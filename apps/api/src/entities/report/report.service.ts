import { Injectable } from '@nestjs/common';
import { Report, Prisma } from '@prisma/client';
import { ReportRepository } from './report.repository';
import { ReportNotFoundException } from './report.exceptions';

@Injectable()
export class ReportService {
  constructor(private readonly reportRepository: ReportRepository) {}

  async create(data: Prisma.ReportCreateInput): Promise<Report> {
    return this.reportRepository.create(data);
  }

  async getByIdOrThrow(id: string): Promise<Report> {
    const report = await this.reportRepository.findById(id);
    if (!report) throw new ReportNotFoundException(id);
    return report;
  }

  async findAllForAdmin(params: {
    skip?: number;
    take?: number;
  }): Promise<Report[]> {
    return this.reportRepository.findAllForAdmin(params);
  }

  async countAllForAdmin(): Promise<number> {
    return this.reportRepository.countAllForAdmin();
  }

  async findOwnExcludingArchival(params: {
    requestedById: string;
    excludeArchival: boolean;
    skip?: number;
    take?: number;
  }): Promise<Report[]> {
    return this.reportRepository.findOwnExcludingArchival(params);
  }

  async countOwnExcludingArchival(params: {
    requestedById: string;
    excludeArchival: boolean;
  }): Promise<number> {
    return this.reportRepository.countOwnExcludingArchival(params);
  }
}
