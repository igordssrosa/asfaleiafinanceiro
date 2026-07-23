import type {
  Request,
  Response,
} from "express";

import {
  Types,
  type HydratedDocument,
} from "mongoose";

import {
  z,
} from "zod";

import {
  InventoryModel,
  type IInventory,
  type InventoryVariant,
} from "../models/Inventory.js";

import {
  ProductModel,
  type IProduct,
} from "../models/Product.js";

import {
  recordAuditLog,
} from "../services/auditLogService.js";

type InventoryWithId =
  HydratedDocument<IInventory>;

type ProductWithId =
  HydratedDocument<IProduct>;

const inventoryStatusSchema =
  z.enum([
    "active",
    "inactive",
  ]);

const inventoryVariantSchema =
  z.object({
    color:
      z
        .string()
        .trim()
        .min(
          1,
          "Informe a cor.",
        )
        .max(
          60,
          "A cor deve possuir no máximo 60 caracteres.",
        ),

    size:
      z
        .string()
        .trim()
        .min(
          1,
          "Informe o tamanho.",
        )
        .max(
          20,
          "O tamanho deve possuir no máximo 20 caracteres.",
        ),

    quantity:
      z
        .coerce
        .number()
        .int(
          "A quantidade precisa ser um número inteiro.",
        )
        .min(
          0,
          "A quantidade não pode ser negativa.",
        )
        .max(
          1_000_000,
          "A quantidade informada é muito alta.",
        ),

    minimumStock:
      z
        .coerce
        .number()
        .int(
          "O estoque mínimo precisa ser um número inteiro.",
        )
        .min(
          0,
          "O estoque mínimo não pode ser negativo.",
        )
        .max(
          1_000_000,
          "O estoque mínimo informado é muito alto.",
        )
        .default(0),
  });

const updateInventorySchema =
  z
    .object({
      isActive:
        z
          .boolean()
          .optional(),

      variants:
        z
          .array(
            inventoryVariantSchema,
          )
          .max(
            500,
            "O produto não pode possuir mais de 500 variações.",
          )
          .optional(),
    })
    .refine(
      (data) =>
        data.isActive !==
          undefined ||
        data.variants !==
          undefined,

      {
        message:
          "Informe o status ou as variações do estoque.",
      },
    )
    .superRefine(
      (
        data,
        context,
      ) => {
        if (!data.variants) {
          return;
        }

        const combinations =
          new Set<string>();

        data.variants.forEach(
          (
            variant,
            index,
          ) => {
            const normalizedColor =
              variant.color
                .trim()
                .toLocaleLowerCase(
                  "pt-BR",
                );

            const normalizedSize =
              variant.size
                .trim()
                .toLocaleUpperCase(
                  "pt-BR",
                );

            const combination =
              `${normalizedColor}::${normalizedSize}`;

            if (
              combinations.has(
                combination,
              )
            ) {
              context.addIssue({
                code:
                  z.ZodIssueCode.custom,

                path: [
                  "variants",
                  index,
                ],

                message:
                  `A combinação ${variant.color} / ${variant.size} está repetida.`,
              });

              return;
            }

            combinations.add(
              combination,
            );
          },
        );
      },
    );

const listInventorySchema =
  z.object({
    search:
      z
        .string()
        .trim()
        .max(120)
        .optional(),

    status:
      inventoryStatusSchema
        .optional(),

    page:
      z
        .coerce
        .number()
        .int()
        .min(1)
        .default(1),

    limit:
      z
        .coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20),
  });

function getAuthenticatedUserId(
  request: Request,
): Types.ObjectId | null {
  const userId =
    request.auth?.userId;

  if (
    !userId ||
    !Types.ObjectId.isValid(
      userId,
    )
  ) {
    return null;
  }

  return new Types.ObjectId(
    userId,
  );
}

function getRouteProductId(
  request: Request,
): string | null {
  const routeProductId =
    request.params.productId;

  if (
    typeof routeProductId ===
    "string"
  ) {
    return routeProductId;
  }

  if (
    Array.isArray(
      routeProductId,
    )
  ) {
    return (
      routeProductId[0] ??
      null
    );
  }

  return null;
}

