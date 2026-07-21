# AWS Order and Inventory Platform — Development and Learning Plan

## Goal

Build and operate a small production-shaped order and inventory platform while
learning the AWS services and engineering decisions expected of a mid-level
software engineer.

The application will support:

- Product and inventory management
- Product-image upload
- Customer order creation and order history
- Reliable background order processing
- Transactional email and operational notifications
- Scheduled low-stock inventory reports
- HTTPS delivery, monitoring, scaling, and automated deployment

The application is deliberately modest. AWS architecture, security,
operability, reliability, and cost control are the main subjects.

## Learning method

We will use the manual-first approach selected for this project:

1. Understand the service and its billing model.
2. Create the lesson resources manually in the AWS Console or CLI.
3. Inspect, use, intentionally troubleshoot, and understand them.
4. Perform the mandatory cleanup in `COST-SAFETY-CHECKLIST.md`.
5. Later reproduce the understood architecture with Infrastructure as Code.

No lesson is complete until its cleanup status is recorded as `VERIFIED` or an
intentional residual resource is documented as `PARTIAL`.

Use `docs/ENGINEERING-CONCEPTS.md` as the phase-completion workbook. Its review
questions and demonstrations determine whether the engineering concepts for a
phase have actually been understood.

## Confirmed technology stack and project choices

The following choices were confirmed during Phase 0:

- Frontend: React with TypeScript
- API and workers: Node.js with TypeScript
- Database: PostgreSQL
- Packaging: Docker
- Primary AWS Region: Mumbai (`ap-south-1`)
- Infrastructure as Code: Terraform, introduced in the later IaC phase
- Domain: an existing Cloudflare-managed domain will be used in Phase 8

Cloudflare will remain the authoritative DNS provider. Phase 8 will integrate
the domain with AWS Certificate Manager and CloudFront and/or the Application
Load Balancer as appropriate. The exact hostname, certificate-validation
records, routing, and edge/origin design will be decided in Phase 8. Phase 0
must not create or change domain, DNS, certificate, CloudFront, or load-balancer
resources.
- Delivery automation: GitHub Actions
- AWS Region: Mumbai (`ap-south-1`)

We will keep the codebase as a modular monolith plus a background worker. We
will not introduce microservices or Kubernetes merely to increase complexity.

## Target architecture

```text
Users
  |
CloudFront
  |-----------------------------|
S3 frontend                     Application Load Balancer
                                  |
                               ECS Fargate API
                                  |-------- RDS PostgreSQL
                                  |-------- S3 product images
                                  |-------- SQS order queue
                                               |
                                            Worker/Lambda
                                               |
                               EventBridge / SNS / SES

EventBridge Scheduler ---> Inventory-report Lambda ---> RDS / S3 / SES

Application and infrastructure ---> CloudWatch logs, metrics, alarms
```

This is the final learning architecture, not the starting point. Each phase adds
only the components needed for its lesson.

## Phase 0 — Account safety and cost controls

### Build

- Inspect account plan, credits, and existing resources.
- Enable root MFA.
- Create the daily administrative identity and configure AWS CLI access safely.
- Create a monthly AWS Budget and alerts.
- Establish tags and the resource ledger.

### Learn

- AWS accounts, Regions, Availability Zones, and global services
- Root user versus IAM identities
- Users, roles, policies, credentials, and least privilege
- Free Tier, credits, budgets, bills, and cost allocation tags

### Exit criteria

- MFA and budget alerts are verified.
- CLI identity and selected Region are verified.
- Existing account resources have been inventoried.
- Baseline cost is recorded.

### Cleanup gate

No paid workload resources should exist after this phase.

## Phase 1 — Local application foundation

### Build

- Create the frontend, API, worker, and PostgreSQL development environment.
- Implement product, inventory, and order data models.
- Implement health/readiness endpoints.
- Add database migrations, tests, structured logging, and Docker packaging.

### Learn

- Stateless versus stateful components
- Synchronous versus asynchronous boundaries
- Health checks, configuration, migrations, and graceful shutdown
- What the cloud infrastructure will need from the application

### Exit criteria

- A product can be created and ordered locally.
- Inventory changes are transactionally safe.
- Tests and containers run locally.
- No secrets are committed to source control.

### Cleanup gate

This phase is local; no AWS workload resources are created.

