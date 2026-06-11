import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserModule } from '../entities/user/user.module';

@Module({
  imports: [UserModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
