import type {
  Request,
  Response,
} from "express";

import { Types } from "mongoose";
import { z } from "zod";

import {
  PricingCalculationModel,
  type IPricingCalculation,
} from "../models/PricingCalculation.js";

const moneySchema = z
  .union([
    z.number(),
    z.string().trim(),
  ])
  .transform((value) => Number(value))
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
          Math.round(value * 100),
      ) < 0.000001,
    "O valor deve possuir no máximo duas casas decimais.",
  );

const percentageSchema = z
  .union([
    z.number(),
    z.string().trim(),
  ])
  .transform((value) => Number(value))
  .refine(
    (value) =>
      Number.isFinite(value) &&
      value >= 0,
    "O percentual não pode ser negativo.",
  )
  .refine(
    (value) => value <= 100,
    "O percentual não pode ser maior que 100.",
  );

const pricingInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(
        2,
        "Informe um nome para o cálculo.",
      )
      .max(120),

    productName: z
      .string()
      .trim()
      .min(
        2,
        "Informe o nome do produto.",
      )
      .max(120),

    costs: z.object({
      productCost: moneySchema,
      packagingCost: moneySchema,
      operationalCost: moneySchema,
      shippingSubsidy: moneySchema,
      otherCost: moneySchema,
    }),

    rates: z.object({
      paymentFeePercent:
        percentageSchema,

      marketplaceFeePercent:
        percentageSchema,

      taxPercent:
        percentageSchema,

      targetMarginPercent:
        percentageSchema,

      discountPercent:
        percentageSchema.refine(
          (value) => value < 100,
          "O desconto deve ser menor que 100%.",
        ),
    }),
  })
  .superRefine((data, context) => {
    const totalCosts =
      data.costs.productCost +
      data.costs.packagingCost +
      data.costs.operationalCost +
      data.costs.shippingSubsidy +
      data.costs.otherCost;

    if (totalCosts <= 0) {
      context.addIssue({
        code: "custom",
        path: ["costs"],
        message:
          "Informe pelo menos um custo maior que zero.",
      });
    }

    const totalVariableRate =
      data.rates.paymentFeePercent +
      data.rates.marketplaceFeePercent +
      data.rates.taxPercent;

    const totalRateWithMargin =
      totalVariableRate +
      data.rates.targetMarginPercent;

    if (totalRateWithMargin >= 100) {
      context.addIssue({
        code: "custom",
        path: ["rates"],
        message:
          "A soma das taxas com a margem deve ser menor que 100%.",
      });
    }
  });

