import { registerAs } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { JwtConfigModel } from './jwt-config-model';

const JwtConfigName = 'jwtConfig';

export const JwtConfig = registerAs(JwtConfigName, (): JwtConfigModel => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET env variable is required');

  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!refreshSecret)
    throw new Error('JWT_REFRESH_SECRET env variable is required');

  return {
    secret,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshSecret,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  };
});

export const getJwtConfig = (configService: ConfigService): JwtConfigModel =>
  configService.get<JwtConfigModel>(JwtConfigName)!;
