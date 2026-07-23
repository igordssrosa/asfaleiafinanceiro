import {
  apiFetch,
} from "./api";

import type {
  GetInventoryItemResponse,
  ListInventoryParams,
  ListInventoryResponse,
  UpdateInventoryInput,
  UpdateInventoryResponse,
} from "../types/inventory";

function addStringParameter(
  searchParams:
    URLSearchParams,

  name:
    string,

  value:
    string | undefined,
): void {
  const normalizedValue =
    value?.trim();

  if (!normalizedValue) {
    return;
  }

  searchParams.set(
    name,
    normalizedValue,
  );
}

function addNumberParameter(
  searchParams:
    URLSearchParams,

  name:
    string,

  value:
    number | undefined,
): void {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return;
  }

  searchParams.set(
    name,
    String(value),
  );
}

/*
 * Lista os produtos disponíveis no estoque.
 *
 * Permite:
 * - pesquisa por nome, SKU ou categoria;
 * - filtro por ativo ou inativo;
 * - paginação.
 */
export async function listInventoryRequest(
  params:
    ListInventoryParams = {},
): Promise<ListInventoryResponse> {
  const searchParams =
    new URLSearchParams();

  addStringParameter(
    searchParams,
    "search",
    params.search,
  );

  addStringParameter(
    searchParams,
    "status",
    params.status,
  );

  addNumberParameter(
    searchParams,
    "page",
    params.page,
  );

  addNumberParameter(
    searchParams,
    "limit",
    params.limit,
  );

  const query =
    searchParams.toString();

  const endpoint =
    query
      ? `/inventory?${query}`
      : "/inventory";

  return apiFetch<ListInventoryResponse>(
    endpoint,
    {
      method:
        "GET",

      retryOnUnauthorized:
        true,
    },
  );
}

/*
 * Busca o estoque completo de um produto.
 */
export async function getInventoryItemRequest(
  productId:
    string,
): Promise<GetInventoryItemResponse> {
  const normalizedProductId =
    productId.trim();

  if (!normalizedProductId) {
    throw new Error(
      "O identificador do produto é obrigatório.",
    );
  }

  return apiFetch<GetInventoryItemResponse>(
    `/inventory/${encodeURIComponent(
      normalizedProductId,
    )}`,
    {
      method:
        "GET",

      retryOnUnauthorized:
        true,
    },
  );
}

/*
 * Atualiza o estoque de um produto.
 *
 * Pode alterar:
 * - status ativo ou inativo;
 * - cores;
 * - tamanhos;
 * - quantidades;
 * - estoque mínimo.
 */
export async function updateInventoryItemRequest(
  productId:
    string,

  input:
    UpdateInventoryInput,
): Promise<UpdateInventoryResponse> {
  const normalizedProductId =
    productId.trim();

  if (!normalizedProductId) {
    throw new Error(
      "O identificador do produto é obrigatório.",
    );
  }

  return apiFetch<UpdateInventoryResponse>(
    `/inventory/${encodeURIComponent(
      normalizedProductId,
    )}`,
    {
      method:
        "PUT",

      body:
        JSON.stringify(
          input,
        ),

      retryOnUnauthorized:
        true,
    },
  );
}