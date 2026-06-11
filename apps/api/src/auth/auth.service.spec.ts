import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UserService } from '../entities/user/user.service';
import {
  UserAlreadyExistsException,
  UserInactiveException,
  UserNotFoundException,
} from '../entities/user/user.exceptions';
import { DomainException } from '../common/exceptions';
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

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockUserService: jest.Mocked<Partial<UserService>> = {
      assertEmailNotTaken: jest.fn(),
      create: jest.fn(),
      getActiveByEmailOrThrow: jest.fn(),
      getByIdOrThrow: jest.fn(),
    };

    const mockJwtService: jest.Mocked<Partial<JwtService>> = {
      sign: jest.fn().mockReturnValue('mock-token'),
      verify: jest.fn(),
    };

    const mockConfigService: jest.Mocked<Partial<ConfigService>> = {
      get: jest.fn().mockReturnValue({
        secret: 'test-secret',
        expiresIn: '15m',
        refreshSecret: 'test-refresh-secret',
        refreshExpiresIn: '7d',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  describe('register', () => {
    it('creates user and returns tokens', async () => {
      const user = mockUser();
      userService.assertEmailNotTaken.mockResolvedValue(undefined);
      userService.create.mockResolvedValue(user);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed');

      const result = await service.register({
        email: 'test@example.com',
        password: 'Password1!',
      });

      expect(userService.assertEmailNotTaken).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(userService.create).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('throws when email is already taken', async () => {
      userService.assertEmailNotTaken.mockRejectedValue(
        new UserAlreadyExistsException('test@example.com'),
      );

      await expect(
        service.register({ email: 'test@example.com', password: 'Password1!' }),
      ).rejects.toThrow(UserAlreadyExistsException);
    });
  });

  describe('login', () => {
    it('returns tokens for valid credentials', async () => {
      const user = mockUser();
      userService.getActiveByEmailOrThrow.mockResolvedValue(user);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'Password1!',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('throws DomainException for wrong password', async () => {
      const user = mockUser();
      userService.getActiveByEmailOrThrow.mockResolvedValue(user);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'WrongPass1!' }),
      ).rejects.toThrow(DomainException);
    });

    it('throws DomainException when user not found', async () => {
      userService.getActiveByEmailOrThrow.mockRejectedValue(
        new UserNotFoundException('test@example.com'),
      );

      await expect(
        service.login({ email: 'missing@example.com', password: 'Password1!' }),
      ).rejects.toThrow(DomainException);
    });

    it('throws DomainException when user is inactive', async () => {
      userService.getActiveByEmailOrThrow.mockRejectedValue(
        new UserInactiveException(),
      );

      await expect(
        service.login({
          email: 'inactive@example.com',
          password: 'Password1!',
        }),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('refresh', () => {
    it('returns new tokens for valid refresh token', async () => {
      const user = mockUser();
      jwtService.verify.mockReturnValue({
        sub: 'user-1',
        email: 'test@example.com',
        role: 'ANALYST',
      });
      userService.getByIdOrThrow.mockResolvedValue(user);

      const result = await service.refresh('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('throws DomainException for invalid refresh token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(service.refresh('invalid-token')).rejects.toThrow(
        DomainException,
      );
    });

    it('throws when user from token not found', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'nonexistent',
        email: 'test@example.com',
        role: 'ANALYST',
      });
      userService.getByIdOrThrow.mockRejectedValue(
        new UserNotFoundException('nonexistent'),
      );

      await expect(service.refresh('valid-token')).rejects.toThrow(
        DomainException,
      );
    });
  });
});
