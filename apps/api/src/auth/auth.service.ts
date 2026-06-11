import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { User } from '@prisma/client';
import { UserService } from '../entities/user/user.service';
import { getJwtConfig } from '../config/jwt-config';
import {
  RegisterArgs,
  LoginArgs,
  AuthTokensOutput,
  UserProfileOutput,
  INVALID_CREDENTIALS,
  REFRESH_TOKEN_INVALID,
} from './models';
import { DomainException } from '../common/exceptions';
import { HttpStatus } from '@nestjs/common';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(args: RegisterArgs): Promise<AuthTokensOutput> {
    this.logger.log({ message: 'Register user', meta: { email: args.email } });

    await this.userService.assertEmailNotTaken(args.email);

    const passwordHash = await argon2.hash(args.password);
    const user = await this.userService.create({
      email: args.email,
      passwordHash,
    });

    return this.generateTokens(user);
  }

  async login(args: LoginArgs): Promise<AuthTokensOutput> {
    this.logger.log({ message: 'Login user', meta: { email: args.email } });

    const user = await this.userService
      .getActiveByEmailOrThrow(args.email)
      .catch(() => {
        throw new DomainException(
          'INVALID_CREDENTIALS',
          INVALID_CREDENTIALS,
          HttpStatus.UNAUTHORIZED,
        );
      });

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      args.password,
    );
    if (!isPasswordValid) {
      throw new DomainException(
        'INVALID_CREDENTIALS',
        INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.generateTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokensOutput> {
    this.logger.log({ message: 'Refresh tokens' });

    const jwtConfig = getJwtConfig(this.configService);
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: jwtConfig.refreshSecret,
      });
    } catch {
      throw new DomainException(
        'REFRESH_TOKEN_INVALID',
        REFRESH_TOKEN_INVALID,
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.userService
      .getByIdOrThrow(payload.sub)
      .catch(() => {
        throw new DomainException(
          'REFRESH_TOKEN_INVALID',
          REFRESH_TOKEN_INVALID,
          HttpStatus.UNAUTHORIZED,
        );
      });

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    return this.generateTokens(user);
  }

  private generateTokens(user: User): AuthTokensOutput {
    const jwtConfig = getJwtConfig(this.configService);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtConfig.secret,
      expiresIn: jwtConfig.expiresIn as never,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: jwtConfig.refreshSecret,
      expiresIn: jwtConfig.refreshExpiresIn as never,
    });

    return { accessToken, refreshToken };
  }

  mapToProfileOutput(user: User): UserProfileOutput {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
