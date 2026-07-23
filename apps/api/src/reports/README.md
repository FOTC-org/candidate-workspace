# Reports module

Generates aggregate reports from `Analysis` data (sentiment distribution, most active users) for
a given date range, requested by a user and persisted as a permanent snapshot. Authorization is
contextual — response visibility and shape depend on role, report ownership, and the data the
report covers, not on role alone.

## Endpoints

### `GET /api/v1/reports`

Query: `page` (default `1`), `limit` (default `20`).

Response `200`:
```json
{ "items": [/* Report records, same shape as GET /reports/:id */], "total": 0, "page": 1, "limit": 20 }
```

Filtering (no explicit error responses — the list is always a valid, possibly empty, `200`):
- ADMIN — all reports.
- MANAGER / ANALYST — only reports they requested themselves.
- MANAGER additionally — reports covering only inactive users are excluded from the list
  entirely (not just blocked at the detail level — see design decision 9 below).

### `POST /api/v1/reports`

Request:
```json
{ "dateFrom": "ISO date", "dateTo": "ISO date" }
```

Response `201`:
```json
{
  "id": "string",
  "requestedById": "string",
  "dateFrom": "ISO date",
  "dateTo": "ISO date",
  "isEmpty": false,
  "analysisCount": 0,
  "sentimentDistribution": { "positive": 0, "negative": 0, "neutral": 0 },
  "mostActiveUsers": [
    { "userId": "string", "email": "string", "analysisCount": 0 }
  ],
  "createdAt": "ISO date"
}
```

`mostActiveUsers` entries omit `userId`/`email` for an ANALYST requester — see "Design
decisions" below.

Error responses (via the global `AllExceptionsFilter`):
| `errorCode` | Status | When |
|---|---|---|
| standard DTO validation errors | 400 | `dateFrom > dateTo`, a range extending into the future, or a range longer than 365 days |

### `GET /api/v1/reports/:id`

Response `200`: same shape as `POST /reports`'s response, or `403` if the requester is not
authorized to view this specific report (see "Authorization" below).

Error responses:
| `errorCode` | Status | When |
|---|---|---|
| `REPORT_NOT_OWNED` | 403 | MANAGER or ANALYST requesting a report they did not create themselves |
| `REPORT_ARCHIVAL_RESTRICTED` | 403 | MANAGER requesting their own report, but it covers only inactive users |
| `REPORT_NOT_FOUND` | 404 | No report exists with the given `id` |

## Data model

```prisma
model Report {
  id                      String   @id @default(cuid())
  requestedById           String
  dateFrom                DateTime
  dateTo                  DateTime
  isEmpty                 Boolean
  analysisCount           Int
  sentimentDistribution   Json
  mostActiveUsers         Json
  coversOnlyInactiveUsers Boolean
  createdAt               DateTime @default(now())
  requestedBy             User     @relation(fields: [requestedById], references: [id])

  @@index([requestedById, createdAt])
  @@map("reports")
}
```

`User` gains the reverse relation `reports Report[]` — the same mechanical exception already
used for `Analysis.user` (goals.md §2): no `@relation` attributes, no `onDelete`, no new column
on `users`.

`sentimentDistribution` is stored as `Json` (a map of sentiment string → count) since `sentiment`
is an arbitrary provider string, not a closed enum — mirrors why `Analysis.keywords` needed a
non-relational representation in the Analytics module. `mostActiveUsers` is stored as `Json`
holding the full shape (`userId`, `email`, `analysisCount`) for up to 5 entries — the
role-dependent projection (stripping `userId`/`email` for ANALYST) happens at serialization time,
not at write time (§5.7 goals.md).

No `status` field: unlike `Analysis`, a `Report` is always complete at creation (§5.4 goals.md)
— there is no intermediate state to represent.

## Configuration

No new configuration required. Reports reads only from the existing `PrismaService` — there is
no external provider dependency, unlike Analytics.

## Design decisions

Full rationale for the following lives in `goals.md` §5.4–§5.9 and §6; this section restates
the outcomes with pointers back for the complete reasoning.

### 1. Report generation model (goals.md §5.4)

