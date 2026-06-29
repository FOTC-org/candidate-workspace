import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { createWinstonLogger } from './common/logger/winston-logger.factory';

async function bootstrap(): Promise<void> {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const logLevel = process.env.LOG_LEVEL ?? 'debug';
  const port = parseInt(process.env.PORT ?? '3001', 10);

  const corsAllowedOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (!corsAllowedOrigins) {
    throw new Error('CORS_ALLOWED_ORIGINS env variable is required');
  }

  const app = await NestFactory.create(AppModule, {
    logger: createWinstonLogger(nodeEnv, logLevel),
  });

  app.getHttpAdapter().getInstance().disable('x-powered-by');

  app.enableCors({
    origin: corsAllowedOrigins.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('UserHub API')
    .setDescription('REST API for the UserHub platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
}

bootstrap();
