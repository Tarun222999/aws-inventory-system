# Phase 4 — Containers, health, scaling, and deployment safety

## Scope and safety

- Phase 4 preflight began on 2026-07-31.
- The working tree already contains the intentional, uncommitted Phase 3
  close-out changes in `docs/COST-SAFETY-CHECKLIST.md`,
  `docs/ENGINEERING-CONCEPTS.md`, `docs/PHASE-3-NOTES.md`, and ADR 0005. They
  are preserved and must not be overwritten, reverted, or silently reformatted.
- Commit `6ecda52` retains the Phase 1 progress correction and commit `dcc7de3`
  retains the Phase 2 close-out history.
- Phase 3 cleanup is `VERIFIED` with USD 0 expected residual cost. Delayed NAT,
  public IPv4, EC2, EBS, transfer, and request usage can still appear.
- Phase 2 cleanup remains `VERIFIED` with USD 0 expected residual cost. The last
  recorded delayed July estimate through 2026-07-27 was about USD 0.1017.
- Overall account cleanup currently remains `PARTIAL` because two inactive root
  access keys had a separate review date of 2026-07-28. That security follow-up
  is overdue. Phase 4 will not inspect, modify, or delete those credentials.
  Once the approved reusable Phase 4 foundation exists, its intentional
  retention will be an additional documented reason for overall `PARTIAL`.
- Phase 4 is limited to ECR, ECS Fargate, task/execution roles, task
  definitions, an ECS service, ALB/target health, scaling, replacement,
  draining, logs, versioned images/digests, circuit-breaker rollback, sizing,
  availability, and cost analysis.
- Do not create RDS, Secrets Manager, application S3 storage, Route 53,
  CloudFront, SES, SNS, EventBridge, or any other Phase 5+ resource.
- No AWS creation is approved at this checkpoint. Creation remains manual and
  incremental, with a fresh explicit approval immediately before each
  potentially billable creation group.

All supported resources will use these tags:

```text
Project=aws-order-platform
Environment=learning
Owner=Tarun222999
AutoCleanup=false
```

## Verified pre-creation baseline — 2026-07-31

- The `aws-learning` profile resolved to the expected IAM Identity Center
  `AWSReservedSSO_AdministratorAccess` assumed role. The account identifier is
  intentionally omitted.
- The configured and selected Region is Mumbai (`ap-south-1`).
- Read-only regional inventory found zero ECR repositories, ECS clusters,
  registered task-definition families, Application Load Balancers, target
  groups, Phase 4 CloudWatch log groups, Phase 4 IAM roles, active NAT
  Gateways, Elastic IPs, VPC endpoints, non-terminated EC2 instances, and
  custom VPCs.
- The original default VPC remains. The current API inventory unexpectedly
  returned zero subnets in that VPC, so Phase 4 will not modify it. A dedicated
  reusable learning VPC is planned and the subnet discrepancy will remain a
  read-only observation unless separately investigated.
- No new Cost Explorer request was made. The current-month Billing dashboard
  was inspected manually on 2026-08-02. The July 2026 total shown was USD 0.62:
  USD 0.35 EC2-Other, USD 0.10 tax, USD 0.08 EC2-Instances, USD 0.04
  VPC, USD 0.04 Cost Explorer, USD 0.01 still aggregated as `Others`, and USD
  0.00 each for S3, Secrets Manager, CloudShell, and Glue. This distribution is
  consistent with delayed Phase 2/3 compute, EBS/NAT/network, public-IPv4,
  request, and tax usage already incurred, but that is an inference rather than
  usage-type attribution. The remaining USD 0.01 is recorded as tiny
  unspecified historical usage rather than evidence of an active resource;
  the live resource inventory was empty.
- The August 1–31, 2026 bill was inspected manually on 2026-08-02. Its status
  was pending and both total charges and estimated grand total were USD 0.00.
  No account identifier or payment information was recorded. This is the Phase
  4 current-month billing baseline; delayed billing is not cleanup evidence.

## Learning architecture

```text
learner /32
    |
internet-facing ALB (HTTP 80, two AZs)
    |
target group (IP targets, HTTP 3000, /health)
    |
ECS Fargate service (desired 1, briefly 2)
    |-- task execution role: pull ECR image and write CloudWatch logs
    |-- task role: application identity, no AWS API permissions in Phase 4
    |-- exact image digest and versioned tag
    |-- SIGTERM graceful shutdown and bounded slow-request demonstration

ECR private repository ---> Fargate image pull
Fargate stdout/stderr ----> CloudWatch Logs (one-day retention)
```

## Creation preflight refresh — 2026-08-02

- Immediately before the first creation approval, the `aws-learning` session
  again resolved to the expected IAM Identity Center administrator role and
  the configured Region remained Mumbai (`ap-south-1`).
