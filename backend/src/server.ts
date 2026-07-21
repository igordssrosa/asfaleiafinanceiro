import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

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
  }),
);

app.get("/api/health", (_request, response) => {
  response.status(200).json({
    status: "ok",
    message: "API da Asfaleia funcionando",
  });
});

app.listen(port, () => {
  console.log(`Servidor iniciado em http://localhost:${port}`);
});