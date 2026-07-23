import { Injectable } from '@nestjs/common';
import { Analysis, AnalysisStatus } from '@prisma/client';
import { AnalysisRepository } from './analysis.repository';

@Injectable()
export class AnalysisService {
  constructor(private readonly analysisRepository: AnalysisRepository) {}

  async createPending(params: {
    userId: string;
    text: string;
    textHash: string;
  }): Promise<Analysis> {
    return this.analysisRepository.create({
      user: { connect: { id: params.userId } },
      text: params.text,
      textHash: params.textHash,
    });
  }

  async markSuccess(
    id: string,
    params: { sentiment: string; keywords: string[]; attemptsMade: number },
  ): Promise<Analysis> {
    return this.analysisRepository.update(id, {
      status: AnalysisStatus.SUCCESS,
      sentiment: params.sentiment,
      keywords: params.keywords,
      attemptsMade: params.attemptsMade,
    });
  }

  async markFailed(
    id: string,
    params: { errorCode: string; attemptsMade: number },
  ): Promise<Analysis> {
    return this.analysisRepository.update(id, {
      status: AnalysisStatus.FAILED,
      errorCode: params.errorCode,
      attemptsMade: params.attemptsMade,
    });
  }

  async findRecentDuplicate(params: {
    userId: string;
    textHash: string;
    createdAfter: Date;
  }): Promise<Analysis | null> {
    return this.analysisRepository.findRecentDuplicate({
      userId: params.userId,
      textHash: params.textHash,
      statuses: [AnalysisStatus.PENDING, AnalysisStatus.SUCCESS],
      createdAfter: params.createdAfter,
    });
  }

  async getHistoryForUser(params: {
    userId: string;
    skip?: number;
    take?: number;
  }): Promise<Analysis[]> {
    return this.analysisRepository.findManyByUser(params);
  }

  async countByUser(userId: string): Promise<number> {
    return this.analysisRepository.countByUser(userId);
  }

  async findSuccessfulInDateRange(params: {
    dateFrom: Date;
    dateTo: Date;
  }): ReturnType<AnalysisRepository['findSuccessfulInDateRange']> {
    return this.analysisRepository.findSuccessfulInDateRange(params);
  }
}