function escapeRegularExpression(
  value: string,
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

function normalizeVariant(
  variant: {
    color: string;
    size: string;
    quantity: number;
    minimumStock: number;
  },
): InventoryVariant {
  return {
    color:
      variant.color
        .trim(),

    size:
      variant.size
        .trim()
        .toLocaleUpperCase(
          "pt-BR",
        ),

    quantity:
      variant.quantity,

    minimumStock:
      variant.minimumStock,
  };
}

function getVariantSummary(
  variants:
    InventoryVariant[],
) {
  let totalQuantity =
    0;

  let lowStockVariants =
    0;

  let outOfStockVariants =
    0;

  for (
    const variant
    of variants
  ) {
    totalQuantity +=
      variant.quantity;

    if (
      variant.quantity ===
      0
    ) {
      outOfStockVariants +=
        1;

      continue;
    }

    if (
      variant.minimumStock >
        0 &&
      variant.quantity <=
        variant.minimumStock
    ) {
      lowStockVariants +=
        1;
    }
  }

  return {
    totalQuantity,

    variantCount:
      variants.length,

    lowStockVariants,

    outOfStockVariants,
  };
}

function serializeInventory(
  inventory:
    InventoryWithId,

  product:
    ProductWithId,
) {
  const variants =
    inventory.variants ??
    [];

  const summary =
    getVariantSummary(
      variants,
    );

  return {
    id:
      inventory
        ._id
        .toString(),

    product: {
      id:
        product
          ._id
          .toString(),

      name:
        product.name,

      sku:
        product.sku,

      category:
        product.category,

      status:
        product.status,

      unitCost:
        product.unitCostCents /
        100,

      salePrice:
        product.salePriceCents /
        100,
    },

    isActive:
      inventory.isActive,

    variants:
      variants.map(
        (variant) => ({
          id:
            variant._id
              ?.toString() ??
            null,

          color:
            variant.color,

          size:
            variant.size,

          quantity:
            variant.quantity,

          minimumStock:
            variant.minimumStock,

          isOutOfStock:
            variant.quantity ===
            0,

          isLowStock:
            variant.quantity >
              0 &&
            variant.minimumStock >
              0 &&
            variant.quantity <=
              variant.minimumStock,
        }),
      ),

    ...summary,

    createdAt:
      inventory.createdAt,

    updatedAt:
      inventory.updatedAt,
  };
}

function isDuplicateKeyError(
  error: unknown,
): boolean {
  if (
    typeof error !==
      "object" ||
    error === null ||
    !(
      "code"
      in error
    )
  ) {
    return false;
  }

  return (
    (
      error as {
        code?: unknown;
      }
    ).code ===
    11000
  );
}

/*
 * Cria registros de estoque para produtos
 * cadastrados antes da implementação deste
 * módulo.
 */
async function ensureInventoryForExistingProducts(): Promise<void> {
  const products =
    await ProductModel
      .find({
        deletedAt:
          null,
      })
      .select(
        "_id status",
      );

  if (
    products.length ===
    0
  ) {
    return;
  }

  const operations =
    products.map(
      (product) => ({
        updateOne: {
          filter: {
            productId:
              product._id,
          },

          update: {
            $setOnInsert: {
              productId:
                product._id,

              isActive:
                product.status ===
                "active",

              variants:
                [],
            },
          },

          upsert:
            true,
        },
      }),
    );

  try {
    await InventoryModel.bulkWrite(
      operations,
      {
        ordered:
          false,
      },
    );
  } catch (error) {
    /*
     * Pode ocorrer em duas requisições
     * simultâneas tentando criar o mesmo
     * estoque. O índice único evita
     * documentos duplicados.
     */
    if (
      !isDuplicateKeyError(
        error,
      )
    ) {
      throw error;
    }
  }
}

async function findOrCreateInventory(
  product:
    ProductWithId,
): Promise<InventoryWithId> {
  const existingInventory =
    await InventoryModel.findOne({
      productId:
        product._id,
    });

  if (
    existingInventory
  ) {
    return existingInventory;
  }

  try {
    return await InventoryModel.create({
      productId:
        product._id,

      isActive:
        product.status ===
        "active",

      variants:
        [],
    });
  } catch (error) {
    if (
      !isDuplicateKeyError(
        error,
      )
    ) {
      throw error;
    }

    const createdByOtherRequest =
      await InventoryModel.findOne({
        productId:
          product._id,
      });

    if (
      !createdByOtherRequest
    ) {
      throw error;
    }

    return createdByOtherRequest;
  }
}

export async function listInventoryItems(
  request: Request,
  response: Response,
): Promise<void> {
  const parsedQuery =
    listInventorySchema.safeParse(
      request.query,
    );

  if (
    !parsedQuery.success
  ) {
    response
      .status(400)
      .json({
        message:
          "Filtros do estoque inválidos.",

        errors:
          parsedQuery.error
            .flatten()
            .fieldErrors,
      });

    return;
  }

  await ensureInventoryForExistingProducts();

  const {
    search,
    status,
    page,
    limit,
  } =
    parsedQuery.data;

  const productFilter:
    Record<
      string,
      unknown
    > = {
      deletedAt:
        null,
    };

  if (search) {
    const expression =
      new RegExp(
        escapeRegularExpression(
          search,
        ),
        "i",
      );

    productFilter.$or = [
      {
        name:
          expression,
      },

      {
        sku:
          expression,
      },

      {
        category:
          expression,
      },
    ];
  }

  const products =
    await ProductModel
      .find(
        productFilter,
      )
      .select(
        "name sku category status unitCostCents salePriceCents createdAt",
      );

  const productMap =
    new Map<
      string,
      ProductWithId
    >();

  for (
    const product
    of products
  ) {
    productMap.set(
      product
        ._id
        .toString(),

      product,
    );
  }

  const productIds =
    products.map(
      (product) =>
        product._id,
    );

  if (
    productIds.length ===
    0
  ) {
    response
      .status(200)
      .json({
        inventoryItems:
          [],

        summary: {
          totalProducts:
            0,

          activeProducts:
            0,

          inactiveProducts:
            0,

          totalUnits:
            0,

          lowStockVariants:
            0,

          outOfStockVariants:
            0,
        },

        pagination: {
          page,
          limit,
          total:
            0,

          totalPages:
            0,
        },
      });

    return;
  }

  const baseInventoryFilter = {
    productId: {
      $in:
        productIds,
    },
  };

  const inventoryFilter:
    Record<
      string,
      unknown
    > = {
      ...baseInventoryFilter,
    };

  if (status) {
    inventoryFilter.isActive =
      status ===
      "active";
  }

  const skip =
    (
      page -
      1
    ) *
    limit;

  const [
    inventoryItems,
    total,
    allInventoryItems,
  ] =
    await Promise.all([
      InventoryModel
        .find(
          inventoryFilter,
        )
        .sort({
          updatedAt:
            -1,
        })
        .skip(
          skip,
        )
        .limit(
          limit,
        ),

      InventoryModel
        .countDocuments(
          inventoryFilter,
        ),

      InventoryModel
        .find(
          baseInventoryFilter,
        )
        .select(
          "isActive variants",
        ),
    ]);

  const summary = {
    totalProducts:
      allInventoryItems.length,

    activeProducts:
      0,

    inactiveProducts:
      0,

    totalUnits:
      0,

    lowStockVariants:
      0,

    outOfStockVariants:
      0,
  };

  for (
    const inventory
    of allInventoryItems
  ) {
    if (
      inventory.isActive
    ) {
      summary.activeProducts +=
        1;
    } else {
      summary.inactiveProducts +=
        1;
    }

    const variantSummary =
      getVariantSummary(
        inventory.variants ??
        [],
      );

    summary.totalUnits +=
      variantSummary.totalQuantity;

    summary.lowStockVariants +=
      variantSummary.lowStockVariants;

    summary.outOfStockVariants +=
      variantSummary.outOfStockVariants;
  }

  const serializedItems =
    inventoryItems
      .map(
        (inventory) => {
          const product =
            productMap.get(
              inventory
                .productId
                .toString(),
            );

          if (!product) {
            return null;
          }

          return serializeInventory(
            inventory,
            product,
          );
        },
      )
      .filter(
        (
          inventoryItem,
        ): inventoryItem is
          NonNullable<
            typeof inventoryItem
          > =>
          inventoryItem !==
          null,
      );

  response
    .status(200)
    .json({
      inventoryItems:
        serializedItems,

      summary,

      pagination: {
        page,
        limit,
        total,

        totalPages:
          Math.ceil(
            total /
            limit,
          ),
      },
    });
}

export async function getInventoryItem(
  request: Request,
  response: Response,
): Promise<void> {
  const productId =
    getRouteProductId(
      request,
    );

  if (
    !productId ||
    !Types.ObjectId.isValid(
      productId,
    )
  ) {
    response
      .status(400)
      .json({
        message:
          "Identificador do produto inválido.",
      });

    return;
  }

  const product =
    await ProductModel.findOne({
      _id:
        productId,

      deletedAt:
        null,
    });

  if (!product) {
    response
      .status(404)
      .json({
        message:
          "Produto não encontrado.",
      });

    return;
  }

  const inventory =
    await findOrCreateInventory(
      product,
    );

  response
    .status(200)
    .json({
      inventoryItem:
        serializeInventory(
          inventory,
          product,
        ),
    });
}

export async function updateInventoryItem(
  request: Request,
  response: Response,
): Promise<void> {
  const userId =
    getAuthenticatedUserId(
      request,
    );

  if (!userId) {
    response
      .status(401)
      .json({
        message:
          "Autenticação necessária.",
      });

    return;
  }

  const productId =
    getRouteProductId(
      request,
    );

  if (
    !productId ||
    !Types.ObjectId.isValid(
      productId,
    )
  ) {
    response
      .status(400)
      .json({
        message:
          "Identificador do produto inválido.",
      });

    return;
  }

  const parsedBody =
    updateInventorySchema.safeParse(
      request.body,
    );

  if (
    !parsedBody.success
  ) {
    response
      .status(400)
      .json({
        message:
          "Dados do estoque inválidos.",

        errors:
          parsedBody.error
            .flatten()
            .fieldErrors,
      });

    return;
  }

  const product =
    await ProductModel.findOne({
      _id:
        productId,

      deletedAt:
        null,
    });

  if (!product) {
    response
      .status(404)
      .json({
        message:
          "Produto não encontrado.",
      });

    return;
  }

  const inventory =
    await findOrCreateInventory(
      product,
    );

  const previousStatus =
    inventory.isActive
      ? "active"
      : "inactive";

  const changedFields:
    string[] = [];

  if (
    parsedBody.data
      .variants !==
    undefined
  ) {
    inventory.variants =
      parsedBody.data
        .variants
        .map(
          normalizeVariant,
        );

    changedFields.push(
      "variants",
    );
  }

  if (
    parsedBody.data
      .isActive !==
    undefined
  ) {
    inventory.isActive =
      parsedBody.data
        .isActive;

    product.status =
      parsedBody.data
        .isActive
        ? "active"
        : "inactive";

    product.updatedBy =
      userId;

    changedFields.push(
      "isActive",
    );
  }

  if (
    parsedBody.data
      .isActive !==
    undefined
  ) {
    await Promise.all([
      inventory.save(),
      product.save(),
    ]);
  } else {
    await inventory.save();
  }

  const currentSummary =
    getVariantSummary(
      inventory.variants ??
      [],
    );

  const currentStatus =
    inventory.isActive
      ? "active"
      : "inactive";

  let description =
    `Atualizou o estoque do produto "${product.name}".`;

  if (
    changedFields.length ===
      1 &&
    changedFields[0] ===
      "isActive"
  ) {
    description =
      inventory.isActive
        ? `Ativou o produto "${product.name}" no estoque.`
        : `Desativou o produto "${product.name}" no estoque.`;
  }

  await recordAuditLog({
    request,
    userId,

    action:
      "update",

    resource:
      "product",

    resourceId:
      product
        ._id
        .toString(),

    description,

    metadata: {
      source:
        "inventory",

      changedFields,

      previousStatus,

      currentStatus,

      variantCount:
        currentSummary.variantCount,

      totalQuantity:
        currentSummary.totalQuantity,

      lowStockVariants:
        currentSummary.lowStockVariants,

      outOfStockVariants:
        currentSummary.outOfStockVariants,
    },
  });

  response
    .status(200)
    .json({
      message:
        "Estoque atualizado com sucesso.",

      inventoryItem:
        serializeInventory(
          inventory,
          product,
        ),
    });
}