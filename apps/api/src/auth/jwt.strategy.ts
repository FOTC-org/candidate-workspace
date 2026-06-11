import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { User } from '@prisma/client';
import { getJwtConfig } from '../config/jwt-config';
import { UserService } from '../entities/user/user.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly userService: UserService,
  ) {
    const jwtConfig = getJwtConfig(configService);
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.secret,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userService.getByIdOrThrow(payload.sub);
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }
    return user;
  }
}
