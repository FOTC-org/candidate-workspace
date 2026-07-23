import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AnalysisStatus } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Analytics (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  const testEmail = `analytics-e2e-${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';

  const uniqueText = (label: string) =>
    `${label} ${Date.now()}-${Math.random().toString(36).slice(2)}`;

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

    prisma = app.get(PrismaService);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: testEmail, password: testPassword })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(201);

    accessToken = loginRes.body.accessToken;

    const meRes = await request(app.getHttpServer())
      .post('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    userId = meRes.body.id;
  });

  afterAll(async () => {
    await prisma.analysis.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  describe('POST /api/v1/analytics/analyze', () => {
    it('returns 400 when userId and text are missing', () => {
      return request(app.getHttpServer())
        .post('/api/v1/analytics/analyze')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it('creates and returns a SUCCESS analysis on the happy path', async () => {
      const text = uniqueText('happy path');

      const res = await request(app.getHttpServer())
        .post('/api/v1/analytics/analyze')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId, text })
        .expect(201);

      expect(res.body.status).toBe(AnalysisStatus.SUCCESS);
      expect(typeof res.body.sentiment).toBe('string');
      expect(Array.isArray(res.body.keywords)).toBe(true);
      expect(res.body.errorCode).toBeNull();

      const persisted = await prisma.analysis.findUnique({
        where: { id: res.body.id },
      });
      expect(persisted?.attemptsMade).toBe(1);
    });

    it(
      'returns 503 ANALYTICS_PROVIDER_UNAVAILABLE after exhausting retries on a 5xx response',
      async () => {
        const text = `${uniqueText('server error')} __error_500__`;

        const res = await request(app.getHttpServer())
          .post('/api/v1/analytics/analyze')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ userId, text })
          .expect(503);

        expect(res.body.errorCode).toBe('ANALYTICS_PROVIDER_UNAVAILABLE');

        const persisted = await prisma.analysis.findFirst({
          where: { userId, text },
        });
        expect(persisted?.status).toBe(AnalysisStatus.FAILED);
        expect(persisted?.attemptsMade).toBe(3);
      },
      10000,
    );

    it(
      'returns 503 ANALYTICS_PROVIDER_UNAVAILABLE after exhausting retries on a timeout',
      async () => {
        const text = `${uniqueText('timeout case')} __timeout__`;

        const res = await request(app.getHttpServer())
          .post('/api/v1/analytics/analyze')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ userId, text })
          .expect(503);

        expect(res.body.errorCode).toBe('ANALYTICS_PROVIDER_UNAVAILABLE');

        const persisted = await prisma.analysis.findFirst({
          where: { userId, text },
        });
        expect(persisted?.status).toBe(AnalysisStatus.FAILED);
        expect(persisted?.attemptsMade).toBe(3);
      },
      20000,
    );

    it(
      'returns 503 ANALYTICS_INVALID_RESPONSE on a schema-invalid response, without retrying',
      async () => {
        const text = `${uniqueText('partial response')} __partial__`;

        const res = await request(app.getHttpServer())
          .post('/api/v1/analytics/analyze')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ userId, text })
          .expect(503);

        expect(res.body.errorCode).toBe('ANALYTICS_INVALID_RESPONSE');

        const persisted = await prisma.analysis.findFirst({
          where: { userId, text },
        });
        expect(persisted?.status).toBe(AnalysisStatus.FAILED);
        expect(persisted?.attemptsMade).toBe(1);
      },
      10000,
    );

    it('reuses the existing record when identical text is resubmitted within the idempotency window', async () => {
      const text = uniqueText('duplicate submission');

      const first = await request(app.getHttpServer())
        .post('/api/v1/analytics/analyze')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId, text })
        .expect(201);

      const second = await request(app.getHttpServer())
        .post('/api/v1/analytics/analyze')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId, text })
        .expect(200);

      expect(second.body.id).toBe(first.body.id);

      const count = await prisma.analysis.count({ where: { userId, text } });
      expect(count).toBe(1);
    });

    it(
      'creates a new record when identical text is resubmitted after a FAILED result',
      async () => {
        const text = `${uniqueText('retry after failure')} __error_503__`;

        const first = await request(app.getHttpServer())
          .post('/api/v1/analytics/analyze')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ userId, text })
          .expect(503);

        const second = await request(app.getHttpServer())
          .post('/api/v1/analytics/analyze')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ userId, text })
          .expect(503);

        expect(second.body.errorCode).toBe(first.body.errorCode);

        const records = await prisma.analysis.findMany({
          where: { userId, text },
        });
        expect(records).toHaveLength(2);
        expect(records[0].id).not.toBe(records[1].id);
      },
      15000,
    );
  });

  describe('GET /api/v1/analytics/users/:id', () => {
    it('returns paginated analysis history for the user', async () => {
      const text = uniqueText('history entry');

      await request(app.getHttpServer())
        .post('/api/v1/analytics/analyze')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId, text })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/analytics/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
      expect(res.body.total).toBeGreaterThan(0);
      expect(
        res.body.items.some((item: { text: string }) => item.text === text),
      ).toBe(true);
    });

    it('returns 400 when page is below the minimum allowed value', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/analytics/users/${userId}`)
        .query({ page: 0 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });
});
