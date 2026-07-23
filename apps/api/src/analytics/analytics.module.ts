import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalysisModule } from '../entities/analysis/analysis.module';
import { AnalyticsProviderClient } from './providers/analytics-provider.client';

@Module({
  imports: [AnalysisModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsProviderClient],
})
export class AnalyticsModule {}
