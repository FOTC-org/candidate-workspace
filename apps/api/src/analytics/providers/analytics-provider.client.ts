import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { getAnalyticsConfig } from '../../config/analytics-config';
import { AnalyzeProviderResponseModel } from './models/analyze-provider-response.model';
import { AnalyzeProviderResult } from './models/analyze-provider-result.model';
import {
  AnalyticsProviderUnavailableException,
  AnalyticsInvalidResponseException,
} from '../analytics.exceptions';

@Injectable()
export class AnalyticsProviderClient {
  private readonly logger = new Logger(AnalyticsProviderClient.name);

  constructor(private readonly configService: ConfigService) {}

  async analyze(text: string): Promise<AnalyzeProviderResult> {
    const config = getAnalyticsConfig(this.configService);
    const maxAttempts = config.maxRetries + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let response: Response;

      try {
        response = await this.sendRequest(config.baseUrl, text, config.timeoutMs);
      } catch (error) {
        this.logger.warn({
          message: 'Analytics provider request failed (timeout or network error)',
          meta: { attempt, error: error instanceof Error ? error.message : String(error) },
        });
        if (attempt === maxAttempts) {
          throw new AnalyticsProviderUnavailableException(attempt);
        }
        await this.delay(this.backoffDelayMs(config.backoffBaseMs, attempt));
        continue;
      }

      if (response.status >= 500) {
        this.logger.warn({
          message: 'Analytics provider returned a server error',
          meta: { status: response.status, attempt },
        });
        if (attempt === maxAttempts) {
          throw new AnalyticsProviderUnavailableException(attempt);
        }
        await this.delay(this.backoffDelayMs(config.backoffBaseMs, attempt));
        continue;
      }

      if (!response.ok) {
        this.logger.warn({
          message: 'Analytics provider returned a client error, not retrying',
          meta: { status: response.status, attempt },
        });
        throw new AnalyticsProviderUnavailableException(attempt);
      }

      return this.parseAndValidate(response, attempt);
    }

    // Unreachable: the loop always returns or throws, this satisfies TypeScript's
    // control-flow analysis for a function with a non-void return type.
    throw new AnalyticsProviderUnavailableException(maxAttempts);
  }

  private async sendRequest(
    baseUrl: string,
    text: string,
    timeoutMs: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(`${baseUrl}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  private async parseAndValidate(
    response: Response,
    attemptsMade: number,
  ): Promise<AnalyzeProviderResult> {
    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      this.logger.warn({
        message: 'Analytics provider returned a non-JSON body',
        meta: { error: error instanceof Error ? error.message : String(error) },
      });
      throw new AnalyticsInvalidResponseException();
    }

    const instance = plainToInstance(AnalyzeProviderResponseModel, body);
    const errors = await validate(instance);

    if (errors.length > 0) {
      this.logger.warn({
        message: 'Analytics provider response failed schema validation',
        meta: { invalidProperties: errors.map((e) => e.property) },
      });
      throw new AnalyticsInvalidResponseException();
    }

    return {
      sentiment: instance.sentiment,
      keywords: instance.keywords,
      attemptsMade,
    };
  }

  private backoffDelayMs(backoffBaseMs: number, failedAttempt: number): number {
    return backoffBaseMs * Math.pow(3, failedAttempt - 1);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
