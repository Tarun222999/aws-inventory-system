# Phase 7 — Events, schedules, and notifications

## Delivered learning architecture

```text
ProcessOrder command
  -> one command owner persists order and outbox state
  -> OrderConfirmed domain event
  -> EventBridge bus applies content-based rules
     -> SNS operations topic -> subscribed operational observers
     -> other matching consumers independently

EventBridge Scheduler
  -> low-stock Lambda
  -> query inventory over private VPC networking
  -> conditional, date-keyed report object in private S3
  -> SES transactional email containing a short-lived presigned download link
```

## Boundary decisions

- `ProcessOrder` is a command: it requests work from one owning component.
  `OrderConfirmed` is an event: it states a completed fact and does not name
  its consumers.
- SQS remains the durable work mechanism where one worker must perform and
  acknowledge background work. SNS is not a replacement for queue-owned
  acknowledgement and redrive behavior.
- EventBridge owns content-based routing of domain events; SNS performs
  subscriber fan-out once a notification audience is chosen.
- SES is the application email provider for a verified sender and deliberate
  customer-facing messages. SNS email subscriptions are appropriate for simple
  operational alerts, not the customer email boundary.
- Scheduler creates time-based invocations; an EventBridge bus routes events
  that already occurred. They are separate products with different sources and
  delivery semantics.

## Evidence

- An `OrderConfirmed` event was routed only by its matching EventBridge rule;
  SNS delivered the transformed operational notification to its confirmed
  email subscriber.
- The Lambda report completed on demand, a duplicate reporting-period run, and
  a one-time Scheduler invocation. The S3 report object's original ETag and
  last-modified time remained unchanged on duplicate runs because the report
  key is deterministic and creation is conditional.
- A controlled removal of `lambda:InvokeFunction` from the Scheduler execution
  role caused an `AccessDeniedException` at delivery time. Lambda did not run
  and the Scheduler DLQ received the original schedule payload. This proves a
  target failure is observable without treating it as a Lambda application
  failure.
- The failure schedule allowed one retry, but its 60-second maximum event age
  elapsed first; `RETRY_ATTEMPTS` was therefore zero. A retry count is a
  maximum, bounded by delivery age, rather than a guarantee.
- Event schemas evolve additively: place new optional fields in `detail`, keep
  existing fields and their meaning stable, and allow consumers to ignore
  fields they do not understand.

## Phase review — 2026-09-21

**Confidence: 3 — Phase 7 complete.** The learner accurately distinguished
commands from events, EventBridge routing from Scheduler, SNS operational
fan-out from SES transactional email, date-based idempotency, and independent
target outcomes. The Scheduler retry/event-age interaction was reviewed after
the exercise and should be repeated when Phase 8 introduces operational
monitoring.

All Phase 7 disposable AWS resources were deleted and verified. The stopped,
private RDS instance is intentionally retained as prior-phase foundation; its
storage, backup, and managed-secret costs and next automatic-restart review
deadline are recorded in the cost ledger.
