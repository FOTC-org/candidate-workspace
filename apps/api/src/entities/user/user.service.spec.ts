import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import {
  UserNotFoundException,
  UserAlreadyExistsException,
  UserInactiveException,
} from './user.exceptions';
import { Role, User } from '@prisma/client';

const mockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: 'hash',
  role: Role.ANALYST,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    const mockRepo: jest.Mocked<Partial<UserRepository>> = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateRole: jest.fn(),
      deactivate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: UserRepository, useValue: mockRepo }],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(UserRepository);
  });

  describe('getByEmailOrThrow', () => {
    it('returns user when found', async () => {
      const user = mockUser();
      repository.findByEmail.mockResolvedValue(user);

      const result = await service.getByEmailOrThrow('test@example.com');

      expect(result).toEqual(user);
    });

    it('throws UserNotFoundException when user not found', async () => {
      repository.findByEmail.mockResolvedValue(null);

      await expect(
        service.getByEmailOrThrow('missing@example.com'),
      ).rejects.toThrow(UserNotFoundException);
    });
  });

  describe('getByIdOrThrow', () => {
    it('returns user when found', async () => {
      const user = mockUser();
      repository.findById.mockResolvedValue(user);

      const result = await service.getByIdOrThrow('user-1');

      expect(result).toEqual(user);
    });

    it('throws UserNotFoundException when user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getByIdOrThrow('nonexistent')).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe('getActiveByEmailOrThrow', () => {
    it('returns active user', async () => {
      const user = mockUser({ isActive: true });
      repository.findByEmail.mockResolvedValue(user);

      const result = await service.getActiveByEmailOrThrow('test@example.com');

      expect(result).toEqual(user);
    });

    it('throws UserInactiveException when user is inactive', async () => {
      const user = mockUser({ isActive: false });
      repository.findByEmail.mockResolvedValue(user);

      await expect(
        service.getActiveByEmailOrThrow('test@example.com'),
      ).rejects.toThrow(UserInactiveException);
    });

    it('throws UserNotFoundException when user not found', async () => {
      repository.findByEmail.mockResolvedValue(null);

      await expect(
        service.getActiveByEmailOrThrow('missing@example.com'),
      ).rejects.toThrow(UserNotFoundException);
    });
  });

  describe('assertEmailNotTaken', () => {
    it('resolves when email is free', async () => {
      repository.findByEmail.mockResolvedValue(null);

      await expect(
        service.assertEmailNotTaken('new@example.com'),
      ).resolves.not.toThrow();
    });

    it('throws UserAlreadyExistsException when email is taken', async () => {
      repository.findByEmail.mockResolvedValue(mockUser());

      await expect(
        service.assertEmailNotTaken('test@example.com'),
      ).rejects.toThrow(UserAlreadyExistsException);
    });
  });

  describe('deactivate', () => {
    it('deactivates existing user', async () => {
      const user = mockUser();
      const deactivated = mockUser({ isActive: false });
      repository.findById.mockResolvedValue(user);
      repository.deactivate.mockResolvedValue(deactivated);

      const result = await service.deactivate('user-1');

      expect(result.isActive).toBe(false);
      expect(repository.deactivate).toHaveBeenCalledWith('user-1');
    });

    it('throws UserNotFoundException when user not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deactivate('nonexistent')).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe('updateRole', () => {
    it('updates user role', async () => {
      const updated = mockUser({ role: Role.ADMIN });
      repository.updateRole.mockResolvedValue(updated);

      const result = await service.updateRole('user-1', Role.ADMIN);

      expect(result.role).toBe(Role.ADMIN);
      expect(repository.updateRole).toHaveBeenCalledWith('user-1', Role.ADMIN);
    });
  });
});
