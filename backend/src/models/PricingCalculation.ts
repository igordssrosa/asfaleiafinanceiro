import {
  model,
  Schema,
  Types,
} from "mongoose";

export interface IPricingCosts {
  productCostCents: number;
  packagingCostCents: number;
  operationalCostCents: number;
  shippingSubsidyCents: number;
  otherCostCents: number;
}

export interface IPricingRates {
  paymentFeePercent: number;
  marketplaceFeePercent: number;
  taxPercent: number;
  targetMarginPercent: number;
  discountPercent: number;
}

export interface IPricingResult {
  totalFixedCostCents: number;
  totalVariableRatePercent: number;
  targetSalePriceCents: number;
  suggestedListPriceCents: number;
  discountedSalePriceCents: number;
  expectedVariableCostsCents: number;
  expectedProfitCents: number;
  achievedMarginPercent: number;
}

export interface IPricingCalculation {
  name: string;
  productName: string;

  costs: IPricingCosts;
  rates: IPricingRates;
  result: IPricingResult;

  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const pricingCostsSchema =
  new Schema<IPricingCosts>(
    {
      productCostCents: {
        type: Number,
        required: true,
        min: 0,
      },

      packagingCostCents: {
        type: Number,
        required: true,
        min: 0,
      },

      operationalCostCents: {
        type: Number,
        required: true,
        min: 0,
      },

      shippingSubsidyCents: {
        type: Number,
        required: true,
        min: 0,
      },

      otherCostCents: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    {
      _id: false,
    },
  );

const pricingRatesSchema =
  new Schema<IPricingRates>(
    {
      paymentFeePercent: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },

      marketplaceFeePercent: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },

      taxPercent: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },

      targetMarginPercent: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },

      discountPercent: {
        type: Number,
        required: true,
        min: 0,
        max: 99.99,
      },
    },
    {
      _id: false,
    },
  );

const pricingResultSchema =
  new Schema<IPricingResult>(
    {
      totalFixedCostCents: {
        type: Number,
        required: true,
        min: 0,
      },

      totalVariableRatePercent: {
        type: Number,
        required: true,
        min: 0,
      },

      targetSalePriceCents: {
        type: Number,
        required: true,
        min: 0,
      },

      suggestedListPriceCents: {
        type: Number,
        required: true,
        min: 0,
      },

      discountedSalePriceCents: {
        type: Number,
        required: true,
        min: 0,
      },

      expectedVariableCostsCents: {
        type: Number,
        required: true,
        min: 0,
      },

      expectedProfitCents: {
        type: Number,
        required: true,
      },

      achievedMarginPercent: {
        type: Number,
        required: true,
      },
    },
    {
      _id: false,
    },
  );

const pricingCalculationSchema =
  new Schema<IPricingCalculation>(
    {
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
      },

      productName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
      },

      costs: {
        type: pricingCostsSchema,
        required: true,
      },

      rates: {
        type: pricingRatesSchema,
        required: true,
      },

      result: {
        type: pricingResultSchema,
        required: true,
      },

      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    },
    {
      timestamps: true,
      collection: "pricing_calculations",
    },
  );

pricingCalculationSchema.index({
  createdAt: -1,
});

pricingCalculationSchema.index({
  productName: 1,
});

export const PricingCalculationModel =
  model<IPricingCalculation>(
    "PricingCalculation",
    pricingCalculationSchema,
  );