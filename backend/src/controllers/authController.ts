import bcrypt from "bcryptjs";
import type {
  Request,
  Response,
} from "express";
import { Types } from "mongoose";
import { z } from "zod";

import {
  SessionModel,
} from "../models/Session.js";

import {
  UserModel,
} from "../models/User.js";

import {
  recordAuditLog,
} from "../services/auditLogService.js";

import {
  REFRESH_COOKIE_NAME,
  clearAuthCookies,
  createAccessToken,
  createRefreshToken,
  createSessionExpirationDate,
  hashRefreshToken,
  setAuthCookies,
} from "../utils/authTokens.js";

const loginSchema =
  z.object({
    email:
      z
        .string()
        .trim()
        .email(
          "E-mail inválido.",
        )
        .max(160),

    password:
      z
        .string()
        .min(
          1,
          "A senha é obrigatória.",
        )
        .max(200),
  });

function getUserAgent(
  request: Request,
): string | null {
  return (
    request
      .get("user-agent")
      ?.slice(0, 500) ??
    null
  );
}

async function createUserSession(
  request: Request,
  response: Response,
  userId: string,
): Promise<Date> {
  /*
   * O vencimento é criado apenas no login.
   *
   * Ele não será prorrogado quando o token
   * de acesso for renovado.
   */
  const sessionExpiresAt =
    createSessionExpirationDate();

  const accessToken =
    createAccessToken({
      userId,
      role:
        "owner",
    });

  const refreshToken =
    createRefreshToken();

  const refreshTokenHash =
    hashRefreshToken(
      refreshToken,
    );

  await SessionModel.create({
    userId:
      new Types.ObjectId(
        userId,
      ),

    refreshTokenHash,

    userAgent:
      getUserAgent(
        request,
      ),

    ipAddress:
      request.ip,

    lastUsedAt:
      new Date(),

    expiresAt:
      sessionExpiresAt,

    revokedAt:
      null,
  });

  setAuthCookies(
    response,
    accessToken,
    refreshToken,
    sessionExpiresAt,
  );

  return sessionExpiresAt;
}

export async function login(
  request: Request,
  response: Response,
): Promise<void> {
  const parsedBody =
    loginSchema.safeParse(
      request.body,
    );

  if (
    !parsedBody.success
  ) {
    response
      .status(400)
      .json({
        message:
          "Dados de login inválidos.",

        errors:
          parsedBody.error
            .flatten()
            .fieldErrors,
      });

    return;
  }

  const email =
    parsedBody.data.email
      .toLowerCase();

  const {
    password,
  } =
    parsedBody.data;

  const user =
    await UserModel.findOne({
      email,

      isActive:
        true,

      role:
        "owner",
    }).select(
      "+passwordHash",
    );

  if (!user) {
    response
      .status(401)
      .json({
        message:
          "E-mail ou senha incorretos.",
      });

    return;
  }

  const passwordIsValid =
    await bcrypt.compare(
      password,
      user.passwordHash,
    );

  if (
    !passwordIsValid
  ) {
    response
      .status(401)
      .json({
        message:
          "E-mail ou senha incorretos.",
      });

    return;
  }

  const userId =
    user._id.toString();

  const sessionExpiresAt =
    await createUserSession(
      request,
      response,
      userId,
    );

  user.lastLoginAt =
    new Date();

  await user.save();

  /*
   * O log é criado somente depois que
   * o login foi concluído com sucesso.
   *
   * Tentativas com senha incorreta não
   * serão registradas por enquanto.
   */
  await recordAuditLog({
    request,

    userId,

    action:
      "login",

    resource:
      "authentication",

    resourceId:
      userId,

    description:
      `${user.name} entrou no sistema.`,

    metadata: {
      sessionExpiresAt:
        sessionExpiresAt
          .toISOString(),
    },
  });

  response
    .status(200)
    .json({
      message:
        "Login realizado com sucesso.",

      user: {
        id:
          userId,

        name:
          user.name,

        email:
          user.email,

        role:
          user.role,
      },

      /*
       * O frontend usará esse horário para
       * executar o logout automático.
       */
      sessionExpiresAt:
        sessionExpiresAt
          .toISOString(),
    });
}

