# UserHub

User management & analytics platform — pnpm monorepo: NestJS + Prisma (`apps/api`), Next.js App Router + Tailwind (`apps/web`), mock external text-analysis API (`apps/mock-analytics`).

## Quick start (fresh clone)

```bash
# 1. Install dependencies
pnpm install

# 2. Start the database
docker compose up -d db

# 3. Copy env files, run migrations and seed
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/mock-analytics/.env.example apps/mock-analytics/.env
cd apps/api && npx prisma migrate dev && npx prisma db seed && cd ../..

# 4. Start all services
pnpm --filter api start:dev & pnpm --filter web dev & pnpm --filter mock-analytics start:dev
```

Services:

- API: http://localhost:3001/api/v1
- Swagger: http://localhost:3001/api/docs
- Web: http://localhost:3000
- Mock Analytics: http://localhost:3002

## Test accounts (after seed)

| Email                | Password     | Role               |
| -------------------- | ------------ | ------------------ |
| admin@example.com    | Admin123!    | ADMIN              |
| manager@example.com  | Manager123!  | MANAGER            |
| analyst@example.com  | Analyst123!  | ANALYST            |
| inactive@example.com | Inactive123! | ANALYST (inactive) |

## Run tests

```bash
pnpm --filter api test        # unit tests
pnpm --filter api test:e2e    # e2e tests
pnpm --filter web test        # component tests
```
