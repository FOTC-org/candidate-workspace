import { Injectable, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import { User } from '@prisma/client';
import { UserService } from '../entities/user/user.service';
import {
  ListUsersArgs,
  UpdateUserArgs,
  UpdateRoleArgs,
  UserOutput,
  PaginatedUsersOutput,
} from './models';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly userService: UserService) {}

  async findAll(args: ListUsersArgs): Promise<PaginatedUsersOutput> {
    const page = args.page ?? 1;
    const limit = args.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.userService.findAll({ skip, take: limit }),
      this.userService.count(),
    ]);

    return {
      items: items.map(this.mapToOutput),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<UserOutput> {
    const user = await this.userService.getByIdOrThrow(id);
    return this.mapToOutput(user);
  }

  async updateProfile(id: string, args: UpdateUserArgs): Promise<UserOutput> {
    this.logger.log({ message: 'Update user profile', meta: { id } });

    const updateData: Record<string, unknown> = {};

    if (args.email) {
      await this.userService.assertEmailNotTaken(args.email);
      updateData.email = args.email;
    }

    if (args.password) {
      updateData.passwordHash = await argon2.hash(args.password);
    }

    const user = await this.userService.update(id, updateData);
    return this.mapToOutput(user);
  }

  async updateRole(id: string, args: UpdateRoleArgs): Promise<UserOutput> {
    this.logger.log({
      message: 'Update user role',
      meta: { id, role: args.role },
    });
    const user = await this.userService.updateRole(id, args.role);
    return this.mapToOutput(user);
  }

  async deactivate(id: string): Promise<UserOutput> {
    this.logger.log({ message: 'Deactivate user', meta: { id } });
    const user = await this.userService.deactivate(id);
    return this.mapToOutput(user);
  }

  private mapToOutput(user: User): UserOutput {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
