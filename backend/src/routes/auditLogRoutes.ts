import {
  Router,
} from "express";

import {
  listAuditLogs,
} from "../controllers/auditLogController.js";

import {
  requireAuth,
} from "../middlewares/requireAuth.js";

const auditLogRoutes =
  Router();

auditLogRoutes.use(
  requireAuth,
);

auditLogRoutes.get(
  "/",
  listAuditLogs,
);

export {
  auditLogRoutes,
};