- Read-only inventory again found zero ECR repositories, ECS clusters,
  Application Load Balancers, target groups, Phase 4 log groups, Phase 4 IAM
  roles, active NAT Gateways, Elastic IPs, VPC endpoints, non-terminated EC2
  instances, and custom VPCs.
- No AWS resource was created or modified by this refresh. The August bill
  baseline remains the manually observed pending USD 0.00 estimate; billing
  can be delayed.

The application runs in an explicitly limited Phase 4 stateless mode: health,
version, controlled unhealthy behavior, and bounded slow requests are valid;
product/order/database behavior is not claimed. PostgreSQL remains the intended
production state store, but managed data infrastructure starts only in Phase 5.

## Chosen reusable network placement

- Create one dedicated `10.40.0.0/16` learning VPC with DNS
  support/hostnames, an Internet Gateway, one public route table, two public
  `/24` subnets (`10.40.0.0/24`, `10.40.1.0/24`), and two private `/24`
  subnets (`10.40.10.0/24`, `10.40.11.0/24`) across `ap-south-1a` and
  `ap-south-1b`. Private route tables remain local-only until a later active
  exercise explicitly approves an egress dependency.
- Put the ALB in both subnets. Allow TCP/80 only from the learner's current
  public IPv4 `/32` during tests.
- Put Fargate tasks in both subnet choices with `assignPublicIp=ENABLED` so they
  can pull from ECR and send logs without a NAT Gateway or paid interface
  endpoints. Task ingress allows TCP/3000 only from the ALB security group.
- A task public IPv4 does not make the container directly reachable: the task
  security group has no public CIDR ingress. The address is still billable.
- The production-shaped later architecture would normally place tasks in
  private subnets across at least two AZs and justify same-AZ NAT and/or ECR,
  Logs, and S3 endpoints. This learning design prioritizes short lifetime and
  lower cost while preserving ALB-to-task isolation.
- Retain the tagged VPC, four subnets, route tables, Internet Gateway, and
  justified reusable security groups through Phase 8. Re-verify them after
  each session and normally delete them at the Phase 8/9 boundary before
  Terraform recreation unless an explicit import exercise is approved.

## Runtime and deployment settings

- ECS Fargate Linux/x86 task size: `0.25 vCPU`, `0.5 GB`, and the included
  `20 GB` ephemeral storage. Start at desired count 1; scale to 2 only for the
  availability and replacement exercises, then return to 1.
- ECS rolling deployment: minimum healthy percent 100, maximum percent 200,
  deployment circuit breaker enabled with automatic rollback.
- Enable Availability Zone rebalancing. With desired count 2, verify one task
  per AZ when capacity permits; desired count 1 cannot survive loss of its AZ.
- ALB target type is `ip`, protocol HTTP, port 3000, health path `/health`,
  10-second interval, 5-second timeout, healthy threshold 2, unhealthy
  threshold 2, and a 30-second deregistration delay for the bounded drain test.
- Use versioned immutable tags and deploy task definitions by explicit ECR
  digest. Do not push or deploy `latest`.
- Create one healthy image and one deliberately unhealthy image with distinct
  digests. The unhealthy deployment must be followed through target-health,
  stopped-task, ECS service/deployment, and CloudWatch log evidence. Automatic
  rollback must restore the known-good digest.
- Do not enable Container Insights, enhanced ECR scanning, autoscaling alarms,
  Live Tail, or unrelated observability features. Basic scaling is manual.

## Current official pricing basis

Pricing was checked on 2026-07-31 using the official AWS pricing pages and the
read-only AWS Price List API for `Asia Pacific (Mumbai)`:

- ECR private storage: USD 0.10/GB-month. Data transfer into ECR and same-Region
  ECR-to-Fargate transfer are USD 0; private ECR pricing has no separate image
  push/pull request meter. Internet/cross-Region transfer can be charged.
- Fargate Linux/x86: USD 0.04256/vCPU-hour plus USD 0.004655/GB-hour, billed
  per second with a one-minute minimum from image-download start through task
  termination. The first 20 GB ephemeral storage is included; configured
  storage above 20 GB is USD 0.000127/GB-hour.
- A `0.25 vCPU`/`0.5 GB` task is about USD 0.0129675/hour. Its public IPv4 adds
  USD 0.005/hour, for about USD 0.0179675 per running task-hour before traffic.
- ALB: USD 0.0239 per ALB-hour or partial hour plus USD 0.008 per consumed
  LCU-hour. LCU billing uses the highest of new connections, active
  connections, processed bytes, and rule evaluations.
- An ALB requires at least two AZ subnets and has one address per enabled AZ.
  The internet-facing IPv4-only ALB is therefore budgeted for two public IPv4
  addresses at USD 0.005 each per hour, or USD 0.01/hour.
