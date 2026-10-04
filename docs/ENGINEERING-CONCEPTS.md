# AWS Engineering Concepts — Phase Review Workbook

Use this workbook after every project phase. A checkbox should be marked only
when you can explain the answer in your own words and support it with an example
or evidence from the project.

This is not a memorization checklist. The expected progression is:

```text
I have heard the term
  -> I can explain it
  -> I can apply it
  -> I can diagnose it when it fails
  -> I can defend the trade-off
```

## How to complete a phase review

For each phase:

1. Answer the review questions without reading the implementation steps.
2. Demonstrate the required practical checks.
3. Identify anything you can use but cannot yet explain.
4. Record unresolved questions in the phase notes.
5. Complete the cost cleanup checklist.

Suggested confidence values:

- `0 — Not encountered`
- `1 — Recognize the term`
- `2 — Can explain with help`
- `3 — Can explain and demonstrate independently`
- `4 — Can diagnose failures and defend trade-offs`

## Phase 0 — Account, IAM, and cost safety

### Concepts

- AWS accounts, Regions, Availability Zones, and global services
- Shared responsibility model
- Authentication versus authorization
- Root user, IAM users, roles, and policies
- Identity-based and resource-based policies
- Default deny, explicit allow, and explicit deny
- Temporary credentials and role assumption
- Least privilege
- Free Tier, promotional credits, budgets, and billing
- Fixed, usage-based, storage, idle, and data-transfer costs
- Tags, ownership, and cost allocation

### I should be able to answer

- [ ] What is the difference between an AWS account, Region, and Availability
      Zone?
- [ ] Which AWS services are global, and why does that matter during cleanup?
- [ ] Which security responsibilities belong to AWS and which belong to us?
- [ ] Why should the root user not be used for normal work?
- [ ] What is the difference between authentication and authorization?
- [ ] How does AWS reach an authorization decision when several policies apply?
- [ ] Why does an explicit deny override an allow?
- [ ] When should an application use an IAM role instead of access keys?
- [ ] Why is a budget alert not a spending cap?
- [ ] Which charges can continue while an application has no users?

### I should be able to demonstrate

- [ ] Verify the current AWS identity and Region.
- [ ] Read a small IAM policy and predict an allowed and denied request.
- [ ] Locate current charges, credits, Free Tier usage, and budget alerts.
- [ ] Identify all existing resources and explain their expected cost.

### Phase review

```text
Confidence (0-4):
Strongest concept:
Weakest concept:
Evidence reviewed:
Question to revisit:
Cleanup status:
```

## Phase 1 — Application and architecture boundaries

### Concepts

- Stateless versus stateful components
- Modular monolith versus microservices
- Synchronous versus asynchronous communication
- Transaction boundaries and partial failure
- Configuration versus secrets
- Health, liveness, and readiness
- Graceful startup and shutdown
- API validation, pagination, and status-code semantics

### I should be able to answer

- [x] Which parts of our application are stateless and which are stateful?
- [x] Why are we starting with a modular monolith instead of microservices?
- [x] Which order actions must finish before responding to the client?
- [x] Which work can safely happen asynchronously?
- [x] What can happen when one step of a multi-step operation fails?
- [x] What is the difference between configuration and a secret?
- [x] How is process liveness different from application readiness?
- [x] When should an API return `200`, `201`, `202`, `409`, or `503`?

### I should be able to demonstrate

- [x] Draw the frontend, API, database, and worker boundaries.
- [x] Show a health endpoint and explain what it proves and does not prove.
- [x] Stop the application gracefully without losing accepted work.
- [x] Show that no secret is stored in source control.

### Phase review

```text
Confidence (0-4):
Architecture decision I can defend:
Failure I investigated:
Question to revisit:
Cleanup status:
```

## Phase 2 — EC2, instance security, and diagnosis

### Concepts

- AMIs, instance types, EC2 lifecycle, and user data
- EBS persistence and residual storage cost
- Public and private IP addresses
- Security-group statefulness
- Instance roles and temporary credentials
- IAM `AccessDenied` diagnosis
- Structured logging and correlation IDs
- Symptom, evidence, hypothesis, and root cause

### I should be able to answer

- [ ] What survives when an EC2 instance is stopped, terminated, or replaced?
- [ ] Which charges can remain after an instance is stopped?
- [ ] Why might an instance's public IP change after stop/start?
- [ ] How does a stateful security group handle response traffic?
- [ ] Why is an instance role safer than storing an access key on the server?
- [ ] How do I determine which principal made a denied AWS request?
- [ ] How do timeout, connection-refused, and authorization failures differ?
- [ ] What information should every structured application log contain?

