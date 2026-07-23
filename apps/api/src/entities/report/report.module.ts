import { Module } from '@nestjs/common';
import { ReportRepository } from './report.repository';
import { ReportService } from './report.service';

@Module({
  providers: [ReportRepository, ReportService],
  exports: [ReportService],
})
export class ReportModule {}