- CloudWatch custom logs in Standard class: USD 0.67/GB ingested and USD
  0.03/GB-month stored. Logs Insights is USD 0.0067/GB scanned; it is not
  required. Retention is one day and the Phase 4 group is deleted after its
  evidence is captured rather than retained as foundation.
- ALB-to-task traffic over private IPs inside the same VPC has no EC2 Regional
  Data Transfer charge. Same-Region ECR-to-Fargate transfer is also USD 0.
  Internet data transfer can still apply, but the diagnostic request volume is
  intentionally tiny.
- NAT is not planned. If introduced, Mumbai pricing is USD 0.056/NAT-hour,
  USD 0.056/GB processed, one USD 0.005/hour public IPv4, and possible
  cross-AZ transfer. It would require a separate time-boxed approval.

Official sources:

- https://aws.amazon.com/ecr/pricing/
- https://aws.amazon.com/fargate/pricing/
- https://aws.amazon.com/elasticloadbalancing/pricing/
- https://aws.amazon.com/vpc/pricing/
- https://aws.amazon.com/cloudwatch/pricing/
- https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-ecs.html
- https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html
- https://docs.aws.amazon.com/AmazonECS/latest/developerguide/load-balancer-connection-draining.html

## Conservative session estimate and cap

Low-traffic hourly planning rate:

```text
ALB hourly charge                         USD 0.023900/hour
up to one low-traffic ALB LCU             USD 0.008000/hour
two ALB public IPv4 addresses             USD 0.010000/hour
one 0.25-vCPU/0.5-GB task                 USD 0.012968/hour
one task public IPv4                      USD 0.005000/hour
baseline with desired count 1             USD 0.059868/hour
baseline with desired count 2             USD 0.077835/hour
```

- Expected billable runtime: no more than three hours from ALB creation.
- Expected interactive spend: under USD 0.50 before tax, assuming tiny traffic,
  less than 0.1 GB logs, and prompt cleanup.
- Conservative session cost cap: USD 0.75 before tax. This is an operating
  limit, not an AWS-enforced spending cap. If the ALB reaches three hours,
  cleanup starts immediately even if an exercise remains unfinished.
- Image storage is capped operationally at 1.5 GB total across the two lesson
  images (USD 0.15/month if retained for a full month). Delete the unhealthy
  image after rollback evidence. Retain only the known-good versioned image and
  repository; record its actual size and monthly residual cost after push.
- Review the retained foundation on 2026-08-31 and again at the Phase 8/9
  boundary. Normally delete it before Phase 9 Terraform recreation unless an
  explicit import exercise is approved.

### Dedicated learning VPC — 2026-08-02

- The user manually created `order-platform-phase4-vpc`
  (`vpc-01f2e981ee69febad`) in Mumbai.
- Read-only verification confirmed state `available`, CIDR `10.40.0.0/16`,
  default tenancy, and exact `Name`, `Project`, `Environment`, `Owner`, and
  `AutoCleanup` tags with no mismatch.
- Read-only verification confirmed that both DNS resolution and DNS hostnames
  are enabled.
- Four tagged `/24` subnets were verified `available` with the intended CIDRs
  and two-AZ placement: public A `subnet-022206a94faffa567` in `ap-south-1a`,
  public B `subnet-03d602d500bb7f64a` in `ap-south-1b`, private A
  `subnet-0959a93361d698088` in `ap-south-1a`, and private B
  `subnet-0462c591e5d829fdd` in `ap-south-1b`.
- Automatic public IPv4 assignment is disabled on all four subnets. Read-only
  verification also found no active NAT Gateway or VPC endpoint, so no
  unintended billable egress dependency was created.
- Internet Gateway `igw-03dcd901c5395fbf7` was verified attached and
  `available` with the exact required tags. A follow-up safety check found no
  active NAT Gateway or unattached Elastic IP.
- Public route table `rtb-069097f89f8bd5070` was verified with both public
  subnet associations and active `0.0.0.0/0` routing to the Phase 4 Internet
  Gateway. Private route table `rtb-0f14920dd8fddf372` was verified with both
  private subnet associations and only the active VPC-local route.
- The VPC main route table remains associated only as main and contains only
  the VPC-local route. Both custom route tables have the exact required tags,
  and the follow-up check again found no active NAT Gateway.
- After the tagging follow-up, main route table `rtb-0cf4de2df4c9d7be0`
  was verified with the exact required tags, its main association intact, and
  only the active VPC-local route.
- ALB security group `sg-037d90e37d307a692` was verified with public IPv4
  inbound TCP/80 and outbound TCP/3000 only to the task security group. Task
  security group `sg-09ee205b5eb8a0727` was verified with inbound TCP/3000
  only from the ALB security group and outbound TCP/443 to IPv4 internet
  endpoints. Both groups have the exact required tags.