### I should be able to demonstrate

- [ ] Connect to an instance through the selected safe access method.
- [ ] Predict and verify the effect of a security-group change.
- [ ] Cause an IAM denial and repair only the missing permission.
- [ ] Find a request in logs using a correlation identifier.
- [ ] Terminate the lesson resources and verify residual storage/IP state.

### Phase review

```text
Confidence (0-4):
IAM failure explained:
Network failure explained:
Residual cost found:
Cleanup status:
```

## Phase 3 — VPC networking and failure domains

### Concepts

- CIDR ranges and IP allocation
- Public and private subnets
- Most-specific route selection
- Route tables, Internet Gateways, and NAT Gateways
- Inbound versus outbound connectivity
- Stateful security groups and stateless network ACLs
- VPC DNS resolution
- Availability Zones and failure domains
- Cross-AZ resilience, traffic, and cost
- Network isolation versus network reachability
- VPC endpoints as a security/cost trade-off

### I should be able to answer

- [x] What actually makes a subnet public?
- [x] Why can a resource in a private subnet initiate internet access through
      NAT but not accept an unsolicited internet connection?
- [x] How does AWS select a route when multiple routes match?
- [x] What is the difference between an Internet Gateway and a NAT Gateway?
- [x] How are network ACLs different from security groups?
- [x] How does an application resolve an RDS hostname inside the VPC?
- [x] Which paths cross Availability Zones, and can they incur additional cost?
- [x] What breaks when one Availability Zone is unavailable?
- [x] When could a VPC endpoint replace NAT traffic, and is it cheaper here?

### I should be able to demonstrate

- [x] Trace user-to-public-tier, public-to-private application, and future
      application-to-database paths without creating Phase 4/5 resources.
- [x] Remove or alter a route, predict the symptom, and diagnose the result.
- [x] Prove that a private resource is not directly reachable from the internet.
- [x] Delete a NAT Gateway and separately verify its Elastic IP release.

### Phase review

```text
Confidence (0-4): 3
Traffic path I can explain: DNS resolves a destination; the source subnet's
  associated route table selects the most-specific destination route; NACLs,
  security groups, and the destination listener then determine reachability.
Availability failure impact: Losing AZ A removes the demonstrated public tier
  and its zonal NAT path; losing AZ B removes the demonstrated private tier.
  Multi-AZ resources improve resilience but cross-AZ traffic can add cost.
NAT decision and cost: A short-lived zonal NAT proved private outbound access
  but added hourly, IPv4, processing, and possible cross-AZ charges. Gateway
  endpoints can replace NAT for S3/DynamoDB paths; interface endpoints charge
  per endpoint-AZ and were not economical for this short SSM exercise.
Cleanup status: VERIFIED on 2026-07-31; all Phase 3 resources and charge-bearing
  dependencies were deleted/released and verified absent in ap-south-1.
```

## Phase 4 — Containers, scaling, and deployment safety

### Concepts

- Container images, immutable artifacts, tags, and digests
- ECR repositories
- ECS clusters, tasks, services, and desired count
- Task execution role versus task role
- CPU/memory sizing and saturation
- Load-balancer listeners, target groups, and health checks
- Graceful termination and request draining
- Rolling-deployment capacity
- Deployment circuit breakers
- Horizontal versus vertical scaling
- Rollback versus roll-forward
- Blast radius and single points of failure

### I should be able to answer

- [x] What is the difference between an ECS task and an ECS service?
- [x] Why does ECS need separate execution and task roles?
- [x] Why is an image digest more deterministic than the `latest` tag?
- [x] How does the ALB decide whether a task should receive traffic?
- [x] What happens to in-flight requests when ECS replaces a task?
- [x] How do minimum and maximum healthy percentages affect deployment?
- [x] When should a deployment roll back instead of roll forward?
- [x] How do desired count and AZ placement affect availability?
- [x] Which supporting resources still cost money when desired count is zero?

### I should be able to demonstrate

- [x] Deploy a versioned image and identify the exact running version.
- [x] Deploy an unhealthy image and follow the failure through ECS and ALB.
- [x] Replace a task and observe request draining and health transitions.
- [x] Restore a previously known-good application version.
- [x] Scale to zero and separately remove ALB/NAT hourly charges.

### Phase review

