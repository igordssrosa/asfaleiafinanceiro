import type {
  Request,
  Response,
} from "express";

import { Types } from "mongoose";
import { z } from "zod";

import {
  TransactionModel,
  type ITransaction,
} from "../models/Transaction.js";


type TransactionFilter = {
  deletedAt: null;

  date?: {
    $gte: string;
    $lte: string;
  };

  type?: ITransaction["type"];
  status?: ITransaction["status"];
  category?: string;
};

type TransactionWithId = ITransaction & {
  _id: Types.ObjectId;
};

const transactionTypeSchema = z.enum([
  "income",
  "expense",
]);

const transactionStatusSchema = z.enum([
  "completed",
  "pending",
]);

const paymentMethodSchema = z.enum([
  "pix",
  "credit_card",
  "debit_card",
  "bank_transfer",
  "cash",
  "boleto",
  "other",
]);

const moneySchema = z
  .union([
    z.number(),
    z.string().trim(),
  ])
  .transform((value) => Number(value))
  .refine(
    (value) =>
      Number.isFinite(value) &&
      value > 0,
    "O valor deve ser maior que zero.",
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
        Math.round(value * 100),
      ) < 0.000001,
    "O valor deve possuir no máximo duas casas decimais.",
  );

const dateSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "A data deve estar no formato AAAA-MM-DD.",
  )
  .refine((value) => {
    const [year, month, day] =
      value.split("-").map(Number);

    const date = new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "Data inválida.");

const monthSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}$/,
    "O mês deve estar no formato AAAA-MM.",
  )
  .refine((value) => {
    const month = Number(
      value.split("-")[1],
    );

    return (
      month >= 1 &&
      month <= 12
    );
  }, "Mês inválido.");

const createTransactionSchema = z.object({
  type: transactionTypeSchema,

  description: z
    .string()
    .trim()
    .min(
      2,
      "Informe uma descrição.",
    )
    .max(120),

  amount: moneySchema,

  category: z
    .string()
    .trim()
    .min(
      2,
      "Informe uma categoria.",
    )
    .max(60),

  date: dateSchema,

  paymentMethod:
    paymentMethodSchema,

  status:
    transactionStatusSchema.default(
      "completed",
    ),

  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable(),
});

const updateTransactionSchema =
  createTransactionSchema
    .partial()
    .refine(
      (data) =>
        Object.keys(data).length > 0,
      "Informe pelo menos um campo para alteração.",
    );