export async function getCurrentUser(
  request: Request,
  response: Response,
): Promise<void> {
  const userId =
    request.auth?.userId;

  if (!userId) {
    response
      .status(401)
      .json({
        message:
          "Autenticação necessária.",
      });

    return;
  }

  const refreshToken =
    request.cookies?.[
      REFRESH_COOKIE_NAME
    ];

  if (
    !refreshToken ||
    typeof refreshToken !==
      "string"
  ) {
    clearAuthCookies(
      response,
    );

    response
      .status(401)
      .json({
        message:
          "Sessão não encontrada.",
      });

    return;
  }

  /*
   * Além de verificar o access token,
   * confirmamos que a sessão absoluta
   * ainda não venceu.
   */
  const session =
    await SessionModel.findOne({
      userId:
        new Types.ObjectId(
          userId,
        ),

      refreshTokenHash:
        hashRefreshToken(
          refreshToken,
        ),

      revokedAt:
        null,

      expiresAt: {
        $gt:
          new Date(),
      },
    });

  if (!session) {
    clearAuthCookies(
      response,
    );

    response
      .status(401)
      .json({
        message:
          "Sessão inválida ou expirada.",
      });

    return;
  }

  const user =
    await UserModel.findOne({
      _id:
        userId,

      isActive:
        true,

      role:
        "owner",
    }).select(
      "name email role lastLoginAt createdAt",
    );

  if (!user) {
    session.revokedAt =
      new Date();

    await session.save();

    clearAuthCookies(
      response,
    );

    response
      .status(401)
      .json({
        message:
          "Usuário não encontrado ou desativado.",
      });

    return;
  }

  response
    .status(200)
    .json({
      user: {
        id:
          user._id.toString(),

        name:
          user.name,

        email:
          user.email,

        role:
          user.role,

        lastLoginAt:
          user.lastLoginAt,

        createdAt:
          user.createdAt,
      },

      sessionExpiresAt:
        session.expiresAt
          .toISOString(),
    });
}

export async function refreshSession(
  request: Request,
  response: Response,
): Promise<void> {
  const refreshToken =
    request.cookies?.[
      REFRESH_COOKIE_NAME
    ];

  if (
    !refreshToken ||
    typeof refreshToken !==
      "string"
  ) {
    clearAuthCookies(
      response,
    );

    response
      .status(401)
      .json({
        message:
          "Sessão não encontrada.",
      });

    return;
  }

  const currentTokenHash =
    hashRefreshToken(
      refreshToken,
    );

  const session =
    await SessionModel.findOne({
      refreshTokenHash:
        currentTokenHash,

      revokedAt:
        null,

      expiresAt: {
        $gt:
          new Date(),
      },
    });

  if (!session) {
    clearAuthCookies(
      response,
    );

    response
      .status(401)
      .json({
        message:
          "Sessão inválida ou expirada.",
      });

    return;
  }

  const user =
    await UserModel.findOne({
      _id:
        session.userId,

      isActive:
        true,

      role:
        "owner",
    });

  if (!user) {
    session.revokedAt =
      new Date();

    await session.save();

    clearAuthCookies(
      response,
    );

    response
      .status(401)
      .json({
        message:
          "Usuário não encontrado ou desativado.",
      });

    return;
  }

  const newAccessToken =
    createAccessToken({
      userId:
        user._id.toString(),

      role:
        "owner",
    });

  const newRefreshToken =
    createRefreshToken();

  session.refreshTokenHash =
    hashRefreshToken(
      newRefreshToken,
    );

  session.lastUsedAt =
    new Date();

  /*
   * Não alteramos session.expiresAt.
   *
   * Portanto, cada renovação mantém o
   * vencimento original de 12 horas.
   */
  await session.save();

  setAuthCookies(
    response,
    newAccessToken,
    newRefreshToken,
    session.expiresAt,
  );

  response
    .status(200)
    .json({
      message:
        "Sessão renovada.",

      sessionExpiresAt:
        session.expiresAt
          .toISOString(),
    });
}

export async function logout(
  request: Request,
  response: Response,
): Promise<void> {
  const refreshToken =
    request.cookies?.[
      REFRESH_COOKIE_NAME
    ];

  /*
   * O usuário pode vir do access token ou
   * da sessão encontrada pelo refresh token.
   */
  let userId:
    string | null =
      request.auth?.userId ??
      null;

  if (
    refreshToken &&
    typeof refreshToken ===
      "string"
  ) {
    const session =
      await SessionModel.findOne({
        refreshTokenHash:
          hashRefreshToken(
            refreshToken,
          ),

        revokedAt:
          null,
      });

    if (session) {
      userId =
        session.userId
          .toString();

      session.revokedAt =
        new Date();

      await session.save();
    }
  }

  /*
   * O log precisa ser criado antes de
   * responder ao frontend.
   */
  if (userId) {
    await recordAuditLog({
      request,

      userId,

      action:
        "logout",

      resource:
        "authentication",

      resourceId:
        userId,

      description:
        "O usuário saiu do sistema.",

      metadata: {},
    });
  }

  clearAuthCookies(
    response,
  );

  response
    .status(200)
    .json({
      message:
        "Logout realizado com sucesso.",
    });
}