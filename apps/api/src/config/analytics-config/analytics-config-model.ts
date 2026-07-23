export interface AnalyticsConfigModel {
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
  backoffBaseMs: number;
  idempotencyWindowMinutes: number;
}