const listTransactionsSchema = z.object({
  month:
    monthSchema.optional(),

  type:
    transactionTypeSchema.optional(),

  status:
    transactionStatusSchema.optional(),

  category: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .optional(),

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

const listTrashSchema = z.object({
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

const summarySchema = z.object({
  month: monthSchema,
});

function serializeTransaction(
  transaction: TransactionWithId,
) {
  return {
    id:
      transaction._id.toString(),

    type:
      transaction.type,

    description:
      transaction.description,

    amount:
      transaction.amountCents / 100,

    category:
      transaction.category,

    date:
      transaction.date,

    paymentMethod:
      transaction.paymentMethod,

    status:
      transaction.status,

    notes:
      transaction.notes,

    createdBy:
      transaction.createdBy.toString(),

    updatedBy:
      transaction.updatedBy.toString(),

    deletedAt:
      transaction.deletedAt,

    deletedBy:
      transaction.deletedBy?.toString() ??
      null,

    createdAt:
      transaction.createdAt,

    updatedAt:
      transaction.updatedAt,
  };
}

function getAuthenticatedUserId(
  request: Request,
): Types.ObjectId | null {
  const userId =
    request.auth?.userId;

  if (
    !userId ||
    !Types.ObjectId.isValid(userId)
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
    typeof routeId === "string"
  ) {
    return routeId;
  }

  if (
    Array.isArray(routeId)
  ) {
    return routeId[0] ?? null;
  }

  return null;
}

export async function createTransaction(
  request: Request,
  response: Response,
): Promise<void> {
  const userId =
    getAuthenticatedUserId(
      request,
    );

  if (!userId) {
    response.status(401).json({
      message:
        "Autenticação necessária.",
    });

    return;
  }

  const parsedBody =
    createTransactionSchema.safeParse(
      request.body,
    );

  if (!parsedBody.success) {
    response.status(400).json({
      message:
        "Dados da movimentação inválidos.",

      errors:
        parsedBody.error
          .flatten()
          .fieldErrors,
    });

    return;
  }

  const data =
    parsedBody.data;

  const transaction =
    await TransactionModel.create({
      type:
        data.type,

      description:
        data.description.trim(),

      amountCents:
        Math.round(
          data.amount * 100,
        ),

      category:
        data.category.trim(),

      date:
        data.date,

      paymentMethod:
        data.paymentMethod,

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

  response.status(201).json({
    message:
      "Movimentação cadastrada com sucesso.",

    transaction:
      serializeTransaction(
        transaction,
      ),
  });
}

export async function listTransactions(
  request: Request,
  response: Response,
): Promise<void> {
  const parsedQuery =
    listTransactionsSchema.safeParse(
      request.query,
    );

  if (!parsedQuery.success) {
    response.status(400).json({
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
    month,
    type,
    status,
    category,
    page,
    limit,
  } = parsedQuery.data;

  const filter: TransactionFilter = {
    deletedAt: null,
  };

  if (month) {
    filter.date = {
      $gte:
        `${month}-01`,

      $lte:
        `${month}-31`,
    };
  }

  if (type) {
    filter.type =
      type;
  }

  if (status) {
    filter.status =
      status;
  }

  if (category) {
    filter.category =
      category;
  }

  const skip =
    (page - 1) * limit;

  const [
    transactions,
    total,
  ] = await Promise.all([
    TransactionModel
      .find(filter)
      .sort({
        date: -1,
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit),

    TransactionModel
      .countDocuments(
        filter,
      ),
  ]);

  response.status(200).json({
    transactions:
      transactions.map(
        (transaction) =>
          serializeTransaction(
            transaction,
          ),
      ),

    pagination: {
      page,
      limit,
      total,

      totalPages:
        Math.ceil(
          total / limit,
        ),
    },
  });
}

export async function getMonthlySummary(
  request: Request,
  response: Response,
): Promise<void> {
  const parsedQuery =
    summarySchema.safeParse(
      request.query,
    );

  if (!parsedQuery.success) {
    response.status(400).json({
      message:
        "Informe um mês válido.",

      errors:
        parsedQuery.error
          .flatten()
          .fieldErrors,
    });

    return;
  }

  const { month } =
    parsedQuery.data;

  const startDate =
    `${month}-01`;

  const endDate =
    `${month}-31`;

  const [summary] =
    await TransactionModel.aggregate([
      {
        $match: {
          deletedAt:
            null,

          date: {
            $gte:
              startDate,

            $lte:
              endDate,
          },
        },
      },

      {
        $group: {
          _id:
            null,

          completedIncomeCents: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $eq: [
                        "$type",
                        "income",
                      ],
                    },

                    {
                      $eq: [
                        "$status",
                        "completed",
                      ],
                    },
                  ],
                },

                "$amountCents",
                0,
              ],
            },
          },

          completedExpenseCents: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $eq: [
                        "$type",
                        "expense",
                      ],
                    },

                    {
                      $eq: [
                        "$status",
                        "completed",
                      ],
                    },
                  ],
                },

                "$amountCents",
                0,
              ],
            },
          },

          pendingIncomeCents: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $eq: [
                        "$type",
                        "income",
                      ],
                    },

                    {
                      $eq: [
                        "$status",
                        "pending",
                      ],
                    },
                  ],
                },

                "$amountCents",
                0,
              ],
            },
          },

          pendingExpenseCents: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $eq: [
                        "$type",
                        "expense",
                      ],
                    },

                    {
                      $eq: [
                        "$status",
                        "pending",
                      ],
                    },
                  ],
                },

                "$amountCents",
                0,
              ],
            },
          },

          transactionCount: {
            $sum:
              1,
          },
        },
      },
    ]);

  const completedIncomeCents =
    summary?.completedIncomeCents ??
    0;

  const completedExpenseCents =
    summary?.completedExpenseCents ??
    0;

  const pendingIncomeCents =
    summary?.pendingIncomeCents ??
    0;

  const pendingExpenseCents =
    summary?.pendingExpenseCents ??
    0;

  response.status(200).json({
    month,

    income:
      completedIncomeCents /
      100,

    expense:
      completedExpenseCents /
      100,

    balance:
      (
        completedIncomeCents -
        completedExpenseCents
      ) / 100,

    pendingIncome:
      pendingIncomeCents /
      100,

    pendingExpense:
      pendingExpenseCents /
      100,

    transactionCount:
      summary?.transactionCount ??
      0,
  });
}

