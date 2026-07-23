# Phase 1 — Local application foundation

## Scope and safety

- Phase 1 began on 2026-07-21.
- This phase is strictly local-only. No AWS workload resources will be created,
  started, modified, or deployed, and Phase 2 will not begin.
- Confirmed stack: React + TypeScript frontend, Node.js + TypeScript API and
  worker, PostgreSQL, and Docker.
- Architecture: modular monolith plus a separate background worker; no
  microservices or unrelated infrastructure.
- Phase 0 cleanup remains `PARTIAL` only because two inactive root access keys
  are retained for deletion review on 2026-07-28. Expected residual cost is
  USD 0. Phase 1 will not alter AWS credentials or resources.

## Boundary sketch

```text
Browser
  |
  | synchronous HTTP/JSON
  v
React frontend ----> Node.js modular-monolith API
                              |
                              | SQL transaction
                              v
                        PostgreSQL database
                              ^
                              | durable pending work
                              |
                    Node.js background worker
```

Stateful: PostgreSQL (products, inventory, orders, and durable pending work).

Stateless: frontend assets, API processes, and worker processes. Runtime
processes may hold temporary in-memory data, but correctness must not depend on
it surviving a restart.

## Incremental build plan and evidence

- [x] Record the application, state, transaction, and async boundaries.
- [x] Scaffold the TypeScript workspace and local PostgreSQL environment.
- [x] Add migrations for products, inventory, orders, order items, and pending
      background work.
- [x] Implement health and readiness with structured logging and graceful
      shutdown.
- [x] Implement validated product creation and paginated product listing with
      intentional status codes.
- [x] Implement transactionally safe order acceptance and inventory changes.
- [x] Implement the background worker and show accepted work survives a worker
      restart.
- [x] Implement the React frontend for product/inventory management, order
      creation, and asynchronous status viewing.
- [ ] Add unit/integration tests and Docker packaging.
- [ ] Run a controlled local dependency failure and record the diagnosis.
- [ ] Verify no secrets are committed.
- [ ] Complete the Phase 1 workbook questions and demonstrations.

## Decisions and evidence log

### 2026-07-21 — Phase start

- Read the development plan, Phase 1 engineering workbook, cost-safety
  checklist, and Phase 0 notes.
- Proposed ADR 0003 for the modular-monolith, transaction, asynchronous-work,
  health/readiness, configuration, and secret boundaries.
- AWS actions: none.
- Local application resources started: none.
- Current Phase 1 status: in progress.
- Cleanup status: `PARTIAL`, inherited solely from the documented Phase 0 root
  key follow-up; no Phase 1 cloud resources exist.

### 2026-07-21 — Step 1 workspace foundation

- Created npm workspaces for the API, worker, and shared configuration package.
- Added strict shared TypeScript settings, ESLint, Prettier, and reproducible
  dependency versions in `package-lock.json`.
- Added validated API/worker environment configuration. `DATABASE_URL` is
  required; ports and polling intervals are bounded and typed.
- Added `.env.example` with local placeholders and ignored real `.env` files.
- Added Docker Compose PostgreSQL `16.4-alpine` with a named local volume and
  readiness health check.
- Verified `npm run check`, production TypeScript builds, successful API and
  worker configuration startup, and fail-fast startup when `DATABASE_URL` is
  absent.
- Started local container `order-platform-postgres-1`; Docker reported it
  healthy and `pg_isready` reported that it accepts connections on port 5432.
- No application schema or business behaviour has been added yet.
- AWS actions/resources: none.

### 2026-07-21 — Step 2 database foundation

- Chose PostgreSQL-generated UUID primary keys for externally visible records.
- Added the shared `@order-platform/database` package using Drizzle ORM and the
  PostgreSQL `pg` driver, with a bounded connection pool factory.
- Defined and migrated five tables: `products`, `inventory`, `orders`,
  `order_items`, and `jobs`.
- Money is stored as integer paise. Order items snapshot purchase-time SKU,
  name, unit price, quantity, and line total.
- PostgreSQL constraints enforce non-blank product/job identifiers, positive
  prices and quantities, non-negative inventory and attempts, consistent line
  totals, unique SKUs, one product line per order, and one job type per order.
- Foreign keys and indexes support ownership, deletion rules, product/order
  lookup, stable order listing, and future worker job claiming.
- Reviewed the generated SQL before applying migration
  `0000_tired_annihilus.sql` to the local database.
- Direct PostgreSQL inspection confirmed all five tables, UUID defaults,
  constraints, indexes, foreign keys, and the Drizzle migration record.
- Controlled failure: attempted to create a product and negative inventory in
  one transaction. The inventory constraint rejected the write and the product
  insert rolled back; persisted rows verified as zero.
- Rebuild evidence: created a disposable empty local database, applied the
  migration, verified all five public tables, and deleted the test database.