- IAM verification on 2026-08-04 confirmed both Phase 4 roles trust only
  `ecs-tasks.amazonaws.com`, have the exact required tags, and have no inline
  policies. The execution role has only `AmazonECSTaskExecutionRolePolicy`;
  the task role has no attached permission policy. An initially attached
  `AmazonEC2ContainerServiceRole` policy on the task role was removed before
  this verification.
- ECS cluster `order-platform-phase4-cluster` was verified `ACTIVE` in Mumbai
  with the exact required tags and Container Insights disabled. It has the
  standard `FARGATE` and `FARGATE_SPOT` capacity providers available but no
  default strategy, services, running or pending tasks, registered EC2
  container instances, or current runtime cost.
- On 2026-08-04 the user gave immediate explicit approval for the Phase 4
  CloudWatch log group only: `/aws/order-platform/phase4/api`, Standard class,
  default service encryption, one-day retention, and a 0.10 GB ingestion cap.
  At the recorded Mumbai rates this caps ingestion near USD 0.067; empty-group
  cost is effectively USD 0. Stop tasks to stop ingestion, delete the group
  after evidence, and verify the Phase 4 prefix is empty.
- Post-creation verification confirmed the log group uses Standard class,
  one-day retention, default service encryption, and the exact required tags.
  It has 0 stored bytes and no log streams, metric filters, or subscription
  filters; current direct cost is effectively USD 0 before task log ingestion.
- On 2026-08-04 the user gave immediate explicit approval for the private ECR
  repository and exactly two versioned image pushes: one healthy and one
  controlled-unhealthy image. Tags are immutable, encryption is AES-256, and
  combined storage is capped at 1.5 GB (USD 0.15/month at USD 0.10/GB-month).
  Same-Region ECR-to-Fargate transfer is USD 0. Delete the unhealthy image
  after rollback evidence and retain only the measured known-good image.
- Post-creation verification confirmed private repository
  `order-platform-phase4-api` uses immutable tags, AES-256 encryption, exact
  required resource tags, and basic rather than enhanced registry scanning.
  It contains zero images, so current ECR storage cost is effectively USD 0.
- The first approved push created exactly one Linux/amd64 image tagged
  `phase4-healthy-v1`, with ECR digest
  `sha256:f14819c56db20d6cd8c500011abd30f111b067aaa56505fd20e360a91086442a`.
  The tested local image resolves to the same registry digest. ECR reports a
  compressed size of 190,003,692 bytes (about 0.190 GB), yielding an estimated
  retained cost of about USD 0.019/month at USD 0.10/GB-month. The second
  approved unhealthy-image push remains unused.
- The planned first task-definition revision pins that healthy digest and uses
  Fargate `awsvpc`, Linux/x86_64, 0.25 vCPU, 0.5 GB memory, the included 20 GB
  ephemeral storage, API port 3000, the verified execution and task roles,
  the one-day Phase 4 log group, and a 15-second container stop timeout.
  Registration has USD 0 direct cost and does not authorize launching a task.
- Post-registration verification found revision 1 otherwise matched the plan
  but stored `NODE_ENV=NODE_ENV` instead of `NODE_ENV=production`. No service,
  running task, or pending task was created, so no Fargate/public-IPv4 runtime
  cost began. Because task-definition revisions are immutable, register and
  verify corrected revision 2 before any runtime approval or launch.
- Revision 2 was verified `ACTIVE` with `NODE_ENV=production` and every other
  planned field intact: pinned healthy digest, Fargate/awsvpc, Linux/x86_64,
  0.25 vCPU, 0.5 GB, default included storage, roles, port 3000, placeholder
  database URL, CloudWatch logging, 15-second stop timeout, and exact tags.
  The cluster still has zero services and tasks. Incorrect revision 1 remains
  active only until it is deliberately deregistered before runtime.
- Follow-up verification confirmed revision 1 is `INACTIVE` and corrected
  revision 2 remains `ACTIVE`; no task or service was launched during cleanup.
- On 2026-08-04 the user explicitly approved runtime group 2: one IP target
  group, one internet-facing ALB/listener, one ECS service at desired count 1
  and briefly 2, task public IPv4 addresses for NAT-free egress, a maximum
  three-hour ALB lifetime, and a USD 0.75 pre-tax operating cap. This does not
  approve NAT, endpoints, EC2, RDS, or Phase 5+ resources. At the time of
  approval, read-only checks confirmed zero tasks, services, load balancers,
  target groups, and active NAT Gateways in the Phase 4 VPC.
- Target group `order-platform-phase4-api-tg` was verified in the Phase 4 VPC
  with target type IP, IPv4 HTTP/3000, HTTP/1, `/health`, traffic port,
  10-second interval, 5-second timeout, 2/2 thresholds, matcher 200, exact
  tags, and zero registered targets. Slow start is 0, stickiness is disabled,
  and cross-zone behavior inherits the ALB. The default deregistration delay
  is 300 seconds and must be reduced to 30 before ALB creation.