## Phase 2 — First manual deployment on EC2

### Build

- Create a security group and a small EC2 instance manually.
- Connect using a safe AWS-supported access method.
- deploy and run the API.
- Attach an IAM role and send application logs to CloudWatch.
- Exercise a failed connection and an incorrect permission deliberately.

### Learn

- AMIs, instance types, EBS, user data, and instance lifecycle
- Inbound versus outbound security-group rules
- Public/private IP addresses and DNS
- IAM roles versus access keys
- Process management, logs, and basic Linux operations

### Exit criteria

- The API is reachable only through intended ports.
- The application uses an instance role rather than embedded AWS keys.
- A failure can be diagnosed from instance and CloudWatch evidence.

### Cleanup gate

- Terminate the lesson EC2 instance.
- Delete unnecessary EBS volumes and snapshots.
- Review/release public IPv4 or Elastic IP resources.
- Delete lesson-only security groups after dependencies are gone.

## Phase 3 — Networking and isolation

### Build

- Design a VPC across two Availability Zones.
- Create public and private subnets, route tables, and an internet gateway.
- Temporarily use a NAT Gateway to demonstrate private outbound access.
- Test allowed and blocked network paths.

### Learn

- CIDR planning and IP addressing
- Public versus private subnet behavior
- Route tables, internet gateways, NAT, and DNS resolution
- Security groups versus network ACLs
- Availability Zone placement and failure boundaries

### Exit criteria

- Every intended network path can be explained hop by hop.
- Private resources cannot accept unsolicited internet connections.
- Security boundaries are verified rather than assumed.

### Cleanup gate

- Delete the NAT Gateway first and verify its Elastic IP separately.
- Remove dependent network interfaces/endpoints.
- Delete lesson VPC resources in dependency order.

## Phase 4 — Containers with ECR, ECS, and load balancing

### Build

- Push the API image to ECR.
- Create an ECS cluster, task definition, task role, and execution role.
- Run the API using ECS Fargate.
- Add an Application Load Balancer, target group, and health checks.
- Test task replacement, an unhealthy deployment, and basic scaling.

### Learn

- Images, registries, tasks, services, clusters, and desired count
- Task role versus execution role
- Load-balancer listeners, target groups, and health checks
- Stateless deployment, replacement, scaling, and rollback

### Exit criteria

- ECS replaces a failed task.
- The ALB sends traffic only to healthy targets.
- The application has no long-lived AWS credentials.
- Logs identify deployment and health-check failures.

### Cleanup gate

- Scale the ECS service to zero, then delete it when the exercise ends.
- Stop standalone tasks.
- Delete the ALB, listeners, and target groups.
- Delete NAT Gateway/public IPv4 resources created for the phase.
- Retain only explicitly recorded ECR images.

## Phase 5 — Managed database, object storage, and secrets

### Build

- Create a small Single-AZ RDS PostgreSQL instance for learning.
- Place the database in private subnets.
- Store database credentials in Secrets Manager.
- Grant the ECS task role access to only the required secret and S3 paths.
- Create an S3 bucket for product images and use presigned uploads.
- Exercise database backup, restore concepts, and credential rotation.

### Learn

- RDS subnet groups, parameter groups, backups, and connections
- Database availability and connection-pool behaviour during scaling
- Object storage, bucket policies, encryption, and presigned URLs
- IAM identity versus application secrets
- Encryption at rest/in transit and secret lifecycle

### Exit criteria

- RDS is not publicly reachable.
- Database credentials are absent from Git and container images.
- Product uploads do not require public-write S3 permissions.
- Backup and recovery expectations are documented.

### Cleanup gate

- Decide deliberately whether data is disposable or requires a snapshot.
- Stop or delete RDS; record retained storage/snapshot cost.
- Delete disposable S3 objects and incomplete multipart uploads.
- Schedule deletion of lesson-only secrets when no longer needed.
- Remove NAT Gateway and load balancer resources if recreated.

## Phase 6 — Reliable asynchronous order processing

### Build

- Place order-processing messages on SQS.
- Process them using a worker or Lambda.
- Configure retry behavior, visibility timeout, and a dead-letter queue.
- Implement idempotent processing and test duplicate delivery.
- Simulate poison messages and worker failure.

### Learn

