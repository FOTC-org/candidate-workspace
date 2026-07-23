import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActiveUserOutput {
  @ApiPropertyOptional()
  userId?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiProperty()
  analysisCount!: number;
}

export class ReportOutput {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  requestedById!: string;

  @ApiProperty()
  dateFrom!: Date;

  @ApiProperty()
  dateTo!: Date;

  @ApiProperty()
  isEmpty!: boolean;

  @ApiProperty()
  analysisCount!: number;

  @ApiProperty({ type: Object })
  sentimentDistribution!: Record<string, number>;

  @ApiProperty({ type: [ActiveUserOutput] })
  mostActiveUsers!: ActiveUserOutput[];

  @ApiProperty()
  createdAt!: Date;
}

export class PaginatedReportsOutput {
  @ApiProperty({ type: [ReportOutput] })
  items!: ReportOutput[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
