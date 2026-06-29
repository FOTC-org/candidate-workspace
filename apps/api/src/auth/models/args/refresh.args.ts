import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshArgs {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}