- Follow-up verification confirmed the deregistration delay is 30 seconds,
  other target-group attributes remain unchanged, the target set is empty,
  and no ALB exists yet.
- ALB `order-platform-phase4-alb` was created at 2026-08-04 22:48 IST, starting
  the approved billing clock and setting a mandatory 2026-08-05 01:48 IST
  cleanup deadline. Initial verification confirmed internet-facing IPv4,
  application type, the correct VPC and public A/B subnets, only the ALB
  security group, exact tags, HTTP/80 forwarding to the Phase 4 target group,
  cross-zone enabled, access logs disabled, and deletion protection disabled.
  Follow-up verification confirmed the ALB is `active` and its authoritative
  subnet mappings include both `ap-south-1a` public A and `ap-south-1b` public
  B. The EC2 inventory exposed one requester-managed ALB ENI/public association
  in public B at that instant; because ALB frontend capacity is AWS-managed,
  the authoritative two-AZ mapping—not a transient EC2 ENI count—is the
  availability configuration. Cleanup must still wait for every exposed ALB
  ENI/public IPv4 dependency to disappear.
- ECS service `order-platform-phase4-api` launched its first Fargate task at
  2026-08-04 23:20 IST. Verification found service state `ACTIVE`, desired /
  running / pending counts `1 / 1 / 0`, a completed deployment, zero failed
  tasks, minimum healthy 100%, maximum 200%, and circuit breaker plus rollback
  enabled. The service uses task definition revision 2, both planned public
  subnets, only the task security group, assigned public IPs, ECS-managed tags,
  service-to-task tag propagation, and no ECS Exec.
- Fargate placed the first task in public B with 0.25 vCPU and 0.5 GB memory.
  Its requester-managed ENI has the expected private IP, a temporary public
  IPv4 association, and only the task security group. ECS registered the task
  private IP on port 3000; the target became `healthy`.
- Requests through the ALB to `/health` and `/version` returned status `ok` and
  version `phase4-healthy-v1`. CloudWatch contains the expected task log stream
  and the startup record confirms `production`, host `0.0.0.0`, port 3000, and
  healthy mode. Required service tags propagated to the task alongside the
  ECS-managed service and cluster tags.
- The service health-check grace period is 0 seconds rather than the planned
  30 seconds. The fast-starting healthy baseline succeeded, so no emergency
  change was required; review this distinction before the controlled unhealthy
  deployment.
- The user manually stopped the only running task while desired count remained
  1. The ALB temporarily returned HTTP 503 while the target group had no healthy
  destination, demonstrating the predicted single-replica availability gap.
  ECS replaced the task without changing the deployment revision; desired /
  running / pending returned to `1 / 1 / 0`, with zero deployment failures.
- The replacement became healthy in public A at private IP `10.40.0.184`, while
  `/health` identified its container hostname as
  `ip-10-40-0-184.ap-south-1.compute.internal`. The original task stopped with
  `UserInitiated`, container exit code 0, and its former ENI returned not found.
  A distinct CloudWatch stream was created for the replacement task.
- The user then changed desired count from 1 to 2 without forcing a new
  deployment. ECS retained the healthy task in public A and started the second
  replica in public B at private IP `10.40.1.235`. Service counts converged to
  `2 / 2 / 0`, and the target group verified one healthy target in each AZ.
  Two-task Fargate plus task-public-IPv4 runtime is about USD 0.035935/hour,
  before the already-running ALB/LCU/public-IPv4 charges.
- A manual 20-request `/version` sample through the ALB returned 10 responses
  from the public-A task hostname and 10 from the public-B task hostname. This
  is direct evidence that both registered private-IP targets served traffic;
  the exact even split is an observed small sample, not an ALB distribution
  guarantee.
- With desired count still 2, the user started a 180-request probe and manually
  stopped the public-A task. Every request succeeded: 36 were served by the old
  public-A task, 127 by the surviving public-B task, and 17 by the new public-A
  replacement. There were zero probe errors and no observed ALB 503 response.
- AWS verification returned desired / running / pending `2 / 2 / 0`, zero
  deployment failures, and healthy targets `10.40.1.235:3000` in public B and
  `10.40.0.38:3000` in public A. No ENI remained for the stopped task's old
  private IP `10.40.0.184`, verifying release of that task's network/public-IP
  dependency. This contrasts self-healing with one replica against maintained
  request availability with two replicas across the two selected AZs.
- The user scaled back from 2 to 1. AWS exposed the removed public-B target as
  `draining` with `Target.DeregistrationInProgress`, then removed it after the
  configured 30-second deregistration delay; the service converged to `1 / 1 /
  0` with only the public-A target healthy.
