import { Test, TestingModule } from '@nestjs/testing';
import { Role, User, Report } from '@prisma/client';
import { ReportsAuthorizationService } from './reports-authorization.service';
import {
  ReportNotOwnedException,
  ReportArchivalRestrictedException,
} from './reports.exceptions';

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

const mockReport = (overrides: Partial<Report> = {}): Report => ({
  id: 'report-1',
  requestedById: 'user-1',
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-01-31'),
  isEmpty: false,
  analysisCount: 10,
  sentimentDistribution: {},
  mostActiveUsers: [],
  coversOnlyInactiveUsers: false,
  createdAt: new Date(),
  ...overrides,
});

describe('ReportsAuthorizationService', () => {
  let service: ReportsAuthorizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsAuthorizationService],
    }).compile();

    service = module.get<ReportsAuthorizationService>(
      ReportsAuthorizationService,
    );
  });

  describe('ADMIN', () => {
    it('is always allowed, regardless of ownership or archival status', () => {
      const admin = mockUser({ id: 'admin-1', role: Role.ADMIN });
      const report = mockReport({
        requestedById: 'someone-else',
        coversOnlyInactiveUsers: true,
      });

      expect(() => service.assertCanView(admin, report)).not.toThrow();
    });
  });

  describe('MANAGER', () => {
    it('is allowed when they own the report and it does not cover only inactive users', () => {
      const manager = mockUser({ id: 'manager-1', role: Role.MANAGER });
      const report = mockReport({
        requestedById: 'manager-1',
        coversOnlyInactiveUsers: false,
      });

      expect(() => service.assertCanView(manager, report)).not.toThrow();
    });

    it('throws ReportArchivalRestrictedException when they own the report but it covers only inactive users', () => {
      const manager = mockUser({ id: 'manager-1', role: Role.MANAGER });
      const report = mockReport({
        requestedById: 'manager-1',
        coversOnlyInactiveUsers: true,
      });

      expect(() => service.assertCanView(manager, report)).toThrow(
        ReportArchivalRestrictedException,
      );
    });

    it('throws ReportNotOwnedException when they do not own the report, even if not archival', () => {
      const manager = mockUser({ id: 'manager-1', role: Role.MANAGER });
      const report = mockReport({
        requestedById: 'someone-else',
        coversOnlyInactiveUsers: false,
      });

      expect(() => service.assertCanView(manager, report)).toThrow(
        ReportNotOwnedException,
      );
    });

    it('throws ReportNotOwnedException (not the archival exception) when they neither own it nor is it archival-relevant to them', () => {
      const manager = mockUser({ id: 'manager-1', role: Role.MANAGER });
      const report = mockReport({
        requestedById: 'someone-else',
        coversOnlyInactiveUsers: true,
      });

      expect(() => service.assertCanView(manager, report)).toThrow(
        ReportNotOwnedException,
      );
    });
  });

  describe('ANALYST', () => {
    it('is allowed when they own the report', () => {
      const analyst = mockUser({ id: 'analyst-1', role: Role.ANALYST });
      const report = mockReport({ requestedById: 'analyst-1' });

      expect(() => service.assertCanView(analyst, report)).not.toThrow();
    });

    it('is allowed even when their own report covers only inactive users', () => {
      const analyst = mockUser({ id: 'analyst-1', role: Role.ANALYST });
      const report = mockReport({
        requestedById: 'analyst-1',
        coversOnlyInactiveUsers: true,
      });

      expect(() => service.assertCanView(analyst, report)).not.toThrow();
    });

    it('throws ReportNotOwnedException when they do not own the report', () => {
      const analyst = mockUser({ id: 'analyst-1', role: Role.ANALYST });
      const report = mockReport({ requestedById: 'someone-else' });

      expect(() => service.assertCanView(analyst, report)).toThrow(
        ReportNotOwnedException,
      );
    });
  });
});
