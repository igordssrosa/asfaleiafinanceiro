import { Router } from "express";

import {
  createTransaction,
  deleteTransaction,
  getMonthlySummary,
  listDeletedTransactions,
  listTransactions,
  restoreTransaction,
  updateTransaction,
} from "../controllers/transactionController.js";

import {
  requireAuth,
} from "../middlewares/requireAuth.js";

const transactionRoutes =
  Router();

transactionRoutes.use(requireAuth);

transactionRoutes.get(
  "/summary",
  getMonthlySummary,
);

transactionRoutes.get(
  "/trash",
  listDeletedTransactions,
);

transactionRoutes.get(
  "/",
  listTransactions,
);

transactionRoutes.post(
  "/",
  createTransaction,
);

transactionRoutes.patch(
  "/:id",
  updateTransaction,
);

transactionRoutes.delete(
  "/:id",
  deleteTransaction,
);

transactionRoutes.post(
  "/:id/restore",
  restoreTransaction,
);

export { transactionRoutes };