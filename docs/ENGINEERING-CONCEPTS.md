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

- [ ] Which parts of our application are stateless and which are stateful?
- [ ] Why are we starting with a modular monolith instead of microservices?
- [ ] Which order actions must finish before responding to the client?
- [ ] Which work can safely happen asynchronously?
- [ ] What can happen when one step of a multi-step operation fails?
- [ ] What is the difference between configuration and a secret?
- [ ] How is process liveness different from application readiness?
- [ ] When should an API return `200`, `201`, `202`, `409`, or `503`?

### I should be able to demonstrate

- [ ] Draw the frontend, API, database, and worker boundaries.
- [ ] Show a health endpoint and explain what it proves and does not prove.
- [ ] Stop the application gracefully without losing accepted work.
- [ ] Show that no secret is stored in source control.

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

- [ ] What actually makes a subnet public?
- [ ] Why can a resource in a private subnet initiate internet access through
      NAT but not accept an unsolicited internet connection?
- [ ] How does AWS select a route when multiple routes match?
- [ ] What is the difference between an Internet Gateway and a NAT Gateway?
- [ ] How are network ACLs different from security groups?
- [ ] How does an application resolve an RDS hostname inside the VPC?
- [ ] Which paths cross Availability Zones, and can they incur additional cost?
- [ ] What breaks when one Availability Zone is unavailable?
- [ ] When could a VPC endpoint replace NAT traffic, and is it cheaper here?

### I should be able to demonstrate

- [ ] Trace user-to-ALB, ALB-to-application, and application-to-RDS paths.
- [ ] Remove or alter a route, predict the symptom, and diagnose the result.
- [ ] Prove that a private resource is not directly reachable from the internet.
- [ ] Delete a NAT Gateway and separately verify its Elastic IP release.

### Phase review

```text
Confidence (0-4):
Traffic path I can explain:
Availability failure impact:
NAT decision and cost:
Cleanup status:
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

- [ ] What is the difference between an ECS task and an ECS service?
- [ ] Why does ECS need separate execution and task roles?
- [ ] Why is an image digest more deterministic than the `latest` tag?
- [ ] How does the ALB decide whether a task should receive traffic?
- [ ] What happens to in-flight requests when ECS replaces a task?
- [ ] How do minimum and maximum healthy percentages affect deployment?
- [ ] When should a deployment roll back instead of roll forward?
- [ ] How do desired count and AZ placement affect availability?
- [ ] Which supporting resources still cost money when desired count is zero?

### I should be able to demonstrate

- [ ] Deploy a versioned image and identify the exact running version.
- [ ] Deploy an unhealthy image and follow the failure through ECS and ALB.
- [ ] Replace a task and observe request draining and health transitions.
- [ ] Restore a previously known-good application version.
- [ ] Scale to zero and separately remove ALB/NAT hourly charges.

### Phase review

```text
Confidence (0-4):
Failed deployment diagnosis:
Rollback evidence:
Idle-cost estimate:
Cleanup status:
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

- [ ] How can two customers attempt to purchase the last item concurrently?
- [ ] Which transaction strategy prevents overselling, and what is its trade-off?
- [ ] Why can adding ECS tasks exhaust database connections?
- [ ] How should the pool size relate to the number of application tasks?
- [ ] How can a schema migration support old and new application versions?
- [ ] Why is a backup different from Multi-AZ availability?
- [ ] Why does Multi-AZ not protect against a destructive application query?
- [ ] What do RTO and RPO mean for this project?
- [ ] Why should an ECS role and a database password be handled differently?
- [ ] How can a browser upload to S3 without receiving broad bucket access?

### I should be able to demonstrate

- [ ] Run concurrent purchase attempts and prove inventory remains correct.
- [ ] Observe connection count while application instances increase.
- [ ] Find the query plan for a representative order query.
- [ ] Retrieve a secret through only the intended workload role.
- [ ] Upload through a presigned operation without public-write access.
- [ ] Explain and test the chosen backup/restore procedure.

### Phase review

```text
Confidence (0-4):
Concurrency result:
Connection-scaling result:
RTO/RPO decision:
Retained data and cost:
Cleanup status:
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

### I should be able to demonstrate

- [ ] Process a duplicate message without duplicating its business effect.
- [ ] Crash after the database change but before message acknowledgement.
- [ ] Diagnose and correct an intentionally short visibility timeout.
- [ ] Send a poison message to the DLQ and safely redrive it.
- [ ] Observe backpressure through queue metrics.

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

- [ ] Is `ProcessOrder` a command or an event? What about `OrderConfirmed`?
- [ ] Why use SQS for worker load rather than SNS alone?
- [ ] When is EventBridge routing preferable to direct queue publishing?
- [ ] When is SNS more appropriate than EventBridge?
- [ ] Why is SES a better fit than SNS for customer-facing email?
- [ ] How is an EventBridge event bus different from Scheduler?
- [ ] How do we prevent duplicate reports for the same reporting period?
- [ ] What happens when one event consumer succeeds and another fails?

### I should be able to demonstrate

- [ ] Route an order event only to its intended consumers.
- [ ] Evolve an event without breaking an existing consumer.
- [ ] Run the same reporting period twice without creating conflicting results.
- [ ] Cause a notification target to fail and observe independent consumers.
- [ ] Disable all schedules before session cleanup.

### Phase review

```text
Confidence (0-4):
Messaging choice I can defend:
Schedule idempotency result:
Partial-failure result:
Cleanup status:
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

- [ ] What does CloudFront cache, and how can stale content be corrected?
- [ ] What roles do Route 53, ACM, CloudFront, and the ALB each play?
- [ ] When should I use a log, metric, trace, or CloudTrail event?
- [ ] What are the important latency, traffic, error, and saturation signals?
- [ ] Which alarm indicates a customer problem before customers report it?
- [ ] How can one order be followed across the API, queue, worker, and database?
- [ ] What can the system still do when a dependency is unavailable?
- [ ] How is high availability different from disaster recovery?
- [ ] What does the complete system cost while idle and under representative
      load?

### I should be able to demonstrate

- [ ] Diagnose delayed orders using signals from multiple components.
- [ ] Build a timeline for one controlled failure.
- [ ] Tune a noisy alarm into an actionable alarm.
- [ ] Simulate an AZ or dependency failure safely and explain the result.
- [ ] Calculate idle cost and a representative cost per order.

### Phase review

```text
Confidence (0-4):
Incident diagnosed:
Signals used:
Resilience gap found:
Cost estimate:
Cleanup status:
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

| Phase | Confidence (0-4) | Completed date | Main evidence | Revisit? |
|---|---:|---|---|---|
| 0 — Account/IAM/cost | 2 | 2026-07-21 | MFA, SSO caller/Region, billing/budget, IAM policy prediction, cross-Region/global inventory, cleanup ledger | Yes — global scope and idle costs |
| 1 — Application boundaries | | | | |
| 2 — EC2/diagnosis | | | | |
| 3 — Networking | | | | |
| 4 — ECS/deployments | | | | |
| 5 — Data/storage/secrets | | | | |
| 6 — Async reliability | | | | |
| 7 — Events/notifications | | | | |
| 8 — Operations/resilience | | | | |
| 9 — Terraform/drift | | | | |
| 10 — CI/CD/readiness | | | | |
