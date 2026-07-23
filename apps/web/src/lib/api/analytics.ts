import type { AnalysisDto, PaginatedAnalysesDto } from "@/types";

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

export async function analyzeApi(
  accessToken: string,
  userId: string,
  text: string,
): Promise<AnalysisDto> {
  return apiFetch<AnalysisDto>(
    "/analytics/analyze",
    { method: "POST", body: JSON.stringify({ userId, text }) },
    accessToken,
  );
}

export async function getAnalysisHistoryApi(
  accessToken: string,
  userId: string,
  page = 1,
  limit = 20,
): Promise<PaginatedAnalysesDto> {
  return apiFetch<PaginatedAnalysesDto>(
    `/analytics/users/${userId}?page=${page}&limit=${limit}`,
    {},
    accessToken,
  );
}
