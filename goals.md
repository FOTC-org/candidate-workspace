# UserHub — Analytics & Reports: Requirements Contract

## Purpose of this file

This document is intentionally maintained throughout the implementation.
It serves two purposes:
1. A working requirements contract for AI assistants.
2. A record of project decisions made while implementing ambiguous requirements.

Sections marked as "Decision pending" are expected to evolve during development.

> This document was initially created before implementation and is continuously updated as I
> inspect the repository and make implementation decisions.

> Project-specific observations are intentionally recorded here so they remain part of the
> working context provided to AI assistants.

> This document intentionally consolidates the project context, implementation requirements,
> repository-specific observations, and AI working instructions into a single source of truth.
> Additional AI prompts are task-specific and therefore are not duplicated here unless they
> contain reusable project knowledge.

> This document is my source of truth for extending UserHub with the Analytics and Reports
> modules. It defines scope, non-negotiable rules, and open decisions. I use it as the working
> context I give to any AI assistant (Copilot, Claude, Cursor, or other) before it touches code.
> Any AI working in this repository must read this file, together with `AGENTS.md` and
> everything under `.github/instructions/`, before generating or modifying code.

---

## 1. Project overview

UserHub is an existing user management platform, built as a pnpm monorepo:

- `apps/api` — NestJS + Prisma + PostgreSQL
- `apps/web` — Next.js (App Router) + Tailwind CSS
- `apps/mock-analytics` — mock external text-analysis API used in development/testing

The system core — JWT authentication, ADMIN/MANAGER/ANALYST roles, user CRUD, the Core API, and
the frontend foundation — is already implemented and tested. It is treated as code written by
the team I am joining.

My task is to extend this platform with two new modules:

- **Analytics** — integrates with the external text-analysis API, persists analysis results
  linked to users, and exposes them through the API and a frontend view.
- **Reports** — generates aggregate reports from user and analysis data, with authorization
  rules that go beyond simple role checks.

Guiding principles for this work:

- Extend the existing UserHub platform; do not rewrite or restructure the existing core.
- Preserve current authentication, authorization, and project architecture.
- Follow repository conventions from `.github/instructions/` at all times.
- Treat ambiguities in the task brief as decisions to make and document, not as gaps to fill
  in silently.

---

## 2. Non-negotiable engineering rules

These are rules I expect any AI assistant to follow without exception when working in this
repository. They summarize (and must never contradict) `.github/instructions/nestjs.instructions.md`,
`.github/instructions/nextjs.instructions.md`, and `.github/instructions/workflow.instructions.md`.
If any instruction I give in a prompt conflicts with these, the AI must flag the conflict instead
of silently picking one side.

**Backend (`apps/api`)**
- Follow the existing layering: controller → feature service → entity service → repository →
  Prisma. New Prisma entities get their own entity module under `entities/<entity>/`
  (repository + entity service; only the service is exported).
- Feature modules never touch `PrismaService` or another module's repository directly.
- Every endpoint has a dedicated DTO in `models/args/` with `class-validator` decorators.
  No `any`, no `Record<string, unknown>`, no raw `@Body() body` without a DTO.
- Controllers are thin: log entry, validate via DTO, delegate to a service. No business logic,
  no manual role checks, no `try/catch` for formatting responses in controllers.
- All errors go through the existing global exception filter and its unified error shape
  (`statusCode`, `errorCode`, `message`, `timestamp`, `path`). Never return a raw 500 or an
  unhandled stack trace for a foreseeable failure.
- Configuration exclusively via the `registerAs` + typed model pattern. `process.env` only in
  config files and `main.ts`.
- Structured logging (Winston) on every controller and service handling requests — no
  `console.log`.
- Unit tests mock the layer directly below (feature service mocks entity services, entity
  service mocks the repository) — no real database in unit tests.
- Do not introduce new dependencies without justification recorded in the commit that adds them.
- Do not use `any` or `@ts-ignore` (an explicit, justified `@ts-expect-error` is the only
  exception).
