# Analytics module

Integrates with an external text-analysis provider (`apps/mock-analytics` in development) to
produce a sentiment/keywords analysis for a piece of text, persists every attempt — successful
or not — linked to a user, and exposes the history through a paginated endpoint.

## Endpoints

### `POST /api/v1/analytics/analyze`

Request:
```json
{ "userId": "string (cuid)", "text": "string, non-empty" }
```

Response `200` (existing record reused within the idempotency window) or `201` (new record
created):
```json
{
  "id": "string",
  "userId": "string",
  "text": "string",
  "status": "PENDING | SUCCESS | FAILED",
  "sentiment": "string | null",
  "keywords": "string[] | null",
  "errorCode": "string | null",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

Error responses (via the global `AllExceptionsFilter`, never a raw `500`):
| `errorCode` | Status | When |
|---|---|---|
| `ANALYTICS_PROVIDER_UNAVAILABLE` | 503 | Provider timed out or returned 5xx on every attempt (3 total) |
| `ANALYTICS_INVALID_RESPONSE` | 503 | Provider returned `200` but the body doesn't match the expected schema |
| standard DTO validation errors | 400 | Missing/invalid `userId` or `text` |

### `GET /api/v1/analytics/users/:id`

Query: `page` (default `1`), `limit` (default `20`, following the existing pagination shape from
`users.service.ts`).

Response:
```json
{ "items": [/* Analysis records, same shape as above */], "total": 0, "page": 1, "limit": 20 }
```

## Data model

```prisma
enum AnalysisStatus {
  PENDING
  SUCCESS
  FAILED
}

