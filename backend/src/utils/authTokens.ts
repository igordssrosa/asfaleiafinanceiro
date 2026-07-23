import {
  createHash,
  randomBytes,
} from "node:crypto";

import type {
  CookieOptions,
  Response,
} from "express";

import jwt, {
  type JwtPayload,
} from "jsonwebtoken";

export const ACCESS_COOKIE_NAME =
  "asfaleia_access";

export const REFRESH_COOKIE_NAME =
  "asfaleia_refresh";

export type AccessTokenPayload = {
  userId: string;
  role: "owner";
};

const DEFAULT_ACCESS_TOKEN_TTL_MINUTES =
  15;

const DEFAULT_REFRESH_TOKEN_TTL_DAYS =
  7;

const DEFAULT_SESSION_TTL_HOURS =
  12;

function getPositiveNumber(
  value: string | undefined,
  fallback: number,
): number {
  const parsedValue =
    Number(value);

  if (
    !Number.isFinite(
      parsedValue,
    ) ||
    parsedValue <= 0
  ) {
    return fallback;
  }

  return parsedValue;
}

export function getAccessTokenTtlMinutes(): number {
  return getPositiveNumber(
    process.env
      .ACCESS_TOKEN_TTL_MINUTES,

    DEFAULT_ACCESS_TOKEN_TTL_MINUTES,
  );
}

/*
 * Mantido para compatibilidade com o
 * restante do projeto.
 *
 * A duração real da sessão será controlada
 * por SESSION_TTL_HOURS.
 */
export function getRefreshTokenTtlDays(): number {
  return getPositiveNumber(
    process.env
      .REFRESH_TOKEN_TTL_DAYS,

    DEFAULT_REFRESH_TOKEN_TTL_DAYS,
  );
}

/*
 * Duração máxima e absoluta da sessão.
 *
 * Mesmo que o token seja renovado, a sessão
 * não poderá ultrapassar esse período.
 */
export function getSessionTtlHours(): number {
  return getPositiveNumber(
    process.env
      .SESSION_TTL_HOURS,

    DEFAULT_SESSION_TTL_HOURS,
  );
}

export function createSessionExpirationDate(
  referenceDate =
    new Date(),
): Date {
  const durationMilliseconds =
    getSessionTtlHours() *
    60 *
    60 *
    1000;

  return new Date(
    referenceDate.getTime() +
      durationMilliseconds,
  );
}

export function getSessionRemainingMilliseconds(
  sessionExpiresAt: Date,
): number {
  return Math.max(
    0,
    sessionExpiresAt.getTime() -
      Date.now(),
  );
}

function getAccessTokenSecret(): string {
  const secret =
    process.env
      .JWT_ACCESS_SECRET
      ?.trim();

  if (
    !secret ||
    secret.length < 64
  ) {
    throw new Error(
      "JWT_ACCESS_SECRET deve possuir pelo menos 64 caracteres.",
    );
  }

  return secret;
}

export function validateAuthEnvironment(): void {
  getAccessTokenSecret();
  getAccessTokenTtlMinutes();
  getRefreshTokenTtlDays();
  getSessionTtlHours();
}

export function createAccessToken(
  payload:
    AccessTokenPayload,
): string {
  const expiresInSeconds =
    getAccessTokenTtlMinutes() *
    60;

  return jwt.sign(
    {
      role:
        payload.role,
    },

    getAccessTokenSecret(),

    {
      subject:
        payload.userId,

      expiresIn:
        expiresInSeconds,

      issuer:
        "asfaleia-api",

      audience:
        "asfaleia-frontend",
    },
  );
}

export function verifyAccessToken(
  token: string,
): AccessTokenPayload {
  const decodedToken =
    jwt.verify(
      token,

      getAccessTokenSecret(),

      {
        issuer:
          "asfaleia-api",

        audience:
          "asfaleia-frontend",
      },
    );

  if (
    typeof decodedToken ===
      "string" ||
    !decodedToken.sub ||
    decodedToken.role !==
      "owner"
  ) {
    throw new Error(
      "Token inválido.",
    );
  }

  const payload =
    decodedToken as JwtPayload;

  return {
    userId:
      String(
        payload.sub,
      ),

    role:
      "owner",
  };
}

export function createRefreshToken(): string {
  return randomBytes(48)
    .toString(
      "base64url",
    );
}

export function hashRefreshToken(
  token: string,
): string {
  return createHash(
    "sha256",
  )
    .update(token)
    .digest("hex");
}

function isProduction(): boolean {
  return (
    process.env.NODE_ENV ===
    "production"
  );
}

function getBaseCookieOptions(): CookieOptions {
  return {
    httpOnly:
      true,

    secure:
      isProduction(),

    sameSite:
      "lax",
  };
}

function getLimitedMaxAge(
  defaultMaxAge:
    number,

  sessionExpiresAt?:
    Date,
): number {
  if (!sessionExpiresAt) {
    return defaultMaxAge;
  }

  const remainingMilliseconds =
    getSessionRemainingMilliseconds(
      sessionExpiresAt,
    );

  return Math.max(
    1,

    Math.min(
      defaultMaxAge,
      remainingMilliseconds,
    ),
  );
}

function accessCookieOptions(
  sessionExpiresAt?:
    Date,
): CookieOptions {
  const defaultMaxAge =
    getAccessTokenTtlMinutes() *
    60 *
    1000;

  return {
    ...getBaseCookieOptions(),

    path:
      "/",

    maxAge:
      getLimitedMaxAge(
        defaultMaxAge,
        sessionExpiresAt,
      ),
  };
}

function refreshCookieOptions(
  sessionExpiresAt?:
    Date,
): CookieOptions {
  const defaultMaxAge =
    getRefreshTokenTtlDays() *
    24 *
    60 *
    60 *
    1000;

  return {
    ...getBaseCookieOptions(),

    path:
      "/api/auth",

    maxAge:
      getLimitedMaxAge(
        defaultMaxAge,
        sessionExpiresAt,
      ),
  };
}

function accessCookieClearOptions(): CookieOptions {
  return {
    ...getBaseCookieOptions(),

    path:
      "/",
  };
}

function refreshCookieClearOptions(): CookieOptions {
  return {
    ...getBaseCookieOptions(),

    path:
      "/api/auth",
  };
}

/*
 * Quando sessionExpiresAt for informado,
 * nenhum cookie poderá durar além do
 * vencimento absoluto da sessão.
 */
export function setAuthCookies(
  response:
    Response,

  accessToken:
    string,

  refreshToken:
    string,

  sessionExpiresAt?:
    Date,
): void {
  response.cookie(
    ACCESS_COOKIE_NAME,
    accessToken,
    accessCookieOptions(
      sessionExpiresAt,
    ),
  );

  response.cookie(
    REFRESH_COOKIE_NAME,
    refreshToken,
    refreshCookieOptions(
      sessionExpiresAt,
    ),
  );
}

export function clearAuthCookies(
  response:
    Response,
): void {
  response.clearCookie(
    ACCESS_COOKIE_NAME,
    accessCookieClearOptions(),
  );

  response.clearCookie(
    REFRESH_COOKIE_NAME,
    refreshCookieClearOptions(),
  );
}