- For the explicit drain test, a 10,000 ms request was started through the ALB
  and the only task was manually stopped while it was in flight. The request
  completed successfully on `ip-10-40-0-38.ap-south-1.compute.internal` in
  10,198 ms. CloudWatch then logged `Graceful shutdown started` with `SIGTERM`
  and `Graceful shutdown completed`; their near-identical timestamps show the
  request had already finished during load-balancer/ECS draining before the
  container received SIGTERM. The task exited 0 with no container reason, its
  old ENI/private-public IP dependency was absent, and the service replacement
  became healthy in public B at private IP `10.40.1.7`.
- This demonstrates two cooperating safeguards without overstating the result:
  deregistration draining protected the observed in-flight request, while the
  application's SIGTERM handler performed a clean bounded shutdown. The AWS
  run did not force the handler itself to wait on an active request because
  draining completed that request before SIGTERM arrived.
- Direct idle service cost is USD 0. Ledger status is `RUNNING — REQUIRED`
  while the approved retained foundation is built and re-verified.
- At desired count zero, Fargate task and task-public-IPv4 charges stop only
  after tasks terminate. ALB hours/LCUs and its public IPv4 addresses continue;
  ECR image storage and CloudWatch stored logs also continue. Scaling to zero
  is not final cleanup.

## Billable approval groups

1. Registry and image group: ECR repository plus two versioned image pushes.
   This starts ECR storage billing. IAM roles, log group, VPC, subnets, IGW,
   route tables, and security groups have no direct hourly service charge in
   the planned configuration. They become retained-foundation obligations once
   created and must be re-verified during every cleanup.
2. Runtime group: internet-facing ALB/listener/target group and ECS Fargate
   service/tasks/public IPv4 addresses. This starts ALB, LCU, Fargate,
   public-IPv4, log-ingestion, and small data-transfer billing.

Each group requires concrete explicit approval immediately before creation.
Approval for group 1 does not approve group 2 or any NAT Gateway.

### Creation group 1 approval — 2026-08-02

- After the refreshed identity, Region, resource, and USD 0.00 August billing
  baseline checks, the user explicitly approved Phase 4 creation group 1 in
  Mumbai.
- Approval covers the dedicated reusable VPC foundation, security groups, empty ECS
  cluster, separate task/execution IAM roles, one-day CloudWatch log group, ECR
  repository, and at most 1.5 GB across two versioned image pushes.
- Maximum ECR storage exposure is USD 0.15/month if the full 1.5 GB were
  retained for an entire month. The user-approved lifecycle change on
  2026-08-02 supersedes the original delete-everything intent: delete the
  unhealthy image after rollback, but retain one known-good image/repository
  and the no-direct-cost foundation through Phase 8 with re-verification,
  actual residual cost, and review dates recorded.
- This approval does not cover an ALB, Fargate task/service runtime, NAT
  Gateway, VPC endpoint, EC2, RDS, or any Phase 5+ resource. Runtime group 2
  retains its own immediate approval gate.

## Local deployment-surface preparation — 2026-08-02

- Added build-time `APP_VERSION` and `PHASE4_HEALTH_MODE` image metadata so the
  healthy and controlled-unhealthy builds have distinct image configurations
  and digests without using mutable `latest`.
- `/health` now returns the built version and deliberately returns HTTP 503 for
  the unhealthy image. `/version` returns the version and container hostname,
  allowing repeated ALB requests to identify the responding task.
- Added `/phase4/slow?delayMs=` with a bounded maximum of 20 seconds for the
  in-flight request/draining exercise. It introduces no database behavior or
  persistent state.
- API startup logs now identify the exact application version and health mode.
  Existing SIGTERM handling still stops new acceptance, waits for active HTTP
  requests, closes the database pool, and enforces the configured deadline.
- Focused tests passed 2/2 for healthy/unhealthy ALB responses, exact version
  identification, bounded slow requests, and invalid-delay rejection. API and
  configuration type checks, focused lint, and the API production TypeScript
  build passed. The first broad API test command also selected database
  integration suites and failed only because no `DATABASE_URL` was supplied;
  the new no-database operational tests themselves passed in that run.
- Local healthy image `order-platform-phase4-api:phase4-healthy-v1` was built
  for Linux/amd64 and inspected with `APP_VERSION=phase4-healthy-v1`, healthy
  mode, non-root `node` user, and an approximately 470 MB local image size.
  The local size is not the compressed ECR billed size.
- A localhost-only container test verified `/health` returned `status=ok` and
  version `phase4-healthy-v1`; `/version` returned the same version plus the
  container hostname. Startup logs recorded production mode, `0.0.0.0:3000`,
  the exact version, and healthy mode. A syntactically valid placeholder
  database URL satisfied configuration only; no managed database was created
  or contacted, and database-backed endpoints were not tested.
