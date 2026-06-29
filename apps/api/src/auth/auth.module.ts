import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtConfig } from '../config/jwt-config';
import { UserModule } from '../entities/user/user.module';

@Module({
  imports: [
    ConfigModule.forFeature(JwtConfig),
    UserModule,
    PassportModule,
    JwtModule.register({}),
  ],

  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
