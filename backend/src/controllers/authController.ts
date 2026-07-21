import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";

import { SessionModel } from "../models/Session.js";
import { UserModel } from "../models/User.js";
import {
  REFRESH_COOKIE_NAME,
  clearAuthCookies,
  createAccessToken,
  createRefreshToken,
  getRefreshTokenTtlDays,
  hashRefreshToken,
  setAuthCookies,
} from "../utils/authTokens.js";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("E-mail inválido.")
    .max(160),
  password: z
    .string()
    .min(1, "A senha é obrigatória.")
    .max(200),
});

function getRefreshExpirationDate(): Date {
  const expirationDate = new Date();

  expirationDate.setDate(
    expirationDate.getDate() +
      getRefreshTokenTtlDays(),
  );

  return expirationDate;
}

function getUserAgent(request: Request): string | null {
  return request.get("user-agent")?.slice(0, 500) ?? null;
}

async function createUserSession(
  request: Request,
  response: Response,
  userId: string,
): Promise<void> {
  const accessToken = createAccessToken({
    userId,
    role: "owner",
  });

  const refreshToken = createRefreshToken();
  const refreshTokenHash =
    hashRefreshToken(refreshToken);

  await SessionModel.create({
    userId: new Types.ObjectId(userId),
    refreshTokenHash,
    userAgent: getUserAgent(request),
    ipAddress: request.ip,
    lastUsedAt: new Date(),
    expiresAt: getRefreshExpirationDate(),
    revokedAt: null,
  });

  setAuthCookies(
    response,
    accessToken,
    refreshToken,
  );
}

export async function login(
  request: Request,
  response: Response,
): Promise<void> {
  const parsedBody = loginSchema.safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({
      message: "Dados de login inválidos.",
      errors: parsedBody.error.flatten().fieldErrors,
    });

    return;
  }

  const email = parsedBody.data.email.toLowerCase();
  const { password } = parsedBody.data;

  const user = await UserModel.findOne({
    email,
    isActive: true,
    role: "owner",
  }).select("+passwordHash");

  if (!user) {
    response.status(401).json({
      message: "E-mail ou senha incorretos.",
    });

    return;
  }

  const passwordIsValid = await bcrypt.compare(
    password,
    user.passwordHash,
  );

  if (!passwordIsValid) {
    response.status(401).json({
      message: "E-mail ou senha incorretos.",
    });

    return;
  }

  await createUserSession(
    request,
    response,
    user._id.toString(),
  );

  user.lastLoginAt = new Date();
  await user.save();

  response.status(200).json({
    message: "Login realizado com sucesso.",
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}

export async function getCurrentUser(
  request: Request,
  response: Response,
): Promise<void> {
  const userId = request.auth?.userId;

  if (!userId) {
    response.status(401).json({
      message: "Autenticação necessária.",
    });

    return;
  }

  const user = await UserModel.findOne({
    _id: userId,
    isActive: true,
    role: "owner",
  }).select("name email role lastLoginAt createdAt");

  if (!user) {
    response.status(401).json({
      message: "Usuário não encontrado ou desativado.",
    });

    return;
  }

  response.status(200).json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    },
  });
}

export async function refreshSession(
  request: Request,
  response: Response,
): Promise<void> {
  const refreshToken =
    request.cookies?.[REFRESH_COOKIE_NAME];

  if (
    !refreshToken ||
    typeof refreshToken !== "string"
  ) {
    clearAuthCookies(response);

    response.status(401).json({
      message: "Sessão não encontrada.",
    });

    return;
  }

  const currentTokenHash =
    hashRefreshToken(refreshToken);

  const session = await SessionModel.findOne({
    refreshTokenHash: currentTokenHash,
    revokedAt: null,
    expiresAt: {
      $gt: new Date(),
    },
  });

  if (!session) {
    clearAuthCookies(response);

    response.status(401).json({
      message: "Sessão inválida ou expirada.",
    });

    return;
  }

  const user = await UserModel.findOne({
    _id: session.userId,
    isActive: true,
    role: "owner",
  });

  if (!user) {
    session.revokedAt = new Date();
    await session.save();

    clearAuthCookies(response);

    response.status(401).json({
      message: "Usuário não encontrado ou desativado.",
    });

    return;
  }

  const newAccessToken = createAccessToken({
    userId: user._id.toString(),
    role: "owner",
  });

  const newRefreshToken = createRefreshToken();

  session.refreshTokenHash =
    hashRefreshToken(newRefreshToken);

  session.lastUsedAt = new Date();
  session.expiresAt = getRefreshExpirationDate();

  await session.save();

  setAuthCookies(
    response,
    newAccessToken,
    newRefreshToken,
  );

  response.status(200).json({
    message: "Sessão renovada.",
  });
}

export async function logout(
  request: Request,
  response: Response,
): Promise<void> {
  const refreshToken =
    request.cookies?.[REFRESH_COOKIE_NAME];

  if (
    refreshToken &&
    typeof refreshToken === "string"
  ) {
    await SessionModel.updateOne(
      {
        refreshTokenHash:
          hashRefreshToken(refreshToken),
        revokedAt: null,
      },
      {
        $set: {
          revokedAt: new Date(),
        },
      },
    );
  }

  clearAuthCookies(response);

  response.status(200).json({
    message: "Logout realizado com sucesso.",
  });
}