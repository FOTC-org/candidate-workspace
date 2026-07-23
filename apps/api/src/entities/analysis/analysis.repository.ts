import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Analysis, AnalysisStatus, Prisma } from '@prisma/client';

@Injectable()
export class AnalysisRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AnalysisCreateInput): Promise<Analysis> {
    return this.prisma.analysis.create({ data });
  }

  async update(id: string, data: Prisma.AnalysisUpdateInput): Promise<Analysis> {
    return this.prisma.analysis.update({ where: { id }, data });
  }

  async findRecentDuplicate(params: {
    userId: string;
    textHash: string;
    statuses: AnalysisStatus[];
    createdAfter: Date;
  }): Promise<Analysis | null> {
    return this.prisma.analysis.findFirst({
      where: {
        userId: params.userId,
        textHash: params.textHash,
        status: { in: params.statuses },
        createdAt: { gte: params.createdAfter },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findManyByUser(params: {
    userId: string;
    skip?: number;
    take?: number;
  }): Promise<Analysis[]> {
    return this.prisma.analysis.findMany({
      where: { userId: params.userId },
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async countByUser(userId: string): Promise<number> {
    return this.prisma.analysis.count({ where: { userId } });
  }

  async findSuccessfulInDateRange(params: {
    dateFrom: Date;
    dateTo: Date;
  }): Promise<
    Array<{ userId: string; sentiment: string | null; user: { email: string; isActive: boolean } }>
  > {
    return this.prisma.analysis.findMany({
      where: {
        status: AnalysisStatus.SUCCESS,
        createdAt: { gte: params.dateFrom, lte: params.dateTo },
      },
      select: {
        userId: true,
        sentiment: true,
        user: { select: { email: true, isActive: true } },
      },
    });
  }

}
