import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { Analysis } from '@prisma/client';
import { AnalysisService } from '../entities/analysis/analysis.service';
import { AnalyticsProviderClient } from './providers/analytics-provider.client';
import { getAnalyticsConfig } from '../config/analytics-config';
import {
  AnalyticsProviderUnavailableException,
  AnalyticsInvalidResponseException,
} from './analytics.exceptions';
import {
  AnalyzeArgs,
  GetAnalysisHistoryArgs,
  AnalysisOutput,
  PaginatedAnalysesOutput,
  AnalyzeResult,
} from './models';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly analysisService: AnalysisService,
    private readonly providerClient: AnalyticsProviderClient,
    private readonly configService: ConfigService,
  ) {}

async analyze(args: AnalyzeArgs): Promise<AnalyzeResult> {
  const config = getAnalyticsConfig(this.configService);
  const normalizedText = this.normalizeText(args.text);
  const textHash = this.hashText(args.userId, normalizedText);
  const createdAfter = new Date(
    Date.now() - config.idempotencyWindowMinutes * 60_000,
  );

  const duplicate = await this.analysisService.findRecentDuplicate({
    userId: args.userId,
    textHash,
    createdAfter,
  });

  if (duplicate) {
    this.logger.log({
      message: 'Reusing existing analysis within idempotency window',
      meta: { userId: args.userId, analysisId: duplicate.id },
    });
    return { output: this.mapToOutput(duplicate), isNewRecord: false };
  }

  const pending = await this.analysisService.createPending({
    userId: args.userId,
    text: args.text,
    textHash,
  });

  try {
    const result = await this.providerClient.analyze(args.text);
    const succeeded = await this.analysisService.markSuccess(pending.id, {
      sentiment: result.sentiment,
      keywords: result.keywords,
      attemptsMade: result.attemptsMade,
    });
    return { output: this.mapToOutput(succeeded), isNewRecord: true };
  } catch (error) {
    if (
      error instanceof AnalyticsProviderUnavailableException ||
      error instanceof AnalyticsInvalidResponseException
    ) {
      await this.analysisService.markFailed(pending.id, {
        errorCode: error.errorCode,
        attemptsMade: error.attemptsMade,
      });
    }
    throw error;
  }
}

  async getHistoryForUser(
    userId: string,
    query: GetAnalysisHistoryArgs,
  ): Promise<PaginatedAnalysesOutput> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.analysisService.getHistoryForUser({ userId, skip, take: limit }),
      this.analysisService.countByUser(userId),
    ]);

    return {
      items: items.map(this.mapToOutput),
      total,
      page,
      limit,
    };
  }

  private normalizeText(text: string): string {
    return text.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private hashText(userId: string, normalizedText: string): string {
    return createHash('sha256').update(`${userId}${normalizedText}`).digest('hex');
  }

  private mapToOutput(analysis: Analysis): AnalysisOutput {
    return {
      id: analysis.id,
      userId: analysis.userId,
      text: analysis.text,
      status: analysis.status,
      sentiment: analysis.sentiment,
      keywords: analysis.keywords.length > 0 ? analysis.keywords : null,
      errorCode: analysis.errorCode,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt,
    };
  }
}