```text
Confidence (0-4): 2. Formal five-question review completed on 2026-08-06;
  concepts can be explained with guidance and should be reinforced through
  reuse in later phases.
Failed deployment diagnosis: Revision 3's container started normally with the
  correct immutable unhealthy digest, but `/health` deliberately returned 503.
  ALB reported `Target.ResponseCodeMismatch`; ECS drained three failed targets.
  This was an application-health failure, not image pull, IAM, networking, or
  process startup failure.
Rollback evidence: The circuit breaker tripped at the fixed threshold of three.
  Revision 3 moved to FAILED, revision 2 returned to PRIMARY/COMPLETED, desired /
  running / pending returned to 1 / 1 / 0, the target was healthy, and ALB
  `/version` returned `phase4-healthy-v1`.
Idle-cost estimate: Desired count zero removes Fargate/task-public-IPv4 cost only
  after task ENIs disappear. ALB/LCU and its two public IPv4 addresses continue
  until ALB deletion; logs and ECR persist independently. After verified runtime
  cleanup, only the 190,003,692-byte healthy ECR image costs about USD 0.019/month
  prorated; the retained VPC/ECS/IAM/security foundation has USD 0 direct idle
  service cost.
Cleanup status: VERIFIED for disposable Phase 4 runtime on 2026-08-05. The
  approved reusable foundation and one known-good image remain documented, so
  overall account cleanup is PARTIAL. The separate inactive-root-key review is
  overdue and was not inspected or modified in Phase 4.
```

## Phase 5 — Database, storage, and secrets

### Concepts

- Transactions and isolation
- Optimistic and pessimistic concurrency
- Inventory consistency and overselling
- Indexes and query plans
- Database connection pooling
- Connection exhaustion during application scaling
- Backward-compatible schema migrations
- Backups versus high availability
- Recovery Time Objective and Recovery Point Objective
- Single-AZ versus Multi-AZ
- Encryption at rest and in transit
- IAM identities versus database/application secrets
- Secret retrieval and rotation
- S3 object permissions and presigned operations

### I should be able to answer

- [x] How can two customers attempt to purchase the last item concurrently?
- [x] Which transaction strategy prevents overselling, and what is its trade-off?
- [x] Why can adding ECS tasks exhaust database connections?
- [x] How should the pool size relate to the number of application tasks?
- [x] How can a schema migration support old and new application versions?
- [x] Why is a backup different from Multi-AZ availability?
- [x] Why does Multi-AZ not protect against a destructive application query?
- [x] What do RTO and RPO mean for this project?
- [x] Why should an ECS role and a database password be handled differently?
- [x] How can a browser upload to S3 without receiving broad bucket access?

### I should be able to demonstrate

- [x] Run concurrent purchase attempts and prove inventory remains correct.
- [x] Observe connection count while application instances increase.
- [x] Find the query plan for a representative order query.
- [x] Retrieve a secret through only the intended workload role.
- [x] Upload through a presigned operation without public-write access.
- [x] Explain and test the chosen backup/restore procedure.

### Phase review

```text
Confidence (0-4): 3 — explain and demonstrate independently; repeat the
  production trade-off analysis before claiming level 4.
Concurrency result: Concurrent deployed HTTP orders for quantity one returned
  exactly 201/409; final inventory was zero. Transaction + deterministic row
  locks serialized the stock check and update.
Connection-scaling result: Safe simulation observed 1/2/4 sessions for 1/2/4
  represented instances. Pool max 5 bounds four API plus two worker tasks at 30
  connections and reserves headroom.
RTO/RPO decision: Learning RTO 60 minutes/RPO 5 minutes; private PITR restore
  became available in about 13.5 minutes and was verified then deleted.
Retained data and cost: Stopped 20-GiB RDS storage about USD 2.62/month, managed
  secret about USD 0.40/month, one clean ECR image about USD 0.012/month, and
  one 29,792-byte private S3 image about USD 0.00000075/month, plus variable
  backup/request/transfer/tax. RDS review 2026-08-23; full review 2026-08-31.
Cleanup status: Phase 5 disposable runtime VERIFIED; overall cleanup PARTIAL
  for intentional retained foundation/data and the separately overdue
  inactive-root-key review, which Phase 5 did not inspect or modify.
```

## Phase 6 — Asynchronous processing and reliability

### Concepts

