import { registerAs } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { AnalyticsConfigModel } from './analytics-config-model';

const AnalyticsConfigName = 'analyticsConfig';

export const AnalyticsConfig = registerAs(
  AnalyticsConfigName,
  (): AnalyticsConfigModel => {
    const baseUrl = process.env.MOCK_ANALYTICS_BASE_URL;
    if (!baseUrl) {
      throw new Error('MOCK_ANALYTICS_BASE_URL env variable is required');
    }

    return {
      baseUrl,
      timeoutMs: parseInt(process.env.MOCK_ANALYTICS_TIMEOUT_MS ?? '5000', 10),
      maxRetries: parseInt(process.env.MOCK_ANALYTICS_MAX_RETRIES ?? '2', 10),
      backoffBaseMs: parseInt(
        process.env.MOCK_ANALYTICS_BACKOFF_BASE_MS ?? '300',
        10,
      ),
      idempotencyWindowMinutes: parseInt(
        process.env.ANALYTICS_IDEMPOTENCY_WINDOW_MINUTES ?? '5',
        10,
      ),
    };
  },
);

export const getAnalyticsConfig = (
  configService: ConfigService,
): AnalyticsConfigModel =>
  configService.get<AnalyticsConfigModel>(AnalyticsConfigName)!;
