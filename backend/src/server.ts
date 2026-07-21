import "dotenv/config";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoose from "mongoose";

import { connectDatabase } from "./config/database.js";
import { authRoutes } from "./routes/authRoutes.js";
import { transactionRoutes } from "./routes/transactionRoutes.js";
import { validateAuthEnvironment } from "./utils/authTokens.js";

import {
  pricingCalculationRoutes,
} from "./routes/pricingCalculationRoutes.js";

const app = express();

const port = Number(process.env.PORT) || 3333;

const frontendUrl =
  process.env.FRONTEND_URL || "http://localhost:5173";

app.use(helmet());

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message:
        "Muitas requisições. Aguarde alguns minutos e tente novamente.",
    },
  }),
);

/*
 * Rotas de autenticação:
 *
 * POST /api/auth/login
 * POST /api/auth/refresh
 * POST /api/auth/logout
 * GET  /api/auth/me
 */
app.use("/api/auth", authRoutes);

/*
 * Rotas financeiras:
 *
 * GET    /api/transactions
 * GET    /api/transactions/summary
 * POST   /api/transactions
 * PATCH  /api/transactions/:id
 * DELETE /api/transactions/:id
 * POST   /api/transactions/:id/restore
 */
app.use(
  "/api/transactions",
  transactionRoutes,
);

app.use(
  "/api/pricing-calculations",
  pricingCalculationRoutes,
);

app.get("/api/health", async (_request, response) => {
  try {
    const database = mongoose.connection.db;

    if (!database) {
      return response.status(503).json({
        status: "error",
        message:
          "API funcionando, mas o banco está desconectado",
        database: "disconnected",
      });
    }

    await database.admin().command({ ping: 1 });

    return response.status(200).json({
      status: "ok",
      message: "API da Asfaleia funcionando",
      database: "connected",
      databaseName: mongoose.connection.name,
    });
  } catch {
    return response.status(503).json({
      status: "error",
      message:
        "Não foi possível acessar o MongoDB Atlas",
      database: "error",
    });
  }
});

async function startServer(): Promise<void> {
  try {
    validateAuthEnvironment();

    await connectDatabase();

    app.listen(port, () => {
      console.log(
        `Servidor iniciado em http://localhost:${port}`,
      );
    });
  } catch (error) {
    console.error(
      "Não foi possível iniciar o servidor.",
    );

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

void startServer();