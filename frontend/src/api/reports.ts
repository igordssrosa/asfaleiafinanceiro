import { ApiError, apiFetch } from "./api";

import type {
  MonthlyComparison,
  MonthlyReport,
} from "../types/report";

const apiUrl =
  import.meta.env.VITE_API_URL ??
  "http://localhost:3333/api";

export async function getMonthlyReportRequest(
  month: string,
): Promise<MonthlyReport> {
  const searchParams =
    new URLSearchParams({
      month,
    });

  return apiFetch<MonthlyReport>(
    `/reports/monthly?${searchParams.toString()}`,
    {
      method: "GET",
    },
  );
}

export async function getMonthlyComparisonRequest(
  endMonth: string,
  months = 6,
): Promise<MonthlyComparison> {
  const searchParams =
    new URLSearchParams({
      endMonth,
      months: String(months),
    });

  return apiFetch<MonthlyComparison>(
    `/reports/comparison?${searchParams.toString()}`,
    {
      method: "GET",
    },
  );
}

async function readDownloadError(
  response: Response,
): Promise<string> {
  try {
    const data = await response.json() as {
      message?: string;
    };

    return (
      data.message ??
      "Não foi possível exportar o relatório."
    );
  } catch {
    return "Não foi possível exportar o relatório.";
  }
}

export async function downloadMonthlyReportCsvRequest(
  month: string,
): Promise<void> {
  const searchParams =
    new URLSearchParams({
      month,
    });

  const response = await fetch(
    `${apiUrl}/reports/export.csv?${searchParams.toString()}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept:
          "text/csv, application/json",
      },
    },
  );

  if (!response.ok) {
    const message =
      await readDownloadError(response);

    throw new ApiError(
      message,
      response.status,
    );
  }

  const blob =
    await response.blob();

  const downloadUrl =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href =
    downloadUrl;

  anchor.download =
    `asfaleia-relatorio-${month}.csv`;

  document.body.appendChild(
    anchor,
  );

  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(
    downloadUrl,
  );
}