- A manual `docker stop --time 15` sent SIGTERM. Logs showed graceful shutdown
  start and completion within milliseconds; the container exited 0, was not
  OOM-killed, and reported no runtime error. This is the local baseline for the
  later ALB draining and ECS task-replacement exercise.
- Local image `order-platform-phase4-api:phase4-unhealthy-v1` was built for
  Linux/amd64 with non-root user `node`, embedded version
  `phase4-unhealthy-v1`, and health mode `unhealthy`. Local `/version` returned
  HTTP 200 with that version while `/health` deliberately returned HTTP 503;
  the container remained running, distinguishing process state from
  application/load-balancer health.
- The tested unhealthy image was pushed under the repository's immutable tag
  at digest
  `sha256:746f4d169ce73284b2252328bc20a825d91cd3720c7098daea1338cd711be809`
  and compressed size 190,006,714 bytes. The healthy digest remained unchanged.
  Both images total about 0.380 GB, estimated near USD 0.038/month prorated;
  delete the unhealthy image after rollback evidence.
- Task-definition revision 3 was registered `ACTIVE` and pinned to the exact
  unhealthy digest. Read-only comparison against healthy revision 2 verified
  identical substantive task/container settings and exact required tags. The
  only non-image serialization difference was omission of empty
  `environmentFiles`, `ulimits`, and log `secretOptions` arrays, which has no
  runtime effect. Registration has USD 0 direct cost and did not update the
  service.
- The service was updated from healthy revision 2 to unhealthy revision 3 with
  desired count 1, minimum healthy 100%, maximum 200%, circuit breaker and
  rollback enabled, and a fixed failure threshold of 3. Healthy revision 2
  remained the customer-serving target throughout.
- Each revision 3 container started normally and logged version
  `phase4-unhealthy-v1` with health mode `unhealthy`. ALB health checks received
  HTTP 503; captured target state showed `unhealthy` with
  `Target.ResponseCodeMismatch`. ECS drained/stopped the attempts cleanly rather
  than treating them as image-pull, IAM, network, or process-crash failures.
- At failure count 3, revision 3 moved to `FAILED` and the circuit breaker
  automatically promoted revision 2 back to `PRIMARY`. Final verification
  returned service task revision 2, desired / running / pending `1 / 1 / 0`,
  rollout `COMPLETED`, one healthy public-B target, no remaining unhealthy
  target, and ALB `/version` response `phase4-healthy-v1`. This is the required
  rollback and immutable-version evidence.
- AWS actions/resources created: none. Local preparation has no AWS cost.

## Planned question → prediction → evidence loop

1. Explain a task versus a service and predict what happens when one service
   task is stopped manually.
2. Explain which actions use the execution role and which would use the task
   role; verify the application task role has no AWS API policy.
3. Predict whether a tag or digest identifies immutable bytes; deploy by digest
   and compare ECR, task definition, and running-task evidence.
4. Predict the ALB target state for the deliberately unhealthy image; follow
   target, task, service, deployment, and log evidence through rollback.
5. Run a bounded slow request, replace a task, and observe healthy → draining →
   unused transitions plus the application's SIGTERM shutdown logs.
6. Scale desired count 1 → 2 → 1 and explain CPU/memory saturation, horizontal
   versus vertical scaling, AZ placement, and blast radius.
7. Calculate cost at desired count 0 and explain why ALB, public IPv4, ECR, and
   logs require separate cleanup.

### Pre-build prediction — desired count 1

- On 2026-08-02, the user predicted that stopping the only task makes it
  unavailable to take work. Review added that the ECS service observes running
  count zero versus desired count one and starts a replacement. Until a target
  is healthy, the ALB can have no destination for new requests and return 503;
  an in-flight request succeeds only if deregistration draining and the
  application's graceful shutdown complete within their deadlines.

## Exact dependency-aware runtime cleanup and retained-foundation verification

1. Capture final version/digest, deployment, target-health, draining, log, AZ,
   sizing, and cost evidence. End request generators and manual test sessions.
2. Update the ECS service desired count to zero. Wait for running and pending
   task counts to reach zero; stop and verify any standalone task separately.
3. Delete the ECS service after it is inactive. Verify it is absent and no task
   remains in `RUNNING`, `PENDING`, `DEPROVISIONING`, or `STOPPING` state.
4. Delete the ALB. Its listener disappears with it, but verify both ALB and
   listener absence. Wait for ALB ENIs and both public IPv4 dependencies to
   disappear.
5. Delete the target group and verify it absent. Confirm no registered target
   remains in healthy, unhealthy, draining, or unused state.
6. Retain the empty ECS cluster only after verifying it has zero services,
   zero running/pending tasks, no custom capacity provider, and no autoscaling
   setting that can restart runtime.
7. Retain only the required known-good task-definition revision. Deregister
   unhealthy/obsolete active revisions where practical; historical inactive
   metadata can remain at USD 0.
