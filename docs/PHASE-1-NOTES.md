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
- [ ] Scaffold the TypeScript workspace and local PostgreSQL environment.
- [ ] Add migrations for products, inventory, orders, order items, and pending
      background work.
- [ ] Implement health and readiness with structured logging and graceful
      shutdown.
- [ ] Implement validated product creation and paginated product listing with
      intentional status codes.
- [ ] Implement transactionally safe order acceptance and inventory changes.
- [ ] Implement the background worker and show accepted work survives a worker
      restart.
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

## Phase review (complete at exit)

```text
Confidence (0-4):
Architecture decision I can defend:
Failure I investigated:
Question to revisit:
Cleanup status:
```
