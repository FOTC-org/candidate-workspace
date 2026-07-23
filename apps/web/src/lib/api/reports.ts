import type { ReportDto, PaginatedReportsDto } from "@/types";

const API_URL = process.env.API_URL ?? "http://localhost:3001/api/v1";

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Request failed" }));
    throw error;
  }

  return response.json() as Promise<T>;
}

export async function listReportsApi(
  accessToken: string,
  page = 1,
  limit = 20,
): Promise<PaginatedReportsDto> {
  return apiFetch<PaginatedReportsDto>(
    `/reports?page=${page}&limit=${limit}`,
    {},
    accessToken,
  );
}

export async function getReportApi(
  accessToken: string,
  id: string,
): Promise<ReportDto> {
  return apiFetch<ReportDto>(`/reports/${id}`, {}, accessToken);
}

export async function createReportApi(
  accessToken: string,
  dateFrom: string,
  dateTo: string,
): Promise<ReportDto> {
  return apiFetch<ReportDto>(
    "/reports",
    { method: "POST", body: JSON.stringify({ dateFrom, dateTo }) },
    accessToken,
  );
}