- Queue-based load leveling and eventual consistency
- At-least-once delivery and idempotency
- Visibility timeout, retries, backoff, retention, and DLQs
- Transaction boundaries and the database/outbox problem

### Exit criteria

- Duplicate messages do not duplicate an order outcome.
- Failed messages reach the DLQ and can be diagnosed/redriven.
- API response time does not depend on background work completing.

### Cleanup gate

- Stop workers and set ECS desired count to zero where applicable.
- Confirm queues contain no important messages before deletion.
- Delete lesson queues and event-source mappings when appropriate.
- Verify that no retrying workload remains active.

## Phase 7 — Events, schedules, and notifications

### Build

- Emit an order-domain event through EventBridge.
- Route operational notifications through SNS.
- Send a verified-address order email through SES.
- Create an EventBridge Scheduler job for a low-stock report.
- Have the report Lambda query inventory, write a report to S3, and send a link.
- Configure retries and a DLQ for scheduled execution.

### Learn

- Queueing versus pub/sub versus event routing
- EventBridge event buses versus EventBridge Scheduler
- Cron/rate schedules, time zones, retries, and one-time jobs
- SNS subscriptions versus SES transactional email
- Event schemas, loose coupling, and failure handling

### Exit criteria

- An order event reaches only intended targets.
- The scheduled report can be run on demand and on a test schedule.
- Failed delivery is observable and recoverable.
- SES sandbox limitations and production-access requirements are understood.

### Cleanup gate

- Disable/delete EventBridge schedules before ending the exercise.
- Delete test rules, targets, topics, subscriptions, and queues.
- Remove provisioned resources while retaining only intentional logs/reports.

## Phase 8 — Edge delivery, security, and operations

### Build

- Host the frontend in private S3 behind CloudFront.
- Add HTTPS using ACM while retaining Cloudflare as authoritative DNS.
- Add the required Cloudflare DNS validation and routing records only after the
  exact hostname and CloudFront/ALB design have been reviewed.
- Configure CloudWatch dashboards, alarms, and log retention.
- Send operational alarms through SNS.
- Review CloudTrail and perform controlled failure drills.
- Test scaling, unhealthy tasks, denied IAM access, and database unavailability.

### Learn

- CDN caching and invalidation
- Authoritative DNS, certificates, HTTPS, and origin protection
- Cloudflare DNS integration with AWS ACM and CloudFront/ALB
- Metrics, logs, alarms, audit events, and incident diagnosis
- Reliability, least privilege, backup, recovery, and cost trade-offs

### Exit criteria

- The frontend and API are served over HTTPS.
- Important failure conditions produce actionable alarms.
- A failure can be traced from symptom to root cause.
- Security and cost reviews identify concrete improvements.

### Cleanup gate

- Delete load balancers, NAT Gateways, running compute, and RDS runtime.
- Disable alarm actions and schedules that are no longer needed.
- Review CloudFront, ACM, logs, snapshots, S3, and public IPv4 usage.
- Review Cloudflare DNS records created for the project and record any
  intentionally retained certificate or distribution.

## Phase 9 — Infrastructure as Code with Terraform

### Build

- Recreate the understood architecture in small Terraform modules.
- Separate low-cost foundation resources from expensive runtime resources.
- Configure remote state and state locking using an appropriate safe design.
- Use plans, applies, outputs, variables, and lifecycle protections.
- Introduce and repair controlled configuration drift.

Suggested separation:

```text
infrastructure/
  foundation/   # IAM, selected storage, registry, shared configuration
  runtime/      # NAT, ALB, ECS tasks, RDS, and other hourly resources
```

### Learn

- Desired state, dependency graphs, state files, imports, and drift
- Plan review, resource replacement, sensitive values, and deletion protection
- Infrastructure module boundaries and environment separation

### Exit criteria

- A reviewed plan creates the expected architecture.
- `terraform destroy` removes the runtime without silently retaining expensive
  resources.
- The post-destroy cost checklist passes.
- No credentials or secret values exist in Git or exposed Terraform output.

### Cleanup gate

- Run and review the runtime destroy operation.
- Confirm successful deletion in AWS, not merely in Terraform output.
- Investigate any retained or failed resource manually.
- Keep state storage only if its purpose and residual cost are documented.

## Phase 10 — CI/CD and production review

### Build

- Build and test application images in GitHub Actions.
- Authenticate to AWS using short-lived identity federation rather than stored
  access keys.