- At-most-once and at-least-once delivery
- Limits of exactly-once claims
- Idempotency and deduplication
- Visibility timeout and acknowledgement
- Retries, exponential backoff, and retry storms
- Poison messages and dead-letter queues
- Safe DLQ redrive
- Queue depth, oldest-message age, and backpressure
- Eventual consistency
- Message ordering
- Transactional outbox pattern
- Failure after side effect but before acknowledgement
- Lambda invocation-driven execution versus a continuously running ECS worker
- SQS event source mappings, batches, partial batch failures, and concurrency limits
- Lambda execution roles, function timeout/memory, stateless environments, and cold/warm reuse

### I should be able to answer

- [ ] Why might SQS deliver the same message more than once?
- [ ] How does our worker prevent a repeated order effect?
- [ ] What happens if processing succeeds but acknowledgement fails?
- [ ] How should visibility timeout relate to processing time?
- [ ] When should a failure retry, and when should it go to a DLQ?
- [ ] Why can aggressive retries make an outage worse?
- [ ] What does growing queue age tell an operator?
- [ ] When does message ordering matter for inventory?
- [ ] What database/message inconsistency does an outbox address?
- [ ] Who polls an SQS queue when Lambda is the consumer, and what invokes the handler?
- [ ] Why must the Lambda timeout be materially shorter than the SQS visibility timeout?
- [ ] Why does ReportBatchItemFailures avoid retrying successful records in a failed batch?
- [ ] Why is the SQS redrive policy—not a Lambda asynchronous-invocation DLQ—responsible for this queue's poison messages?

### I should be able to demonstrate

- [ ] Process a duplicate message without duplicating its business effect.
- [ ] Crash after the database change but before message acknowledgement.
- [ ] Diagnose and correct an intentionally short visibility timeout.
- [ ] Send a poison message to the DLQ and safely redrive it.
- [ ] Observe backpressure through queue metrics.
- [ ] Process a synthetic SQS batch with Lambda and correlate queue and Lambda evidence.
- [ ] Return one partial batch failure, diagnose a poison message in the SQS DLQ, correct the handler, and safely redrive it.
- [ ] Remove the Lambda mapping, function, role, and lesson log group; verify no message remains retrying.

### Phase review

```text
Confidence (0-4):
Duplicate-delivery result:
Crash/retry result:
DLQ diagnosis:
Cleanup status:
```

## Phase 7 — Events, schedules, and notifications

### Concepts

- Commands versus events
- Queueing versus publish/subscribe versus event routing
- Event schemas and loose coupling
- SQS versus EventBridge versus SNS
- EventBridge event bus versus EventBridge Scheduler
- Cron/rate schedules and time zones
- Duplicate schedules, retries, and DLQs
- SNS operational fan-out
- SES transactional email
- Partial success across multiple consumers

### I should be able to answer

- [x] Is `ProcessOrder` a command or an event? What about `OrderConfirmed`?
- [x] Why use SQS for worker load rather than SNS alone?
- [x] When is EventBridge routing preferable to direct queue publishing?
- [x] When is SNS more appropriate than EventBridge?
- [x] Why is SES a better fit than SNS for customer-facing email?
- [x] How is an EventBridge event bus different from Scheduler?
- [x] How do we prevent duplicate reports for the same reporting period?
- [x] What happens when one event consumer succeeds and another fails?

### I should be able to demonstrate

- [x] Route an order event only to its intended consumers.
- [x] Evolve an event without breaking an existing consumer.
- [x] Run the same reporting period twice without creating conflicting results.
- [x] Cause a notification target to fail and observe independent consumers.
- [x] Disable all schedules before session cleanup.

### Phase review

```text
Confidence (0-4): 3 — can explain and defend the main boundaries; revisit Scheduler retry timing/event-age interaction during Phase 8 operations work.
Messaging choice I can defend: Commands go to their single owner; `OrderConfirmed` facts enter EventBridge for content-based routing. SQS remains the durable work queue, SNS performs operational fan-out, and SES sends transactional customer email.
Schedule idempotency result: The same reporting date ran on demand, again on demand, and from Scheduler without overwriting the existing S3 report. A deterministic date key plus conditional write preserved the original object.
Partial-failure result: Removing Scheduler-role `lambda:InvokeFunction` caused target delivery to fail before Lambda ran. The Scheduler DLQ captured an `AccessDeniedException`; a successful target would remain successful because EventBridge target deliveries are independent.
Cleanup status: Phase 7 disposable resources are deleted and AWS-verified. The retained private RDS instance is stopped; storage/backup/secret costs and the automatic-restart review date remain documented in the cost ledger.
```

## Phase 8 — Edge delivery, observability, and resilience

### Concepts

