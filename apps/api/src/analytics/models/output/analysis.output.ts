import { ApiProperty } from '@nestjs/swagger';
import { AnalysisStatus } from '@prisma/client';

export class AnalysisOutput {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ enum: AnalysisStatus })
  status!: AnalysisStatus;

  @ApiProperty({ nullable: true, type: String })
  sentiment!: string | null;

  @ApiProperty({ nullable: true, type: [String] })
  keywords!: string[] | null;

  @ApiProperty({ nullable: true, type: String })
  errorCode!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class PaginatedAnalysesOutput {
  @ApiProperty({ type: [AnalysisOutput] })
  items!: AnalysisOutput[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
