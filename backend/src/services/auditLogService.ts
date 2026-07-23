import type {
  Request,
} from "express";

import {
  Types,
} from "mongoose";

import {
  AuditLogModel,
  type AuditLogAction,
  type AuditLogResource,
} from "../models/AuditLog.js";

import {
  UserModel,
} from "../models/User.js";

type AuditMetadata = Record<
  string,
  unknown
>;

type RecordAuditLogInput = {
  request: Request;

  userId:
    | string
    | Types.ObjectId;

  action:
    AuditLogAction;

  resource:
    AuditLogResource;

  resourceId:
    string;

  description:
    string;

  metadata?:
    AuditMetadata;
};

/*
 * Campos que nunca devem ser gravados
 * dentro dos metadados do log.
 */
const sensitiveFieldNames =
  new Set([
    "password",
    "passwordhash",
    "currentpassword",
    "newpassword",
    "confirmpassword",
    "token",
    "accesstoken",
    "refreshtoken",
    "refreshtokenhash",
    "authorization",
    "cookie",
    "cookies",
    "jwt",
    "secret",
    "jwt_access_secret",
    "jwt_refresh_secret",
  ]);

function normalizeFieldName(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[_\-\s]/g,
      "",
    );
}

function isSensitiveField(
  fieldName: string,
): boolean {
  return sensitiveFieldNames.has(
    normalizeFieldName(
      fieldName,
    ),
  );
}

/*
 * Remove dados sensíveis dos metadados.
 *
 * Também limita a profundidade para impedir
 * objetos muito grandes ou estruturas
 * recursivas.
 */
function sanitizeValue(
  value: unknown,
  depth = 0,
): unknown {
  if (depth > 5) {
    return "[Limite de profundidade]";
  }

  if (
    value === null ||
    value === undefined
  ) {
    return value ?? null;
  }

  if (
    typeof value === "string"
  ) {
    /*
     * Evita textos enormes nos metadados.
     */
    return value.slice(
      0,
      1000,
    );
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (
    value instanceof Date
  ) {
    return value.toISOString();
  }

  if (
    value instanceof Types.ObjectId
  ) {
    return value.toString();
  }

  if (
    Array.isArray(value)
  ) {
    return value
      .slice(0, 100)
      .map((item) =>
        sanitizeValue(
          item,
          depth + 1,
        ),
      );
  }

  if (
    typeof value === "object"
  ) {
    const sanitizedObject:
      AuditMetadata = {};

    for (
      const [
        key,
        nestedValue,
      ] of Object.entries(value)
    ) {
      if (
        isSensitiveField(key)
      ) {
        sanitizedObject[key] =
          "[REMOVIDO]";

        continue;
      }

      sanitizedObject[key] =
        sanitizeValue(
          nestedValue,
          depth + 1,
        );
    }

    return sanitizedObject;
  }

  return String(value).slice(
    0,
    1000,
  );
}

function sanitizeMetadata(
  metadata:
    AuditMetadata | undefined,
): AuditMetadata {
  if (!metadata) {
    return {};
  }

  const sanitized =
    sanitizeValue(metadata);

  if (
    typeof sanitized ===
      "object" &&
    sanitized !== null &&
    !Array.isArray(sanitized)
  ) {
    return sanitized as
      AuditMetadata;
  }

  return {};
}

function getRequestIp(
  request: Request,
): string | null {
  const forwardedFor =
    request.headers[
      "x-forwarded-for"
    ];

  if (
    typeof forwardedFor ===
    "string"
  ) {
    const firstIp =
      forwardedFor
        .split(",")[0]
        ?.trim();

    return firstIp || null;
  }

  if (
    Array.isArray(forwardedFor)
  ) {
    return (
      forwardedFor[0]
        ?.trim() ||
      null
    );
  }

  return (
    request.ip ||
    request.socket
      .remoteAddress ||
    null
  );
}

function getUserAgent(
  request: Request,
): string | null {
  const userAgent =
    request.get(
      "user-agent",
    );

  if (!userAgent) {
    return null;
  }

  return userAgent.slice(
    0,
    500,
  );
}

function normalizeUserId(
  userId:
    | string
    | Types.ObjectId,
): Types.ObjectId | null {
  if (
    userId instanceof
    Types.ObjectId
  ) {
    return userId;
  }

  if (
    !Types.ObjectId.isValid(
      userId,
    )
  ) {
    return null;
  }

  return new Types.ObjectId(
    userId,
  );
}

/*
 * Registra uma atividade no banco.
 *
 * Retorna true quando o log foi salvo.
 * Retorna false quando não foi possível
 * registrar o log.
 *
 * A função não lança erro para não impedir
 * a criação, edição ou exclusão principal.
 */
export async function recordAuditLog(
  input: RecordAuditLogInput,
): Promise<boolean> {
  try {
    const actorId =
      normalizeUserId(
        input.userId,
      );

    if (!actorId) {
      console.error(
        "Log de auditoria não registrado: usuário inválido.",
      );

      return false;
    }

    const user =
      await UserModel
        .findById(actorId)
        .select({
          name: 1,
          email: 1,
        })
        .lean();

    if (!user) {
      console.error(
        "Log de auditoria não registrado: usuário não encontrado.",
      );

      return false;
    }

    const actorName =
      typeof user.name ===
        "string"
        ? user.name.trim()
        : "";

    const actorEmail =
      typeof user.email ===
        "string"
        ? user.email
            .trim()
            .toLowerCase()
        : "";

    if (
      !actorName ||
      !actorEmail
    ) {
      console.error(
        "Log de auditoria não registrado: usuário sem nome ou e-mail.",
      );

      return false;
    }

    await AuditLogModel.create({
      actorId,

      actorName,

      actorEmail,

      action:
        input.action,

      resource:
        input.resource,

      resourceId:
        input.resourceId,

      description:
        input.description
          .trim()
          .slice(
            0,
            500,
          ),

      metadata:
        sanitizeMetadata(
          input.metadata,
        ),

      ipAddress:
        getRequestIp(
          input.request,
        ),

      userAgent:
        getUserAgent(
          input.request,
        ),
    });

    return true;
  } catch (error) {
    /*
     * Uma falha no log não pode cancelar
     * a operação principal do sistema.
     */
    console.error(
      "Não foi possível registrar o log de auditoria.",
    );

    if (
      error instanceof Error
    ) {
      console.error(
        error.message,
      );
    } else {
      console.error(error);
    }

    return false;
  }
}