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
- DNS resolution is enabled and DNS hostnames are disabled. The next manual
  action is to enable DNS hostnames while leaving resolution enabled.
- The VPC currently has zero subnets, attached Internet Gateways, active NAT
  Gateways, VPC endpoints, and network interfaces. No unintended billable
  dependency was created.
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
Confidence (0-4):
Failed deployment diagnosis:
Rollback evidence:
Task replacement/draining evidence:
Version/digest evidence:
Desired-count/AZ reasoning:
CPU/memory sizing reasoning:
Idle-cost estimate:
Phase 4 cleanup status:
Expected Phase 4 residual cost:
Delayed usage caveat:
Overall inactive-root-key follow-up:
```