**Decision:** synchronous, inline within the request lifecycle. `POST /reports` computes all
aggregations against the local database and returns the complete report in the same response.

### 2. Report persistence model (goals.md §5.5)

**Decision:** a full snapshot computed once at creation and stored permanently. `GET /reports/:id`
only reads the stored result — it never recomputes aggregations, even if new `Analysis` records
have since been created within the report's date range.

### 3. FAILED analyses in aggregations (goals.md §5.6)

**Decision:** only `SUCCESS` analyses count towards `analysisCount`, `sentimentDistribution`, and
`mostActiveUsers` — one uniform rule applied to every aggregated field, not a different rule per
field. `PENDING` and `FAILED` records within the date range are excluded entirely. Aggregation reads `Analysis` records via a new `AnalysisService.findSuccessfulInDateRange` method (added to the existing `Analytics` entity module, filtering `status: SUCCESS` at the repository level) — Reports does not duplicate this filter itself.

### 4. Most active users (goals.md §5.7)

**Decision:** top 5 users by `SUCCESS` analysis count within the date range, ties broken
alphabetically by email. The stored snapshot always holds the full shape (`userId`, `email`,
`analysisCount`); `userId`/`email` are stripped only at response-serialization time for an
ANALYST requester.

### 5. Meaning of "covers only inactive users" (goals.md §5.8)

**Decision:** the set of "users the report covers" is the set of distinct `userId`s with at
least one `SUCCESS` analysis in the date range — the same set used for `mostActiveUsers` and
`sentimentDistribution`. `coversOnlyInactiveUsers` is `true` only when this set is non-empty and
every member has `isActive: false`. An empty set (`isEmpty: true`) is never "only inactive
users."

### 6. Authorization layer (goals.md §6)

**Decision:** a dedicated `ReportsAuthorizationService`, called by `ReportsService` after
loading a report and before returning it, sitting on top of (not replacing) the existing
`JwtAuthGuard`/`RolesGuard`. It receives the requesting user and the loaded `Report`, and either
returns normally or throws `ReportNotOwnedException`/`ReportArchivalRestrictedException`
(§5.9). It is not implemented as a Nest guard, because a guard runs before the controller
handler and has no access to the *specific report* being requested (guards are resource-unaware
by design in this codebase — goals.md §2) — the report must be loaded first to know what it
covers and who requested it.

Rules (goals.md §6):
- **ADMIN** — sees every report unconditionally.
- **MANAGER** — sees only reports they requested themselves (`REPORT_NOT_OWNED` otherwise), and
  never a report where `coversOnlyInactiveUsers` is `true`, even their own
  (`REPORT_ARCHIVAL_RESTRICTED`).
- **ANALYST** — sees only reports they requested themselves (`REPORT_NOT_OWNED` otherwise, same
  ownership rule as MANAGER); never subject to `REPORT_ARCHIVAL_RESTRICTED`, since the response
  they receive never contains `userId`/`email` in the first place — there is nothing archival
  left to protect against for this role. Response shape strips `mostActiveUsers[].userId`/`.email`.
- **Inactive requester** — already rejected globally at 401 by `JwtStrategy`, before this layer
  or any controller runs; no additional code needed here (goals.md §2).

### 7. Error codes for access denial (goals.md §5.9)

**Decision:** `ReportNotOwnedException` (`REPORT_NOT_OWNED`, 403) and
`ReportArchivalRestrictedException` (`REPORT_ARCHIVAL_RESTRICTED`, 403), both `DomainException`
subclasses mirroring `entities/user/user.exceptions.ts` — distinguishable error codes instead of
a single generic `ForbiddenException`, since the two denial reasons are conceptually distinct and
a client could reasonably want to react to each differently.

### 8. Date range validation

**Decision:** validated entirely at the DTO level (`class-validator`, custom validators where
needed), never in the controller or service — consistent with goals.md §2's "no business logic
in controllers." Three independent rules, each with its own message:
- `dateFrom` must not be after `dateTo`.
- `dateTo` must not be in the future.
- The range (`dateTo - dateFrom`) must not exceed 365 days.

### 9. Report list endpoint and filtering (goals.md §5.10)