export async function updateTransaction(
  request: Request,
  response: Response,
): Promise<void> {
  const userId =
    getAuthenticatedUserId(
      request,
    );

  if (!userId) {
    response.status(401).json({
      message:
        "Autenticação necessária.",
    });

    return;
  }

  const id =
    getRouteId(request);

  if (
    !id ||
    !Types.ObjectId.isValid(id)
  ) {
    response.status(400).json({
      message:
        "Identificador inválido.",
    });

    return;
  }

  const parsedBody =
    updateTransactionSchema.safeParse(
      request.body,
    );

  if (!parsedBody.success) {
    response.status(400).json({
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
    Record<string, unknown> = {
    updatedBy:
      userId,
  };

  if (
    data.type !== undefined
  ) {
    updateData.type =
      data.type;
  }

  if (
    data.description !== undefined
  ) {
    updateData.description =
      data.description.trim();
  }

  if (
    data.amount !== undefined
  ) {
    updateData.amountCents =
      Math.round(
        data.amount * 100,
      );
  }

  if (
    data.category !== undefined
  ) {
    updateData.category =
      data.category.trim();
  }

  if (
    data.date !== undefined
  ) {
    updateData.date =
      data.date;
  }

  if (
    data.paymentMethod !== undefined
  ) {
    updateData.paymentMethod =
      data.paymentMethod;
  }

  if (
    data.status !== undefined
  ) {
    updateData.status =
      data.status;
  }

  if (
    data.notes !== undefined
  ) {
    updateData.notes =
      data.notes?.trim() ||
      null;
  }

  const transaction =
    await TransactionModel
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

  if (!transaction) {
    response.status(404).json({
      message:
        "Movimentação não encontrada.",
    });

    return;
  }

  response.status(200).json({
    message:
      "Movimentação atualizada com sucesso.",

    transaction:
      serializeTransaction(
        transaction,
      ),
  });
}

export async function deleteTransaction(
  request: Request,
  response: Response,
): Promise<void> {
  const userId =
    getAuthenticatedUserId(
      request,
    );

  if (!userId) {
    response.status(401).json({
      message:
        "Autenticação necessária.",
    });

    return;
  }

  const id =
    getRouteId(request);

  if (
    !id ||
    !Types.ObjectId.isValid(id)
  ) {
    response.status(400).json({
      message:
        "Identificador inválido.",
    });

    return;
  }

  const transaction =
    await TransactionModel
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

  if (!transaction) {
    response.status(404).json({
      message:
        "Movimentação não encontrada.",
    });

    return;
  }

  response.status(200).json({
    message:
      "Movimentação enviada para a lixeira.",
  });
}

export async function restoreTransaction(
  request: Request,
  response: Response,
): Promise<void> {
  const userId =
    getAuthenticatedUserId(request);

  if (!userId) {
    response.status(401).json({
      message:
        "Autenticação necessária.",
    });

    return;
  }

  const id = getRouteId(request);

  if (
    !id ||
    !Types.ObjectId.isValid(id)
  ) {
    response.status(400).json({
      message:
        "Identificador inválido.",
    });

    return;
  }

  const transaction =
    await TransactionModel.findOneAndUpdate(
      {
        _id: id,

        deletedAt: {
          $ne: null,
        },
      },
      {
        $set: {
          deletedAt: null,
          deletedBy: null,
          updatedBy: userId,
        },
      },
      {
        returnDocument: "after",
      },
    );

  if (!transaction) {
    response.status(404).json({
      message:
        "Movimentação excluída não encontrada.",
    });

    return;
  }

  response.status(200).json({
    message:
      "Movimentação restaurada com sucesso.",

    transaction:
      serializeTransaction(transaction),
  });
}

export async function listDeletedTransactions(
  request: Request,
  response: Response,
): Promise<void> {
  const parsedQuery =
    listTrashSchema.safeParse(
      request.query,
    );

  if (!parsedQuery.success) {
    response.status(400).json({
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
    (page - 1) * limit;

  const filter = {
    deletedAt: {
      $ne: null,
    },
  };

  const [
    transactions,
    total,
  ] = await Promise.all([
    TransactionModel.find(filter)
      .sort({
        deletedAt: -1,
      })
      .skip(skip)
      .limit(limit),

    TransactionModel.countDocuments(
      filter,
    ),
  ]);

  response.status(200).json({
    transactions:
      transactions.map(
        (transaction) =>
          serializeTransaction(
            transaction,
          ),
      ),

    pagination: {
      page,
      limit,
      total,

      totalPages:
        Math.ceil(total / limit),
    },
  });
}