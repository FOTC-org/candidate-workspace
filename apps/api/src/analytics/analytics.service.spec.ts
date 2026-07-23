import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AnalyticsService } from './analytics.service';
import { AnalysisService } from '../entities/analysis/analysis.service';
import { AnalyticsProviderClient } from './providers/analytics-provider.client';
import {
  AnalyticsProviderUnavailableException,
  AnalyticsInvalidResponseException,
} from './analytics.exceptions';
import { AnalyticsConfigModel } from '../config/analytics-config';
import { Analysis, AnalysisStatus } from '@prisma/client';

const mockConfig: AnalyticsConfigModel = {
  baseUrl: 'http://localhost:3002',
  timeoutMs: 5000,
  maxRetries: 2,
  backoffBaseMs: 300,
  idempotencyWindowMinutes: 5,
};

const mockAnalysis = (overrides: Partial<Analysis> = {}): Analysis => ({
  id: 'analysis-1',
  userId: 'user-1',
  text: 'some note about the user',
  textHash: 'hash-1',
  sentiment: null,
  keywords: [],
  status: AnalysisStatus.PENDING,
  errorCode: null,
  attemptsMade: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let analysisService: jest.Mocked<AnalysisService>;
  let providerClient: jest.Mocked<AnalyticsProviderClient>;

  beforeEach(async () => {
    const mockAnalysisService: jest.Mocked<Partial<AnalysisService>> = {
      createPending: jest.fn(),
      markSuccess: jest.fn(),
      markFailed: jest.fn(),
      findRecentDuplicate: jest.fn(),
      getHistoryForUser: jest.fn(),
      countByUser: jest.fn(),
    };

    const mockProviderClient: jest.Mocked<Partial<AnalyticsProviderClient>> = {
      analyze: jest.fn(),
    };

    const mockConfigService: Partial<ConfigService> = {
      get: jest.fn().mockReturnValue(mockConfig),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: AnalysisService, useValue: mockAnalysisService },
        { provide: AnalyticsProviderClient, useValue: mockProviderClient },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    analysisService = module.get(AnalysisService);
    providerClient = module.get(AnalyticsProviderClient);
  });

  describe('analyze', () => {
    it('returns the existing record and does not call the provider when a duplicate is found', async () => {
      const duplicate = mockAnalysis({ status: AnalysisStatus.SUCCESS });
      analysisService.findRecentDuplicate.mockResolvedValue(duplicate);

      const result = await service.analyze({ userId: 'user-1', text: 'hello' });

      expect(result.isNewRecord).toBe(false);
      expect(result.output.id).toBe(duplicate.id);
      expect(providerClient.analyze).not.toHaveBeenCalled();
      expect(analysisService.createPending).not.toHaveBeenCalled();
    });

    it('creates a pending record, calls the provider, and marks it SUCCESS when no duplicate is found', async () => {
      analysisService.findRecentDuplicate.mockResolvedValue(null);
      const pending = mockAnalysis();
      analysisService.createPending.mockResolvedValue(pending);
      providerClient.analyze.mockResolvedValue({
        sentiment: 'positive',
        keywords: ['great', 'service'],
        attemptsMade: 1,
      });
      const succeeded = mockAnalysis({
        status: AnalysisStatus.SUCCESS,
        sentiment: 'positive',
        keywords: ['great', 'service'],
        attemptsMade: 1,
      });
      analysisService.markSuccess.mockResolvedValue(succeeded);

      const result = await service.analyze({ userId: 'user-1', text: 'hello' });

      expect(result.isNewRecord).toBe(true);
      expect(result.output.status).toBe(AnalysisStatus.SUCCESS);
      expect(result.output.sentiment).toBe('positive');
      expect(result.output.keywords).toEqual(['great', 'service']);
      expect(analysisService.createPending).toHaveBeenCalledWith({
        userId: 'user-1',
        text: 'hello',
        textHash: expect.any(String),
      });
      expect(analysisService.markSuccess).toHaveBeenCalledWith(pending.id, {
        sentiment: 'positive',
        keywords: ['great', 'service'],
        attemptsMade: 1,
      });
    });

    it('maps an empty keywords array to null in the output', async () => {
      analysisService.findRecentDuplicate.mockResolvedValue(null);
      analysisService.createPending.mockResolvedValue(mockAnalysis());
      providerClient.analyze.mockResolvedValue({
        sentiment: 'neutral',
        keywords: [],
        attemptsMade: 1,
      });
      analysisService.markSuccess.mockResolvedValue(
        mockAnalysis({ status: AnalysisStatus.SUCCESS, sentiment: 'neutral', keywords: [] }),
      );

      const result = await service.analyze({ userId: 'user-1', text: 'hello' });

      expect(result.output.keywords).toBeNull();
    });

    it('marks the record FAILED and rethrows when the provider is unavailable', async () => {
      analysisService.findRecentDuplicate.mockResolvedValue(null);
      const pending = mockAnalysis();
      analysisService.createPending.mockResolvedValue(pending);
      const error = new AnalyticsProviderUnavailableException(3);
      providerClient.analyze.mockRejectedValue(error);
      analysisService.markFailed.mockResolvedValue(
        mockAnalysis({
          status: AnalysisStatus.FAILED,
          errorCode: 'ANALYTICS_PROVIDER_UNAVAILABLE',
          attemptsMade: 3,
        }),
      );

      await expect(
        service.analyze({ userId: 'user-1', text: 'hello' }),
      ).rejects.toThrow(AnalyticsProviderUnavailableException);

      expect(analysisService.markFailed).toHaveBeenCalledWith(pending.id, {
        errorCode: 'ANALYTICS_PROVIDER_UNAVAILABLE',
        attemptsMade: 3,
      });
    });

    it('marks the record FAILED and rethrows on a schema-invalid response, with attemptsMade 1', async () => {
      analysisService.findRecentDuplicate.mockResolvedValue(null);
      const pending = mockAnalysis();
      analysisService.createPending.mockResolvedValue(pending);
      const error = new AnalyticsInvalidResponseException();
      providerClient.analyze.mockRejectedValue(error);
      analysisService.markFailed.mockResolvedValue(
        mockAnalysis({
          status: AnalysisStatus.FAILED,
          errorCode: 'ANALYTICS_INVALID_RESPONSE',
          attemptsMade: 1,
        }),
      );

      await expect(
        service.analyze({ userId: 'user-1', text: 'hello' }),
      ).rejects.toThrow(AnalyticsInvalidResponseException);

      expect(analysisService.markFailed).toHaveBeenCalledWith(pending.id, {
        errorCode: 'ANALYTICS_INVALID_RESPONSE',
        attemptsMade: 1,
      });
    });

    it('rethrows without calling markFailed when an unexpected error occurs', async () => {
      analysisService.findRecentDuplicate.mockResolvedValue(null);
      analysisService.createPending.mockResolvedValue(mockAnalysis());
      providerClient.analyze.mockRejectedValue(new Error('unexpected'));

      await expect(
        service.analyze({ userId: 'user-1', text: 'hello' }),
      ).rejects.toThrow('unexpected');

      expect(analysisService.markFailed).not.toHaveBeenCalled();
    });
  });

  describe('getHistoryForUser', () => {
    it('returns paginated results using the given page and limit', async () => {
      const records = [mockAnalysis(), mockAnalysis({ id: 'analysis-2' })];
      analysisService.getHistoryForUser.mockResolvedValue(records);
      analysisService.countByUser.mockResolvedValue(2);

      const result = await service.getHistoryForUser('user-1', {
        page: 2,
        limit: 10,
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(analysisService.getHistoryForUser).toHaveBeenCalledWith({
        userId: 'user-1',
        skip: 10,
        take: 10,
      });
    });

    it('defaults to page 1 and limit 20 when not provided', async () => {
      analysisService.getHistoryForUser.mockResolvedValue([]);
      analysisService.countByUser.mockResolvedValue(0);

      const result = await service.getHistoryForUser('user-1', {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(analysisService.getHistoryForUser).toHaveBeenCalledWith({
        userId: 'user-1',
        skip: 0,
        take: 20,
      });
    });
  });
});
