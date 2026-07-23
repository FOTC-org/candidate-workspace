import { Test, TestingModule } from '@nestjs/testing';
import { AnalysisService } from './analysis.service';
import { AnalysisRepository } from './analysis.repository';
import { Analysis, AnalysisStatus } from '@prisma/client';

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

describe('AnalysisService', () => {
  let service: AnalysisService;
  let repository: jest.Mocked<AnalysisRepository>;

  beforeEach(async () => {
    const mockRepo: jest.Mocked<Partial<AnalysisRepository>> = {
      create: jest.fn(),
      update: jest.fn(),
      findRecentDuplicate: jest.fn(),
      findManyByUser: jest.fn(),
      countByUser: jest.fn(),
      findSuccessfulInDateRange: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisService,
        { provide: AnalysisRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<AnalysisService>(AnalysisService);
    repository = module.get(AnalysisRepository);
  });

  describe('createPending', () => {
    it('creates a record with connected user, status defaulting to PENDING', async () => {
      const created = mockAnalysis();
      repository.create.mockResolvedValue(created);

      const result = await service.createPending({
        userId: 'user-1',
        text: 'some note about the user',
        textHash: 'hash-1',
      });

      expect(result).toEqual(created);
      expect(repository.create).toHaveBeenCalledWith({
        user: { connect: { id: 'user-1' } },
        text: 'some note about the user',
        textHash: 'hash-1',
      });
    });
  });

  describe('markSuccess', () => {
    it('updates the record with SUCCESS status and result fields', async () => {
      const updated = mockAnalysis({
        status: AnalysisStatus.SUCCESS,
        sentiment: 'positive',
        keywords: ['great', 'service'],
        attemptsMade: 1,
      });
      repository.update.mockResolvedValue(updated);

      const result = await service.markSuccess('analysis-1', {
        sentiment: 'positive',
        keywords: ['great', 'service'],
        attemptsMade: 1,
      });

      expect(result).toEqual(updated);
      expect(repository.update).toHaveBeenCalledWith('analysis-1', {
        status: AnalysisStatus.SUCCESS,
        sentiment: 'positive',
        keywords: ['great', 'service'],
        attemptsMade: 1,
      });
    });
  });

  describe('markFailed', () => {
    it('updates the record with FAILED status and error fields', async () => {
      const updated = mockAnalysis({
        status: AnalysisStatus.FAILED,
        errorCode: 'ANALYTICS_PROVIDER_UNAVAILABLE',
        attemptsMade: 3,
      });
      repository.update.mockResolvedValue(updated);

      const result = await service.markFailed('analysis-1', {
        errorCode: 'ANALYTICS_PROVIDER_UNAVAILABLE',
        attemptsMade: 3,
      });

      expect(result).toEqual(updated);
      expect(repository.update).toHaveBeenCalledWith('analysis-1', {
        status: AnalysisStatus.FAILED,
        errorCode: 'ANALYTICS_PROVIDER_UNAVAILABLE',
        attemptsMade: 3,
      });
    });
  });

  describe('findRecentDuplicate', () => {
    it('returns the existing record when a duplicate is found', async () => {
      const existing = mockAnalysis();
      repository.findRecentDuplicate.mockResolvedValue(existing);
      const createdAfter = new Date('2026-07-12T00:00:00.000Z');

      const result = await service.findRecentDuplicate({
        userId: 'user-1',
        textHash: 'hash-1',
        createdAfter,
      });

      expect(result).toEqual(existing);
    });

    it('returns null when no duplicate is found', async () => {
      repository.findRecentDuplicate.mockResolvedValue(null);

      const result = await service.findRecentDuplicate({
        userId: 'user-1',
        textHash: 'hash-1',
        createdAfter: new Date(),
      });

      expect(result).toBeNull();
    });

    it('only considers PENDING and SUCCESS statuses as duplicates, excluding FAILED', async () => {
      repository.findRecentDuplicate.mockResolvedValue(null);
      const createdAfter = new Date('2026-07-12T00:00:00.000Z');

      await service.findRecentDuplicate({
        userId: 'user-1',
        textHash: 'hash-1',
        createdAfter,
      });

      expect(repository.findRecentDuplicate).toHaveBeenCalledWith({
        userId: 'user-1',
        textHash: 'hash-1',
        statuses: [AnalysisStatus.PENDING, AnalysisStatus.SUCCESS],
        createdAfter,
      });
    });
  });

  describe('getHistoryForUser', () => {
    it('returns paginated records for the given user', async () => {
      const records = [mockAnalysis(), mockAnalysis({ id: 'analysis-2' })];
      repository.findManyByUser.mockResolvedValue(records);

      const result = await service.getHistoryForUser({
        userId: 'user-1',
        skip: 0,
        take: 20,
      });

      expect(result).toEqual(records);
      expect(repository.findManyByUser).toHaveBeenCalledWith({
        userId: 'user-1',
        skip: 0,
        take: 20,
      });
    });
  });

  describe('countByUser', () => {
    it('returns the total count of analyses for the user', async () => {
      repository.countByUser.mockResolvedValue(5);

      const result = await service.countByUser('user-1');

      expect(result).toBe(5);
      expect(repository.countByUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('findSuccessfulInDateRange', () => {
    it('returns successful analyses with user info within the date range', async () => {
      const records = [
        {
          userId: 'user-1',
          sentiment: 'positive',
          user: { email: 'a@a.com', isActive: true },
        },
      ];
      repository.findSuccessfulInDateRange.mockResolvedValue(records);

      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');
      const result = await service.findSuccessfulInDateRange({ dateFrom, dateTo });

      expect(result).toEqual(records);
      expect(repository.findSuccessfulInDateRange).toHaveBeenCalledWith({
        dateFrom,
        dateTo,
      });
    });
  });
});
