---
description: "Work workflow — small commits, hard testing requirements, Definition of Done"
applyTo: "**"
---

# Workflow and execution guidelines

> Applies to everyone working in this repository. AI assisting with code MUST enforce these rules — in particular, remind about tests and commit structure.

## 1. Work loop (step-by-step workflow)

1. **Read the context** — instructions from `.github/` + the requirements document (e.g. `goals.md`, if it exists). Determine which requirement the task relates to.
2. **Plan** — before any code is written, briefly describe the plan (modules, endpoints, Prisma models, components). The plan must be visible in the PR description or in the first commit.
3. **Migrations first** — schema changes start with `schema.prisma` + a migration (`prisma migrate dev --name <description>`). Never edit the database manually.
4. **Implement in small steps** — one coherent change = one commit (see section 2).
5. **Tests together with code** — see section 3. A feature without tests is NOT finished.
6. **Verify locally** — lint + tests + a manual smoke test (with `api` and `web` running) before pushing.

## 2. Commits — small and clearly described

We work in **small commits** (one logical step = one commit; a commit does not mix refactoring with a new feature).

Convention: `type(scope): description` (types: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`).

```
feat(users): add CreateUserDto with strict validation
```

## 3. Testing — a hard requirement

> Note for AI: you tend to "forget" about tests unless someone asks for them. In this repo that is unacceptable — **a code proposal without accompanying tests is incomplete and you must call this out.**

1. **Every new endpoint** MUST have test coverage: unit tests for the service + an e2e/integration test for the endpoint (happy path + at least one error case, e.g. validation 400, missing resource 404, conflict 409).
2. **Every service method containing business logic** MUST have unit tests (mocked repository, no real database).
3. **Frontend:** components with conditional logic (roles, empty states, errors) MUST have tests (Testing Library). Purely presentational components may go without tests.
4. Tests are committed **in the same commit as, or immediately after,** the code they test — never "at the end of the task".
5. Before pushing, the full suite must pass: `lint`, `test` (api + web), `build`.

### Definition of Done

- [ ] Code compliant with the standards from `.github/instructions/`
- [ ] Unit tests for business logic
- [ ] Endpoint / component test (including error cases)
- [ ] Prisma migration (if applicable) with a readable name
- [ ] Small commits following the `type(scope): description` convention
- [ ] Lint + tests + build pass locally

## 4. Working with AI — good practices

- AI must read the context files before generating code — if it generates "tutorial-grade" code that violates the standards, fix the prompt instead of accepting the output.
- Verify EVERY generated fragment: security (input validation, entity data leaks), edge cases, consistency with the existing architecture.
- Do not paste secrets or `.env` values into prompts.
- If AI proposes a dependency (npm package) — justify adding it in the commit; we do not add dependencies "just in case".

## 5. Running the project

```bash
# install
pnpm install

# database (docker)
docker compose up -d db

# migrations + seed
pnpm --filter api prisma migrate dev
pnpm --filter api prisma db seed

# dev
pnpm --filter api start:dev
pnpm --filter web dev

# tests
pnpm --filter api test
pnpm --filter web test
```

(If the scripts differ from the repo state — the repo state is the source of truth; update this file.)
