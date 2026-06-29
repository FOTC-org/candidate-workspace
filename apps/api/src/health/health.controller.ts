import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators';

interface HealthOutput {
  status: 'ok' | 'error';
  database: 'ok' | 'error';
  timestamp: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check — app and database status' })
  async check(): Promise<HealthOutput> {
    this.logger.log({ message: 'GET /health' });

    let databaseStatus: 'ok' | 'error' = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      databaseStatus = 'error';
    }

    return {
      status: databaseStatus === 'ok' ? 'ok' : 'error',
      database: databaseStatus,
      timestamp: new Date().toISOString(),
    };
  }
}
