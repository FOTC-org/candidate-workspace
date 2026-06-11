import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserOutput {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class PaginatedUsersOutput {
  @ApiProperty({ type: [UserOutput] })
  items!: UserOutput[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