**Decision:** `GET /reports` filters at the query level — ADMIN sees everything; MANAGER/ANALYST
see only their own reports; MANAGER additionally never sees archival-restricted reports
(`coversOnlyInactiveUsers: true`) even in the list, not only when opening one. List items share
the same output shape as `GET /:id`, including the same ANALYST projection.

## Known limitations

- A report is a point-in-time snapshot (§5.5): if `Analysis` records are added later that fall
  within an existing report's date range, the report is not updated retroactively. This is
  treated as correct behavior, not a limitation to fix, per §5.5's reasoning — but is noted here
  since it may be surprising at first glance.
- `mostActiveUsers` is capped at 5 entries with no way to request more — a fixed, undocumented-
  as-configurable constant per §5.7.

## Test plan

**Unit** (`ReportsAuthorizationService`, one test per rule/combination — goals.md §6/§7):
- ADMIN — always allowed, regardless of ownership or `coversOnlyInactiveUsers`.
- MANAGER, owns the report, `coversOnlyInactiveUsers: false` — allowed.
- MANAGER, owns the report, `coversOnlyInactiveUsers: true` — `ReportArchivalRestrictedException`.
- MANAGER, does not own the report — `ReportNotOwnedException` (checked before the archival rule).
- ANALYST, owns the report — allowed, response is the aggregated shape.
- ANALYST, does not own the report — `ReportNotOwnedException`.
- ANALYST, owns a report with `coversOnlyInactiveUsers: true` — allowed (never restricted by
  this rule).
- `GET /reports` as ADMIN → includes reports requested by other users.
- `GET /reports` as MANAGER → only own reports, and excludes any owned report with
  `coversOnlyInactiveUsers: true`.
- `GET /reports` as ANALYST → only own reports, aggregated shape, no `userId`/`email` in
  `mostActiveUsers`.

**Unit** (`ReportsService`, mocked `AnalysisService`/`ReportRepository`/`ReportsAuthorizationService`):
- Date range with matching `SUCCESS` analyses → correct `analysisCount`,
  `sentimentDistribution`, `mostActiveUsers`.
- Date range with no `SUCCESS` analyses → `isEmpty: true`, `analysisCount: 0`,
  `coversOnlyInactiveUsers: false`.
- Date range where every contributing user is inactive → `coversOnlyInactiveUsers: true`.
- Date range where at least one contributing user is active → `coversOnlyInactiveUsers: false`.
- `FAILED`/`PENDING` analyses within range are excluded from every aggregated field (one test
  asserting all three fields together, not just one).
- Tie in `SUCCESS` count among candidates for the top-5 slot → resolved alphabetically by email.

**Unit** (DTO validation):
- `dateFrom > dateTo` → rejected with a specific message.
- `dateTo` in the future → rejected with a specific message.
- Range longer than 365 days → rejected with a specific message.
- Valid range → accepted.

**E2E** (`apps/api/test/reports.e2e-spec.ts`):
- `POST /reports`, invalid range (each of the three cases) → `400`.
- `POST /reports`, valid range with data → `201`, correct aggregation shape.
- `POST /reports`, valid range with no data → `201`, `isEmpty: true`.
- `GET /reports/:id` as ADMIN → any report, `200`.
- `GET /reports/:id` as MANAGER, own report → `200`.
- `GET /reports/:id` as MANAGER, someone else's report → `403 REPORT_NOT_OWNED`.
- `GET /reports/:id` as MANAGER, own report covering only inactive users → `403
  REPORT_ARCHIVAL_RESTRICTED`.
- `GET /reports/:id` as ANALYST, own report → `200`, `mostActiveUsers` entries without
  `userId`/`email`.
- `GET /reports/:id` as ANALYST, someone else's report → `403 REPORT_NOT_OWNED`.
- `GET /reports/:id`, non-existent `id` → `404`.

**Frontend** (report list + report detail views, Testing Library):
- List view: loading, empty, and populated states.
- Detail view: different rendering for the ADMIN/MANAGER shape (with user identities) vs. the
  ANALYST shape (aggregated only).
- Form validation errors surfaced for each of the three invalid-range cases.
