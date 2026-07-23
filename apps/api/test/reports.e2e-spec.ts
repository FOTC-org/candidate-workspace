import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { Role } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Reports (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const testId = Date.now();
  const password = 'TestPass123!';

  interface TestActor {
    id: string;
    email: string;
    accessToken: string;
  }

  let admin: TestActor;
  let manager: TestActor;
  let anotherManager: TestActor;
  let analyst: TestActor;
  let subjectUser: TestActor;

  async function registerAndLogin(emailPrefix: string): Promise<TestActor> {
    const email = `${emailPrefix}-${testId}@example.com`;

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(201);

    const accessToken = loginRes.body.accessToken;

    const meRes = await request(app.getHttpServer())
      .post('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    return { id: meRes.body.id, email, accessToken };
  }

  async function createAnalysis(
    userId: string,
    sentiment: string,
    createdAt: Date,
  ): Promise<void> {
    await prisma.analysis.create({
      data: {
        userId,
        text: `e2e report fixture ${testId}-${Math.random()}`,
        textHash: `hash-${testId}-${Math.random()}`,
        sentiment,
        keywords: [],
        status: 'SUCCESS',
        attemptsMade: 1,
        createdAt,
      },
    });
  }

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

    admin = await registerAndLogin('reports-admin');
    manager = await registerAndLogin('reports-manager');
    anotherManager = await registerAndLogin('reports-other-manager');
    analyst = await registerAndLogin('reports-analyst');
    subjectUser = await registerAndLogin('reports-subject');

    await prisma.user.update({
      where: { id: admin.id },
      data: { role: Role.ADMIN },
    });
    await prisma.user.update({
      where: { id: manager.id },
      data: { role: Role.MANAGER },
    });
    await prisma.user.update({
      where: { id: anotherManager.id },
      data: { role: Role.MANAGER },
    });
    // analyst stays ANALYST (default from registration)

    // Two SUCCESS analyses for subjectUser, inside a fixed date window used by "happy path" tests
    await createAnalysis(subjectUser.id, 'positive', new Date('2024-06-10'));
    await createAnalysis(subjectUser.id, 'negative', new Date('2024-06-15'));
  });

  afterAll(async () => {
    const userIds = [
      admin.id,
      manager.id,
      anotherManager.id,
      analyst.id,
      subjectUser.id,
    ];
    await prisma.report.deleteMany({
      where: { requestedById: { in: userIds } },
    });
    await prisma.analysis.deleteMany({ where: { userId: subjectUser.id } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  const HAPPY_RANGE = { dateFrom: '2024-06-01', dateTo: '2024-06-30' };
  const EMPTY_RANGE = { dateFrom: '2020-01-01', dateTo: '2020-01-31' };

  describe('POST /api/v1/reports', () => {
    it('returns 400 when dateFrom is after dateTo', () => {
      return request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({ dateFrom: '2024-06-30', dateTo: '2024-06-01' })
        .expect(400);
    });

    it('returns 400 when dateTo is in the future', () => {
      const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
        .toISOString()
        .slice(0, 10);
      return request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({ dateFrom: '2024-01-01', dateTo: future })
        .expect(400);
    });

    it('returns 400 when the range exceeds 365 days', () => {
      return request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({ dateFrom: '2020-01-01', dateTo: '2022-01-01' })
        .expect(400);
    });

    it('creates a report with correct aggregations on the happy path', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${manager.accessToken}`)
        .send(HAPPY_RANGE)
        .expect(201);

      expect(res.body.isEmpty).toBe(false);
      expect(res.body.analysisCount).toBe(2);
      expect(res.body.sentimentDistribution).toEqual({
        positive: 1,
        negative: 1,
      });
      expect(
        res.body.mostActiveUsers.some(
          (u: { userId: string }) => u.userId === subjectUser.id,
        ),
      ).toBe(true);
    });

    it('returns isEmpty: true for a date range with no data, as a 201, not a 404', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${manager.accessToken}`)
        .send(EMPTY_RANGE)
        .expect(201);

      expect(res.body.isEmpty).toBe(true);
      expect(res.body.analysisCount).toBe(0);
      expect(res.body.mostActiveUsers).toEqual([]);
    });

    it('strips userId/email from mostActiveUsers for an ANALYST requester', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${analyst.accessToken}`)
        .send(HAPPY_RANGE)
        .expect(201);

      for (const entry of res.body.mostActiveUsers) {
        expect(entry.userId).toBeUndefined();
        expect(entry.email).toBeUndefined();
        expect(typeof entry.analysisCount).toBe('number');
      }
    });
  });

  describe('GET /api/v1/reports/:id — authorization', () => {
    it('returns 404 for a non-existent report id', () => {
      return request(app.getHttpServer())
        .get('/api/v1/reports/nonexistent-id')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(404);
    });

    it('allows ADMIN to view any report', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${manager.accessToken}`)
        .send(HAPPY_RANGE)
        .expect(201);

      await request(app.getHttpServer())
        .get(`/api/v1/reports/${created.body.id}`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(200);
    });

    it('allows MANAGER to view their own report', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${manager.accessToken}`)
        .send(HAPPY_RANGE)
        .expect(201);

      await request(app.getHttpServer())
        .get(`/api/v1/reports/${created.body.id}`)
        .set('Authorization', `Bearer ${manager.accessToken}`)
        .expect(200);
    });

    it('returns 403 REPORT_NOT_OWNED when a MANAGER requests another MANAGER\'s report', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${manager.accessToken}`)
        .send(HAPPY_RANGE)
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/reports/${created.body.id}`)
        .set('Authorization', `Bearer ${anotherManager.accessToken}`)
        .expect(403);

      expect(res.body.errorCode).toBe('REPORT_NOT_OWNED');
    });

    it('returns 403 REPORT_NOT_OWNED when an ANALYST requests someone else\'s report', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${manager.accessToken}`)
        .send(HAPPY_RANGE)
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/reports/${created.body.id}`)
        .set('Authorization', `Bearer ${analyst.accessToken}`)
        .expect(403);

      expect(res.body.errorCode).toBe('REPORT_NOT_OWNED');
    });

    it('allows ANALYST to view their own report in the aggregated shape', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${analyst.accessToken}`)
        .send(HAPPY_RANGE)
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/reports/${created.body.id}`)
        .set('Authorization', `Bearer ${analyst.accessToken}`)
        .expect(200);

      for (const entry of res.body.mostActiveUsers) {
        expect(entry.userId).toBeUndefined();
      }
    });

    it('returns 403 REPORT_ARCHIVAL_RESTRICTED for a MANAGER viewing their own report that covers only inactive users', async () => {
      const archivalUser = await registerAndLogin('reports-archival-subject');
      await createAnalysis(
        archivalUser.id,
        'neutral',
        new Date('2024-07-15'),
      );
      await prisma.user.update({
        where: { id: archivalUser.id },
        data: { isActive: false },
      });

      const created = await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${manager.accessToken}`)
        .send({ dateFrom: '2024-07-01', dateTo: '2024-07-31' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/reports/${created.body.id}`)
        .set('Authorization', `Bearer ${manager.accessToken}`)
        .expect(403);

      expect(res.body.errorCode).toBe('REPORT_ARCHIVAL_RESTRICTED');

      await prisma.analysis.deleteMany({ where: { userId: archivalUser.id } });
      await prisma.user.delete({ where: { id: archivalUser.id } });
    });
  });

  describe('GET /api/v1/reports', () => {
    it('returns own reports for MANAGER, excluding archival-restricted ones', async () => {
      const archivalUser = await registerAndLogin(
        'reports-list-archival-subject',
      );
      await createAnalysis(
        archivalUser.id,
        'neutral',
        new Date('2024-08-15'),
      );
      await prisma.user.update({
        where: { id: archivalUser.id },
        data: { isActive: false },
      });

      const normalReport = await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${manager.accessToken}`)
        .send(HAPPY_RANGE)
        .expect(201);

      const archivalReport = await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${manager.accessToken}`)
        .send({ dateFrom: '2024-08-01', dateTo: '2024-08-31' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/v1/reports')
        .query({ limit: 100 })
        .set('Authorization', `Bearer ${manager.accessToken}`)
        .expect(200);

      const ids = res.body.items.map((r: { id: string }) => r.id);
      expect(ids).toContain(normalReport.body.id);
      expect(ids).not.toContain(archivalReport.body.id);

      await prisma.analysis.deleteMany({ where: { userId: archivalUser.id } });
      await prisma.user.delete({ where: { id: archivalUser.id } });
    });

    it("does not include another user's reports for a MANAGER", async () => {
      const own = await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${manager.accessToken}`)
        .send(HAPPY_RANGE)
        .expect(201);

      const others = await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${anotherManager.accessToken}`)
        .send(HAPPY_RANGE)
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/v1/reports')
        .query({ limit: 100 })
        .set('Authorization', `Bearer ${manager.accessToken}`)
        .expect(200);

      const ids = res.body.items.map((r: { id: string }) => r.id);
      expect(ids).toContain(own.body.id);
      expect(ids).not.toContain(others.body.id);
    });

    it('includes reports requested by other users for ADMIN', async () => {
      const managerReport = await request(app.getHttpServer())
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${manager.accessToken}`)
        .send(HAPPY_RANGE)
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/v1/reports')
        .query({ limit: 100 })
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(200);

      const ids = res.body.items.map((r: { id: string }) => r.id);
      expect(ids).toContain(managerReport.body.id);
    });

    it('returns 400 when page is below the minimum allowed value', () => {
      return request(app.getHttpServer())
        .get('/api/v1/reports')
        .query({ page: 0 })
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(400);
    });
  });
});
