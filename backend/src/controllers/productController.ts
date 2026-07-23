import type {
  Request,
  Response,
} from "express";

import {
  Types,
} from "mongoose";

import {
  z,
} from "zod";

import {
  ProductModel,
  type IProduct,
} from "../models/Product.js";

import {
  recordAuditLog,
} from "../services/auditLogService.js";

type ProductWithId =
  IProduct & {
    _id: Types.ObjectId;
  };

const moneySchema = z
  .union([
    z.number(),
    z.string().trim(),
  ])
  .transform(
    (value) =>
      Number(value),
  )
  .refine(
    (value) =>
      Number.isFinite(value) &&
      value >= 0,
    "O valor não pode ser negativo.",
  )
  .refine(
    (value) =>
      value <= 100_000_000,
    "O valor informado é muito alto.",
  )
  .refine(
    (value) =>
      Math.abs(
        value * 100 -
          Math.round(
            value * 100,
          ),
      ) < 0.000001,
    "O valor deve possuir no máximo duas casas decimais.",
  );

const productStatusSchema =
  z.enum([
    "active",
    "inactive",
  ]);

const productSchema =
  z.object({
    name: z
      .string()
      .trim()
      .min(
        2,
        "Informe o nome do produto.",
      )
      .max(120),

    sku: z
      .string()
      .trim()
      .max(50)
      .optional()
      .nullable(),

    category: z
      .string()
      .trim()
      .min(
        2,
        "Informe a categoria.",
      )
      .max(60),

    description: z
      .string()
      .trim()
      .max(500)
      .optional()
      .nullable(),

    unitCost:
      moneySchema,

    salePrice:
      moneySchema,

    status:
      productStatusSchema.default(
        "active",
      ),

    notes: z
      .string()
      .trim()
      .max(500)
      .optional()
      .nullable(),
  });

const updateProductSchema =
  productSchema
    .partial()
    .refine(
      (data) =>
        Object.keys(data).length >
        0,
      "Informe pelo menos um campo para alteração.",
    );

const listProductsSchema =
  z.object({
    search: z
      .string()
      .trim()
      .max(120)
      .optional(),

    category: z
      .string()
      .trim()
      .max(60)
      .optional(),

    status:
      productStatusSchema.optional(),

    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20),
  });

const listTrashSchema =
  z.object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
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

function getRouteId(
  request: Request,
): string | null {
  const routeId =
    request.params.id;

  if (
    typeof routeId ===
    "string"
  ) {
    return routeId;
  }

  if (
    Array.isArray(routeId)
  ) {
    return (
      routeId[0] ??
      null
    );
  }

  return null;
}

function normalizeSku(
  sku:
    | string
    | null
    | undefined,
): string | null {
  const normalized =
    sku
      ?.trim()
      .toUpperCase();

  return (
    normalized ||
    null
  );
}

function toCents(
  value: number,
): number {
  return Math.round(
    value * 100,
  );
}

function serializeProduct(
  product: ProductWithId,
) {
  return {
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

    description:
      product.description,

    unitCost:
      product.unitCostCents /
      100,

    salePrice:
      product.salePriceCents /
      100,

    status:
      product.status,

    notes:
      product.notes,

    createdBy:
      product
        .createdBy
        .toString(),

    updatedBy:
      product
        .updatedBy
        .toString(),

    deletedAt:
      product.deletedAt,

    deletedBy:
      product.deletedBy
        ?.toString() ??
      null,

    createdAt:
      product.createdAt,

    updatedAt:
      product.updatedAt,
  };
}

function isDuplicateKeyError(
  error: unknown,
): boolean {
  if (
    typeof error !==
      "object" ||
    error === null ||
    !("code" in error)
  ) {
    return false;
  }

  return (
    (
      error as {
        code?: unknown;
      }
    ).code === 11000
  );
}

