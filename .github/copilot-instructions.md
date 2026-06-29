# Copilot Instructions — NestJS + Next.js monorepo

## Project context

User management & analytics platform — pnpm monorepo:

- **Backend:** NestJS + Prisma (PostgreSQL) — `apps/api`
- **Frontend:** Next.js (App Router) + Tailwind CSS — `apps/web`
- **Mock external text-analysis API** (dev) — `apps/mock-analytics`
- **Tests:** Jest (backend), Vitest/Testing Library (frontend)

The system core (auth, users, Core API, frontend foundation) is implemented. Further development is defined by business requirements provided by the stakeholder — it is recommended to keep them in the repo as a context file (e.g. `goals.md`) so that AI and humans work from the same source of truth.

## Context files (Progressive Disclosure)

Detailed rules are loaded automatically based on the path of the edited file:

1. `.github/instructions/nestjs.instructions.md` — backend standards (`apps/api/**`)
2. `.github/instructions/nextjs.instructions.md` — frontend standards (`apps/web/**`)
3. `.github/instructions/workflow.instructions.md` — workflow: commits, testing, DoD (all files)

## Non-negotiable overriding rules

1. **Do NOT generate "tutorial-grade" code.** The team has its own standards in the `*.instructions.md` files — they ALWAYS take precedence over conventions from framework documentation and popular examples.
2. **Do NOT skip tests.** Every piece of business logic and every endpoint requires tests (details in `workflow.instructions.md`). Code without tests is incomplete — call this out explicitly.
3. **Do NOT invent requirements.** Scope is defined by the provided business requirements. Do not add functionality nobody asked for.
4. **Flag conflicts.** If a user instruction contradicts the standards — point out the conflict explicitly instead of silently breaking the rules.
5. **Keep context up to date.** If new conventions emerge, propose an update to the relevant instructions file.

## Repository structure (target)

```
.
├── .github/
│   ├── copilot-instructions.md   ← this file (entrypoint for Copilot)
│   └── instructions/             ← rules scoped per path
├── AGENTS.md                     ← entrypoint for other AI agents
├── apps/
│   ├── api/                      ← NestJS + Prisma
│   ├── web/                      ← Next.js + Tailwind
│   └── mock-analytics/           ← mock external API (dev)
└── packages/                     ← shared types/utils (optional)
```
