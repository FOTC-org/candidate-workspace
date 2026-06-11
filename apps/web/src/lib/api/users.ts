import type { AuthTokensDto, UserDto, PaginatedUsersDto } from "@/types";

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

export async function loginApi(
  email: string,
  password: string,
): Promise<AuthTokensDto> {
  return apiFetch<AuthTokensDto>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerApi(
  email: string,
  password: string,
): Promise<AuthTokensDto> {
  return apiFetch<AuthTokensDto>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function refreshTokenApi(
  refreshToken: string,
): Promise<AuthTokensDto> {
  return apiFetch<AuthTokensDto>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export async function getMeApi(accessToken: string): Promise<UserDto> {
  return apiFetch<UserDto>("/users/me", {}, accessToken);
}

export async function getUsersApi(
  accessToken: string,
  page = 1,
  limit = 20,
): Promise<PaginatedUsersDto> {
  return apiFetch<PaginatedUsersDto>(
    `/users?page=${page}&limit=${limit}`,
    {},
    accessToken,
  );
}

export async function getUserApi(
  accessToken: string,
  id: string,
): Promise<UserDto> {
  return apiFetch<UserDto>(`/users/${id}`, {}, accessToken);
}

export async function deactivateUserApi(
  accessToken: string,
  id: string,
): Promise<UserDto> {
  return apiFetch<UserDto>(`/users/${id}`, { method: "DELETE" }, accessToken);
}

export async function updateUserRoleApi(
  accessToken: string,
  id: string,
  role: string,
): Promise<UserDto> {
  return apiFetch<UserDto>(
    `/users/${id}/role`,
    { method: "PATCH", body: JSON.stringify({ role }) },
    accessToken,
  );
}