function escapeRegularExpression(
  value: string,
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

export async function createProduct(
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

  const parsedBody =
    productSchema.safeParse(
      request.body,
    );

  if (
    !parsedBody.success
  ) {
    response
      .status(400)
      .json({
        message:
          "Dados do produto inválidos.",

        errors:
          parsedBody.error
            .flatten()
            .fieldErrors,
      });

    return;
  }

  const data =
    parsedBody.data;

  try {
    const product =
      await ProductModel.create({
        name:
          data.name.trim(),

        sku:
          normalizeSku(
            data.sku,
          ),

        category:
          data.category.trim(),

        description:
          data.description
            ?.trim() ||
          null,

        unitCostCents:
          toCents(
            data.unitCost,
          ),

        salePriceCents:
          toCents(
            data.salePrice,
          ),

        status:
          data.status,

        notes:
          data.notes?.trim() ||
          null,

        createdBy:
          userId,

        updatedBy:
          userId,

        deletedAt:
          null,

        deletedBy:
          null,
      });

    await recordAuditLog({
      request,
      userId,

      action:
        "create",

      resource:
        "product",

      resourceId:
        product
          ._id
          .toString(),

      description:
        `Criou o produto "${product.name}".`,

      metadata: {
        name:
          product.name,

        sku:
          product.sku,

        category:
          product.category,

        unitCost:
          product.unitCostCents /
          100,

        salePrice:
          product.salePriceCents /
          100,

        status:
          product.status,
      },
    });

    response
      .status(201)
      .json({
        message:
          "Produto cadastrado com sucesso.",

        product:
          serializeProduct(
            product,
          ),
      });
  } catch (error) {
    if (
      isDuplicateKeyError(
        error,
      )
    ) {
      response
        .status(409)
        .json({
          message:
            "Já existe um produto com esse SKU.",
        });

      return;
    }

    throw error;
  }
}

export async function listProducts(
  request: Request,
  response: Response,
): Promise<void> {
  const parsedQuery =
    listProductsSchema.safeParse(
      request.query,
    );

  if (
    !parsedQuery.success
  ) {
    response
      .status(400)
      .json({
        message:
          "Filtros inválidos.",

        errors:
          parsedQuery.error
            .flatten()
            .fieldErrors,
      });

    return;
  }

  const {
    search,
    category,
    status,
    page,
    limit,
  } = parsedQuery.data;

  const filter:
    Record<
      string,
      unknown
    > = {
      deletedAt:
        null,
    };

  if (category) {
    filter.category =
      category;
  }

  if (status) {
    filter.status =
      status;
  }

  if (search) {
    const expression =
      new RegExp(
        escapeRegularExpression(
          search,
        ),
        "i",
      );

    filter.$or = [
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

  const skip =
    (page - 1) *
    limit;

  const [
    products,
    total,
  ] = await Promise.all([
    ProductModel
      .find(filter)
      .sort({
        createdAt:
          -1,
      })
      .skip(skip)
      .limit(limit),

    ProductModel
      .countDocuments(
        filter,
      ),
  ]);

  response
    .status(200)
    .json({
      products:
        products.map(
          (product) =>
            serializeProduct(
              product,
            ),
        ),

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

export async function updateProduct(
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

  const id =
    getRouteId(
      request,
    );

  if (
    !id ||
    !Types.ObjectId.isValid(
      id,
    )
  ) {
    response
      .status(400)
      .json({
        message:
          "Identificador inválido.",
      });

    return;
  }

  const parsedBody =
    updateProductSchema.safeParse(
      request.body,
    );

  if (
    !parsedBody.success
  ) {
    response
      .status(400)
      .json({
        message:
          "Dados de alteração inválidos.",

        errors:
          parsedBody.error
            .flatten()
            .fieldErrors,
      });

    return;
  }

  const data =
    parsedBody.data;

  const updateData:
    Record<
      string,
      unknown
    > = {
      updatedBy:
        userId,
    };

  if (
    data.name !==
    undefined
  ) {
    updateData.name =
      data.name.trim();
  }

  if (
    data.sku !==
    undefined
  ) {
    updateData.sku =
      normalizeSku(
        data.sku,
      );
  }

  if (
    data.category !==
    undefined
  ) {
    updateData.category =
      data.category.trim();
  }

  if (
    data.description !==
    undefined
  ) {
    updateData.description =
      data.description
        ?.trim() ||
      null;
  }

  if (
    data.unitCost !==
    undefined
  ) {
    updateData.unitCostCents =
      toCents(
        data.unitCost,
      );
  }

  if (
    data.salePrice !==
    undefined
  ) {
    updateData.salePriceCents =
      toCents(
        data.salePrice,
      );
  }

  if (
    data.status !==
    undefined
  ) {
    updateData.status =
      data.status;
  }

  if (
    data.notes !==
    undefined
  ) {
    updateData.notes =
      data.notes
        ?.trim() ||
      null;
  }

  try {
    const product =
      await ProductModel
        .findOneAndUpdate(
          {
            _id:
              id,

            deletedAt:
              null,
          },

          {
            $set:
              updateData,
          },

          {
            returnDocument:
              "after",

            runValidators:
              true,
          },
        );

    if (!product) {
      response
        .status(404)
        .json({
          message:
            "Produto não encontrado.",
        });

      return;
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

      description:
        `Atualizou o produto "${product.name}".`,

      metadata: {
        changedFields:
          Object.keys(
            data,
          ),

        currentValues: {
          name:
            product.name,

          sku:
            product.sku,

          category:
            product.category,

          description:
            product.description,

          unitCost:
            product.unitCostCents /
            100,

          salePrice:
            product.salePriceCents /
            100,

          status:
            product.status,

          notes:
            product.notes,
        },
      },
    });

    response
      .status(200)
      .json({
        message:
          "Produto atualizado com sucesso.",

        product:
          serializeProduct(
            product,
          ),
      });
  } catch (error) {
    if (
      isDuplicateKeyError(
        error,
      )
    ) {
      response
        .status(409)
        .json({
          message:
            "Já existe um produto com esse SKU.",
        });

      return;
    }

    throw error;
  }
}

export async function deleteProduct(
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

  const id =
    getRouteId(
      request,
    );

  if (
    !id ||
    !Types.ObjectId.isValid(
      id,
    )
  ) {
    response
      .status(400)
      .json({
        message:
          "Identificador inválido.",
      });

    return;
  }

  const product =
    await ProductModel
      .findOneAndUpdate(
        {
          _id:
            id,

          deletedAt:
            null,
        },

        {
          $set: {
            deletedAt:
              new Date(),

            deletedBy:
              userId,

            updatedBy:
              userId,
          },
        },

        {
          returnDocument:
            "after",
        },
      );

  if (!product) {
    response
      .status(404)
      .json({
        message:
          "Produto não encontrado.",
      });

    return;
  }

  await recordAuditLog({
    request,
    userId,

    action:
      "move_to_trash",

    resource:
      "product",

    resourceId:
      product
        ._id
        .toString(),

    description:
      `Enviou o produto "${product.name}" para a lixeira.`,

    metadata: {
      name:
        product.name,

      sku:
        product.sku,

      category:
        product.category,

      unitCost:
        product.unitCostCents /
        100,

      salePrice:
        product.salePriceCents /
        100,

      status:
        product.status,
    },
  });

  response
    .status(200)
    .json({
      message:
        "Produto enviado para a lixeira.",
    });
}

export async function listDeletedProducts(
  request: Request,
  response: Response,
): Promise<void> {
  const parsedQuery =
    listTrashSchema.safeParse(
      request.query,
    );

  if (
    !parsedQuery.success
  ) {
    response
      .status(400)
      .json({
        message:
          "Filtros da lixeira inválidos.",

        errors:
          parsedQuery.error
            .flatten()
            .fieldErrors,
      });

    return;
  }

  const {
    page,
    limit,
  } = parsedQuery.data;

  const skip =
    (page - 1) *
    limit;

  const filter = {
    deletedAt: {
      $ne:
        null,
    },
  };

  const [
    products,
    total,
  ] = await Promise.all([
    ProductModel
      .find(filter)
      .sort({
        deletedAt:
          -1,
      })
      .skip(skip)
      .limit(limit),

    ProductModel
      .countDocuments(
        filter,
      ),
  ]);

  response
    .status(200)
    .json({
      products:
        products.map(
          (product) =>
            serializeProduct(
              product,
            ),
        ),

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

export async function restoreProduct(
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

  const id =
    getRouteId(
      request,
    );

  if (
    !id ||
    !Types.ObjectId.isValid(
      id,
    )
  ) {
    response
      .status(400)
      .json({
        message:
          "Identificador inválido.",
      });

    return;
  }

  const product =
    await ProductModel
      .findOneAndUpdate(
        {
          _id:
            id,

          deletedAt: {
            $ne:
              null,
          },
        },

        {
          $set: {
            deletedAt:
              null,

            deletedBy:
              null,

            updatedBy:
              userId,
          },
        },

        {
          returnDocument:
            "after",
        },
      );

  if (!product) {
    response
      .status(404)
      .json({
        message:
          "Produto excluído não encontrado.",
      });

    return;
  }

  await recordAuditLog({
    request,
    userId,

    action:
      "restore",

    resource:
      "product",

    resourceId:
      product
        ._id
        .toString(),

    description:
      `Restaurou o produto "${product.name}".`,

    metadata: {
      name:
        product.name,

      sku:
        product.sku,

      category:
        product.category,

      unitCost:
        product.unitCostCents /
        100,

      salePrice:
        product.salePriceCents /
        100,

      status:
        product.status,
    },
  });

  response
    .status(200)
    .json({
      message:
        "Produto restaurado com sucesso.",

      product:
        serializeProduct(
          product,
        ),
    });
}

export async function permanentlyDeleteProduct(
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

  const id =
    getRouteId(
      request,
    );

  if (
    !id ||
    !Types.ObjectId.isValid(
      id,
    )
  ) {
    response
      .status(400)
      .json({
        message:
          "Identificador inválido.",
      });

    return;
  }

  const product =
    await ProductModel
      .findOneAndDelete({
        _id:
          id,

        deletedAt: {
          $ne:
            null,
        },
      });

  if (!product) {
    response
      .status(404)
      .json({
        message:
          "Produto excluído não encontrado.",
      });

    return;
  }

  /*
   * O documento retornado pelo MongoDB ainda
   * contém os dados necessários para o log,
   * mesmo após a exclusão definitiva.
   */
  await recordAuditLog({
    request,
    userId,

    action:
      "permanent_delete",

    resource:
      "product",

    resourceId:
      product
        ._id
        .toString(),

    description:
      `Excluiu permanentemente o produto "${product.name}".`,

    metadata: {
      name:
        product.name,

      sku:
        product.sku,

      category:
        product.category,

      unitCost:
        product.unitCostCents /
        100,

      salePrice:
        product.salePriceCents /
        100,

      status:
        product.status,
    },
  });

  response
    .status(200)
    .json({
      message:
        "Produto excluído permanentemente.",
    });
}