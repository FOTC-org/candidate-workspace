import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UserService } from '../entities/user/user.service';
import {
  UserAlreadyExistsException,
  UserNotFoundException,
} from '../entities/user/user.exceptions';
import { Role, User } from '@prisma/client';
import * as argon2 from 'argon2';

jest.mock('argon2');

const mockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: 'hashed',
  role: Role.ANALYST,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('UsersService', () => {
  let service: UsersService;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    const mockUserService: jest.Mocked<Partial<UserService>> = {
      findAll: jest.fn(),
      count: jest.fn(),
      getByIdOrThrow: jest.fn(),
      assertEmailNotTaken: jest.fn(),
      update: jest.fn(),
      updateRole: jest.fn(),
      deactivate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userService = module.get(UserService);
  });

  describe('findAll', () => {
    it('returns paginated users', async () => {
      const users = [mockUser(), mockUser({ id: 'user-2', email: 'b@b.com' })];
      userService.findAll.mockResolvedValue(users);
      userService.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('returns empty list when no users', async () => {
      userService.findAll.mockResolvedValue([]);
      userService.count.mockResolvedValue(0);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('returns user output', async () => {
      userService.getByIdOrThrow.mockResolvedValue(mockUser());

      const result = await service.findOne('user-1');

      expect(result.id).toBe('user-1');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('throws when user not found', async () => {
      userService.getByIdOrThrow.mockRejectedValue(
        new UserNotFoundException('nonexistent'),
      );

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('updates email when new email is provided', async () => {
      const updated = mockUser({ email: 'new@example.com' });
      userService.assertEmailNotTaken.mockResolvedValue(undefined);
      userService.update.mockResolvedValue(updated);

      const result = await service.updateProfile('user-1', {
        email: 'new@example.com',
      });

      expect(result.email).toBe('new@example.com');
      expect(userService.assertEmailNotTaken).toHaveBeenCalledWith(
        'new@example.com',
      );
    });

    it('hashes password when new password is provided', async () => {
      const updated = mockUser();
      (argon2.hash as jest.Mock).mockResolvedValue('new-hash');
      userService.update.mockResolvedValue(updated);

      await service.updateProfile('user-1', { password: 'NewPass123!' });

      expect(argon2.hash).toHaveBeenCalledWith('NewPass123!');
      expect(userService.update).toHaveBeenCalledWith('user-1', {
        passwordHash: 'new-hash',
      });
    });

    it('throws when new email is already taken', async () => {
      userService.assertEmailNotTaken.mockRejectedValue(
        new UserAlreadyExistsException('taken@example.com'),
      );

      await expect(
        service.updateProfile('user-1', { email: 'taken@example.com' }),
      ).rejects.toThrow(UserAlreadyExistsException);
    });
  });

  describe('updateRole', () => {
    it('updates user role', async () => {
      userService.updateRole.mockResolvedValue(mockUser({ role: Role.ADMIN }));

      const result = await service.updateRole('user-1', { role: Role.ADMIN });

      expect(result.role).toBe(Role.ADMIN);
    });
  });

  describe('deactivate', () => {
    it('deactivates user', async () => {
      userService.deactivate.mockResolvedValue(mockUser({ isActive: false }));

      const result = await service.deactivate('user-1');

      expect(result.isActive).toBe(false);
    });

    it('throws when user not found', async () => {
      userService.deactivate.mockRejectedValue(
        new UserNotFoundException('nonexistent'),
      );

      await expect(service.deactivate('nonexistent')).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });
});