- Reuse the existing `JwtAuthGuard` (authentication, with `@Public()` bypass via `IS_PUBLIC_KEY`)
  and `RolesGuard` (`@Roles(...)` via `ROLES_KEY`, throws `ForbiddenException` on role mismatch)
  for authentication and coarse role gating on Analytics/Reports endpoints. Neither guard checks
  `user.isActive` or is aware of a specific resource (e.g. a report's ownership or content) —
  Reports' contextual authorization (§6) must be built as an additional layer on top of these
  two, not as a replacement for them, and not by duplicating their role-checking logic.
- `JwtStrategy.validate()` re-fetches the user from the database on every request
  (`userService.getByIdOrThrow`) and throws `UnauthorizedException` (401) if `!user.isActive`.
  An inactive requester is therefore already rejected globally, before reaching `RolesGuard` or
  any controller, for every endpoint that isn't `@Public()`. Analytics and Reports endpoints
  must simply avoid `@Public()` — no additional "is the requester inactive" check is needed in
  either module.
- `CurrentUser()` (`createParamDecorator`, `common/decorators`) extracts `request.user` in
  controllers — use it in the new `analytics`/`reports` controllers rather than reading
  `request.user` manually.
- `DomainException` (`common/exceptions`) takes `(errorCode, message, statusCode)` and is
  handled directly by `AllExceptionsFilter`, which reads its `errorCode` and `getStatus()`
  as-is. All new domain-specific errors (e.g. `ANALYTICS_PROVIDER_UNAVAILABLE`,
  `ANALYTICS_INVALID_RESPONSE`) must be thrown as `DomainException`, not a generic NestJS
  exception. Generic exceptions (like `RolesGuard`'s `ForbiddenException`) are mapped by the
  filter through a fixed status→code table (e.g. any 403 becomes `errorCode: 'FORBIDDEN'`) and
  cannot carry a distinct code — so if Reports' different authorization-denial reasons need
  distinguishable `errorCode`s, they must be raised as `DomainException`, not reuse
  `ForbiddenException` as-is.
- List endpoints follow the pagination shape already used in `users.service.ts`: optional
  `page`/`limit` on the args DTO (defaulting e.g. to `1`/`20`), `skip = (page - 1) * limit`,
  items and total count fetched in parallel via `Promise.all`, returned as a flat
  `{ items, total, page, limit }` output. `GET /api/v1/analytics/users/:id` must follow the same
  shape.

**Frontend (`apps/web`)**
- Server Components by default; `"use client"` only on the smallest leaf component that needs
  interactivity. Never at `page.tsx`/`layout.tsx` level.
- Data fetching happens in Server Components via typed functions from `lib/api/`; components
  never build requests manually.
- `lib/api/` has two layers: feature files (e.g. `users.ts`) used from Server Components, which
  fetch the backend directly via the `API_URL` env var with a manually attached `Authorization`
  header; and `client.ts`, used from Client Components, which calls Next.js Route Handlers under
  `app/api/*` that proxy to the backend server-side rather than being called directly from the
  browser. New Analytics/Reports client-side calls follow `client.ts`'s shape and require a
  matching Route Handler under `app/api/analytics/*` / `app/api/reports/*`.
- Every route segment that fetches data ships `loading.tsx`, `error.tsx`, and `not-found.tsx`
  where applicable — not manual `isLoading` flags for route-level fetches.
- Forms use `react-hook-form` + `zod`.
- Tailwind is the only styling system; no inline styles, no per-component CSS files.
- Components with conditional logic (roles, empty states, errors) have tests.

**Process**
- Small, logical commits following `type(scope): description`. No commit that mixes unrelated
  changes.
- Tests are written together with the code they cover, in the same or the very next commit.
- Schema changes start with `schema.prisma` + a named migration — never a manual database edit.
- A feature without tests is not considered finished.

**The following are out of scope:**
- Refactoring unrelated modules
- Rewriting authentication
- Replacing project architecture
- Updating existing Users module
- Improving unrelated tests
- Styling unrelated pages

The one mechanical exception to "Updating existing Users module": `User` gains a single
reverse-relation field (`analyses Analysis[]`), required by Prisma for the `Analysis.user`
relation to compile. This adds no column to the `users` table and changes no existing
behavior — it is treated as part of creating the `Analysis` model, not as a Users-module change.

---

## 3. Analytics module goals

### 3.1 Functional requirements
- Create the `analytics` module (`entities/analysis/` + `analytics/`, following the pattern in
  §2). `schema.prisma` currently defines only `User` — the `Analysis` model and its migration
  are created from scratch as part of this work.
- Implement:
  - `POST /api/v1/analytics/analyze` — accepts text (e.g. a note about a user), sends it to the
    external analytics API, persists the result linked to the user.
  - `GET /api/v1/analytics/users/:id` — paginated analysis history for a user.
- Persist every analysis attempt (not only successful ones) linked to the user it concerns.
- Add a frontend view: an analysis form plus a results list, with distinct loading, in-progress,
  error, and success states.
- `User` gains the single reverse-relation field required by Prisma for the `Analysis.user`
  relation (`analyses Analysis[]`) — no `@relation` attributes, no `onDelete` clause, and no new
  column on `users` (the foreign key lives entirely on `Analysis.userId`). `onDelete` is
  intentionally omitted: users are never hard-deleted in this system (`deactivate` only flips
  `isActive`), so referential integrity on delete is never actually exercised.

### 3.2 Business rules

The external API integration target is `apps/mock-analytics` in the dev environment. Its
contract (`apps/mock-analytics/README.md`):
  - `POST /analyze` with `{ text: string }` → `200 { sentiment: string, keywords: string[] }`.
  - Failure modes, triggered via `X-Mock-Mode` header or an embedded trigger string in `text`:
    `timeout` (no response for 15s), `500`, `503`, `partial` (200 response missing the
    `sentiment` field).
  - These triggers are a test-only seam into the mock service, used from tests — not a
    parameter exposed on the public `analyze` endpoint.
- `apps/api/.env.example` has no variable for the mock analytics service's base URL yet — one
  must be added (`MOCK_ANALYTICS_BASE_URL`), following the existing `registerAs` + typed
  model config pattern (same shape as `getJwtConfig`), not a bare `process.env` read in the
  provider client.
- A request timeout is required, shorter than the mock's 15-second hang, so the timeout path is
  actually exercised.
- A retry mechanism is required: max 2 retries, exponential backoff, triggered only by timeout
  or 5xx responses (not by 4xx).
- Once retries are exhausted, the application must return a clear domain error —
  `ANALYTICS_PROVIDER_UNAVAILABLE`, HTTP 503 — via the existing global exception filter. A raw
  500 is never acceptable.
- The originating request and the fact of failure must be persisted with `status: FAILED`, so
  the analysis can be retried later from the frontend.
- The provider's response must be schema-validated before being persisted as a successful
  result. An incomplete or invalid response (e.g. the `partial` mock mode, missing `sentiment`)
  must never be saved as a successful analysis — it is treated as a failure and persisted with
  `status: FAILED`.
- Idempotency: resubmitting identical text for the same user within a short time window must
  not create a duplicate analysis. Mechanism finalized in §4.2.

### 3.3 Frontend requirements
- The view must distinguish "analysis in progress," "failed with retry available," and "result
  ready" states, using App Router mechanisms (`loading.tsx`, Suspense) wherever they suffice,
  and local component state only where a client-triggered mutation is involved.
- The top-level composition pattern is: a `*-page-form.tsx` Client Component holds the paginated
  data via `React.useState` (seeded from server-fetched `initialData`) and an `accessToken` prop
  threaded down from the Server Component above it; a leaf component below it performs the
  mutation and lifts the result back up via an `onDataChange` callback, rather than each
  component managing its own copy of the list. `AnalyticsPageForm` follows the same shape.
- The existing reference mutation (`UsersDataTable.handleDeactivate`) covers only the
  in-progress state, via a local `React.useState` loading flag around the API call — it has no
  `catch` block and no error state. The "failed with retry available" state has no existing
  precedent to copy and must be added on top of this shape: catch the object thrown by
  `apiFetch`/`clientFetch` (the parsed response body — carries `errorCode`/`message` when thrown
  via the backend's exception filter, or a bare `{ message: "Request failed" }` fallback if the
  response body isn't valid JSON) and store it in local state to drive the retry UI. A retry is
  a plain resubmission of the same form (§4.6) — no dedicated retry endpoint or flag.

---

## 4. Analytics design decisions

All decisions below are finalized. Full rationale, the data model, endpoint contracts, known
limitations, and the test plan live in `apps/api/src/analytics/README.md` — this section is a
condensed record for quick reference and for other AI assistants working elsewhere in the repo.

### 4.1 Status representation

**Decision:** `AnalysisStatus` enum — `PENDING`, `SUCCESS`, `FAILED`. A record is created as
`PENDING` immediately on accepting the request, before the provider is called, and updated to
`SUCCESS` or `FAILED` once the outcome is known.

**Reason:** satisfies "the user's request must be persisted" literally, and gives the idempotency check something to detect for genuinely concurrent (not just sequential) duplicate submissions.

### 4.2 Idempotency mechanism

**Decision:** `sha256(userId + normalizedText)` (trimmed, whitespace-collapsed, lowercased),
checked at the application level against existing `PENDING`/`SUCCESS` records created within a
5-minute window (`ANALYTICS_IDEMPOTENCY_WINDOW_MINUTES`). A match returns the existing record
instead of creating a new one. `FAILED` records are excluded from this check.

**Reason:** matches "resubmitting identical text," not a blanket cooldown that would also block
unrelated notes sent close together. A permanent DB uniqueness constraint was rejected (blocks
the same text forever, not just briefly); a time-bucketed DB constraint was rejected (introduces
its own boundary bug at bucket edges).

**Known limitation:** check-then-act, not atomic — accepted for this submission's scope; see
`analytics/README.md` for the full reasoning.

### 4.3 Retry execution model

**Decision:** synchronous, inline within the request lifecycle. Exponential backoff without jitter (300ms, then 900ms). Retries only on timeout or 5xx, never on 4xx or a schema-invalid `200`. Per-attempt timeout: 5 seconds. Max 2 retries (3 attempts total, per the brief).

**Reason:** worst case (~16.2s) fits comfortably within a single request, so a background job/queue would be unjustified infrastructure; consistent with the same reasoning applied to Reports' synchronous generation. Jitter was rejected — it solves a multi-client thundering-herd problem this module doesn't have, at the cost of non-deterministic unit tests.

### 4.4 Failure persistence shape

**Decision:** a `FAILED` record stores `errorCode` and `attemptsMade`. No separate error message
column, no raw provider response column. `updatedAt` (`@updatedAt`, auto-managed by Prisma, the same pattern already used on `User`) tracks the moment of the last status transition — this
doubles as the completion timestamp for a terminal `SUCCESS`/`FAILED` record, without a
dedicated column for it.

**Reason:** `errorCode` is enough to derive a display message from a constant, avoiding drift
between stored and displayed text. `attemptsMade` gives tests an independent, persisted way to
verify retry behavior. Raw provider response was rejected as an unrequested addition — the same
debugging value comes more cheaply from structured Winston logging at the point of failure.
`updatedAt` was added afterwards: since status now transitions over time (§4.1, `PENDING` →
terminal), tracking *when* that transition happened is a one-line, zero-logic addition (Prisma
manages it automatically) that removes an otherwise real gap — without it, nothing in the record
would indicate how long an analysis took to resolve, or when a `FAILED` result actually occurred
versus when the request was first accepted.

### 4.5 Provider response validation

**Decision:** validated in `AnalyticsProviderClient` (not `AnalyticsService`, not the
controller) via `class-validator`/`class-transformer` against a dedicated response model, run
after the retry loop resolves any `200` response. A validation failure is terminal — it does not
re-enter the retry loop, and immediately raises `DomainException('ANALYTICS_INVALID_RESPONSE',..., 503)`.

**Reason:** the provider client is the only code that knows the external contract, the same role
a repository plays for Prisma — everything above it sees only validated data or an exception.
Keeping this outside `AnalyticsService` keeps that service focused on orchestration, not
transport concerns.

### 4.6 User-triggered retry

**Decision:** a plain, new `POST /analytics/analyze` with the same text — no dedicated retry
endpoint or flag. Since the prior attempt is `FAILED` (excluded from the idempotency check in
§4.2), a new record is created from scratch with its own `attemptsMade` and retry cycle.

**Reason:** falls directly out of §4.1/§4.2 without adding anything. A dedicated retry endpoint
was rejected as unrequested, and would conflate automatic transport-level retries with a user's
manual retry decision under one counter. The resulting full history per attempt
(`FAILED, FAILED, SUCCESS`) is treated as a feature — full transparency, and directly useful for
Reports' `FAILED`-analyses aggregation.

---

## 5. Reports module goals

### 5.1 Functional requirements
- Create the `reports` module (`entities/report/` + `reports/`, following the pattern in §2).
  The `Report` model and its migration are created from scratch, alongside `Analysis`.
- Implement:
  - `POST /api/v1/reports` — request generation of a report for a date range.
  - `GET /api/v1/reports/:id` — fetch a report (metadata + aggregated data).
- A report list view and a report detail view in `apps/web`.

### 5.2 Aggregations

A report contains:
- Analysis count.
- Sentiment distribution.
- Most active users.

The exact definition of "most active" and the treatment of `FAILED` analyses within these
aggregations are resolved in §5.6 and §5.7.

### 5.3 Business rules
- A date range with no data is a valid result: `200`, not `404`, explicitly flagged with
  `isEmpty: true`.
- Invalid ranges are rejected at the DTO level, with clear per-case messages, not with logic in
  the controller:
  - `dateFrom > dateTo`
  - a range extending into the future
  - a range longer than 365 days
- Whether a report is generated synchronously or asynchronously is resolved in §5.4.
- Whether `FAILED` analyses count toward aggregations is resolved in §5.6; the behavior is
  consistent across all aggregated fields and covered by a test.

### 5.4 Report generation model

**Decision:** synchronous, inline within the request lifecycle. `POST /reports` computes all
aggregations against the local PostgreSQL database and returns the complete report in the same
response — no `PENDING`/`READY` status on `Report`, no background job, no polling.

**Reason:** the brief explicitly leaves sync-vs-async as an open design decision, and
`analytics/README.md` (decision 3) already signals consistency with this choice for Reports.
Unlike Analytics' external, unreliable provider (worst case ~16.2s, network failures, retries),
Reports aggregates data from the local database via indexed `COUNT`/`GROUP BY` queries — there is
no analogous external bottleneck to justify offloading work to a background process. No queueing
library (Bull/BullMQ/Agenda) exists anywhere in `apps/api`'s dependencies, and introducing one
for this would violate the "no new abstractions beyond what the current requirement needs" rule
(goals.md §8) — a real performance need would have to materialize before that tradeoff is
worth making.

**Consequence:** `Report` does not need a status field the way `Analysis` does — a report exists
already complete the moment it's created, so there's no intermediate state to represent.

### 5.5 Report persistence model

**Decision:** a full snapshot, computed once at creation time and stored permanently on the
`Report` record. `GET /reports/:id` only reads the stored result — it never recomputes
aggregations. Stored fields: `analysisCount`, `sentimentDistribution` (JSON map of sentiment →
count, since `sentiment` is an arbitrary provider string, not a closed enum), `mostActiveUsers`
(JSON, exact shape per decision in §5.7), `isEmpty`, and `coversOnlyInactiveUsers` (a boolean
computed once at creation, consumed directly by the authorization layer — see §6 — without
recomputation on every access).

**Reason:** falls directly out of §5.4 — if aggregation is cheap enough to run synchronously
inline in the request, recomputing it again on every `GET` is redundant work with no benefit.
A report is treated as a document describing a specific point in time, not a live view over
`Analysis` data: reopening the same report tomorrow should show the same numbers, even if new
analyses have been recorded since (the system never edits or deletes existing `Analysis` rows,
so staleness risk in practice is minimal). This also directly serves the MANAGER
"only-inactive-users" authorization rule (§6): checking `coversOnlyInactiveUsers` is a plain
field read, not a re-aggregation, on every authorization check.

### 5.6 FAILED analyses in aggregations

**Decision:** only `SUCCESS` analyses count towards any aggregation — `analysisCount`,
`sentimentDistribution`, and `mostActiveUsers` all apply the same `WHERE status = 'SUCCESS'`
filter. `PENDING` and `FAILED` records within the date range are excluded entirely, from every
field, not just some.

**Reason:** "consistent," per the brief, is read as one rule applied uniformly across the whole
report, not a different rule per field. A `FAILED` record has no `sentiment` (`null` by
definition — see `analytics/README.md` decision 4), so including it in `analysisCount` while
excluding it from `sentimentDistribution` would make the report internally inconsistent (a count
higher than the sum of the sentiment breakdown, with no way to tell why from the report alone).
The alternative — counting `FAILED` towards `analysisCount` only — was considered and rejected:
it introduces a second, field-specific rule instead of one report-wide rule, and forces an
additional undocumented micro-decision about whether "most active" means attempts or successful
outcomes. `analytics/README.md`'s note that the full per-attempt history
(`FAILED, FAILED, SUCCESS`) is "directly useful for Reports' FAILED-analyses aggregation" is read
as confirming the data is *available* for this purpose (via `AnalysisService.getHistoryForUser`),
not as a mandate that Reports must include it in aggregate counts.

### 5.7 Most active users definition

**Decision:** "most active" is defined as the top 5 users by count of `SUCCESS` analyses within
the report's date range (consistent with §5.6 — only `SUCCESS` counts as activity). Ties are
broken alphabetically by email. The full shape (`userId`, `email`, `analysisCount`) is stored in
the snapshot (per §5.5); `userId`/`email` are stripped at serialization time for ANALYST
requesters (per §6), not at write time — the stored snapshot is role-agnostic and complete, the
role-dependent view is a projection applied when building the response.

**Reason:**
- **Top 5, not all users:** "most active **users**" (not "all users") reads as a deliberately
  small, highlighted leaderboard, not a full population dump. A fixed constant (not a
  request-configurable parameter) was chosen since the brief never asks for that parameter, and
  introducing one would be scope the task didn't request (goals.md §8).
- **Tie-break by email, not by most recent activity:** determinism was prioritized over a
  business interpretation the brief never specifies. Sorting by most-recent-analysis would need
  an extra `ORDER BY MAX(createdAt)` and would make tests time-dependent; alphabetical email
  ordering is simple, deterministic, and trivially testable — the simplest solution consistent
  with existing patterns (goals.md §9).
- **Snapshot stores the full shape, serialization strips it per role:** storing only the
  ADMIN/MANAGER shape would require re-deriving `mostActiveUsers` differently per role at write
  time (impossible — a report is generated once, but read by potentially different roles across
  its lifetime), or storing two versions (redundant). Storing the complete shape once and
  projecting it down for ANALYST at read time keeps §5.5's "one snapshot, computed once" decision
  intact while still satisfying the per-role response shape requirement in §6.

### 5.8 Meaning of "covers only inactive users"

**Decision:** the set of "users the report covers" is the set of distinct `userId`s with at
least one `SUCCESS` analysis within the report's date range — the same set used to compute
`mostActiveUsers` (§5.7) and `sentimentDistribution` (§5.6). A report "covers only inactive
users" when this set is non-empty and every user in it has `isActive: false`. An empty set
(i.e. `isEmpty: true`, §5.3) never counts as "only inactive users" — `coversOnlyInactiveUsers`
is `false` whenever the covered-users set is empty, since there are no users to evaluate against
the rule.

**Reason:** consistent with §5.6 — one definition of "which users the report is about" is used
uniformly across every field of the report, not a narrower `SUCCESS`-only definition for
aggregations and a broader, status-agnostic definition for authorization. Using the same set
also makes `coversOnlyInactiveUsers` cheap to compute: it's `.every(u => !u.isActive)` over the
exact same set of users already fetched to build `mostActiveUsers`, not a second, independently
reasoned query. Treating an empty covered-users set as distinct from "only inactive users" keeps
`isEmpty` and `coversOnlyInactiveUsers` as two separate, non-overlapping facts about a report,
each answering a different question (§5.3 vs §6).

### 5.9 Error codes for report access denial

**Decision:** two distinct `DomainException` subclasses, mirroring the existing pattern in
`entities/user/user.exceptions.ts`:
- `ReportNotOwnedException` → `errorCode: 'REPORT_NOT_OWNED'`, `403 Forbidden` — a MANAGER or
  ANALYST requesting a report they did not create themselves.
- `ReportArchivalRestrictedException` → `errorCode: 'REPORT_ARCHIVAL_RESTRICTED'`,
  `403 Forbidden` — a MANAGER requesting their own report, but it covers only inactive users
  (§5.8), which is archival data reserved for ADMIN.

ADMIN never has a denial path on `GET /reports/:id` — ADMIN always sees every report. ANALYST
can be denied via `ReportNotOwnedException` (§6) but never via
`ReportArchivalRestrictedException` — the archival restriction only matters for data ANALYST
never sees in the first place (`userId`/`email` are always stripped from an ANALYST's response,
so there's nothing archival left to protect against for that role).

**Reason:** the two denial reasons are conceptually distinct rules the brief lists separately
(§6) and a client could reasonably want to react to differently (e.g. "this isn't your report" —
the user could be pointed at their own report list — versus "this report is permanently
restricted" — nothing actionable for a MANAGER). A generic `ForbiddenException` maps to a single,
non-distinguishable `errorCode: 'FORBIDDEN'` via the filter (goals.md §2), which would make it
impossible for a test or a client to tell the two cases apart. The cost of two small exception
classes is minimal and follows an already-established repository pattern
(`UserNotFoundException`/`UserAlreadyExistsException`), so this isn't a new abstraction — it's
reuse of an existing one.

### 5.10 Report list endpoint and filtering

**Decision:** `GET /api/v1/reports` (paginated, `{items, total, page, limit}` shape per §2) is
added — the brief's frontend requirement ("Report list view") has no data source without it,
even though it isn't listed under "Functional requirements" alongside `POST`/`GET /:id`.
Filtering happens at the query level, not via `ReportsAuthorizationService`: ADMIN sees all
reports; MANAGER and ANALYST see only reports where `requestedById` matches their own id;
additionally, for MANAGER, reports with `coversOnlyInactiveUsers: true` are excluded from the
query entirely (`AND NOT coversOnlyInactiveUsers`), not merely blocked at the detail level. List
items use the same output shape as `GET /:id` (including the same per-role projection of
`mostActiveUsers` for ANALYST) — no separate, reduced list DTO.

**Reason:** "NEVER sees reports covering ONLY inactive users" (§6) is read as covering visibility
in general, not just detail access — showing even the existence, date range, or title of an
archival report on a list a MANAGER can browse is itself a form of "seeing" it. Filtering at the
query level (rather than fetching everything and post-processing per item through
`ReportsAuthorizationService`) is both cheaper and structurally guarantees no leak: a row that
shouldn't be visible is never fetched, rather than fetched and then hidden. This does mean the
ownership + archival rule is expressed in two places (a SQL-level filter for the list, and
`ReportsAuthorizationService` for a single report by id) rather than one — accepted as a minor
duplication of the same underlying rule, not a second, competing rule.

---

## 6. Authorization rules

Authorization for Reports is contextual, not role-only. The existing `JwtAuthGuard` and
`RolesGuard` (`common/guards/`) cover authentication and coarse role gating; the authentication
layer (`JwtStrategy`) already rejects an inactive *requester* globally
(401, before any controller runs), so that part of the rule below needs no new code. What is
still missing is a layer aware of *resource content* — a report's ownership and which users it
covers — since neither existing guard is resource-aware. A plain `RolesGuard` is not sufficient
on its own; unit tests are required for every combination below.

**ADMIN**
- Sees all reports.

**MANAGER**
- Sees only reports they requested themselves.
- Never sees a report covering only inactive users — archival data reserved for ADMIN — even if
  they requested it themselves.

**ANALYST**
- May request reports.
- Sees only reports they requested themselves — the same ownership restriction as MANAGER (the
  brief never grants ANALYST a broader viewing scope than MANAGER, only a narrower *response
  shape*; see §5.9 for the resolution of this point).
- Receives aggregated data only: no list of user names or e-mails.
- Same endpoint as ADMIN/MANAGER, different response shape depending on role.
- Not subject to the "only inactive users" restriction — that rule protects `userId`/`email`
  data, which ANALYST never receives in the first place (§5.9).

**Inactive users (`isActive: false`)**
- No access whatsoever, even with a valid, non-expired JWT. Already enforced globally by the
  existing `JwtStrategy` (401) for any endpoint that isn't `@Public()` — this applies to the
  requester's own status, and is distinct from the MANAGER content-based restriction above,
  which concerns the users a report is *about*, not the requester.

---

## 7. Testing strategy

Every module ships with:

**Unit tests**
- Entity/feature services: business rules, including error cases (not-found, conflict,
  unauthorized), mocking the layer directly below.
- Authorization logic: one test per rule/combination in §6, not a single combined test.

**Integration / e2e tests**
- Every endpoint: happy path plus at least one error case (validation 400, not-found 404,
  conflict/authorization 403).
- Provider failure paths for Analytics: timeout, 500, 503, and partial/invalid response, each
  asserting the resulting `errorCode` and persisted `FAILED` state.
- Every permission combination for Reports (role × ownership × active/inactive × report content).

**Frontend tests**
- Components with conditional logic: loading, in-progress, error/retry, empty, and success
  states.
- Custom hooks containing business logic: happy path plus edge cases.

Purely presentational components without conditional logic do not require tests.

---

## 8. AI working instructions

**Before modifying code:**
1. Inspect the existing architecture relevant to the change (entity modules, feature modules,
   existing guards/filters/config patterns).
2. Find a similar, already-implemented module or component and use it as the reference pattern.
3. Follow existing patterns rather than introducing a new one, unless no equivalent exists.

**When generating code:**
- State any assumption being made, explicitly, before or alongside the generated code.
- Ask before changing anything in the existing, frozen system core.
- Prefer existing dependencies already in the repository over adding new ones.
- Do not create abstractions (base classes, generic utilities, config layers) beyond what the
  current requirement needs.

**After generating code:**
- Verify it compiles / type-checks.
- Run the relevant test suite (`pnpm --filter api test`, `pnpm --filter web test`, or the
  targeted e2e suite).
- Review the generated code manually against §2 before committing it.
- Do not assume generated code is correct merely because it compiles.

---

## 9. Implementation approach

Before implementing any ambiguous requirement:
1. Identify the specific missing decision (do not proceed on an implicit default).
2. Inspect existing repository patterns for a precedent.
3. Choose the simplest solution consistent with the existing architecture.
4. Document the rationale — in §4 and §5.4–5.9 here, and in the relevant module's `README.md`.
