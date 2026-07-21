import type {
  Request,
  Response,
} from "express";

import { z } from "zod";

import {
  TransactionModel,
} from "../models/Transaction.js";

const monthSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}$/,
    "O mês deve estar no formato AAAA-MM.",
  )
  .refine((value) => {
    const [
      yearText,
      monthText,
    ] = value.split("-");

    const year = Number(yearText);
    const month = Number(monthText);

    return (
      Number.isInteger(year) &&
      year >= 2000 &&
      year <= 2100 &&
      Number.isInteger(month) &&
      month >= 1 &&
      month <= 12
    );
  }, "Mês inválido.");

const monthlyReportSchema = z.object({
  month: monthSchema,
});

const comparisonReportSchema = z.object({
  endMonth: monthSchema,

  months: z.coerce
    .number()
    .int()
    .min(2)
    .max(24)
    .default(6),
});

type MonthlySummaryRow = {
  _id: null;

  completedIncomeCents: number;
  completedExpenseCents: number;

  pendingIncomeCents: number;
  pendingExpenseCents: number;

  transactionCount: number;
  completedCount: number;
  pendingCount: number;
};

type CategoryAggregationRow = {
  _id: {
    type:
      | "income"
      | "expense";

    category: string;
  };

  amountCents: number;
  transactionCount: number;
};

type ComparisonAggregationRow = {
  _id: string;
  incomeCents: number;
  expenseCents: number;
  transactionCount: number;
};

function shiftMonth(
  monthValue: string,
  offset: number,
): string {
  const [
    yearText,
    monthText,
  ] = monthValue.split("-");

  const year = Number(yearText);
  const month = Number(monthText);

  const shiftedDate =
    new Date(
      Date.UTC(
        year,
        month - 1 + offset,
        1,
      ),
    );

  const shiftedYear =
    shiftedDate.getUTCFullYear();

  const shiftedMonth =
    String(
      shiftedDate.getUTCMonth() + 1,
    ).padStart(2, "0");

  return `${shiftedYear}-${shiftedMonth}`;
}

function getMonthRange(
  month: string,
): {
  startDate: string;
  endDateExclusive: string;
} {
  return {
    startDate:
      `${month}-01`,

    endDateExclusive:
      `${shiftMonth(month, 1)}-01`,
  };
}

function roundPercentage(
  value: number,
): number {
  return (
    Math.round(value * 100) /
    100
  );
}

function createCategoryResponse(
  rows: CategoryAggregationRow[],
  type:
    | "income"
    | "expense",
) {
  const typeRows =
    rows.filter(
      (row) =>
        row._id.type === type,
    );

  const totalCents =
    typeRows.reduce(
      (
        total,
        row,
      ) =>
        total +
        row.amountCents,
      0,
    );

  return typeRows.map((row) => ({
    category:
      row._id.category,

    amount:
      row.amountCents / 100,

    transactionCount:
      row.transactionCount,

    percentage:
      totalCents > 0
        ? roundPercentage(
            (
              row.amountCents /
              totalCents
            ) * 100,
          )
        : 0,
  }));
}

function transactionTypeLabel(
  type: string,
): string {
  return type === "income"
    ? "Receita"
    : "Despesa";
}

function transactionStatusLabel(
  status: string,
): string {
  return status === "completed"
    ? "Concluído"
    : "Pendente";
}

function paymentMethodLabel(
  paymentMethod: string,
): string {
  const labels:
    Record<string, string> = {
      pix: "Pix",

      credit_card:
        "Cartão de crédito",

      debit_card:
        "Cartão de débito",

      bank_transfer:
        "Transferência bancária",

      cash:
        "Dinheiro",

      boleto:
        "Boleto",

      other:
        "Outro",
    };

  return (
    labels[paymentMethod] ??
    paymentMethod
  );
}

function escapeCsvCell(
  value:
    | string
    | number
    | null
    | undefined,
): string {
  const normalizedValue =
    value === null ||
    value === undefined
      ? ""
      : String(value);

  return `"${normalizedValue.replace(
    /"/g,
    '""',
  )}"`;
}

function formatCsvMoney(
  amountCents: number,
): string {
  return (
    amountCents / 100
  )
    .toFixed(2)
    .replace(".", ",");
}

