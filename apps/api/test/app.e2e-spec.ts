import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/health', () => {
    it('returns 200 with ok status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(res.body).toMatchObject({
        status: 'ok',
        database: 'ok',
      });
      expect(typeof (res.body as { timestamp: unknown }).timestamp).toBe(
        'string',
      );
    });
  });

  describe('unknown route under the global prefix', () => {
    it('returns the JSON error body with the full request path', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/does-not-exist?x=1')
        .expect(404);

      expect(res.body).toMatchObject({
        statusCode: 404,
        errorCode: 'NOT_FOUND',
        path: '/api/v1/does-not-exist?x=1',
      });
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns 400 when body is empty', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);
    });

    it('returns 401 for invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'WrongPass1!' })
        .expect(401);
    });
  });
});