const listPricingSchema = z.object({
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

type PricingInput =
  z.infer<typeof pricingInputSchema>;

type PricingCalculationWithId =
  IPricingCalculation & {
    _id: Types.ObjectId;
  };

type CalculatedPricing = {
  storedCosts: {
    productCostCents: number;
    packagingCostCents: number;
    operationalCostCents: number;
    shippingSubsidyCents: number;
    otherCostCents: number;
  };

  storedRates: {
    paymentFeePercent: number;
    marketplaceFeePercent: number;
    taxPercent: number;
    targetMarginPercent: number;
    discountPercent: number;
  };

  storedResult: {
    totalFixedCostCents: number;
    totalVariableRatePercent: number;
    targetSalePriceCents: number;
    suggestedListPriceCents: number;
    discountedSalePriceCents: number;
    expectedVariableCostsCents: number;
    expectedProfitCents: number;
    achievedMarginPercent: number;
  };
};

function getAuthenticatedUserId(
  request: Request,
): Types.ObjectId | null {
  const userId = request.auth?.userId;

  if (
    !userId ||
    !Types.ObjectId.isValid(userId)
  ) {
    return null;
  }

  return new Types.ObjectId(userId);
}

function toCents(
  value: number,
): number {
  return Math.round(value * 100);
}

function fromCents(
  value: number,
): number {
  return value / 100;
}

function roundPercentage(
  value: number,
): number {
  return Math.round(value * 100) / 100;
}

function calculatePricing(
  input: PricingInput,
): CalculatedPricing {
  const productCostCents =
    toCents(input.costs.productCost);

  const packagingCostCents =
    toCents(input.costs.packagingCost);

  const operationalCostCents =
    toCents(input.costs.operationalCost);

  const shippingSubsidyCents =
    toCents(input.costs.shippingSubsidy);

  const otherCostCents =
    toCents(input.costs.otherCost);

  const totalFixedCostCents =
    productCostCents +
    packagingCostCents +
    operationalCostCents +
    shippingSubsidyCents +
    otherCostCents;

  const totalVariableRatePercent =
    input.rates.paymentFeePercent +
    input.rates.marketplaceFeePercent +
    input.rates.taxPercent;

  const totalVariableRate =
    totalVariableRatePercent / 100;

  const targetMarginRate =
    input.rates.targetMarginPercent / 100;

  const discountRate =
    input.rates.discountPercent / 100;

  const salePriceDenominator =
    1 -
    totalVariableRate -
    targetMarginRate;

  const targetSalePriceCents =
    Math.ceil(
      totalFixedCostCents /
        salePriceDenominator,
    );

  const suggestedListPriceCents =
    Math.ceil(
      targetSalePriceCents /
        (1 - discountRate),
    );

  const discountedSalePriceCents =
    Math.round(
      suggestedListPriceCents *
        (1 - discountRate),
    );

  const expectedVariableCostsCents =
    Math.round(
      discountedSalePriceCents *
        totalVariableRate,
    );

  const expectedProfitCents =
    discountedSalePriceCents -
    totalFixedCostCents -
    expectedVariableCostsCents;

  const achievedMarginPercent =
    discountedSalePriceCents > 0
      ? roundPercentage(
          (
            expectedProfitCents /
            discountedSalePriceCents
          ) * 100,
        )
      : 0;

  return {
    storedCosts: {
      productCostCents,
      packagingCostCents,
      operationalCostCents,
      shippingSubsidyCents,
      otherCostCents,
    },

    storedRates: {
      paymentFeePercent:
        input.rates.paymentFeePercent,

      marketplaceFeePercent:
        input.rates.marketplaceFeePercent,

      taxPercent:
        input.rates.taxPercent,

      targetMarginPercent:
        input.rates.targetMarginPercent,

      discountPercent:
        input.rates.discountPercent,
    },

    storedResult: {
      totalFixedCostCents,
      totalVariableRatePercent:
        roundPercentage(
          totalVariableRatePercent,
        ),

      targetSalePriceCents,
      suggestedListPriceCents,
      discountedSalePriceCents,
      expectedVariableCostsCents,
      expectedProfitCents,
      achievedMarginPercent,
    },
  };
}

function serializeResult(
  calculation: CalculatedPricing,
) {
  return {
    totalFixedCost:
      fromCents(
        calculation
          .storedResult
          .totalFixedCostCents,
      ),

    totalVariableRatePercent:
      calculation
        .storedResult
        .totalVariableRatePercent,

    targetSalePrice:
      fromCents(
        calculation
          .storedResult
          .targetSalePriceCents,
      ),

    suggestedListPrice:
      fromCents(
        calculation
          .storedResult
          .suggestedListPriceCents,
      ),

    discountedSalePrice:
      fromCents(
        calculation
          .storedResult
          .discountedSalePriceCents,
      ),

    expectedVariableCosts:
      fromCents(
        calculation
          .storedResult
          .expectedVariableCostsCents,
      ),

    expectedProfit:
      fromCents(
        calculation
          .storedResult
          .expectedProfitCents,
      ),

    achievedMarginPercent:
      calculation
        .storedResult
        .achievedMarginPercent,
  };
}

function serializePricingCalculation(
  calculation:
    PricingCalculationWithId,
) {
  return {
    id:
      calculation._id.toString(),

    name:
      calculation.name,

    productName:
      calculation.productName,

    costs: {
      productCost:
        fromCents(
          calculation
            .costs
            .productCostCents,
        ),

      packagingCost:
        fromCents(
          calculation
            .costs
            .packagingCostCents,
        ),

      operationalCost:
        fromCents(
          calculation
            .costs
            .operationalCostCents,
        ),

      shippingSubsidy:
        fromCents(
          calculation
            .costs
            .shippingSubsidyCents,
        ),

      otherCost:
        fromCents(
          calculation
            .costs
            .otherCostCents,
        ),
    },

    rates:
      calculation.rates,

    result: {
      totalFixedCost:
        fromCents(
          calculation
            .result
            .totalFixedCostCents,
        ),

      totalVariableRatePercent:
        calculation
          .result
          .totalVariableRatePercent,

      targetSalePrice:
        fromCents(
          calculation
            .result
            .targetSalePriceCents,
        ),

      suggestedListPrice:
        fromCents(
          calculation
            .result
            .suggestedListPriceCents,
        ),

      discountedSalePrice:
        fromCents(
          calculation
            .result
            .discountedSalePriceCents,
        ),

      expectedVariableCosts:
        fromCents(
          calculation
            .result
            .expectedVariableCostsCents,
        ),

      expectedProfit:
        fromCents(
          calculation
            .result
            .expectedProfitCents,
        ),

      achievedMarginPercent:
        calculation
          .result
          .achievedMarginPercent,
    },

    createdBy:
      calculation
        .createdBy
        .toString(),

    updatedBy:
      calculation
        .updatedBy
        .toString(),

    createdAt:
      calculation.createdAt,

    updatedAt:
      calculation.updatedAt,
  };
}

export async function calculatePrice(
  request: Request,
  response: Response,
): Promise<void> {
  const parsedBody =
    pricingInputSchema.safeParse(
      request.body,
    );

  if (!parsedBody.success) {
    response.status(400).json({
      message:
        "Dados da precificação inválidos.",

      errors:
        parsedBody.error
          .flatten()
          .fieldErrors,
    });

    return;
  }

  const calculation =
    calculatePricing(
      parsedBody.data,
    );

  response.status(200).json({
    result:
      serializeResult(calculation),
  });
}

export async function createPricingCalculation(
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

  const parsedBody =
    pricingInputSchema.safeParse(
      request.body,
    );

  if (!parsedBody.success) {
    response.status(400).json({
      message:
        "Dados da precificação inválidos.",

      errors:
        parsedBody.error
          .flatten()
          .fieldErrors,
    });

    return;
  }

  const input =
    parsedBody.data;

  const calculation =
    calculatePricing(input);

  const savedCalculation =
    await PricingCalculationModel.create({
      name:
        input.name.trim(),

      productName:
        input.productName.trim(),

      costs:
        calculation.storedCosts,

      rates:
        calculation.storedRates,

      result:
        calculation.storedResult,

      createdBy:
        userId,

      updatedBy:
        userId,
    });

  response.status(201).json({
    message:
      "Precificação salva com sucesso.",

    calculation:
      serializePricingCalculation(
        savedCalculation,
      ),
  });
}

export async function listPricingCalculations(
  request: Request,
  response: Response,
): Promise<void> {
  const parsedQuery =
    listPricingSchema.safeParse(
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
    page,
    limit,
  } = parsedQuery.data;

  const skip =
    (page - 1) * limit;

  const [
    calculations,
    total,
  ] = await Promise.all([
    PricingCalculationModel
      .find()
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit),

    PricingCalculationModel
      .countDocuments(),
  ]);

  response.status(200).json({
    calculations:
      calculations.map(
        (calculation) =>
          serializePricingCalculation(
            calculation,
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