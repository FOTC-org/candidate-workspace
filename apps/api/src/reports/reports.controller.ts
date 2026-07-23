import { Controller, Get, Post, Body, Param, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../common/decorators';
import {
  CreateReportArgs,
  ListReportsArgs,
  ReportOutput,
  PaginatedReportsOutput,
} from './models';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({ summary: 'List reports visible to the current user' })
  async list(
    @CurrentUser() user: User,
    @Query() query: ListReportsArgs,
  ): Promise<PaginatedReportsOutput> {
    this.logger.log({ message: 'GET /reports', meta: { userId: user.id, query } });
    return this.reportsService.list(user, query);
  }

  @Post()
  @ApiOperation({ summary: 'Generate a report for a date range' })
  async create(
    @CurrentUser() user: User,
    @Body() body: CreateReportArgs,
  ): Promise<ReportOutput> {
    this.logger.log({ message: 'POST /reports', meta: { userId: user.id } });
    return this.reportsService.create(user, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a report by id' })
  async getById(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ReportOutput> {
    this.logger.log({ message: 'GET /reports/:id', meta: { userId: user.id, id } });
    return this.reportsService.getByIdOrThrow(user, id);
  }
}
