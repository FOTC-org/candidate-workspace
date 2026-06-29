import { registerAs } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { AppConfigModel } from './app-config-model';

const AppConfigName = 'appConfig';

export const AppConfig = registerAs(AppConfigName, (): AppConfigModel => {
  const corsRaw = process.env.CORS_ALLOWED_ORIGINS;
  if (!corsRaw) {
    throw new Error('CORS_ALLOWED_ORIGINS env variable is required');
  }
  return {
    port: parseInt(process.env.PORT ?? '3001', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    corsAllowedOrigins: corsRaw.split(',').map((o) => o.trim()),
    logLevel: process.env.LOG_LEVEL ?? 'debug',
  };
});

export const getAppConfig = (configService: ConfigService): AppConfigModel =>
  configService.get<AppConfigModel>(AppConfigName)!;
