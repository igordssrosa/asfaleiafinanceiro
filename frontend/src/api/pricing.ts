import { apiFetch } from "./api";

import type {
  CalculatePricingResponse,
  ListPricingResponse,
  PricingInput,
  SavePricingResponse,
} from "../types/pricing";

export async function calculatePricingRequest(
  input: PricingInput,
): Promise<CalculatePricingResponse> {
  return apiFetch<CalculatePricingResponse>(
    "/pricing-calculations/calculate",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function savePricingRequest(
  input: PricingInput,
): Promise<SavePricingResponse> {
  return apiFetch<SavePricingResponse>(
    "/pricing-calculations",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function listPricingRequest(
  page = 1,
  limit = 50,
): Promise<ListPricingResponse> {
  const searchParams =
    new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

  return apiFetch<ListPricingResponse>(
    `/pricing-calculations?${searchParams.toString()}`,
    {
      method: "GET",
    },
  );
}