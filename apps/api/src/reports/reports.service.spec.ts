import { Test, TestingModule } from '@nestjs/testing';
import { Role, User } from '@prisma/client';
import { ReportsService } from './reports.service';
import { ReportService } from '../entities/report/report.service';
import { AnalysisService } from '../entities/analysis/analysis.service';
import { ReportsAggregationService } from './reports-aggregation.service';
import { ReportsAuthorizationService } from './reports-authorization.service';
import { ReportNotOwnedException } from './reports.exceptions';

const mockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: 'hash',
  role: Role.ANALYST,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const mockReportRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'report-1',
  requestedById: 'user-1',
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-01-31'),
  isEmpty: false,
  analysisCount: 2,
  sentimentDistribution: { positive: 2 },
  mostActiveUsers: [{ userId: 'user-1', email: 'a@a.com', analysisCount: 2 }],
  coversOnlyInactiveUsers: false,
  createdAt: new Date(),
  ...overrides,
});

const mockAggregation = {
  isEmpty: false,
  analysisCount: 2,
  sentimentDistribution: { positive: 2 },
  mostActiveUsers: [{ userId: 'user-1', email: 'a@a.com', analysisCount: 2 }],
  coversOnlyInactiveUsers: false,
};

describe('ReportsService', () => {
  let service: ReportsService;
  let reportService: jest.Mocked<ReportService>;
  let analysisService: jest.Mocked<AnalysisService>;
  let aggregationService: jest.Mocked<ReportsAggregationService>;
  let authorizationService: jest.Mocked<ReportsAuthorizationService>;

  beforeEach(async () => {
    const mockReportService: jest.Mocked<Partial<ReportService>> = {
      create: jest.fn(),
      getByIdOrThrow: jest.fn(),
      findAllForAdmin: jest.fn(),
      countAllForAdmin: jest.fn(),
      findOwnExcludingArchival: jest.fn(),
      countOwnExcludingArchival: jest.fn(),
    };
    const mockAnalysisService: jest.Mocked<Partial<AnalysisService>> = {
      findSuccessfulInDateRange: jest.fn(),
    };
    const mockAggregationService: jest.Mocked<Partial<ReportsAggregationService>> = {
      aggregate: jest.fn(),
    };
    const mockAuthorizationService: jest.Mocked<Partial<ReportsAuthorizationService>> = {
      assertCanView: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: ReportService, useValue: mockReportService },
        { provide: AnalysisService, useValue: mockAnalysisService },
        { provide: ReportsAggregationService, useValue: mockAggregationService },
        { provide: ReportsAuthorizationService, useValue: mockAuthorizationService },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    reportService = module.get(ReportService);
    analysisService = module.get(AnalysisService);
    aggregationService = module.get(ReportsAggregationService);
    authorizationService = module.get(ReportsAuthorizationService);
  });

  describe('create', () => {
    it('fetches successful analyses, aggregates them, and persists the result', async () => {
      const user = mockUser({ role: Role.ADMIN });
      analysisService.findSuccessfulInDateRange.mockResolvedValue([]);
      aggregationService.aggregate.mockReturnValue(mockAggregation);
      reportService.create.mockResolvedValue(mockReportRecord());

      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');
      const result = await service.create(user, { dateFrom, dateTo });

      expect(analysisService.findSuccessfulInDateRange).toHaveBeenCalledWith({
        dateFrom,
        dateTo,
      });
      expect(aggregationService.aggregate).toHaveBeenCalled();
      expect(reportService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestedBy: { connect: { id: user.id } },
          isEmpty: false,
          analysisCount: 2,
        }),
      );
      expect(result.id).toBe('report-1');
    });

    it('strips userId/email from mostActiveUsers for an ANALYST requester', async () => {
      const analyst = mockUser({ role: Role.ANALYST });
      analysisService.findSuccessfulInDateRange.mockResolvedValue([]);
      aggregationService.aggregate.mockReturnValue(mockAggregation);
      reportService.create.mockResolvedValue(mockReportRecord());

      const result = await service.create(analyst, {
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31'),
      });

      expect(result.mostActiveUsers[0]).toEqual({ analysisCount: 2 });
    });

    it('includes userId/email in mostActiveUsers for a MANAGER requester', async () => {
      const manager = mockUser({ role: Role.MANAGER });
      analysisService.findSuccessfulInDateRange.mockResolvedValue([]);
      aggregationService.aggregate.mockReturnValue(mockAggregation);
      reportService.create.mockResolvedValue(mockReportRecord());

      const result = await service.create(manager, {
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31'),
      });

      expect(result.mostActiveUsers[0]).toEqual({
        userId: 'user-1',
        email: 'a@a.com',
        analysisCount: 2,
      });
    });
  });

  describe('getByIdOrThrow', () => {
    it('returns the report when authorization passes', async () => {
      const admin = mockUser({ role: Role.ADMIN });
      reportService.getByIdOrThrow.mockResolvedValue(mockReportRecord());

      const result = await service.getByIdOrThrow(admin, 'report-1');

      expect(authorizationService.assertCanView).toHaveBeenCalledWith(
        admin,
        mockReportRecord(),
      );
      expect(result.id).toBe('report-1');
    });

    it('propagates the exception when authorization denies access', async () => {
      const manager = mockUser({ role: Role.MANAGER, id: 'someone-else' });
      reportService.getByIdOrThrow.mockResolvedValue(mockReportRecord());
      authorizationService.assertCanView.mockImplementation(() => {
        throw new ReportNotOwnedException('report-1');
      });

      await expect(
        service.getByIdOrThrow(manager, 'report-1'),
      ).rejects.toThrow(ReportNotOwnedException);
    });
  });

  describe('list', () => {
    it('fetches all reports for ADMIN, unfiltered by ownership', async () => {
      const admin = mockUser({ role: Role.ADMIN });
      reportService.findAllForAdmin.mockResolvedValue([mockReportRecord()]);
      reportService.countAllForAdmin.mockResolvedValue(1);

      const result = await service.list(admin, {});

      expect(reportService.findAllForAdmin).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
      });
      expect(reportService.findOwnExcludingArchival).not.toHaveBeenCalled();
      expect(result.total).toBe(1);
    });

    it('fetches only own reports and excludes archival ones for MANAGER', async () => {
      const manager = mockUser({ role: Role.MANAGER });
      reportService.findOwnExcludingArchival.mockResolvedValue([mockReportRecord()]);
      reportService.countOwnExcludingArchival.mockResolvedValue(1);

      await service.list(manager, { page: 1, limit: 20 });

      expect(reportService.findOwnExcludingArchival).toHaveBeenCalledWith({
        requestedById: manager.id,
        excludeArchival: true,
        skip: 0,
        take: 20,
      });
    });

    it('fetches only own reports without excluding archival ones for ANALYST', async () => {
      const analyst = mockUser({ role: Role.ANALYST });
      reportService.findOwnExcludingArchival.mockResolvedValue([]);
      reportService.countOwnExcludingArchival.mockResolvedValue(0);

      await service.list(analyst, {});

      expect(reportService.findOwnExcludingArchival).toHaveBeenCalledWith({
        requestedById: analyst.id,
        excludeArchival: false,
        skip: 0,
        take: 20,
      });
    });

    it('applies the requested page and limit to skip calculation', async () => {
      const admin = mockUser({ role: Role.ADMIN });
      reportService.findAllForAdmin.mockResolvedValue([]);
      reportService.countAllForAdmin.mockResolvedValue(0);

      await service.list(admin, { page: 3, limit: 10 });

      expect(reportService.findAllForAdmin).toHaveBeenCalledWith({
        skip: 20,
        take: 10,
      });
    });
  });
});
