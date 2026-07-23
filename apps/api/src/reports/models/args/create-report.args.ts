import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';
import {
  IsDateFromBeforeOrEqualDateTo,
  IsNotFutureDate,
  IsWithinMaxRangeDays,
} from '../validators/date-range.validators';

export class CreateReportArgs {
  @ApiProperty({ example: '2024-01-01' })
  @Type(() => Date)
  @IsDate()
  dateFrom!: Date;

  @ApiProperty({ example: '2024-01-31' })
  @Type(() => Date)
  @IsDate()
  @IsDateFromBeforeOrEqualDateTo()
  @IsNotFutureDate()
  @IsWithinMaxRangeDays()
  dateTo!: Date;
}
