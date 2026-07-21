import { createHash, randomBytes } from "node:crypto";

import type { CookieOptions, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

export const ACCESS_COOKIE_NAME = "asfaleia_access";
export const REFRESH_COOKIE_NAME = "asfaleia_refresh";

export type AccessTokenPayload = {
  userId: string;
  role: "owner";
};

function getPositiveNumber(
  value: string | undefined,
  fallback: number,
): number {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

export function getAccessTokenTtlMinutes(): number {
  return getPositiveNumber(
    process.env.ACCESS_TOKEN_TTL_MINUTES,
    15,
  );
}

export function getRefreshTokenTtlDays(): number {
  return getPositiveNumber(
    process.env.REFRESH_TOKEN_TTL_DAYS,
    7,
  );
}

function getAccessTokenSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET?.trim();

  if (!secret || secret.length < 64) {
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
}

export function createAccessToken(
  payload: AccessTokenPayload,
): string {
  const expiresInSeconds =
    getAccessTokenTtlMinutes() * 60;

  return jwt.sign(
    {
      role: payload.role,
    },
    getAccessTokenSecret(),
    {
      subject: payload.userId,
      expiresIn: expiresInSeconds,
      issuer: "asfaleia-api",
      audience: "asfaleia-frontend",
    },
  );
}

export function verifyAccessToken(
  token: string,
): AccessTokenPayload {
  const decodedToken = jwt.verify(
    token,
    getAccessTokenSecret(),
    {
      issuer: "asfaleia-api",
      audience: "asfaleia-frontend",
    },
  );

  if (
    typeof decodedToken === "string" ||
    !decodedToken.sub ||
    decodedToken.role !== "owner"
  ) {
    throw new Error("Token inválido.");
  }

  const payload = decodedToken as JwtPayload;

  return {
    userId: String(payload.sub),
    role: "owner",
  };
}

export function createRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function accessCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: getAccessTokenTtlMinutes() * 60 * 1000,
  };
}

function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/api/auth",
    maxAge:
      getRefreshTokenTtlDays() *
      24 *
      60 *
      60 *
      1000,
  };
}

export function setAuthCookies(
  response: Response,
  accessToken: string,
  refreshToken: string,
): void {
  response.cookie(
    ACCESS_COOKIE_NAME,
    accessToken,
    accessCookieOptions(),
  );

  response.cookie(
    REFRESH_COOKIE_NAME,
    refreshToken,
    refreshCookieOptions(),
  );
}

export function clearAuthCookies(response: Response): void {
  response.clearCookie(
    ACCESS_COOKIE_NAME,
    accessCookieOptions(),
  );

  response.clearCookie(
    REFRESH_COOKIE_NAME,
    refreshCookieOptions(),
  );
}