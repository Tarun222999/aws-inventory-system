# ADR 0008: Phase 7 event routing, scheduled reporting, and notification boundaries

## Status

Accepted on 2026-09-21 after successful EventBridge/SNS/SES delivery,
idempotent scheduled-report evidence, a controlled Scheduler delivery failure,
and verified disposal of Phase 7 runtime.

## Context

The order platform needs to react to confirmed orders without coupling the
order-owning service to each operational observer. It also needs a periodic
low-stock report that can be retried safely, made available privately, and
emailed to an intended recipient. The learning architecture already uses SQS
for durable background work and private RDS/S3/Secrets Manager resources.

The decision must distinguish commands, durable work queues, domain-event
routing, operational fan-out, customer email, and time-based invocation. It
must provide useful failure evidence without retaining paid endpoint or compute
runtime after the lesson.

## Decision

- Treat `ProcessOrder` as a command sent to one owner and emit
  `OrderConfirmed` only after the order is durably confirmed. Event consumers
  receive a version-tolerant envelope and must tolerate additive optional
  fields in `detail`.
- Publish confirmed-order facts to EventBridge. Use rules that match event
  source and detail type, so the producer does not need to know every consumer.
- Use SNS only as the operational notification fan-out boundary after a
  matching EventBridge rule selects that audience. Use SQS for durable worker
  load and acknowledgement, not SNS alone.
- Use SES with a verified identity for deliberate transactional customer email.
  SNS email subscriptions remain limited to operational notifications.
- Use EventBridge Scheduler for time-based low-stock Lambda invocation. It is
  separate from the EventBridge event bus and supplies a scheduled-time
  payload, explicit time zone, retry policy, maximum event age, and DLQ.
- Store one report per Asia/Kolkata reporting date under a deterministic S3 key
  using conditional creation. Send a short-lived presigned read link rather
  than making the report bucket public.
- Give Scheduler a narrowly scoped execution role for only the intended Lambda
  target and DLQ. Treat its DLQ as delivery-failure evidence; a failure before
  Lambda invocation will not create Lambda application logs.
- Delete schedules before ending the session, then remove all disposable
  Lambda, endpoint, S3, SQS, SES, IAM, EventBridge, SNS, and security-group
  resources. Retain only the separately ledgered stopped/private RDS
  foundation.

## Options considered

1. EventBridge routing followed by SNS operations fan-out and SES customer
   email.
2. Direct producer-to-SNS publication for every notification.
3. Direct producer-to-SQS publication for all consumers.
4. A long-running worker or in-process timer for low-stock reporting.
5. A public S3 report URL or email attachment.

## Why

EventBridge preserves loose coupling: new consumers can be introduced by rules
without changing the event producer. SNS is purpose-built to fan the selected
notification to multiple subscriptions. SQS keeps durable work ownership,
acknowledgement, visibility timeout, and redrive semantics explicit. SES gives
the application control of its verified sender and transactional email content.

Scheduler makes time, time zone, delivery retries, and failure capture explicit
AWS resources instead of hidden process-local behavior. Date-keyed conditional
report creation makes at-least-once Scheduler delivery safe. Private S3 plus a
short-lived presigned URL avoids public report access.

## Trade-offs

- EventBridge, SNS, Scheduler, SES, S3, Lambda, and SQS each have independent
  IAM, delivery, retry, and cost settings; this is more complex than direct
  synchronous calls.
- Event delivery is asynchronous and at-least-once. Consumers need idempotent
  effects, and additive schema changes require compatibility discipline.
- A Scheduler retry limit is only a maximum; a short maximum event age can send
  an event to the DLQ before a retry occurs.
- Presigned URLs are bearer credentials until expiry. Link lifetime and the
  signed action must remain tightly bounded.
- The SES sandbox allows delivery only to verified identities. Production
  customer delivery requires separately reviewed production access, consent,
  bounce/complaint handling, and email reputation controls.

## Validation outcome

- EventBridge routed the exact `OrderConfirmed` event only to the configured
  target; SNS delivered the transformed operational email.
- SES delivered the low-stock report email, and its presigned S3 link opened a
  private report object.
- Re-running the same report period on demand and through Scheduler left the
  original object ETag and last-modified time unchanged.
- A deliberately denied Scheduler-to-Lambda delivery reached the Scheduler DLQ
  as `AccessDeniedException`; Lambda had no new log stream because it was never
  invoked. The schedule used one allowed retry but reached the 60-second event
  age before a retry occurred.
- All Phase 7 disposable resources were deleted and verified absent. The
  retained RDS instance is stopped and private, with its automatic-restart
  review deadline recorded in the cost ledger.

## Conditions that would make us reconsider

- A production event contract requires a schema registry, versioning policy,
  replay strategy, and independently deployable consumers.
- Durable business effects or backpressure require an SQS queue/DLQ consumer
  rather than direct SNS delivery.
- Multiple report recipients, larger reports, or audit requirements require a
  report catalogue, stronger access controls, or a different distribution path.
- A production email program requires SES production access and operational
  handling of opt-outs, bounces, complaints, and reputation metrics.
- A sustained private Lambda workload warrants a new cost/security comparison
  of VPC endpoints, NAT, and other controlled egress designs.
