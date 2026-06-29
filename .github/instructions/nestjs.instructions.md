---
description: "Backend standards NestJS + Prisma — module and models/ structure, configs via registerAs, Winston logger, thin controllers, strict DTOs, global exception filter, unit tests"
applyTo: "apps/api/**"
---

# Backend standards — NestJS + Prisma

> These rules are **non-negotiable** and reflect the team's code style. Code that works but violates the standards below is treated as a defect. Default patterns from documentation and tutorials are NOT acceptable when they conflict with these rules.

## 1. Module structure — entity modules and feature modules

We split code into two kinds of modules:

- **Entity module** (`src/entities/<entity>/`) — one per Prisma entity. Contains the repository (database queries) and the entity service (domain operations on that entity). This is the ONLY place that accesses the given entity.
- **Feature module** (`src/<feature>/`) — controller + business service implementing use cases. Does NOT touch the database — it imports entity modules and uses their services.

```
src/
├── entities/
│   └── user/                        ← User entity module
│       ├── user.module.ts           ← providers: [UserRepository, UserService], exports: [UserService]
│       ├── user.repository.ts       ← Prisma queries (the only place with PrismaService)
│       ├── user.service.ts          ← entity operations (find-or-throw, consistency rules)
│       └── models/                  ← entity types/constants
├── auth/                            ← feature module (use case)
│   ├── auth.module.ts               ← imports: [UserModule]
│   ├── auth.controller.ts
│   ├── auth.service.ts              ← business logic; uses UserService, NOT Prisma
│   └── models/
│       ├── index.ts                 ← barrel export for the whole directory
│       ├── args/                    ← input DTOs (body/query/params)
│       │   ├── index.ts
│       │   └── login.args.ts
│       ├── output/                  ← response DTOs (response models)
│       │   ├── index.ts
│       │   └── login.output.ts
│       └── auth.constants.ts        ← module constants (e.g. error messages)
└── common/                          ← filters, guards, interceptors, decorators
```

- **All module types, DTOs, enums, constants, and interfaces go into `models/`** — never loose next to the service, never inline in the controller.
- Every directory in `models/` has an `index.ts` (barrel export); importing from the module looks like: `import { LoginResponse, invalidCredentialsMessage } from './models'`.
- File naming: `kebab-case` with a role suffix: `*.args.ts` (input), `*.output.ts` (output), `*.constants.ts`, `*.model.ts`.
- Code shared between modules → `src/common/` (filters, guards, interceptors, decorators) or `packages/`.

## 2. Configuration — registerAs + typed model

Configuration is done EXCLUSIVELY with the pattern: typed model + `registerAs` + getter function. Each config module is a directory with three files:

```
src/base-config/
├── base-config-model.ts   ← interface with the config fields
├── base-config.ts         ← registerAs + getter
└── index.ts
```

```ts
// base-config-model.ts
export interface BaseConfigModel {
  hasuraAdminRoleName: string;
  hasuraGraphQLJWTSecret: string;
}

// base-config.ts
const BaseConfigName = "baseConfig";

export const BaseConfig = registerAs(
  BaseConfigName,
  (): BaseConfigModel => ({
    hasuraAdminRoleName: process.env.HASURA_ADMIN_ROLE_NAME || "hasura-admin",
    hasuraGraphQLJWTSecret: process.env.HASURA_GRAPHQL_JWT_SECRET || "",
  }),
);

export const getBaseConfig = (configService: ConfigService): BaseConfigModel =>
  configService.get<BaseConfigModel>(BaseConfigName);
```

- `ConfigModule.forRoot({ isGlobal: true, load: [BaseConfig] })` in `AppModule`.
- Services fetch config via the getter: `getBaseConfig(this.configService)` — never `configService.get('some.string')` scattered around the code.
- **`process.env.X` may appear EXCLUSIVELY in config files and in `main.ts`** (bootstrap). Nowhere else.
- Critical variables (with no sensible default) are validated fail-fast at startup — a missing value = `throw new Error(...)` with a readable message.

## 3. Logger — Winston, structured logs

- Bootstrap uses a Winston logger factory: `NestFactory.create(AppModule, { logger: createWinstonLogger() })`. Format: **JSON in production** (timestamp + ms), **pretty/nest-like in dev** — controlled by `NODE_ENV`, level via `LOG_LEVEL`.
- Every class (controller, service, guard) has its own logger with the class context:
  ```ts
  private readonly logger = new Logger(InvoiceController.name);
  ```
- We log **structurally** — an object with `message` + `meta`, not concatenated strings:
  ```ts
  this.logger.log({
    message: "Get invoice PDF",
    meta: { args },
  });
  ```
- Levels: `log` — business operations (handler entry), `debug` — processing details, `warn`/`error` — exceptional situations (error always with `meta` containing context).
- FORBIDDEN: `console.log`, logging secrets/tokens/passwords in `meta`.

## 4. Controllers — thin, with an entry log

A controller does EXACTLY three things: logs the entry, validates via DTO, delegates to the service:

