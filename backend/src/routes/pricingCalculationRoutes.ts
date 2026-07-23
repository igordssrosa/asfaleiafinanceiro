import { Router } from "express";

import {
  calculatePrice,
  createPricingCalculation,
  deletePricingCalculation,
  listDeletedPricingCalculations,
  listPricingCalculations,
  permanentlyDeletePricingCalculation,
  restorePricingCalculation,
} from "../controllers/pricingCalculationController.js";

import {
  requireAuth,
} from "../middlewares/requireAuth.js";

const pricingCalculationRoutes =
  Router();

pricingCalculationRoutes.use(
  requireAuth,
);

pricingCalculationRoutes.post(
  "/calculate",
  calculatePrice,
);

pricingCalculationRoutes.get(
  "/trash",
  listDeletedPricingCalculations,
);

pricingCalculationRoutes.get(
  "/",
  listPricingCalculations,
);

pricingCalculationRoutes.post(
  "/",
  createPricingCalculation,
);

pricingCalculationRoutes.delete(
  "/:id/permanent",
  permanentlyDeletePricingCalculation,
);

pricingCalculationRoutes.delete(
  "/:id",
  deletePricingCalculation,
);

pricingCalculationRoutes.post(
  "/:id/restore",
  restorePricingCalculation,
);

export {
  pricingCalculationRoutes,
};