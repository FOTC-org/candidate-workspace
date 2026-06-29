import type { AuthTokensDto, UserDto, PaginatedUsersDto } from "@/types";

// Calls Next.js Route Handlers (/api/*) — safe to use in Client Components.
// The Route Handlers proxy requests to the backend server-side.

async function clientFetch<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...options.headers,
  };

  const response = await fetch(path, { ...options, headers });

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
  return clientFetch<AuthTokensDto>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerApi(
  email: string,
  password: string,
): Promise<AuthTokensDto> {
  return clientFetch<AuthTokensDto>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMeApi(accessToken: string): Promise<UserDto> {
  return clientFetch<UserDto>("/api/users/me", {}, accessToken);
}

export async function getUsersApi(
  accessToken: string,
  page = 1,
  limit = 20,
): Promise<PaginatedUsersDto> {
  return clientFetch<PaginatedUsersDto>(
    `/api/users?page=${page}&limit=${limit}`,
    {},
    accessToken,
  );
}

export async function deactivateUserApi(
  accessToken: string,
  id: string,
): Promise<UserDto> {
  return clientFetch<UserDto>(
    `/api/users/${id}`,
    { method: "DELETE" },
    accessToken,
  );
}