- AWS actions/resources: none.

### 2026-07-21 — Step 3 lifecycle and dependency health

- Connected the separate API and worker processes through the shared bounded
  PostgreSQL pool.
- Added structured JSON logging with timestamps, severity, component, errors,
  request IDs, and lifecycle events; secrets are not logged.
- Added `GET /health` as process liveness and `GET /ready` as a bounded
  PostgreSQL readiness check. The API listens only on `127.0.0.1` locally.
- Added consistent JSON `404` and unexpected `500` responses.
- Added `SIGINT`/`SIGTERM` graceful shutdown: stop accepting new requests or
  polling, wait for active work, close the database pool, and enforce a bounded
  shutdown deadline.
- Healthy evidence: `/health` and `/ready` returned `200`; caller request IDs
  were echoed for traceability.
- Controlled failure: stopping local PostgreSQL initially exposed unhandled
  idle pool errors that terminated both processes. Added a pool error listener,
  reran the failure, and verified both processes remained alive.
- Corrected failure evidence: with PostgreSQL stopped, `/health` returned
  `200`, `/ready` returned `503 database_unavailable`, and the worker logged
  the dependency transition without terminating.
- Recovery evidence: restarting PostgreSQL restored `/ready` to `200` without
  restarting the API; the worker automatically reconnected.
- Graceful shutdown evidence: interactive `Ctrl+C` produced shutdown-started
  and shutdown-completed events for both API and worker. Remaining noninteractive
  test processes were identified by exact process ID/start time and removed.
- PostgreSQL is running and healthy after the exercise; the local named volume
  remains intact. AWS actions/resources: none.

### 2026-07-23 — Step 4 products and inventory

- Split product HTTP parsing, validation, repository queries, and cursor logic
  into explicit internal modules while retaining one modular-monolith API.
- Added `POST /products`, `GET /products`, and `GET /products/:id`.
- Product input is strict and bounded: trimmed SKU/name, integer positive price
  in paise, non-negative initial quantity, optional bounded description, and a
  16 KiB request-body limit.
- Product and inventory rows are inserted in one short PostgreSQL transaction
  after validation, preventing partial product creation.
- Added intentional responses: `201` with `Location`, `200`, validation/JSON
  `400`, missing product `404`, duplicate SKU `409`, oversized body `413`, and
  dependency failure `503`.
- Added keyset pagination ordered by `(created_at, id)`, a matching composite
  index, a bounded `limit` of 1–100, an opaque cursor, and `limit + 1` retrieval
  to detect the next page without a count query.
- Standardized persisted application timestamps to millisecond precision so a
  PostgreSQL cursor round-trips exactly through JavaScript `Date`.
- Tests initially exposed a wrapped PostgreSQL unique-violation error and a
  microsecond/millisecond cursor boundary bug. Both were fixed and rerun.
- Integration evidence: atomic product/inventory creation, duplicate SKU
  rejection, and cursor traversal all pass against real local PostgreSQL; test
  data is deleted in cleanup blocks.
- HTTP evidence: create/read/list succeeded; malformed or invalid input returned
  `400`, a missing UUID returned `404`, and duplicate SKU returned `409`. The
  disposable manual product was deleted and the API stopped gracefully.
- Improved the worker wait helper to remove completed abort listeners rather
  than accumulating them across polling iterations.
- PostgreSQL remains local-only and healthy. AWS actions/resources: none.

### 2026-07-23 — Step 5 transactional order acceptance

- Added validated `POST /orders` and `GET /orders/:id` endpoints.
- Order input requires 1–50 unique product UUIDs with positive bounded integer
  quantities.
- The acceptance transaction locks all requested product/inventory rows in
  consistent product-ID order, verifies existence and stock, calculates the
  total, creates the pending order and purchase-time item snapshots, decrements
  inventory, and records a durable `fulfill_order` job before committing.
- Validation occurs before the transaction and no external work occurs while
  row locks are held.
- Intentional responses include `201` with `Location`, `200`, validation `400`,
  missing product/order `404`, insufficient stock `409`, and dependency `503`.
- Integration evidence: successful acceptance produced pending order/items/job
  and correct remaining stock; a multi-item insufficient-stock failure rolled
  back all changes; two concurrent requests for the final unit produced exactly
  one committed order and one insufficient-stock failure.
- All six product/order integration tests pass against real local PostgreSQL.
- HTTP evidence: an order for two units returned `201`, `pending`, and the
  correct total; lookup returned its item; a second attempt returned `409`.
- The disposable HTTP order and product were deleted, and the API stopped
  gracefully. PostgreSQL remains local-only and healthy.
- AWS actions/resources: none.

### 2026-07-23 — Step 6 durable background fulfillment

