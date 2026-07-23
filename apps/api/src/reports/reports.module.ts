import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsAggregationService } from './reports-aggregation.service';
import { ReportsAuthorizationService } from './reports-authorization.service';
import { ReportModule } from '../entities/report/report.module';
import { AnalysisModule } from '../entities/analysis/analysis.module';

@Module({
  imports: [ReportModule, AnalysisModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportsAggregationService,
    ReportsAuthorizationService,
  ],
})
export class ReportsModule {}
