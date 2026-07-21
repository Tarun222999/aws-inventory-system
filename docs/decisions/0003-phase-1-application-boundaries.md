# ADR 0003 — Phase 1 Application Boundaries

## Status

Proposed at the start of Phase 1; validate through the local implementation and
Phase 1 review.

## Context

The order and inventory platform needs production-shaped boundaries without
adding distributed-system complexity before it is useful. Phase 1 must run
locally and must make transactional and failure behaviour observable.

## Decision

- Build one React and TypeScript frontend.
- Build one Node.js and TypeScript API as a modular monolith. Product,
  inventory, and order modules remain explicit internal boundaries rather than
  independently deployed services.
- Run one Node.js and TypeScript background-worker process from the same
  application codebase.
- Use PostgreSQL as the only stateful application component.
- Keep the frontend, API, and worker stateless. They may be stopped and
  replaced without losing committed business data.
- Accept an order synchronously in one database transaction: validate input,
  lock/check inventory, decrement inventory, create the order and its items,
  and record durable pending work before returning `201 Created`.
- Perform simulated fulfilment asynchronously in the worker. Phase 1 uses a
  PostgreSQL-backed work record so accepted work survives a worker restart;
  Phase 6 will replace or extend this boundary with SQS and explicit
  at-least-once-delivery handling.
- Keep `/health` a liveness check and `/ready` a readiness check that verifies
  required dependencies such as the database.
- Read non-sensitive configuration from environment variables. Keep secrets
  out of source control and provide only documented placeholder names.

## Why

A modular monolith keeps local transactions and debugging understandable while
still teaching module ownership. The separate worker demonstrates a genuine
synchronous/asynchronous boundary. Recording pending work in the same database
transaction prevents an accepted order from being committed without durable
work to process.

## Transaction and response boundary

The API does not claim success until all required order-acceptance state is
committed. A validation failure changes no state. Insufficient stock rolls the
transaction back and returns `409 Conflict`. A dependency that prevents safe
acceptance returns `503 Service Unavailable`. Worker completion is not required
for the order-creation response.

## Trade-offs

- A database-backed work queue is useful locally but lacks the delivery,
  scaling, and dead-letter features that SQS introduces in Phase 6.
- A single database is a shared failure boundary.
- A modular monolith cannot independently deploy or scale its internal modules,
  but the current scope does not justify that operational cost.

## Cost and AWS impact

Phase 1 is local-only. No AWS resources, deployments, or credential changes are
required. Local Docker containers consume only the learner's machine resources.

## Failure impact and validation

We will deliberately stop or make PostgreSQL unavailable and verify that
liveness and readiness differ, unsafe writes are rejected, logs identify the
dependency failure, and recovery does not lose committed work. We will also
test transaction rollback when stock is insufficient.

## Conditions that would make us reconsider

- A demonstrated need to scale or deploy a module independently
- A security or ownership boundary that cannot be enforced inside one process
- Workload evidence that PostgreSQL-backed local work processing is no longer
  suitable (addressed deliberately in Phase 6)
