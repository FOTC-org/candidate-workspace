import { Injectable } from '@nestjs/common';
import { User, Prisma, Role } from '@prisma/client';
import { UserRepository } from './user.repository';
import {
  UserNotFoundException,
  UserAlreadyExistsException,
  UserInactiveException,
} from './user.exceptions';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getByEmailOrThrow(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new UserNotFoundException(email);
    return user;
  }

  async getByIdOrThrow(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new UserNotFoundException(id);
    return user;
  }

  async getActiveByEmailOrThrow(email: string): Promise<User> {
    const user = await this.getByEmailOrThrow(email);
    if (!user.isActive) throw new UserInactiveException();
    return user;
  }

  async assertEmailNotTaken(email: string): Promise<void> {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) throw new UserAlreadyExistsException(email);
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.userRepository.create(data);
  }

  async findAll(params: { skip?: number; take?: number }): Promise<User[]> {
    return this.userRepository.findAll(params);
  }

  async count(): Promise<number> {
    return this.userRepository.count();
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.userRepository.update(id, data);
  }

  async updateRole(id: string, role: Role): Promise<User> {
    return this.userRepository.updateRole(id, role);
  }

  async deactivate(id: string): Promise<User> {
    await this.getByIdOrThrow(id);
    return this.userRepository.deactivate(id);
  }
}
