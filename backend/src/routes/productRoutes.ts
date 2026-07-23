import { Router } from "express";

import {
  createProduct,
  deleteProduct,
  listDeletedProducts,
  listProducts,
  permanentlyDeleteProduct,
  restoreProduct,
  updateProduct,
} from "../controllers/productController.js";

import {
  requireAuth,
} from "../middlewares/requireAuth.js";

const productRoutes =
  Router();

productRoutes.use(
  requireAuth,
);

productRoutes.get(
  "/trash",
  listDeletedProducts,
);

productRoutes.get(
  "/",
  listProducts,
);

productRoutes.post(
  "/",
  createProduct,
);

productRoutes.patch(
  "/:id",
  updateProduct,
);

productRoutes.delete(
  "/:id/permanent",
  permanentlyDeleteProduct,
);

productRoutes.delete(
  "/:id",
  deleteProduct,
);

productRoutes.post(
  "/:id/restore",
  restoreProduct,
);

export { productRoutes };