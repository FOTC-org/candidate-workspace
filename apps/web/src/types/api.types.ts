export type Role = "ADMIN" | "MANAGER" | "ANALYST";

export interface UserDto {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
}

export interface PaginatedUsersDto {
  items: UserDto[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  statusCode: number;
  errorCode: string;
  message: string;
  timestamp: string;
  path: string;
}
