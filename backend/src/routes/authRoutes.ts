import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  getCurrentUser,
  login,
  logout,
  refreshSession,
} from "../controllers/authController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const authRoutes = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      "Muitas tentativas de login. Aguarde alguns minutos.",
  },
});

authRoutes.post("/login", loginLimiter, login);
authRoutes.post("/refresh", refreshSession);
authRoutes.post("/logout", logout);
authRoutes.get("/me", requireAuth, getCurrentUser);

export { authRoutes };