- Push versioned images to ECR and deploy safely to ECS.
- Add deployment health checks and rollback behavior.
- Run a final architecture, security, reliability, and cost review.

### Learn

- CI identity and least privilege
- Immutable artifacts, deployment promotion, and rollback
- Environment separation and change control
- Operational readiness and cost forecasting

### Exit criteria

- A code change can be tested and deployed without permanent AWS keys.
- A failed deployment rolls back or stops safely.
- The architecture and recurring monthly cost can be explained.
- A complete teardown and recovery procedure has been demonstrated.

### Cleanup gate

- Disable workflows capable of redeploying destroyed infrastructure.
- Destroy expensive runtime resources and verify the result.
- Review ECR images, logs, artifacts, state, DNS, certificates, and storage.
- Complete the final close-out record.

## Service coverage matrix

| Service/concept | First introduced | Used for |
|---|---|---|
| IAM | Phase 0 | Human and workload permissions |
| Budgets/Billing | Phase 0 | Cost safety |
| EC2/EBS | Phase 2 | Manual compute fundamentals |
| CloudWatch | Phase 2 | Logs, metrics, dashboards, alarms |
| VPC | Phase 3 | Network isolation and routing |
| ECR | Phase 4 | Container-image storage |
| ECS Fargate | Phase 4 | Managed container compute |
| ALB | Phase 4 | HTTP routing and health checks |
| RDS PostgreSQL | Phase 5 | Relational application data |
| S3 | Phase 5 | Product images, frontend, reports |
| Secrets Manager | Phase 5 | Database/application secrets |
| SQS | Phase 6 | Reliable background work and DLQs |
| Lambda | Phase 6 | Event-driven processing |
| EventBridge bus | Phase 7 | Domain-event routing |
| EventBridge Scheduler | Phase 7 | Recurring inventory reports |
| SNS | Phase 7 | Operational fan-out notifications |
| SES | Phase 7 | Transactional customer email |
| CloudFront | Phase 8 | Frontend/CDN delivery |
| ACM | Phase 8 | TLS certificates |
| Cloudflare DNS (external) | Phase 8 | Existing authoritative DNS and AWS endpoint routing |
| CloudTrail | Phase 8 | API audit history |
| Terraform | Phase 9 | Repeatable infrastructure and cleanup |
| GitHub Actions | Phase 10 | Automated delivery |

## Definition of done for every phase

A phase is complete only when:

- The feature works and its architecture can be explained.
- The phase's required engineering questions have been answered with evidence.
- At least one architecture decision has been recorded, including alternatives
  and trade-offs where the phase presents a meaningful choice.
- At least one relevant failure has been investigated.
- Permissions and network exposure have been reviewed.
- Cost-sensitive resources have been identified.
- The resource ledger is current.
- The cleanup checklist has been completed.
- Cleanup is `VERIFIED`, or each retained resource has an explicit reason,
  expected cost, and deletion/review date.

## Engineering concepts curriculum

These concepts are mandatory learning objectives. They do not add unrelated
services to the project; they are explored through the architecture already
defined above.

Each practical concept follows this loop:

```text
Question -> prediction -> build/test -> observe -> explain -> decide -> record
```

Answers must be supported by evidence such as a request result, policy
evaluation, route trace, log entry, metric, database result, deployment event,
or cost estimate. Merely creating a resource does not complete a concept.

### Phase 0 — Account, identity, and cost foundations

Required concepts:

- AWS shared-responsibility boundaries
- Account, Region, Availability Zone, and global-service scope
- Authentication versus authorization
- Default deny, explicit allow, and explicit deny
- Identity-based versus resource-based policies
- Human identities versus workload roles
- Temporary credentials versus long-lived access keys
- Fixed, usage-based, storage, data-transfer, and idle costs
- Budget-alert limitations and delayed billing information
- Tags as ownership and cost-allocation controls

Required exercises and decisions:

- Identify which security duties belong to AWS and which belong to us.
- Predict and then verify the active caller identity and Region.
- Read a small IAM policy and explain what it does and does not permit.
- Record the learning-account budget, alerts, and acceptable residual cost.

### Phase 1 — Application and system boundaries

Required concepts:

- Stateless versus stateful components
- Modular monolith versus microservices
- Synchronous versus asynchronous work
- Transaction boundaries and partial failure
- Configuration versus secrets
- Health, liveness, and readiness
- Graceful startup and shutdown
- API validation, pagination, and intentional status codes

Required exercises and decisions:

- Draw the boundaries between frontend, API, database, and worker.
- Decide which order operations must complete synchronously.
- Define readiness conditions separately from process liveness.
- Explain why this project does not initially need microservices.

### Phase 2 — Compute, IAM, and first diagnosis

Required concepts:

- EC2 instance lifecycle and persistent EBS storage
- Public/private addressing and public IPv4 cost
- Security-group statefulness and least exposure
- Instance roles and temporary credentials
- IAM policy evaluation and `AccessDenied` diagnosis
- Structured logs and correlation identifiers
- Symptoms, evidence, and root cause

Required exercises and decisions:

- Predict an IAM request outcome, test it, and repair only the missing access.
- Compare timeout, connection-refused, and authorization-failure symptoms.
- Stop an EC2 instance and identify which charges can remain.
- Explain why application access keys must not be stored on the instance.

### Phase 3 — Networking and failure domains

Required concepts:

- CIDR allocation and most-specific route selection
- What technically makes a subnet public or private
- Inbound versus outbound connectivity
- Internet Gateway versus NAT Gateway
- Stateful security groups versus stateless network ACLs
- DNS resolution inside a VPC
- Availability Zones as failure domains
- Cross-AZ resilience, traffic, and cost
- Network isolation versus network reachability

Required exercises and decisions:

- Trace user-to-ALB, ALB-to-application, and application-to-database paths.
- Predict the result of removing a route or rule, then test and diagnose it.
- Explain why private resources can still initiate internet connections.
- Decide whether a NAT Gateway is justified in learning and production modes.
- Describe what breaks if one Availability Zone becomes unavailable.

### Phase 4 — Containers, health, scaling, and deployment

Required concepts:

- Immutable artifacts, image tags, and image digests
- ECS task role versus task execution role
- CPU/memory sizing and saturation
- Desired count and horizontal scaling
- Liveness, readiness, and load-balancer health
- Graceful task termination
- Rolling-deployment minimum/maximum healthy capacity
- Deployment circuit breakers
- Rollback versus roll-forward
- Single points of failure and blast radius

Required exercises and decisions:

- Deploy an unhealthy image and follow the failure through ECS and ALB events.
- Replace a running task and observe whether requests are interrupted.
- Explain how desired count and Availability Zone placement affect resilience.
- Choose versioned images over `latest` and demonstrate a rollback.
- Estimate the idle cost of ECS plus its supporting network resources.

### Phase 5 — Data integrity, scaling, and recovery

Required concepts:

- Database transactions and isolation
- Optimistic versus pessimistic concurrency
- Preventing inventory overselling
- Indexes and query plans
- Connection pools and connection exhaustion during scale-out
- Schema compatibility and expand/contract migrations
- Backups versus high availability
- Recovery Time Objective (RTO) and Recovery Point Objective (RPO)
- Encryption at rest versus in transit
- IAM identity versus database/application secrets
- Presigned S3 operations and prevention of public writes

Required exercises and decisions:

- Simulate two customers attempting to buy the final item concurrently.
- Scale or simulate multiple application instances and observe database
  connection usage.
- Design a migration that remains compatible with old and new application code.
- Explain why Multi-AZ cannot protect against a destructive application query.
- Define an RTO/RPO and map it to an appropriate backup/restore approach.
- Prove that an upload works without making the bucket publicly writable.

### Phase 6 — Messaging and distributed reliability

Required concepts:

- At-most-once and at-least-once delivery
- Why practical exactly-once processing requires application design
- Idempotency keys and deduplication
- Visibility timeout and acknowledgement failure
- Retries, exponential backoff, and retry amplification
- Poison messages, dead-letter queues, and safe redrive
- Queue depth, oldest-message age, and backpressure
- Eventual consistency
- Message ordering
- Transactional outbox problem and pattern

Required exercises and decisions:

- Deliver the same order message more than once without duplicating its effect.
- Crash the worker after the database change but before acknowledgement.
- Configure an incorrect visibility timeout, observe it, and correct it.
- Send a poison message to the DLQ and redrive it after fixing the cause.
- Decide what belongs in the synchronous API response versus background work.

