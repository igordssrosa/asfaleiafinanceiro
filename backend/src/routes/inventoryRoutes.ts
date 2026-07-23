import {
  Router,
} from "express";

import {
  getInventoryItem,
  listInventoryItems,
  updateInventoryItem,
} from "../controllers/inventoryController.js";

import {
  requireAuth,
} from "../middlewares/requireAuth.js";

const inventoryRoutes =
  Router();

/*
 * Todas as rotas de estoque exigem
 * autenticação.
 */
inventoryRoutes.use(
  requireAuth,
);

/*
 * Lista todos os produtos disponíveis
 * no controle de estoque.
 *
 * Exemplos:
 * GET /api/inventory
 * GET /api/inventory?search=camiseta
 * GET /api/inventory?status=active
 */
inventoryRoutes.get(
  "/",
  listInventoryItems,
);

/*
 * Busca o estoque de um produto específico.
 *
 * GET /api/inventory/:productId
 */
inventoryRoutes.get(
  "/:productId",
  getInventoryItem,
);

/*
 * Atualiza:
 * - status ativo/inativo;
 * - cores;
 * - tamanhos;
 * - quantidades;
 * - estoque mínimo.
 *
 * PUT /api/inventory/:productId
 */
inventoryRoutes.put(
  "/:productId",
  updateInventoryItem,
);

export {
  inventoryRoutes,
};