```ts
@Controller("invoices")
export class InvoiceController {
  private readonly logger = new Logger(InvoiceController.name);

  constructor(private readonly invoiceService: InvoiceService) {}

  @Get(":id/pdf")
  @UseGuards(TenantAuthGuard, TenantInvoiceRoleGuard)
  async getInvoicePdf(
    @Param() params: DownloadInvoiceByIdArgs,
  ): Promise<InvoicePdfResponse> {
    this.logger.log({ message: "Get invoice PDF", meta: { params } });
    return this.invoiceService.getInvoicePdf(params.tenantInvoiceId);
  }
}
```

- **Zero business logic in controllers** — no domain conditions, data mapping, or database access.
- Explicit return type (`Promise<XxxResponse>`) — always a type from `models/output/`.
- Authorization via guards (`@UseGuards`) — never manual role checks in the handler.
- FORBIDDEN: `try/catch` in controllers to format error responses — that is what the global filter is for (§6).

## 5. Services, entity modules, and DTOs

### 5.1. Layers: controller → feature service → entity service → repository → Prisma

Database access is handled by an **entity module** (`src/entities/<entity>/`, see §1) — a dedicated module per Prisma entity, containing the repository and the entity service:

```ts
// entities/user/user.repository.ts — Prisma queries only
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }
}

// entities/user/user.service.ts — domain operations on the entity
@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getByEmailOrThrow(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UserNotFoundException(email);
    }
    return user;
  }
}

// entities/user/user.module.ts
@Module({
  providers: [UserRepository, UserService],
  exports: [UserService], // the repository is NOT exported
})
export class UserModule {}
```

- **The repository is the ONLY place touching `PrismaService`.** Database queries only — zero business logic, zero domain exceptions.
- **The entity service** wraps the repository in domain operations (e.g. `getByEmailOrThrow`, entity consistency rules). Only the entity service is exported from the entity module.
- **Feature modules import the entity module** and use its service — NEVER `PrismaService` or someone else's repository directly.
- Prisma entities do not leave the service layer — the feature service maps them to types from `models/output/` before returning from the controller.
- `PrismaService` (global, from `PrismaModule`) — never `new PrismaClient()`.

### 5.2. Feature services

- Use-case business logic lives in feature services. Dependencies via constructor injection: `private readonly`.
- A feature service composes entity services (it may use several — e.g. `AuthService` uses `UserService` and `TokenService`).
- A service returns types from `models/` — never raw Prisma entities outside the module (risk of leaking fields, e.g. password hashes).

### 5.3. Strict DTOs and validation

- **EVERY** endpoint accepting data MUST have a dedicated DTO class (in `models/args/`) with `class-validator` decorators.
- Global `ValidationPipe`:
  ```ts
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
  });
  ```
- FORBIDDEN: `any`, `Record<string, unknown>`, inline interfaces, or a raw `@Body() body` without a DTO.
- Optional fields: `@IsOptional()` + explicit type; nested: `@ValidateNested()` + `@Type()`.

## 6. Error handling — global exception filter

- One global custom exception filter (`AllExceptionsFilter` in `src/common/filters/`), registered via `APP_FILTER`.
- Unified error response shape:
  ```json
  {
    "statusCode": 422,
    "errorCode": "USER_ALREADY_EXISTS",
    "message": "Readable description for the client",
    "timestamp": "2026-06-10T12:00:00.000Z",
    "path": "/api/users"
  }
  ```
- Domain errors: classes inheriting from a base `DomainException` (with an `errorCode` field); error messages as constants in `models/*.constants.ts`, not literals scattered around the code.
- Prisma errors (`P2002`, `P2025`, ...) mapped in the filter to sensible HTTP codes — never a 500 with a raw stack trace.
- The filter logs the error structurally (`logger.error({ message, meta })`) before returning the response.

## 7. Bootstrap (`main.ts`)

- Winston logger wired into `NestFactory.create` (§3).
- `app.getHttpAdapter().getInstance().disable('x-powered-by')`.
- CORS: origins from env (`CORS_ALLOWED_ORIGINS`, comma-separated), fail-fast when missing; explicit `methods` and `allowedHeaders` lists, `credentials: true`.
- API versioning (`/api/v1`), Swagger (`/api/docs`), global `ValidationPipe` and `APP_FILTER`.

## 8. Unit tests (hard requirement)

- **EVERY service method containing business logic MUST have unit tests** (Jest), written together with the code, not "later".
- We mock the layer directly below: a feature service mocks **entity services**, an entity service mocks **the repository**. This way a mock is a simple object with domain methods (`getByEmailOrThrow`, `findByEmail`), without simulating the Prisma API. Unit tests do NOT touch a real database.
- Repositories (pure queries, no logic) do not require unit tests — they are covered by endpoint e2e/integration tests.
- Minimum per method: happy path + error cases (missing record, conflict, missing permissions).
- Naming: `describe('AuthService')` → `describe('login')` → `it('throws InvalidCredentialsException when user does not exist')`.

## 9. Common quality rules

- Language of code, names, and comments: **English**.
- TypeScript `strict`. FORBIDDEN: `any`, `@ts-ignore` (exceptionally `@ts-expect-error` with a justification).
- No commented-out dead code.
- Secrets exclusively in `.env` (with `.env.example` in the repo). Never in code or logs.
