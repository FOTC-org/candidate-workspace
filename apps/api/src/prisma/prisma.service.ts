import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log({ message: 'Prisma connected to database' });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log({ message: 'Prisma disconnected from database' });
  }
}
