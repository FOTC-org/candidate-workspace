import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

export function createWinstonLogger(nodeEnv: string, logLevel: string) {
  const isProduction = nodeEnv === 'production';

  const format = isProduction
    ? winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        winston.format.json(),
      )
    : winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.ms(),
        winston.format.colorize({ all: true }),
        winston.format.printf(({ timestamp, level, message, context, ms }) => {
          return `[${timestamp}] ${level} [${context ?? 'App'}] ${String(message)} ${ms}`;
        }),
      );

  return WinstonModule.createLogger({
    level: logLevel,
    transports: [new winston.transports.Console({ format })],
  });
}
