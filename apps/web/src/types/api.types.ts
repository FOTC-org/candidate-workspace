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

export type AnalysisStatus = "PENDING" | "SUCCESS" | "FAILED";

export interface AnalysisDto {
  id: string;
  userId: string;
  text: string;
  status: AnalysisStatus;
  sentiment: string | null;
  keywords: string[] | null;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedAnalysesDto {
  items: AnalysisDto[];
  total: number;
  page: number;
  limit: number;
}

export interface ActiveUserDto {
  userId?: string;
  email?: string;
  analysisCount: number;
}

export interface ReportDto {
  id: string;
  requestedById: string;
  dateFrom: string;
  dateTo: string;
  isEmpty: boolean;
  analysisCount: number;
  sentimentDistribution: Record<string, number>;
  mostActiveUsers: ActiveUserDto[];
  createdAt: string;
}

export interface PaginatedReportsDto {
  items: ReportDto[];
  total: number;
  page: number;
  limit: number;
}
