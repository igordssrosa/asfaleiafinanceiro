import { apiFetch } from "./api";

import type {
  ListProductsParams,
  ListProductsResponse,
  ProductInput,
  ProductMessageResponse,
  ProductResponse,
} from "../types/product";

export async function listProductsRequest(
  params: ListProductsParams = {},
): Promise<ListProductsResponse> {
  const searchParams =
    new URLSearchParams();

  if (params.search) {
    searchParams.set(
      "search",
      params.search,
    );
  }

  if (params.category) {
    searchParams.set(
      "category",
      params.category,
    );
  }

  if (params.status) {
    searchParams.set(
      "status",
      params.status,
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

  const query =
    searchParams.toString();

  return apiFetch<ListProductsResponse>(
    `/products${query ? `?${query}` : ""}`,
    {
      method: "GET",
    },
  );
}

export async function createProductRequest(
  input: ProductInput,
): Promise<ProductResponse> {
  return apiFetch<ProductResponse>(
    "/products",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function updateProductRequest(
  id: string,
  input: Partial<ProductInput>,
): Promise<ProductResponse> {
  return apiFetch<ProductResponse>(
    `/products/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export async function deleteProductRequest(
  id: string,
): Promise<ProductMessageResponse> {
  return apiFetch<ProductMessageResponse>(
    `/products/${id}`,
    {
      method: "DELETE",
    },
  );
}

export async function listDeletedProductsRequest(
  page = 1,
  limit = 100,
): Promise<ListProductsResponse> {
  const searchParams =
    new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

  return apiFetch<ListProductsResponse>(
    `/products/trash?${searchParams.toString()}`,
    {
      method: "GET",
    },
  );
}

export async function restoreProductRequest(
  id: string,
): Promise<ProductResponse> {
  return apiFetch<ProductResponse>(
    `/products/${id}/restore`,
    {
      method: "POST",
    },
  );
}

export async function permanentlyDeleteProductRequest(
  id: string,
): Promise<ProductMessageResponse> {
  return apiFetch<ProductMessageResponse>(
    `/products/${id}/permanent`,
    {
      method: "DELETE",
    },
  );
}