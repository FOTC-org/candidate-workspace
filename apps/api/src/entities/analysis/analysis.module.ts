import { Module } from '@nestjs/common';
import { AnalysisRepository } from './analysis.repository';
import { AnalysisService } from './analysis.service';

@Module({
  providers: [AnalysisRepository, AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