- Implemented the worker as a separate Node.js process that reuses the shared
  database and configuration packages while remaining independently
  restartable from the API.
- A short claim transaction selects eligible work with
  `FOR UPDATE SKIP LOCKED`, marks the job `processing`, increments its attempt,
  records lease ownership, and moves the order to `processing`. Fulfillment
  runs after the transaction, so database locks are not held during slow work.
- Completion and failure updates require the current lease owner. Successful
  work marks the job `completed` and order `ready_to_ship`; failures either
  schedule a bounded retry or mark both job and order failed after the maximum
  attempt.
- Processing leases expire. A replacement worker can reclaim stale work after
  a crashed worker, while the former owner is prevented from completing a job
  whose lease it no longer owns. This demonstrates that accepted work lives in
  PostgreSQL rather than worker memory and survives worker restart or loss.
- Graceful shutdown stops new polling and awaits the currently claimed job
  before closing the database pool. Signal handlers are guarded and remain
  installed so a repeated console signal cannot bypass the drain path.
- Controlled local failure: the processor's explicit `simulateFailure` input
  was exercised. Tests verified a retry with a future availability time,
  followed by terminal job and order failure at the configured attempt limit.
- Concurrency evidence: with two worker identities, exactly one claimed the
  pending job; a non-owner could not complete it. Recovery evidence: a stale
  processing lease was reclaimed and completed by a replacement worker.
- End-to-end HTTP evidence: the API accepted an order as `pending`; the worker
  claimed it, processed it, and the API subsequently returned
  `ready_to_ship`. Structured worker logs included job ID, order ID, and
  attempt without logging secrets.
- All three worker PostgreSQL integration tests and all six API PostgreSQL
  integration tests pass. The final database check found no jobs, orders, or
  disposable `TEST-*`/`MANUAL-*` products.
- PostgreSQL remains local-only. AWS actions/resources/credentials: none.

### 2026-07-23 — Step 7 React frontend

- Added `apps/frontend` as a React + TypeScript workspace using Vite, within the
  existing modular-monolith repository. It talks only to the existing API; no
  backend routes or contracts were changed.
- Local development uses a same-origin `/api` proxy. The optional
  `VITE_API_BASE_URL` is public configuration only; database credentials and
  server secrets remain outside the browser bundle.
- Implemented a responsive, keyboard-accessible catalog with loading, empty,
  unavailable-dependency, out-of-stock, and cursor-pagination states.
- Added atomic product/opening-stock creation with client validation and clear
  duplicate-SKU conflict handling.
- Added an order builder that caps quantities to observed inventory, shows the
  calculated total, and handles stock conflicts. A missing-product or
  insufficient-stock conflict clears the cart, refetches the first catalog
  page, and tells the user to reselect; network and `503` failures retain the
  cart so a transient dependency failure does not discard their work.
- Product creation refetches the first catalog page instead of locally
  prepending the newest product to the API's oldest-first cursor ordering.
- Added order lookup and status display. `pending` and `processing` orders poll
  serially, scheduling the next request only after the current request settles.
  Effect cleanup cancels future polling and ignores an in-flight result after
  unmount/status change. Poll errors retain the last known order, display the
  mapped failure, retry, and clear the failure after a successful recovery.
  The UI explicitly explains that acceptance is synchronous but fulfillment
  belongs to the separate asynchronous worker.
- Intentional API handling covers validation (`400`), missing product/order
  (`404`), duplicate SKU or insufficient stock (`409`), dependency failure
  (`503`), and unreachable-network failure. The client does not claim runtime
  schema validation of malformed successful responses.
- Frontend tests cover catalog rendering, empty state, product creation, order
  construction, first-page refetch ordering, opaque cursor forwarding, conflict
  cart reconciliation, serialized polling with visible failure/recovery, API
  conflict preservation, and an unreachable/dependency failure path.
- Production build evidence: Vite emitted a 204.52 kB JavaScript bundle
  (64.20 kB gzip) and 7.92 kB stylesheet (2.51 kB gzip). Workspace TypeScript,
  ESLint, Prettier, frontend tests, and production builds passed.
- Real local integration evidence: the browser created a five-unit product,
  selected two units, confirmed the ₹698.00 order total, submitted the order,
  and observed the separate worker move it to `ready_to_ship`. The catalog also
  recovered through its visible retry control after the API was deliberately
  unavailable during startup. The disposable order and product were deleted
  afterward, and the API and worker logged graceful shutdown.
- AWS actions/resources/credentials: none. Phase 1 remains local-only and in
  progress because the remaining phase-wide Docker, secret-review, and workbook
  exit criteria have not been claimed by this frontend increment.

## Phase review (complete at exit)

```text
Confidence (0-4):
Architecture decision I can defend:
Failure I investigated:
Question to revisit:
Cleanup status:
```
