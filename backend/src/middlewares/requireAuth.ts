import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  ACCESS_COOKIE_NAME,
  verifyAccessToken,
} from "../utils/authTokens.js";

export function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const accessToken =
    request.cookies?.[ACCESS_COOKIE_NAME];

  if (
    !accessToken ||
    typeof accessToken !== "string"
  ) {
    response.status(401).json({
      message: "Autenticação necessária.",
    });

    return;
  }

  try {
    request.auth = verifyAccessToken(accessToken);
    next();
  } catch {
    response.status(401).json({
      message: "Sessão inválida ou expirada.",
    });
  }
}