- CloudFront caching and invalidation
- DNS, TLS certificates, and origin protection
- Logs, metrics, traces, and audit events
- Latency, traffic, errors, and saturation
- Leading and lagging indicators
- Actionable versus noisy alarms
- Correlation across API, queue, worker, and database
- Graceful degradation and dependency failure
- High availability versus disaster recovery
- Failure timelines and incident diagnosis
- Idle, normal-load, and scaling costs
- NAT, cross-AZ, public IPv4, logs, storage, and transfer costs

### I should be able to answer

- [x] What does CloudFront cache, and how can stale content be corrected?
- [x] What roles do Route 53, ACM, CloudFront, and the ALB each play?
- [x] When should I use a log, metric, trace, or CloudTrail event?
- [x] What are the important latency, traffic, error, and saturation signals?
- [x] Which alarm indicates a customer problem before customers report it?
- [x] How can one order be followed across the API, queue, worker, and database?
- [x] What can the system still do when a dependency is unavailable?
- [x] How is high availability different from disaster recovery?
- [x] What does the complete system cost while idle and under representative
      load?

### I should be able to demonstrate

- [x] Diagnose delayed orders using signals from multiple components.
- [x] Build a timeline for one controlled failure.
- [x] Tune a noisy alarm into an actionable alarm.
- [x] Simulate an AZ or dependency failure safely and explain the result.
- [x] Calculate idle cost and a representative cost per order.

### Phase review

```text
Confidence (0-4): 3 — can explain and defend the edge, TLS, origin-protection,
observability, failure, resilience, and cost boundaries; production-grade
multi-AZ operation and persistent alarms remain future improvements.
Incident diagnosed: Product creation succeeded but its direct presigned S3
image upload failed because the production browser origin lacked an S3 CORS
rule. The exact rule fixed the retry and was removed during cleanup.
Signals used: Browser preflight error, API partial-success behavior, S3
configuration/object state, CloudTrail management events, CloudFront request
and error metrics, queue depth/age, RDS CPU, application logs, and request IDs.
Resilience gap found: One ECS task and Single-AZ RDS are not highly available;
the client-side product/image workflow can also partially succeed and needs
retry/reconciliation plus an image-pending operational signal.
Cost estimate: Approximately USD 3.056/month retained idle baseline and USD
0.1168/active hour for the representative three-task asynchronous system,
before logs, requests, transfer, excess backups, and tax. At 1,000 orders/hour
that runtime is approximately USD 0.0001168/order; at 10/hour it is USD
0.01168/order.
Cleanup status: Disposable hourly runtime and temporary observability resources
are AWS-verified absent. Overall cleanup is PARTIAL because the documented
stopped RDS storage, secret, ECR images, private S3 data, disabled CloudFront
distribution, ACM certificates, DNS validation/routing records, and reusable
network/IAM/ECS foundation remain for the Phase 8/9 boundary decision.
```

## Phase 9 — Terraform, state, and drift

### Concepts

- Declarative desired state
- Dependency graphs
- Terraform state, locking, sensitivity, and recovery
- In-place updates and resource replacement
- Configuration drift
- Resource ownership and importing
- Deletion and lifecycle protection
- Foundation/runtime separation
- Infrastructure blast radius
- Plan review and post-destroy verification

### I should be able to answer

- [ ] Why does Terraform need state?
- [ ] What sensitive information might state contain?
- [ ] What happens if two people modify the same state concurrently?
- [ ] How can I tell whether a plan updates or replaces a resource?
- [ ] What is drift, and should Terraform or the console win?
- [ ] When should an existing resource be imported rather than recreated?
- [ ] Why separate long-lived foundation from expensive runtime?
- [ ] Why is successful `terraform destroy` output not sufficient proof of
      complete cleanup?

### I should be able to demonstrate

- [ ] Review a plan and predict its AWS changes before applying it.
- [ ] Introduce controlled drift, detect it, and reconcile it safely.
- [ ] Destroy runtime while retaining intentional foundation resources.
- [ ] Verify deletions in AWS and reconcile any failed/retained resource.

### Phase review

```text
Confidence (0-4):
Plan/replacement explained:
Drift exercise result:
Resources retained:
Cleanup status:
```

## Phase 10 — CI/CD and production readiness

### Concepts

- Short-lived CI credentials and identity federation
- Least-privilege deployment roles
- Immutable artifact promotion
- Rolling deployment and health-based rollback
- Rollback versus forward repair
- Database compatibility during deployment
- Environment separation and change control
- Capacity limits as reliability and cost controls
- Recovery procedures and operational ownership

### I should be able to answer

