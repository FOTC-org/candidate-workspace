import { registerAs } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { DatabaseConfigModel } from './database-config-model';

const DatabaseConfigName = 'databaseConfig';

export const DatabaseConfig = registerAs(
  DatabaseConfigName,
  (): DatabaseConfigModel => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL env variable is required');
    }
    return { url };
  },
);

export const getDatabaseConfig = (
  configService: ConfigService,
): DatabaseConfigModel =>
  configService.get<DatabaseConfigModel>(DatabaseConfigName)!;
