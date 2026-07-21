import { Router } from "express";

import {
  calculatePrice,
  createPricingCalculation,
  listPricingCalculations,
} from "../controllers/pricingCalculationController.js";

import {
  requireAuth,
} from "../middlewares/requireAuth.js";

const pricingCalculationRoutes =
  Router();

pricingCalculationRoutes.use(
  requireAuth,
);

/*
 * POST /api/pricing-calculations/calculate
 *
 * Calcula o preço sem salvar no banco.
 */
pricingCalculationRoutes.post(
  "/calculate",
  calculatePrice,
);

/*
 * GET /api/pricing-calculations
 *
 * Lista os cálculos já salvos.
 */
pricingCalculationRoutes.get(
  "/",
  listPricingCalculations,
);

/*
 * POST /api/pricing-calculations
 *
 * Calcula e salva no MongoDB.
 */
pricingCalculationRoutes.post(
  "/",
  createPricingCalculation,
);

export {
  pricingCalculationRoutes,
};