export async function getMonthlyReport(
  request: Request,
  response: Response,
): Promise<void> {
  const parsedQuery =
    monthlyReportSchema.safeParse(
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

  const {
    startDate,
    endDateExclusive,
  } = getMonthRange(month);

  const [
    summaryRows,
    categoryRows,
  ] = await Promise.all([
    TransactionModel
      .aggregate<MonthlySummaryRow>([
        {
          $match: {
            deletedAt: null,

            date: {
              $gte: startDate,
              $lt: endDateExclusive,
            },
          },
        },

        {
          $group: {
            _id: null,

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
              $sum: 1,
            },

            completedCount: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "completed",
                    ],
                  },

                  1,
                  0,
                ],
              },
            },

            pendingCount: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "pending",
                    ],
                  },

                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),

    TransactionModel
      .aggregate<CategoryAggregationRow>([
        {
          $match: {
            deletedAt: null,
            status: "completed",

            date: {
              $gte: startDate,
              $lt: endDateExclusive,
            },
          },
        },

        {
          $group: {
            _id: {
              type: "$type",

              category: {
                $ifNull: [
                  "$category",
                  "Sem categoria",
                ],
              },
            },

            amountCents: {
              $sum: "$amountCents",
            },

            transactionCount: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            amountCents: -1,
          },
        },
      ]),
  ]);

  const summary =
    summaryRows[0];

  const completedIncomeCents =
    summary
      ?.completedIncomeCents ??
    0;

  const completedExpenseCents =
    summary
      ?.completedExpenseCents ??
    0;

  response.status(200).json({
    month,

    summary: {
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
        (
          summary
            ?.pendingIncomeCents ??
          0
        ) / 100,

      pendingExpense:
        (
          summary
            ?.pendingExpenseCents ??
          0
        ) / 100,

      transactionCount:
        summary
          ?.transactionCount ??
        0,

      completedCount:
        summary
          ?.completedCount ??
        0,

      pendingCount:
        summary
          ?.pendingCount ??
        0,
    },

    categories: {
      income:
        createCategoryResponse(
          categoryRows,
          "income",
        ),

      expense:
        createCategoryResponse(
          categoryRows,
          "expense",
        ),
    },
  });
}

export async function getMonthlyComparison(
  request: Request,
  response: Response,
): Promise<void> {
  const parsedQuery =
    comparisonReportSchema.safeParse(
      request.query,
    );

  if (!parsedQuery.success) {
    response.status(400).json({
      message:
        "Filtros de comparação inválidos.",

      errors:
        parsedQuery.error
          .flatten()
          .fieldErrors,
    });

    return;
  }

  const {
    endMonth,
    months,
  } = parsedQuery.data;

  const monthList =
    Array.from(
      {
        length: months,
      },
      (
        _value,
        index,
      ) =>
        shiftMonth(
          endMonth,
          index -
            (months - 1),
        ),
    );

  const firstMonth =
    monthList[0];

  if (!firstMonth) {
    response.status(400).json({
      message:
        "Período inválido.",
    });

    return;
  }

  const startDate =
    `${firstMonth}-01`;

  const endDateExclusive =
    `${shiftMonth(endMonth, 1)}-01`;

  const rows =
    await TransactionModel
      .aggregate<ComparisonAggregationRow>([
        {
          $match: {
            deletedAt: null,
            status: "completed",

            date: {
              $gte: startDate,
              $lt: endDateExclusive,
            },
          },
        },

        {
          $group: {
            _id: {
              $substrBytes: [
                "$date",
                0,
                7,
              ],
            },

            incomeCents: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$type",
                      "income",
                    ],
                  },

                  "$amountCents",
                  0,
                ],
              },
            },

            expenseCents: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$type",
                      "expense",
                    ],
                  },

                  "$amountCents",
                  0,
                ],
              },
            },

            transactionCount: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            _id: 1,
          },
        },
      ]);

  const rowsByMonth =
    new Map(
      rows.map((row) => [
        row._id,
        row,
      ]),
    );

  const comparison =
    monthList.map((month) => {
      const row =
        rowsByMonth.get(month);

      const incomeCents =
        row?.incomeCents ?? 0;

      const expenseCents =
        row?.expenseCents ?? 0;

      return {
        month,

        income:
          incomeCents / 100,

        expense:
          expenseCents / 100,

        balance:
          (
            incomeCents -
            expenseCents
          ) / 100,

        transactionCount:
          row
            ?.transactionCount ??
          0,
      };
    });

  response.status(200).json({
    startMonth:
      firstMonth,

    endMonth,
    months:
      comparison,
  });
}

export async function exportMonthlyReportCsv(
  request: Request,
  response: Response,
): Promise<void> {
  const parsedQuery =
    monthlyReportSchema.safeParse(
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

  const {
    startDate,
    endDateExclusive,
  } = getMonthRange(month);

  const transactions =
    await TransactionModel.find({
      deletedAt: null,

      date: {
        $gte: startDate,
        $lt: endDateExclusive,
      },
    }).sort({
      date: 1,
      createdAt: 1,
    });

  const header = [
    "Data",
    "Tipo",
    "Descrição",
    "Categoria",
    "Forma de pagamento",
    "Status",
    "Valor",
    "Observações",
  ];

  const rows =
    transactions.map(
      (transaction) => [
        transaction.date,

        transactionTypeLabel(
          transaction.type,
        ),

        transaction.description,

        transaction.category,

        paymentMethodLabel(
          transaction.paymentMethod,
        ),

        transactionStatusLabel(
          transaction.status,
        ),

        formatCsvMoney(
          transaction.amountCents,
        ),

        transaction.notes ?? "",
      ],
    );

  const csvLines = [
    header
      .map(escapeCsvCell)
      .join(";"),

    ...rows.map((row) =>
      row
        .map(escapeCsvCell)
        .join(";"),
    ),
  ];

  const csv =
    csvLines.join("\r\n");

  response.setHeader(
    "Content-Type",
    "text/csv; charset=utf-8",
  );

  response.setHeader(
    "Content-Disposition",
    `attachment; filename="asfaleia-relatorio-${month}.csv"`,
  );

  /*
   * O BOM UTF-8 faz o Excel reconhecer
   * corretamente caracteres acentuados.
   */
  response
    .status(200)
    .send(`\uFEFF${csv}`);
}