- [ ] How does CI authenticate without storing a permanent AWS access key?
- [ ] Which exact permissions does the deployment identity require?
- [ ] Why should the same tested artifact be promoted instead of rebuilt?
- [ ] What evidence should determine deployment success or rollback?
- [ ] When is forward repair safer than rollback?
- [ ] Can the database schema support both versions during a rolling deployment?
- [ ] How are development and production permissions separated?
- [ ] Who or what is responsible for recovery when automation fails?

### I should be able to demonstrate

- [ ] Trace the CI identity and its AWS actions.
- [ ] Deploy a failing version and observe the rollback path.
- [ ] Identify and restore the previous known-good artifact.
- [ ] Complete security, reliability, recovery, observability, and cost reviews.
- [ ] Perform and verify a complete final teardown.

### Phase review

```text
Confidence (0-4):
Failed deployment result:
Rollback/recovery evidence:
Production-readiness gaps:
Cleanup status:
```

## Final engineering review

At project completion, I should be able to explain the complete system without
the AWS Console open:

- [ ] Draw the request, data, message, and notification paths.
- [ ] Explain every public/private placement decision.
- [ ] Explain the permissions held by humans, API tasks, workers, and CI.
- [ ] Describe behaviour during task, database, queue, and AZ failures.
- [ ] Demonstrate how duplicate order processing is prevented.
- [ ] Explain database connection behaviour during scale-out.
- [ ] Defend each synchronous/asynchronous boundary.
- [ ] Describe deployment, rollback, and schema-compatibility strategies.
- [ ] Estimate idle and representative-load cost.
- [ ] Diagnose a controlled incident from logs, metrics, and events.
- [ ] Restore important data and explain the achieved RTO/RPO.
- [ ] Tear down the system and verify that no unexplained cost remains.

## Personal progress summary

| Phase                      | Confidence (0-4) | Completed date | Main evidence                                                                                                | Revisit?                          |
| -------------------------- | ---------------: | -------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| 0 — Account/IAM/cost       |                2 | 2026-07-21     | MFA, SSO caller/Region, billing/budget, IAM policy prediction, cross-Region/global inventory, cleanup ledger | Yes — global scope and idle costs |
| 1 — Application boundaries | 3                | 2026-07-23     | ADR 0003, 19 passing tests, browser flow, durable-worker/restart exercises, graceful shutdown, secret audit | Yes — compiled-only runtime images and production secret delivery |
| 2 — EC2/diagnosis          |                4 | 2026-07-27     | SSM/no SSH, EC2/EBS lifecycle, IAM denial/repair, CloudWatch correlation, timeout/refused/503 diagnosis      | Yes — production private networking and cleaner container log parsing |
| 3 — Networking             |                  |                |                                                                                                              |                                   |
| 4 — ECS/deployments        |                2 | 2026-08-06     | Digest-pinned Fargate/ALB deployment, 1-versus-2 task replacement, draining, unhealthy rollout/circuit-breaker rollback, verified runtime cleanup | Yes — task-definition recall, rolling percentages, rollback vs roll-forward, horizontal vs vertical scaling |
| 5 — Data/storage/secrets   |                3 | 2026-08-18     | Private RDS/TLS/secret rotation, pool scaling, row-lock concurrency, query plan, expand/contract, PITR, private presigned S3, real API/UI flow, verified cleanup | Yes — production HA/egress, pool pressure under real replicas, and recovery repetition |
| 6 — Async reliability      |                3 | 2026-09-04     | Real API/outbox/SQS/ECS-worker flow; duplicate/DLQ/redrive labs; Lambda partial-batch/DLQ/redrive lab; workbook review; verified runtime cleanup | Yes — repeat the controlled ECS crash-after-commit-before-ack drill |
| 7 — Events/notifications   |                3 | 2026-09-21     | EventBridge routing, SNS/SES delivery, idempotent S3 report, Scheduler success and DLQ failure, Phase 7 ADR, verified disposable cleanup | Yes — retry timing/event age, schema evolution under multiple real consumers |
| 8 — Operations/resilience  |                3 | 2026-09-28     | Private S3/CloudFront edge, custom TLS/DNS, protected same-origin API, dashboards/alarms/SNS, CloudTrail failure timeline, resilience and cost review, verified runtime cleanup | Yes — recreate alarms/CORS as code, HA trade-offs, selective tracing/data events |
| 9 — Terraform/drift        |                  |                |                                                                                                              |                                   |
| 10 — CI/CD/readiness       |                  |                |                                                                                                              |                                   |