8. Delete the unhealthy/test image after rollback evidence and verify its tag
   and digest are absent. Retain exactly one known-good versioned image and its
   repository; record its actual size and monthly residual storage cost.
9. After log evidence is recorded, delete the Phase 4 CloudWatch log group and
   verify its prefix is empty. Confirm no Container Insights setting, alarm,
   dashboard, or metric filter was created.
10. Retain only the narrowly scoped execution and task roles required by later
    phases. Re-verify trust, attached/inline policies, and absence of unintended
    permissions; IAM has USD 0 direct service cost.
11. After every task/ALB ENI is gone, retain only the justified reusable task
    and ALB security groups. Verify their rules remain least-privilege and that
    neither group has an ENI dependency or unintended public ingress.
12. Retain and re-verify the dedicated VPC, two public and two private subnets,
    route tables, and Internet Gateway. Verify private routes remain as
    intended and that no NAT, EIP, endpoint, public IPv4, or temporary ENI
    survives. Expected direct idle cost is USD 0.
13. Audit Mumbai for lesson ECS services/tasks/clusters/capacity settings,
    active task definitions, ECR repositories/images, ALB/listeners/rules/target
    groups, public IPv4 addresses, NAT/EIP/ENIs/routes, security groups, IAM
    roles/policies, log groups/retention, VPC/subnets/IGW/endpoints, and any
    temporary compute/storage. Confirm the original default VPC was not changed
    and every retained foundation resource has exact tags, residual cost, and
    a 2026-08-31 plus Phase 8/9 review/delete checkpoint.
14. Review the Billing dashboard without treating delayed usage as deletion
    evidence. Record Phase 4 runtime cleanup separately as `VERIFIED`,
    `PARTIAL`, or `NOT VERIFIED`. Overall account cleanup remains `PARTIAL`
    while the justified foundation or overdue root-key follow-up remains.

## Phase review (complete at exit)

```text
Confidence (0-4): 2. The user completed a five-question review on 2026-08-06
  and can explain the concepts with help. Reuse is required to strengthen
  unaided procedural recall, especially task-definition creation, rolling
  percentages, rollback versus roll-forward, and horizontal versus vertical
  scaling.
Failed deployment diagnosis: Revision 3 ran normally but returned HTTP 503 from
  /health. ALB reported Target.ResponseCodeMismatch, proving application health
  failure rather than image pull, IAM, networking, or process-start failure.
Rollback evidence: Three failed revision 3 targets tripped the fixed circuit
  breaker threshold. Revision 3 became FAILED; revision 2 returned to
  PRIMARY/COMPLETED; ALB /version returned phase4-healthy-v1.
Task replacement/draining evidence: Desired count 1 produced a temporary 503
  during replacement. Desired count 2 produced 180/180 successful requests
  while a task was replaced across two AZs. A separate 10-second request
  completed during target draining; the task then logged SIGTERM and exited 0.
Version/digest evidence: Healthy and unhealthy immutable tags resolved to
  distinct digests; revisions 2 and 3 pinned those digests. Only healthy
  phase4-healthy-v1 remains in ECR at its original digest.
Desired-count/AZ reasoning: One replica self-heals but has a replacement/AZ
  availability gap. Two replicas placed one per selected AZ and preserved
  service during one task replacement, at roughly twice task/public-IP cost.
CPU/memory sizing reasoning: 0.25 vCPU/0.5 GB is the least-cost valid Fargate
  size for this low-traffic stateless teaching surface. Horizontal scaling adds
  replicas for concurrency/availability; vertical sizing helps when one task's
  CPU or memory is saturated. No production load test was performed, so this is
  a starting size rather than a production capacity claim.
Idle-cost estimate: Desired count zero stops task compute/public-IPv4 charges
  only after ENIs disappear. ALB/LCU/two public IPv4 charges continue until ALB
  deletion; logs and ECR persist independently.
Phase 4 cleanup status: VERIFIED for disposable runtime on 2026-08-05. Zero
  active services/tasks, ALB/listeners/target groups, VPC ENIs/public IPv4,
  NAT/EIP/endpoints, Phase 4 log groups, or unhealthy images remain.
Expected Phase 4 residual cost: About USD 0.019/month prorated for the retained
  190,003,692-byte healthy ECR image; USD 0 direct idle service cost for the
  retained tagged VPC/ECS/IAM/security foundation.
Delayed usage caveat: Fargate, task/ALB public IPv4, ALB/LCU, ECR, CloudWatch
  Logs, request, transfer, and tax usage incurred during the lesson may appear
  after cleanup. Billing dashboards are not deletion evidence.
Overall inactive-root-key follow-up: The separate review of two inactive root
  access keys was due 2026-07-28 and is overdue. Phase 4 did not inspect,
  modify, or delete those credentials; separate authorization remains required.
```
