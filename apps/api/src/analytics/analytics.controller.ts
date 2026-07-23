import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import {
  AnalyzeArgs,
  GetAnalysisHistoryArgs,
  AnalysisOutput,
  PaginatedAnalysesOutput,
} from './models';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Submit text for sentiment and keyword analysis' })
  async analyze(
    @Body() body: AnalyzeArgs,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AnalysisOutput> {
    this.logger.log({
      message: 'POST /analytics/analyze',
      meta: { userId: body.userId },
    });
    const { output, isNewRecord } = await this.analyticsService.analyze(body);
    res.status(isNewRecord ? HttpStatus.CREATED : HttpStatus.OK);
    return output;
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get paginated analysis history for a user' })
  async getHistoryForUser(
    @Param('id') id: string,
    @Query() query: GetAnalysisHistoryArgs,
  ): Promise<PaginatedAnalysesOutput> {
    this.logger.log({
      message: 'GET /analytics/users/:id',
      meta: { id, query },
    });
    return this.analyticsService.getHistoryForUser(id, query);
  }
}
