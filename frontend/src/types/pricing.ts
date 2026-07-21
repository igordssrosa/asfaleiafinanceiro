export type PricingCosts = {
  productCost: number;
  packagingCost: number;
  operationalCost: number;
  shippingSubsidy: number;
  otherCost: number;
};

export type PricingRates = {
  paymentFeePercent: number;
  marketplaceFeePercent: number;
  taxPercent: number;
  targetMarginPercent: number;
  discountPercent: number;
};

export type PricingInput = {
  name: string;
  productName: string;
  costs: PricingCosts;
  rates: PricingRates;
};

export type PricingResult = {
  totalFixedCost: number;
  totalVariableRatePercent: number;
  targetSalePrice: number;
  suggestedListPrice: number;
  discountedSalePrice: number;
  expectedVariableCosts: number;
  expectedProfit: number;
  achievedMarginPercent: number;
};

export type PricingCalculation = {
  id: string;
  name: string;
  productName: string;
  costs: PricingCosts;
  rates: PricingRates;
  result: PricingResult;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CalculatePricingResponse = {
  result: PricingResult;
};

export type SavePricingResponse = {
  message: string;
  calculation: PricingCalculation;
};

export type ListPricingResponse = {
  calculations: PricingCalculation[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};