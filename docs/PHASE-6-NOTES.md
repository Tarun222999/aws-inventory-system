# Phase 6 — Reliable asynchronous processing

## Lambda supplement — active lab, 2026-09-02

The canonical order-fulfillment path remains the ECS worker plus the
PostgreSQL job and transactional-outbox records. Lambda is a bounded,
synthetic-message learning exercise, not a replacement database worker.

```text
synthetic SQS message
  -> existing Standard source queue
  -> AWS-managed Lambda event source mapping polls and forms a batch
  -> minimal Node.js handler processes Records
  -> Lambda deletes successful records; failed item identifiers are retried
  -> source queue redrive policy moves a poison message to the existing SQS DLQ
```

- Never run the Lambda mapping and ECS worker concurrently against the source
  queue during this lab.
- Lambda has no RDS access and does not introduce a VPC attachment, NAT Gateway,
  or interface endpoint.
- Use a 128 MB Node.js function, 10-second timeout, batch size 2, maximum
  concurrency 2 (the SQS mapping minimum), and `ReportBatchItemFailures`.
- The source queue's existing 60-second visibility timeout is deliberately
  longer than the 10-second function timeout. First show the unsafe timeout
  relationship in the console/configuration without processing a message, then
  correct it before enabling the mapping.
- The execution role trusts `lambda.amazonaws.com`, writes only its exact
  CloudWatch log group, and can receive/delete/read attributes only from the
  exact source queue. The event source mapping is a separate resource that
  connects that queue to the function.
- Demonstrate a successful record, then a mixed batch whose only failing item
  is returned in `batchItemFailures`. Finally make one poison record fail until
  the source queue's `maxReceiveCount=3` sends it to the existing SQS DLQ;
  inspect it, correct handler behavior, and redrive it safely.
- Lambda execution environments may be reused, but handler state must never
  be relied upon across invocations. Observe logs, Invocations, Errors,
  Duration, ConcurrentExecutions, queue depth, and oldest-message age.

## How Lambda differs by source

The handler is always called with an event, but the source owns the event
shape, invocation direction, acknowledgement, retry, and failure contract.

| Source | Invocation model | Handler result | Retry/DLQ owner |
| --- | --- | --- | --- |
| SQS | Lambda event source mapping polls the queue and invokes batches | `batchItemFailures` identifies records not to delete when `ReportBatchItemFailures` is enabled | SQS visibility timeout and the source queue's redrive policy/DLQ |
| S3 | S3 asynchronously invokes Lambda after a bucket notification | ordinary handler success/failure; no SQS acknowledgement | S3/Lambda asynchronous delivery configuration; prevent self-trigger loops with separate buckets or prefixes |
| API Gateway | API Gateway synchronously invokes Lambda for an HTTP request | Lambda returns an HTTP response; caller waits | client/API timeout and API error mapping; not an SQS DLQ flow |
| EventBridge | EventBridge asynchronously delivers a matching event to the Lambda target | ordinary handler success/failure | EventBridge target retry policy and configured EventBridge DLQ/destination |

For SQS, the partial-response structure is a Lambda mapping response contract,
not a new message sent to SQS. Lambda's managed poller retains receipt handles,
deletes records not listed as failures, and lets listed records become visible
again. An exception means the whole batch failed. The exact mapping must enable
`ReportBatchItemFailures` or Lambda does not interpret the per-record response.

Official references: [SQS error handling and partial batch responses](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html), [S3 notifications](https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html), [API Gateway invocation](https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html), and [EventBridge retry policy](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-retry-policy.html).

## Mandatory cleanup

After evidence, delete and verify the event source mapping first, then the
function, Lambda-specific log group, and lesson execution role/policies. Verify
source and DLQ visible/in-flight/delayed counts are zero. Retain only the empty
queues under the later Phase 7 justification.

## Lambda lab outcome — 2026-09-02

- One successful synthetic message was processed and automatically deleted by
  Lambda's SQS integration. The log correlated its SQS message ID and event ID.
- A synthetic `partial-failure` message was deliberately returned in
  `batchItemFailures`; it remained undeleted, retried under the source queue's
  visibility/redrive rules, and reached the existing SQS DLQ after three
  receives. The initially staged success and failure arrived in separate
  invocations, proving that a batch size of two is a maximum rather than a
  promise that two available messages share one invocation.
- The original message was redriven only after the handler behavior was
  corrected. The repaired handler logged `Recovered partial-failure message`,
  Lambda acknowledged it, and source/DLQ counts returned to zero.
- CloudWatch showed Lambda invocations with zero Lambda function errors. SQS
  visible depth briefly reached two while messages were deliberately staged;
  this is the beginning of backpressure. Sustained depth or oldest-message age
  would mean arrivals exceed the bounded consumer capacity and needs a scaling
  or downstream-dependency investigation.
- Cleanup is VERIFIED for the Lambda supplement: event-source mapping,
  function, Lambda log group, exact inline policy, and lesson execution role
  are absent; both queues are empty. The queues remain retained only for the
  later Phase 7 justification. This lab did not replace the ECS/PostgreSQL
  fulfillment worker or complete any remaining real-worker crash/idempotency
  evidence.

## Phase review — 2026-09-04

**Confidence: 3 — complete, with one deliberately deferred repeat exercise.**

Workbook review was completed interactively. The learner correctly explained:

- at-least-once redelivery after a worker commits the job but crashes before
  `DeleteMessage`, and why an idempotent completed-job check prevents a second
  business effect;
- transactional-outbox atomicity for the database order/job/outbox write, and
  why it does not make PostgreSQL and SQS one transaction;
- the visibility-timeout overlap risk, retryable versus poison failures, and
  inspect/fix-before-redrive discipline;
- Lambda's AWS-managed SQS event-source poller and its acknowledgement of
  successful records; and
- why the API returns after durable order/job/outbox creation while fulfillment
  proceeds asynchronously.

Evidence includes the real API -> outbox publisher -> SQS -> ECS worker flow,
duplicate/DLQ/redrive exercises, Lambda partial-batch exercise, and verified
disposable-runtime cleanup. The controlled canonical ECS-worker crash after a
database commit but before SQS acknowledgement was intentionally deferred; it
is a confidence-raising revisit, not claimed as demonstrated. Do not begin
Phase 7 under this record.
