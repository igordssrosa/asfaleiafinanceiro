import {
  apiFetch,
} from "./api";

import type {
  ListAuditLogsParams,
  ListAuditLogsResponse,
} from "../types/auditLog";

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

export async function listAuditLogsRequest(
  params:
    ListAuditLogsParams = {},
): Promise<ListAuditLogsResponse> {
  const searchParams =
    new URLSearchParams();

  addStringParameter(
    searchParams,
    "action",
    params.action,
  );

  addStringParameter(
    searchParams,
    "resource",
    params.resource,
  );

  addStringParameter(
    searchParams,
    "search",
    params.search,
  );

  addStringParameter(
    searchParams,
    "from",
    params.from,
  );

  addStringParameter(
    searchParams,
    "to",
    params.to,
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
      ? `/audit-logs?${query}`
      : "/audit-logs";

  return apiFetch<ListAuditLogsResponse>(
    endpoint,
  );
}