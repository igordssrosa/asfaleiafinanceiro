import { apiFetch } from "./api";

import type {
  CalculatePricingResponse,
  ListPricingResponse,
  PricingInput,
  SavePricingResponse,
  PricingCalculation,
  PricingMessageResponse,
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

export async function deletePricingCalculationRequest(
  id: string,
): Promise<PricingMessageResponse> {
  return apiFetch<PricingMessageResponse>(
    `/pricing-calculations/${id}`,
    {
      method: "DELETE",
    },
  );
}

export async function listDeletedPricingCalculationsRequest(
  page = 1,
  limit = 100,
): Promise<ListPricingResponse> {
  const searchParams =
    new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

  return apiFetch<ListPricingResponse>(
    `/pricing-calculations/trash?${searchParams.toString()}`,
    {
      method: "GET",
    },
  );
}

export async function restorePricingCalculationRequest(
  id: string,
): Promise<{
  message: string;
  calculation: PricingCalculation;
}> {
  return apiFetch<{
    message: string;
    calculation: PricingCalculation;
  }>(
    `/pricing-calculations/${id}/restore`,
    {
      method: "POST",
    },
  );
}

export async function permanentlyDeletePricingCalculationRequest(
  id: string,
): Promise<PricingMessageResponse> {
  return apiFetch<PricingMessageResponse>(
    `/pricing-calculations/${id}/permanent`,
    {
      method: "DELETE",
    },
  );
}