import { Test, TestingModule } from '@nestjs/testing';
import {
  ArgumentsHost,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { UserService } from './../src/entities/user/user.service';
import { AllExceptionsFilter } from './../src/common/filters/all-exceptions.filter';

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const EMAIL_DOMAIN = `e2e-${RUN_ID}.test`;
const PASSWORD = 'Password123!';

const email = (name: string): string => `${name}@${EMAIL_DOMAIN}`;

interface UserBody {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface PageBody {
  items: UserBody[];
  total: number;
  page: number;
  limit: number;
}

interface ErrorBody {
  errorCode: string;
}

const body = <T>(res: request.Response): T => res.body as T;

describe('Users (e2e, database-backed)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;

  const http = () => request(app.getHttpServer());

  const register = async (address: string, password = PASSWORD) => {
    const res = await http()
      .post('/api/v1/auth/register')
      .send({ email: address, password })
      .expect(201);
    return body<{ accessToken: string; refreshToken: string }>(res);
  };

  const me = async (token: string) => {
    const res = await http()
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return body<UserBody>(res);
  };

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

    await register(email('admin'));
    await prisma.user.update({
      where: { email: email('admin') },
      data: { role: 'ADMIN' },
    });
    const login = await http()
      .post('/api/v1/auth/login')
      .send({ email: email('admin'), password: PASSWORD })
      .expect(201);
    adminToken = body<{ accessToken: string }>(login).accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { endsWith: `@${EMAIL_DOMAIN}` } },
    });
    await app.close();
  });

  describe('create (POST /auth/register)', () => {
    it('persists an active ANALYST without exposing the password hash', async () => {
      const tokens = await register(email('create'));

      const profile = await me(tokens.accessToken);

      expect(profile).toMatchObject({
        email: email('create'),
        role: 'ANALYST',
        isActive: true,
      });
      expect(typeof profile.id).toBe('string');
      expect(profile).not.toHaveProperty('passwordHash');
      expect(Number.isNaN(Date.parse(profile.createdAt))).toBe(false);
    });

    it('returns 409 USER_ALREADY_EXISTS for a duplicate email', async () => {
      await register(email('dup'));

      const res = await http()
        .post('/api/v1/auth/register')
        .send({ email: email('dup'), password: PASSWORD })
        .expect(409);

      expect(body<ErrorBody>(res).errorCode).toBe('USER_ALREADY_EXISTS');
    });

    it('never answers 500 when the same email is registered concurrently', async () => {
      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          http()
            .post('/api/v1/auth/register')
            .send({ email: email('race'), password: PASSWORD }),
        ),
      );

      const statuses = results.map((r) => r.status).sort();
      expect(statuses.filter((s) => s === 201)).toHaveLength(1);
      expect(statuses.filter((s) => s === 409)).toHaveLength(4);
      expect(await prisma.user.count({ where: { email: email('race') } })).toBe(
        1,
      );
    });
  });

  describe('list and count (GET /users)', () => {
    it('returns the total count and includes newly created users', async () => {
      const before = await http()
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await register(email('list-a'));
      await register(email('list-b'));

      const after = await http()
        .get('/api/v1/users')
        .query({ page: 1, limit: 100 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const afterBody = body<PageBody>(after);
      expect(afterBody.total).toBe(body<PageBody>(before).total + 2);
      expect(afterBody.page).toBe(1);
      expect(afterBody.limit).toBe(100);
      const emails = afterBody.items.map((u) => u.email);
      expect(emails).toEqual(
        expect.arrayContaining([email('list-a'), email('list-b')]),
      );
      expect(afterBody.items[0]).not.toHaveProperty('passwordHash');
    });

    it('paginates newest first', async () => {
      await register(email('list-newest'));

      const page1 = await http()
        .get('/api/v1/users')
        .query({ page: 1, limit: 1 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const page2 = await http()
        .get('/api/v1/users')
        .query({ page: 2, limit: 1 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const first = body<PageBody>(page1);
      const second = body<PageBody>(page2);
      expect(first.items).toHaveLength(1);
      expect(first.items[0].email).toBe(email('list-newest'));
      expect(second.items).toHaveLength(1);
      expect(second.items[0].email).not.toBe(email('list-newest'));
      expect(second.page).toBe(2);
    });

    it('rejects non-admin callers with 403', async () => {
      const tokens = await register(email('list-analyst'));

      await http()
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(403);
    });
  });

  describe('update (PATCH /users/me)', () => {
    it('changes email and password so only the new credentials work', async () => {
      const tokens = await register(email('update'));
      const newPassword = 'NewPassword456!';

      const res = await http()
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ email: email('updated'), password: newPassword })
        .expect(200);

      expect(body<UserBody>(res).email).toBe(email('updated'));
      expect(res.body).not.toHaveProperty('passwordHash');

      await http()
        .post('/api/v1/auth/login')
        .send({ email: email('updated'), password: newPassword })
        .expect(201);
      await http()
        .post('/api/v1/auth/login')
        .send({ email: email('updated'), password: PASSWORD })
        .expect(401);
      await http()
        .post('/api/v1/auth/login')
        .send({ email: email('update'), password: PASSWORD })
        .expect(401);
    });

    it('returns 409 when the new email belongs to another user', async () => {
      await register(email('taken'));
      const tokens = await register(email('wants-taken'));

      const res = await http()
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ email: email('taken') })
        .expect(409);

      expect(body<ErrorBody>(res).errorCode).toBe('USER_ALREADY_EXISTS');
      expect((await me(tokens.accessToken)).email).toBe(email('wants-taken'));
    });
  });

  describe('role change (PATCH /users/:id/role)', () => {
    it('persists the new role', async () => {
      const tokens = await register(email('role'));
      const { id } = await me(tokens.accessToken);

      const res = await http()
        .patch(`/api/v1/users/${id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'MANAGER' })
        .expect(200);

      expect(body<UserBody>(res).role).toBe('MANAGER');
      const fetched = await http()
        .get(`/api/v1/users/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(body<UserBody>(fetched).role).toBe('MANAGER');
    });

    it('rejects an unknown role with 400', async () => {
      const tokens = await register(email('role-bad'));
      const { id } = await me(tokens.accessToken);

      await http()
        .patch(`/api/v1/users/${id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'SUPERUSER' })
        .expect(400);
    });

    it('maps a missing record (Prisma P2025) to 404 RESOURCE_NOT_FOUND', async () => {
      const res = await http()
        .patch('/api/v1/users/does-not-exist/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'MANAGER' })
        .expect(404);

      expect(body<ErrorBody>(res).errorCode).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('deactivate (DELETE /users/:id)', () => {
    it('soft-deletes the user and blocks login and existing tokens', async () => {
      const tokens = await register(email('deactivate'));
      const { id } = await me(tokens.accessToken);

      const res = await http()
        .delete(`/api/v1/users/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(body<UserBody>(res).isActive).toBe(false);

      const fetched = await http()
        .get(`/api/v1/users/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(body<UserBody>(fetched).isActive).toBe(false);

      await http()
        .post('/api/v1/auth/login')
        .send({ email: email('deactivate'), password: PASSWORD })
        .expect(401);
      await http()
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(401);
    });

    it('returns 404 USER_NOT_FOUND for an unknown id', async () => {
      const res = await http()
        .delete('/api/v1/users/does-not-exist')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(body<ErrorBody>(res).errorCode).toBe('USER_NOT_FOUND');
    });
  });

  describe('Prisma unique violation (P2002) mapping', () => {
    it('maps a duplicate insert to 409 RESOURCE_ALREADY_EXISTS', async () => {
      await register(email('p2002'));

      const error: unknown = await app
        .get(UserService)
        .create({ email: email('p2002'), passwordHash: 'x' })
        .then(
          () => undefined,
          (e: unknown) => e,
        );
      expect(error).toBeDefined();

      let status: number | undefined;
      let sent: ErrorBody | undefined;
      interface CapturedResponse {
        status(code: number): CapturedResponse;
        json(payload: ErrorBody): void;
      }
      const response: CapturedResponse = {
        status(code: number): CapturedResponse {
          status = code;
          return response;
        },
        json(payload: ErrorBody): void {
          sent = payload;
        },
      };
      const host = {
        switchToHttp: () => ({
          getResponse: () => response,
          getRequest: () => ({ url: '/api/v1/auth/register' }),
        }),
      } as unknown as ArgumentsHost;

      new AllExceptionsFilter().catch(error, host);

      expect(status).toBe(409);
      expect(sent?.errorCode).toBe('RESOURCE_ALREADY_EXISTS');
    });
  });
});
