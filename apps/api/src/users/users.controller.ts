import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { UsersService } from './users.service';
import { Roles, CurrentUser } from '../common/decorators';
import {
  ListUsersArgs,
  UpdateUserArgs,
  UpdateRoleArgs,
  UserOutput,
  PaginatedUsersOutput,
} from './models';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all users (ADMIN only)' })
  async findAll(@Query() query: ListUsersArgs): Promise<PaginatedUsersOutput> {
    this.logger.log({ message: 'GET /users', meta: { query } });
    return this.usersService.findAll(query);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get own profile' })
  async getMe(@CurrentUser() user: User): Promise<UserOutput> {
    this.logger.log({ message: 'GET /users/me', meta: { userId: user.id } });
    return this.usersService.findOne(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update own profile (email, password)' })
  async updateMe(
    @CurrentUser() user: User,
    @Body() body: UpdateUserArgs,
  ): Promise<UserOutput> {
    this.logger.log({ message: 'PATCH /users/me', meta: { userId: user.id } });
    return this.usersService.updateProfile(user.id, body);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get user by id (ADMIN only)' })
  async findOne(@Param('id') id: string): Promise<UserOutput> {
    this.logger.log({ message: 'GET /users/:id', meta: { id } });
    return this.usersService.findOne(id);
  }

  @Patch(':id/role')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update user role (ADMIN only)' })
  async updateRole(
    @Param('id') id: string,
    @Body() body: UpdateRoleArgs,
  ): Promise<UserOutput> {
    this.logger.log({
      message: 'PATCH /users/:id/role',
      meta: { id, role: body.role },
    });
    return this.usersService.updateRole(id, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Deactivate user (soft delete, ADMIN only)' })
  async deactivate(@Param('id') id: string): Promise<UserOutput> {
    this.logger.log({ message: 'DELETE /users/:id', meta: { id } });
    return this.usersService.deactivate(id);
  }
}
