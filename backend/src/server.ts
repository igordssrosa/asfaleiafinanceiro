import "dotenv/config";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoose from "mongoose";

import {
  connectDatabase,
} from "./config/database.js";

import {
  auditLogRoutes,
} from "./routes/auditLogRoutes.js";

import {
  authRoutes,
} from "./routes/authRoutes.js";

import {
  inventoryRoutes,
} from "./routes/inventoryRoutes.js";

import {
  pricingCalculationRoutes,
} from "./routes/pricingCalculationRoutes.js";

import {
  productRoutes,
} from "./routes/productRoutes.js";

import {
  reportRoutes,
} from "./routes/reportRoutes.js";

import {
  transactionRoutes,
} from "./routes/transactionRoutes.js";

import {
  validateAuthEnvironment,
} from "./utils/authTokens.js";

const app =
  express();

const port =
  Number(
    process.env.PORT,
  ) || 3333;

const frontendUrl =
  process.env.FRONTEND_URL ||
  "http://localhost:5173";

/* =========================================================
   LIMITADORES DE REQUISIÇÕES
   ========================================================= */

/*
 * Protege apenas tentativas de login.
 *
 * Requisições bem-sucedidas não entram na contagem.
 * Assim, o limite é usado principalmente contra tentativas
 * repetidas com credenciais incorretas.
 */
const loginLimiter =
  rateLimit({
    windowMs:
      15 *
      60 *
      1000,

    limit:
      20,

    standardHeaders:
      true,

    legacyHeaders:
      false,

    skipSuccessfulRequests:
      true,

    message: {
      message:
        "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
    },
  });

/*
 * Limite geral da API.
 *
 * O valor maior evita bloqueios durante o uso normal,
 * inclusive na página de atividades, que atualiza
 * periodicamente.
 */
const apiLimiter =
  rateLimit({
    windowMs:
      15 *
      60 *
      1000,

    limit:
      1_000,

    standardHeaders:
      true,

    legacyHeaders:
      false,

    skip: (
      request,
    ) =>
      request.originalUrl
        .startsWith(
          "/api/health",
        ),

    message: {
      message:
        "Muitas requisições. Aguarde alguns minutos e tente novamente.",
    },
  });

/* =========================================================
   MIDDLEWARES GERAIS
   ========================================================= */

app.use(
  helmet(),
);

app.use(
  cors({
    origin:
      frontendUrl,

    credentials:
      true,
  }),
);

app.use(
  express.json({
    limit:
      "1mb",
  }),
);

app.use(
  cookieParser(),
);

/* =========================================================
   ROTAS DE AUTENTICAÇÃO
   ========================================================= */

/*
 * O limite mais rígido é aplicado somente ao login.
 *
 * POST /api/auth/login
 */
app.use(
  "/api/auth/login",
  loginLimiter,
);

/*
 * POST /api/auth/login
 * POST /api/auth/refresh
 * POST /api/auth/logout
 * GET  /api/auth/me
 */
app.use(
  "/api/auth",
  authRoutes,
);

/* =========================================================
   LIMITE GERAL DA API
   ========================================================= */

/*
 * É registrado depois das rotas de autenticação para não
 * somar o login, refresh, logout e /me ao limite geral.
 */
app.use(
  "/api",
  apiLimiter,
);

/* =========================================================
   ROTAS FINANCEIRAS
   ========================================================= */

app.use(
  "/api/transactions",
  transactionRoutes,
);

app.use(
  "/api/pricing-calculations",
  pricingCalculationRoutes,
);

app.use(
  "/api/reports",
  reportRoutes,
);

/* =========================================================
   ROTAS DE PRODUTOS E ESTOQUE
   ========================================================= */

app.use(
  "/api/products",
  productRoutes,
);

/*
 * GET /api/inventory
 * GET /api/inventory/:productId
 * PUT /api/inventory/:productId
 */
app.use(
  "/api/inventory",
  inventoryRoutes,
);

/* =========================================================
   ROTAS DE AUDITORIA
   ========================================================= */

app.use(
  "/api/audit-logs",
  auditLogRoutes,
);

/* =========================================================
   VERIFICAÇÃO DA API E DO BANCO
   ========================================================= */

app.get(
  "/api/health",
  async (
    _request,
    response,
  ) => {
    try {
      const database =
        mongoose.connection.db;

      if (!database) {
        return response
          .status(503)
          .json({
            status:
              "error",

            message:
              "API funcionando, mas o banco está desconectado",

            database:
              "disconnected",
          });
      }

      await database
        .admin()
        .command({
          ping:
            1,
        });

      return response
        .status(200)
        .json({
          status:
            "ok",

          message:
            "API da Asfaleia funcionando",

          database:
            "connected",

          databaseName:
            mongoose.connection.name,
        });
    } catch {
      return response
        .status(503)
        .json({
          status:
            "error",

          message:
            "Não foi possível acessar o MongoDB Atlas",

          database:
            "error",
        });
    }
  },
);

/* =========================================================
   INICIALIZAÇÃO DO SERVIDOR
   ========================================================= */

async function startServer(): Promise<void> {
  try {
    validateAuthEnvironment();

    await connectDatabase();

    app.listen(
      port,
      () => {
        console.log(
          `Servidor iniciado em http://localhost:${port}`,
        );
      },
    );
  } catch (error) {
    console.error(
      "Não foi possível iniciar o servidor.",
    );

    if (
      error instanceof
      Error
    ) {
      console.error(
        error.message,
      );
    } else {
      console.error(
        error,
      );
    }

    process.exit(
      1,
    );
  }
}

void startServer();