### Phase 7 — Events, schedules, and notification semantics

Required concepts:

- Queueing versus pub/sub versus event routing
- Commands versus events
- Event schemas and consumer coupling
- EventBridge bus versus EventBridge Scheduler
- SNS fan-out versus SES transactional email
- Schedule time zones, retries, flexible windows, and DLQs
- Duplicate scheduled delivery and idempotent reports
- Partial success across notification targets

Required exercises and decisions:

- Choose SQS, EventBridge, SNS, or SES for each communication path and defend
  the choice.
- Evolve an event without breaking its existing consumer.
- Run the inventory report twice for the same reporting period safely.
- Cause one notification target to fail without losing successful targets.

### Phase 8 — Observability, resilience, and operational cost

Required concepts:

- Logs versus metrics versus traces
- Latency, traffic, errors, and saturation
- Leading versus lagging indicators
- Actionable versus noisy alarms
- Correlation across API, queue, worker, and database activity
- Graceful degradation and dependency failure
- High availability versus disaster recovery
- CDN caching and invalidation
- DNS, TLS, origin protection, and audit history
- Cost while idle, under normal load, and during scaling
- Cross-AZ, NAT, log-ingestion, storage, and data-transfer costs

Required exercises and decisions:

- Diagnose delayed orders using API, queue, worker, and database signals.
- Build a failure timeline from logs, metrics, deployment events, and audit data.
- Test one Availability Zone or dependency failure through a safe simulation.
- Tune an alarm so it is actionable rather than merely sensitive.
- Estimate cost per idle day and cost per representative order volume.
- Compare the learning architecture with a justified production architecture.

### Phase 9 — Infrastructure ownership and drift

Required concepts:

- Declarative desired state and dependency graphs
- Terraform state sensitivity, locking, and recovery
- In-place updates versus resource replacement
- Configuration drift and ownership boundaries
- Deletion protection and retained resources
- Foundation/runtime separation
- Infrastructure blast radius and plan review
- Importing existing resources versus recreating them

Required exercises and decisions:

- Predict which resources a Terraform change will update or replace.
- Introduce a controlled manual change, detect drift, and reconcile it safely.
- Demonstrate that runtime destruction does not remove intentional foundation
  data.
- Verify AWS after destroy rather than trusting Terraform output alone.

### Phase 10 — Delivery safety and operational readiness

Required concepts:

- Short-lived CI identity and least privilege
- Immutable build artifacts and promotion
- Rolling deployment and health-based rollback
- Rollback versus forward repair
- Database compatibility during application deployment
- Environment separation and change control
- Recovery procedures and operational ownership
- Capacity limits as reliability and cost controls

Required exercises and decisions:

- Trace the exact permissions used by the CI deployment identity.
- Deploy a failing version and observe the rollback path.
- Demonstrate that the previous artifact can be identified and restored.
- Complete a production-readiness review covering security, reliability,
  observability, recovery, and cost.

## Architecture decision record

When a phase presents a meaningful choice, record it using this lightweight
format in a phase note or future `docs/decisions/` directory:

```text
Decision:
Context:
Options considered:
Chosen option:
Why:
Trade-offs:
Cost impact:
Failure impact:
Conditions that would make us reconsider:
```

Likely decisions include:

- ECS Fargate versus EC2 or EKS
- RDS versus DynamoDB for orders
- Public versus private placement for each component
- Synchronous processing versus SQS
- SQS versus EventBridge versus SNS
- Single-AZ learning database versus Multi-AZ production database
- NAT Gateway versus alternative outbound-access designs
- Rollback versus roll-forward for a failed change
- Resources retained between sessions versus recreated on demand

## Confirmed Phase 0 decisions

Confirmed:

- React with TypeScript for the frontend
- Node.js with TypeScript for the API and worker
- PostgreSQL for relational data
- Docker for packaging
- Mumbai (`ap-south-1`) as the primary AWS Region
- Terraform in the later Infrastructure-as-Code phase
- Existing Cloudflare-managed domain for Phase 8, with Cloudflare retained as
  authoritative DNS

Deferred until Phase 8:

- Exact application hostname
- Whether CloudFront, ALB, or both terminate traffic for each route
- ACM certificate scope and validation records
- Cloudflare-to-AWS routing and proxy mode

No DNS or domain resources are created or changed during Phase 0.
