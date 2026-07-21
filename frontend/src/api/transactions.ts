import { apiFetch } from "./api";

import type {
  ListTransactionsParams,
  ListTransactionsResponse,
  MonthlySummary,
  TransactionInput,
  TransactionMessageResponse,
  TransactionResponse,
} from "../types/transaction";

export async function listTransactionsRequest(
  params: ListTransactionsParams = {},
): Promise<ListTransactionsResponse> {
  const searchParams = new URLSearchParams();

  if (params.month) {
    searchParams.set("month", params.month);
  }

  if (params.type) {
    searchParams.set("type", params.type);
  }

  if (params.status) {
    searchParams.set("status", params.status);
  }

  if (params.category) {
    searchParams.set(
      "category",
      params.category,
    );
  }

  if (params.page) {
    searchParams.set(
      "page",
      String(params.page),
    );
  }

  if (params.limit) {
    searchParams.set(
      "limit",
      String(params.limit),
    );
  }

  const query = searchParams.toString();

  return apiFetch<ListTransactionsResponse>(
    `/transactions${query ? `?${query}` : ""}`,
    {
      method: "GET",
    },
  );
}

export async function getMonthlySummaryRequest(
  month: string,
): Promise<MonthlySummary> {
  const searchParams = new URLSearchParams({
    month,
  });

  return apiFetch<MonthlySummary>(
    `/transactions/summary?${searchParams.toString()}`,
    {
      method: "GET",
    },
  );
}

export async function createTransactionRequest(
  input: TransactionInput,
): Promise<TransactionResponse> {
  return apiFetch<TransactionResponse>(
    "/transactions",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function updateTransactionRequest(
  id: string,
  input: Partial<TransactionInput>,
): Promise<TransactionResponse> {
  return apiFetch<TransactionResponse>(
    `/transactions/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export async function deleteTransactionRequest(
  id: string,
): Promise<TransactionMessageResponse> {
  return apiFetch<TransactionMessageResponse>(
    `/transactions/${id}`,
    {
      method: "DELETE",
    },
  );
}

export async function restoreTransactionRequest(
  id: string,
): Promise<TransactionResponse> {
  return apiFetch<TransactionResponse>(
    `/transactions/${id}/restore`,
    {
      method: "POST",
    },
  );
}

export async function listDeletedTransactionsRequest(
  page = 1,
  limit = 100,
): Promise<ListTransactionsResponse> {
  const searchParams =
    new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

  return apiFetch<ListTransactionsResponse>(
    `/transactions/trash?${searchParams.toString()}`,
    {
      method: "GET",
    },
  );
}