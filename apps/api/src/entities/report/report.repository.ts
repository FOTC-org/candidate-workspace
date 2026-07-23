import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Report, Prisma } from '@prisma/client';

@Injectable()
export class ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ReportCreateInput): Promise<Report> {
    return this.prisma.report.create({ data });
  }

  async findById(id: string): Promise<Report | null> {
    return this.prisma.report.findUnique({ where: { id } });
  }

  async findAllForAdmin(params: {
    skip?: number;
    take?: number;
  }): Promise<Report[]> {
    return this.prisma.report.findMany({
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async countAllForAdmin(): Promise<number> {
    return this.prisma.report.count();
  }

  async findOwnExcludingArchival(params: {
    requestedById: string;
    excludeArchival: boolean;
    skip?: number;
    take?: number;
  }): Promise<Report[]> {
    return this.prisma.report.findMany({
      where: {
        requestedById: params.requestedById,
        ...(params.excludeArchival ? { coversOnlyInactiveUsers: false } : {}),
      },
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async countOwnExcludingArchival(params: {
    requestedById: string;
    excludeArchival: boolean;
  }): Promise<number> {
    return this.prisma.report.count({
      where: {
        requestedById: params.requestedById,
        ...(params.excludeArchival ? { coversOnlyInactiveUsers: false } : {}),
      },
    });
  }
}
