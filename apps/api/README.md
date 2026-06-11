# UserHub API (`apps/api`)

NestJS + Prisma (PostgreSQL) backend. Coding standards: `.github/instructions/nestjs.instructions.md`.

## Architecture

Layer chain: **controller → feature service → entity service → repository → Prisma** (see §1 and §5 of the standards).

```
src/
├── entities/          ← entity modules (repository + entity service per Prisma entity)
├── auth/              ← feature module: registration, login, refresh
├── users/             ← feature module: user CRUD, /users/me
├── health/            ← GET /health
├── common/            ← global exception filter, guards, interceptors, decorators
└── *-config/          ← typed configs (registerAs + getter)
```

- Swagger: http://localhost:3001/api/docs
- API base: http://localhost:3001/api/v1

## Run standalone

```bash
cp .env.example .env
docker compose up -d db          # from repo root
pnpm prisma migrate dev
pnpm prisma db seed
pnpm start:dev
```

## Tests

```bash
pnpm test          # unit
pnpm test:e2e      # e2e (requires running database)
pnpm test:cov      # coverage
```

## Module conventions

Every feature module ships with a `README.md` documenting its purpose, endpoints, and any design decisions/assumptions made during implementation (see `workflow.instructions.md`).
