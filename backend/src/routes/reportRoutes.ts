import { Router } from "express";

import {
  exportMonthlyReportCsv,
  getMonthlyComparison,
  getMonthlyReport,
} from "../controllers/reportController.js";

import {
  requireAuth,
} from "../middlewares/requireAuth.js";

const reportRoutes =
  Router();

reportRoutes.use(
  requireAuth,
);

/*
 * GET /api/reports/monthly?month=2026-07
 */
reportRoutes.get(
  "/monthly",
  getMonthlyReport,
);

/*
 * GET /api/reports/comparison
 * ?endMonth=2026-07
 * &months=6
 */
reportRoutes.get(
  "/comparison",
  getMonthlyComparison,
);

/*
 * GET /api/reports/export.csv
 * ?month=2026-07
 */
reportRoutes.get(
  "/export.csv",
  exportMonthlyReportCsv,
);

export { reportRoutes };