model Analysis {
  id           String         @id @default(cuid())
  userId       String
  text         String
  textHash     String
  sentiment    String?
  keywords     String[]       @default([])
  status       AnalysisStatus
  errorCode    String?
  attemptsMade Int            @default(0)
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  user         User			  @relation(fields: [userId], references: [id])

  @@index([userId, textHash, createdAt])
  @@map('analyses')
}
```

`User` gains the reverse relation `analyses Analysis[]`.

`keywords` is stored as `String[] @default([])` — Prisma does not allow an optional scalar list
(`String[]?` is a schema validation error), so an empty array is the database-level
representation of "no keywords yet." The output DTO maps this back to `null` at serialization
time (`keywords.length > 0 ? keywords : null`) to keep the public API contract consistent with
`sentiment`, where `null` means "no result yet" for `PENDING`/`FAILED` records. The database and
the API are intentionally allowed to disagree here: `[]` is the correct, idiomatic Prisma
representation internally, while `null` is the more accurate meaning to expose externally.

`AnalysisRepository`/`AnalysisService` additionally expose `findSuccessfulInDateRange`, added for the Reports module's aggregations (see `reports/README.md`) — it is not used by any Analytics endpoint itself.

## Configuration

A new typed config module, `analytics-config` (`registerAs` + typed model, same shape as
`getJwtConfig`), backs the provider client — no bare `process.env` reads outside it:

| Env var | Purpose | Default |
|---|---|---|
| `MOCK_ANALYTICS_BASE_URL` | Base URL of the analytics provider | — (required, fail-fast) |
| `MOCK_ANALYTICS_TIMEOUT_MS` | Per-attempt request timeout | `5000` |
| `MOCK_ANALYTICS_MAX_RETRIES` | Retries after the first attempt | `2` |
| `MOCK_ANALYTICS_BACKOFF_BASE_MS` | Base delay for exponential backoff | `300` |
| `ANALYTICS_IDEMPOTENCY_WINDOW_MINUTES` | Duplicate-submission window | `5` |

`apps/api/.env.example` is updated accordingly.

## Design decisions

### 1. Status representation

**Decision:** `AnalysisStatus` enum with three values — `PENDING`, `SUCCESS`, `FAILED`. A record
is created as `PENDING` as soon as the request is accepted, before the provider is called, and
is updated to `SUCCESS` or `FAILED` once the outcome is known.

**Reason:** the brief requires that "the user's request ... must be persisted," not only the
fact of a failure — a `PENDING` row from the start satisfies that literally. It also gives the
idempotency check (decision 2) something to detect: a genuinely concurrent duplicate submission
shows up as an existing `PENDING` row, not just a `SUCCESS`/`FAILED` one from an earlier,
already-finished request.

### 2. Idempotency mechanism

**Decision:** content hash + time window, checked at the application level. The key is
`sha256(userId + normalizedText)`, where `normalizedText` is the trimmed, whitespace-collapsed
 (because formatting differences are not treated as meaningful content changes), lowercased
 input text (sentiment and keyword extraction are assumed to be semantically case-insensitive
 for this task). Before creating a new record, the service looks up an existing `Analysis`
with the same hash for the same user, in status `PENDING` or `SUCCESS`, created within the last
5 minutes. If one exists, it is returned as-is instead of creating a new row. `FAILED` records
are excluded from this check — see decision 6.

**Reason:** this is the option that matches the brief's wording most literally — deduplicating
*identical resubmitted text*, not throttling the user or blocking unrelated notes sent close
together (a pure time-based cooldown would do that). A blanket database uniqueness constraint
was rejected outright: it would prevent the same text from ever being analyzed again, which
contradicts the "short time window" framing entirely. A bucketed unique index (rounding
timestamps into fixed windows for a DB constraint) was also considered and rejected — it
introduces its own boundary bug (two requests two seconds apart, straddling a bucket edge, would
incorrectly be treated as non-duplicates), which is worse than the limitation it tries to fix.

**Known limitation:** this is a check-then-act sequence (`SELECT` then `INSERT`), not atomic. Two
genuinely simultaneous identical requests (the same millisecond) could both pass the check before
either commits, producing two `PENDING` rows. This is accepted as a known, documented
limitation for this submission rather than closed with an additional database-level constraint,
since the realistic trigger (a user's double-click or page refresh) is separated by enough real
time that the check reliably catches it; only truly concurrent, near-simultaneous automated
requests would slip through.

**Window length:** 5 minutes, via `ANALYTICS_IDEMPOTENCY_WINDOW_MINUTES`. Long enough to cover
the realistic accidental-resubmission cases (double click, page refresh, browser back-and-retry)
including the worst-case ~16.2s a single request can already take (see decision 3), while staying
consistent with the brief's "short time window" framing — a much longer window would start
blocking legitimate, deliberate re-analysis of the same note.

### 3. Retry execution model

**Decision:** synchronous, inline within the request lifecycle. The endpoint holds the
connection open through all attempts and responds only once the outcome is final. Backoff is
exponential without jitter (300ms after the first failed attempt, 900ms after the second).
Retries are attempted only after a timeout or a 5xx response — never after a 4xx, and never
after a schema-invalid `200` (see decision 5). Per-attempt timeout is 5 seconds. `2` retries
means 3 attempts total, per the brief.

**Backoff formula:** `backoffBaseMs * 3^(failedAttempt - 1)` — with `backoffBaseMs = 300`, this
produces exactly 300ms after the first failed attempt and 900ms after the second, matching the
brief's stated values. This is a ×3 growth rate, not the more common ×2 doubling — chosen
specifically to reproduce the two concrete numbers given in the brief rather than an arbitrary
standard backoff curve.

**Reason:** the worst-case response time (`3 × 5s + 300ms + 900ms ≈ 16.2s`) is well within what a
single HTTP request can reasonably take, so introducing a background job/queue would be
unjustified infrastructure for a problem that doesn't need it — no queue exists elsewhere in this
stack, and this decision stays consistent with the same reasoning applied to Reports' synchronous
generation. Exponential-with-jitter backoff was considered and rejected: jitter earns its keep
when many independent clients could hit the same downstream service at once (avoiding a
"thundering herd"); here there is a single provider and at most 2 retries per request, and the
added randomness only makes unit tests (fake timers, asserting exact delays) harder to write
deterministically, for no benefit at this scale. 4xx responses are not retried because they
indicate a client-side problem retrying cannot fix; a schema-invalid `200` is not retried because
it's model as a distinct, typically deterministic failure mode of the provider for that input,
not a transient one (see decision 5).


### 4. Failure persistence shape

**Decision:** a `FAILED` record stores `errorCode` (`ANALYTICS_PROVIDER_UNAVAILABLE` or
`ANALYTICS_INVALID_RESPONSE`) and `attemptsMade`. No separate `errorMessage` text column, no
`rawProviderResponse` column.

**Reason:** `errorCode` alone is sufficient — the display message is derived from it via a
constant (consistent with how `DomainException`/`AllExceptionsFilter` already work), avoiding any
risk of the stored text and the displayed text drifting apart. `attemptsMade` is the one addition
worth its cost: it gives tests a second, independent way to verify retry behavior beyond
asserting the provider-client mock's call count — an e2e test can assert `attemptsMade === 3`
after exhaustion, or `attemptsMade === 1` for an immediate `ANALYTICS_INVALID_RESPONSE` (since
that path never retries). Storing the raw provider response was considered for debuggability, but
rejected as an unrequested addition: it's asymmetric (always `null` on a timeout, populated
inconsistently otherwise), and the same debugging value is available more cheaply by structurally
logging the raw response via Winston at the point the validation failure is detected, without
carrying it permanently in a business table.

### 5. Provider response validation

**Decision:** validation lives in `AnalyticsProviderClient`, not in `AnalyticsService` or the
controller, using `class-validator`/`class-transformer` (already a dependency, no new package)
against a dedicated response model. It runs *after* the retry loop has obtained any `200`
response — a validation failure never re-enters the retry loop and immediately raises
`DomainException('ANALYTICS_INVALID_RESPONSE', ..., 503)`.

**Reason:** the provider client is the only piece of code that knows the shape of the external
contract, the same way a repository is the only piece of code that knows Prisma — everything
above it should only ever see a fully validated object or an exception, never a raw, unchecked
payload. Keeping this out of `AnalyticsService` keeps that service focused on orchestration
(idempotency, persistence, status transitions) rather than mixing in transport-level concerns.
Running validation outside the retry loop is required by decision 3: a schema-invalid response is
treated as terminal, not transient, so it must not consume — or wait on — a retry attempt.

**Unexpected 4xx handling:** the mock service has no documented 4xx failure mode — this path
exists only as a defensive guard against a malformed request on our side. An unexpected 4xx from
the provider is mapped to `ANALYTICS_PROVIDER_UNAVAILABLE` rather than a dedicated error code:
retrying it would not help (the same reasoning that excludes 4xx from the retry loop in decision
3), and introducing a third, unrequested `errorCode` for a scenario the brief never describes
was rejected as scope the task didn't ask for.

### 6. User-triggered retry

**Decision:** a retry from the frontend is a plain, new `POST /analytics/analyze` call with the
same text — there is no dedicated retry endpoint, flag, or parameter. Because the prior attempt
is in status `FAILED`, and the idempotency check (decision 2) only matches `PENDING`/`SUCCESS`
records, a new `Analysis` row is created from scratch, with its own `attemptsMade` counter and
its own retry/backoff cycle.

**Reason:** this falls directly out of decisions 1 and 2 without adding anything — a "retry" is
simply "the same request happens to be sent again," which the existing design already handles
correctly. A dedicated retry endpoint was considered and rejected as an unrequested addition that
would also conflate two different meanings of "attempt" under one counter (the automatic
transport-level retries inside a single request vs. a user's manual decision to try again after
seeing a failure). The tradeoff accepted here: the analysis history shows every attempt as its
own row (e.g. `FAILED, FAILED, SUCCESS`), which is treated as a feature — full transparency, and
directly useful for the Reports module's `FAILED`-analyses aggregation — not a drawback.

## Known limitations (carried forward from the decisions above)

- Idempotency is check-then-act, not atomic (decision 2) — accepted for this submission's scope.
- No record of *when* a request reached its terminal state, only `createdAt` — acceptable since
  no requirement in this task depends on duration or completion time.

## Test plan

**Unit** (`AnalyticsProviderClient`, mocked HTTP layer, fake timers):
- Succeeds on attempt 1 → no retry.
- Fails (timeout/500/503) on attempts 1–2, succeeds on attempt 3 → returns result, backoff delays
  asserted at 300ms then 900ms.
- Fails on all 3 attempts → throws mapped to `ANALYTICS_PROVIDER_UNAVAILABLE`.
- 4xx response → fails immediately, no retry attempted.
- `200` with missing `sentiment` → fails immediately as `ANALYTICS_INVALID_RESPONSE`, no retry
  attempted.

**Unit** (`AnalyticsService`, mocked `AnalysisService`/`AnalyticsProviderClient`):
- Duplicate text within the window, existing status `PENDING`/`SUCCESS` → returns the existing
  record, does not call the provider.
- Duplicate text within the window, existing status `FAILED` → calls the provider, creates a new
  record.
- Different text within the window → calls the provider, creates a new record.
- Same text outside the window → calls the provider, creates a new record.
- Unexpected (non-provider) error during the provider call → rethrown without persisting a
  `FAILED` status, since the failure isn't one of the two known, mapped provider error modes.

**E2E** (`apps/api/test/analytics.e2e-spec.ts`, via text triggers embedded in `text` — see note
below):
- `POST /analytics/analyze`, missing `userId`/`text` → `400`.
- Happy path → `201`, `status: SUCCESS`, persisted `attemptsMade: 1`.
- `__error_500__` trigger → `503 ANALYTICS_PROVIDER_UNAVAILABLE`, persisted `status: FAILED`,
  `attemptsMade: 3`.
- `__timeout__` trigger → same as above (extended Jest timeout, ~16.2s worst case, no fake
  timers at this level since a real server answers over the network).
- `__partial__` trigger → `503 ANALYTICS_INVALID_RESPONSE`, persisted `status: FAILED`,
  `attemptsMade: 1`.
- Resubmitting identical text within 5 minutes → same record returned (`200`, same `id`), no
  second `Analysis` row created.
- Resubmitting identical text after a `FAILED` result → new record created (two rows for the
  same `userId`+`text`), provider called again.
- `GET /analytics/users/:id` → returns paginated history including a just-created analysis.
- `GET /analytics/users/:id`, `page` below the minimum allowed value → `400`.

**Trigger mechanism note:** failure modes are triggered via a text trigger string embedded in
`text` (`__error_500__`, `__error_503__`, `__timeout__`, `__partial__`), not via the
`X-Mock-Mode` header. The header is a test-only seam into the mock service itself (goals.md
§3.2) and is never forwarded by `AnalyticsProviderClient` — it can't be exercised through the
public `analyze` endpoint, only the text trigger can.

**Test user setup:** each run creates a single, isolated test user via a real
`POST /auth/register` + `POST /auth/login` round-trip in `beforeAll` — not seeded credentials,
to avoid hardcoding shared test data into the suite — and deletes it, along with all `Analysis`
rows it created, in `afterAll`. Each test submits text unique to that test (a label plus a
random suffix) to avoid unintentionally tripping the idempotency check across unrelated cases.

**`attemptsMade` note:** not part of the public `AnalysisOutput` contract (an internal
debugging field, not exposed over the API — decision 4), so e2e assertions on its value read
the persisted row directly via `PrismaService`, not the HTTP response body.

**Not covered here:** an unexpected (non-provider) failure during analysis — covered at the
unit level in `analytics.service.spec.ts`, where it can be deterministically simulated by
mocking the provider client to throw an arbitrary error.

**Frontend** (analyze form, Testing Library):
- In-progress state renders while the mutation is pending.
- Failure renders the retry affordance and the error message derived from `errorCode`.
- Retry re-submits and, on success, renders the result.
