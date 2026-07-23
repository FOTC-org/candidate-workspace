import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from './report.service';
import { ReportRepository } from './report.repository';
import { ReportNotFoundException } from './report.exceptions';
import { Report } from '@prisma/client';

const mockReport = (overrides: Partial<Report> = {}): Report => ({
  id: 'report-1',
  requestedById: 'user-1',
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-01-31'),
  isEmpty: false,
  analysisCount: 10,
  sentimentDistribution: { positive: 6, negative: 2, neutral: 2 },
  mostActiveUsers: [{ userId: 'user-2', email: 'a@a.com', analysisCount: 5 }],
  coversOnlyInactiveUsers: false,
  createdAt: new Date(),
  ...overrides,
});

describe('ReportService', () => {
  let service: ReportService;
  let repository: jest.Mocked<ReportRepository>;

  beforeEach(async () => {
    const mockRepo: jest.Mocked<Partial<ReportRepository>> = {
      create: jest.fn(),
      findById: jest.fn(),
      findAllForAdmin: jest.fn(),
      countAllForAdmin: jest.fn(),
      findOwnExcludingArchival: jest.fn(),
      countOwnExcludingArchival: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportService, { provide: ReportRepository, useValue: mockRepo }],
    }).compile();

    service = module.get<ReportService>(ReportService);
    repository = module.get(ReportRepository);
  });

  describe('create', () => {
    it('creates and returns a report', async () => {
      const created = mockReport();
      repository.create.mockResolvedValue(created);

      const result = await service.create({
        requestedBy: { connect: { id: 'user-1' } },
        dateFrom: created.dateFrom,
        dateTo: created.dateTo,
        isEmpty: false,
        analysisCount: 10,
        sentimentDistribution: created.sentimentDistribution as object,
        mostActiveUsers: created.mostActiveUsers as object,
        coversOnlyInactiveUsers: false,
      });

      expect(result).toEqual(created);
    });
  });

  describe('getByIdOrThrow', () => {
    it('returns the report when found', async () => {
      const report = mockReport();
      repository.findById.mockResolvedValue(report);

      const result = await service.getByIdOrThrow('report-1');

      expect(result).toEqual(report);
    });

    it('throws ReportNotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getByIdOrThrow('nonexistent')).rejects.toThrow(
        ReportNotFoundException,
      );
    });
  });

  describe('findAllForAdmin', () => {
    it('returns all reports regardless of owner', async () => {
      const reports = [
        mockReport(),
        mockReport({ id: 'report-2', requestedById: 'user-2' }),
      ];
      repository.findAllForAdmin.mockResolvedValue(reports);

      const result = await service.findAllForAdmin({ skip: 0, take: 20 });

      expect(result).toEqual(reports);
      expect(repository.findAllForAdmin).toHaveBeenCalledWith({ skip: 0, take: 20 });
    });
  });

  describe('countAllForAdmin', () => {
    it('returns the total count across all owners', async () => {
      repository.countAllForAdmin.mockResolvedValue(42);

      const result = await service.countAllForAdmin();

      expect(result).toBe(42);
    });
  });

  describe('findOwnExcludingArchival', () => {
    it('passes excludeArchival through to the repository for a MANAGER-style query', async () => {
      const reports = [mockReport()];
      repository.findOwnExcludingArchival.mockResolvedValue(reports);

      const result = await service.findOwnExcludingArchival({
        requestedById: 'user-1',
        excludeArchival: true,
        skip: 0,
        take: 20,
      });

      expect(result).toEqual(reports);
      expect(repository.findOwnExcludingArchival).toHaveBeenCalledWith({
        requestedById: 'user-1',
        excludeArchival: true,
        skip: 0,
        take: 20,
      });
    });

    it('passes excludeArchival: false through for an ANALYST-style query', async () => {
      repository.findOwnExcludingArchival.mockResolvedValue([]);

      await service.findOwnExcludingArchival({
        requestedById: 'user-3',
        excludeArchival: false,
      });

      expect(repository.findOwnExcludingArchival).toHaveBeenCalledWith({
        requestedById: 'user-3',
        excludeArchival: false,
      });
    });
  });

  describe('countOwnExcludingArchival', () => {
    it('passes excludeArchival through to the repository', async () => {
      repository.countOwnExcludingArchival.mockResolvedValue(3);

      const result = await service.countOwnExcludingArchival({
        requestedById: 'user-1',
        excludeArchival: true,
      });

      expect(result).toBe(3);
      expect(repository.countOwnExcludingArchival).toHaveBeenCalledWith({
        requestedById: 'user-1',
        excludeArchival: true,
      });
    });
  });
});
