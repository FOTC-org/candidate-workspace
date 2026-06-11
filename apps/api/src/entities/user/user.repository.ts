import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, Prisma, Role } from '@prisma/client';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findAll(params: { skip?: number; take?: number }): Promise<User[]> {
    return this.prisma.user.findMany({
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(): Promise<number> {
    return this.prisma.user.count();
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async updateRole(id: string, role: Role): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { role } });
  }

  async deactivate(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
