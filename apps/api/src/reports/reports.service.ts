import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { ReportService } from '../entities/report/report.service';
import { AnalysisService } from '../entities/analysis/analysis.service';
import { ReportsAggregationService } from './reports-aggregation.service';
import { ReportsAuthorizationService } from './reports-authorization.service';
import { CreateReportArgs, ListReportsArgs } from './models/args';
import { ReportOutput, PaginatedReportsOutput, ActiveUserOutput } from './models/output';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly reportService: ReportService,
    private readonly analysisService: AnalysisService,
    private readonly reportsAggregationService: ReportsAggregationService,
    private readonly reportsAuthorizationService: ReportsAuthorizationService,
  ) {}

  async create(user: User, args: CreateReportArgs): Promise<ReportOutput> {
    const records = await this.analysisService.findSuccessfulInDateRange({
      dateFrom: args.dateFrom,
      dateTo: args.dateTo,
    });
    const aggregation = this.reportsAggregationService.aggregate(records);

    this.logger.log({
      message: 'Create report',
      meta: { requestedById: user.id, isEmpty: aggregation.isEmpty },
    });

    const report = await this.reportService.create({
      requestedBy: { connect: { id: user.id } },
      dateFrom: args.dateFrom,
      dateTo: args.dateTo,
      isEmpty: aggregation.isEmpty,
      analysisCount: aggregation.analysisCount,
      sentimentDistribution: aggregation.sentimentDistribution as Prisma.InputJsonValue,
      mostActiveUsers: aggregation.mostActiveUsers as unknown as Prisma.InputJsonValue,
      coversOnlyInactiveUsers: aggregation.coversOnlyInactiveUsers,
    });

    return this.mapToOutput(report, user.role);
  }

  async getByIdOrThrow(user: User, id: string): Promise<ReportOutput> {
    const report = await this.reportService.getByIdOrThrow(id);
    this.reportsAuthorizationService.assertCanView(user, report);
    return this.mapToOutput(report, user.role);
  }

  async list(user: User, query: ListReportsArgs): Promise<PaginatedReportsOutput> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all(
      user.role === Role.ADMIN
        ? [
            this.reportService.findAllForAdmin({ skip, take: limit }),
            this.reportService.countAllForAdmin(),
          ]
        : [
            this.reportService.findOwnExcludingArchival({
              requestedById: user.id,
              excludeArchival: user.role === Role.MANAGER,
              skip,
              take: limit,
            }),
            this.reportService.countOwnExcludingArchival({
              requestedById: user.id,
              excludeArchival: user.role === Role.MANAGER,
            }),
          ],
    );

    return {
      items: items.map((report) => this.mapToOutput(report, user.role)),
      total,
      page,
      limit,
    };
  }

  private mapToOutput(
    report: {
      id: string;
      requestedById: string;
      dateFrom: Date;
      dateTo: Date;
      isEmpty: boolean;
      analysisCount: number;
      sentimentDistribution: unknown;
      mostActiveUsers: unknown;
      createdAt: Date;
    },
    role: Role,
  ): ReportOutput {
    const activeUsers = report.mostActiveUsers as ActiveUserOutput[];

    return {
      id: report.id,
      requestedById: report.requestedById,
      dateFrom: report.dateFrom,
      dateTo: report.dateTo,
      isEmpty: report.isEmpty,
      analysisCount: report.analysisCount,
      sentimentDistribution: report.sentimentDistribution as Record<string, number>,
      mostActiveUsers:
        role === Role.ANALYST
          ? activeUsers.map((u) => ({ analysisCount: u.analysisCount }))
          : activeUsers,
      createdAt: report.createdAt,
    };
  }
}
