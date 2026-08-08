# Phase 5 — Database, storage, and secrets

## Scope and safety

- Phase 5 preflight began on 2026-08-07.
- The working tree already contains intentional uncommitted changes in
  `docs/COST-SAFETY-CHECKLIST.md`, `docs/ENGINEERING-CONCEPTS.md`,
  `docs/PHASE-4-NOTES.md`, and ADR 0006, plus untracked
  `docs/mermaid-diagram.svg`. They are preserved and must not be overwritten,
  reverted, silently reformatted, committed, or discarded without separate
  user instruction.
- Phase 4 is complete at confidence 2. Disposable Phase 4 runtime cleanup is
  `VERIFIED`; the approved reusable foundation remains intentionally retained.
- Overall account cleanup remains `PARTIAL` because of the documented retained
  foundation and the separate overdue inactive-root-key review. Phase 5 will
  not inspect, modify, expose, or delete those credentials without separate
  explicit authorization.
- Phase 5 is limited to private Single-AZ RDS PostgreSQL, database networking,
  transactions/concurrency, connection pooling, indexes/query plans,
  backward-compatible migrations, backups/recovery, encryption, Secrets
  Manager, scoped ECS permissions, private S3 product images, presigned
  operations, and credential rotation/recovery.
- Do not create SQS, SNS, SES, EventBridge, schedules, CloudFront, Route 53, or
  other Phase 6+ resources.

All supported resources use:

```text
Project=aws-order-platform
Environment=learning
Owner=Tarun222999
AutoCleanup=false
```

## Verified pre-creation baseline — 2026-08-07

- The `aws-learning` profile resolved to the expected IAM Identity Center
  `AWSReservedSSO_AdministratorAccess` assumed role. The account identifier is
  intentionally omitted.
- The configured and selected Region is Mumbai (`ap-south-1`).
- There are zero RDS instances, Phase 5 DB subnet groups, Phase 5 custom DB
  parameter groups, manual RDS snapshots, Phase 5 secrets, and Phase 5 S3
  buckets.
- The retained Phase 4 VPC is available with DNS resolution and hostnames
  enabled. Its two public and two private `/24` subnets are available across
  `ap-south-1a` and `ap-south-1b`, with automatic public IPv4 disabled.
- Both private subnets use the retained local-only private route table. The
  public subnets use the IGW route. The VPC has zero ENIs, public IPv4
  associations, endpoints, active/deleting NAT Gateways, or Elastic IPs.
- The retained ECS cluster is active and empty: zero services, running tasks,
  pending tasks, or container instances; Container Insights is disabled.
- Task definition revision 2 is active, uses Fargate `awsvpc` at 0.25 vCPU / 0.5
  GB, and pins the retained healthy ECR digest. The execution role retains only
  `AmazonECSTaskExecutionRolePolicy`; the task role remains permissionless.
- There is exactly one retained ECR image and zero ALBs, target groups, or
  Phase 4/5 CloudWatch log groups.
- A retained-foundation discrepancy was found: the unattached ALB security
  group allows TCP/80 from `0.0.0.0/0`, while the Phase 4 notes describe a
  learner `/32`. No ALB or ENI is attached, so no endpoint is exposed. Do not
  reuse this group until its ingress is deliberately reviewed and tightened.
- The existing monthly budget is USD 5 with four notifications. Budget actual
  spend was USD 0.144 at its 2026-08-07 update; no forecast value was returned.
  Billing is delayed and this is not cleanup evidence. No Cost Explorer request
  was made for this preflight.

## Current official pricing basis

The AWS Price List API and official pricing/service documentation were checked
on 2026-08-07:

- RDS PostgreSQL Single-AZ `db.t4g.micro`: USD 0.021 per running instance-hour
  or partial hour in Mumbai.
- RDS PostgreSQL gp3: USD 0.131/GB-month. The orderable minimum is 20 GiB, or
  about USD 2.62/month (about USD 0.00364/hour prorated) while running or
  stopped. Storage autoscaling will be disabled for the bounded lab.
- RDS backup storage exceeding the applicable free allocation: USD
  0.095/GB-month. Conservatively, a full additional 20 GB would be USD
  1.90/month, although the small lab's incremental backup usage should be much
  lower. Stopped instances retain billable storage/backups and automatically
  restart after seven consecutive stopped days.
- RDS PostgreSQL gp3 includes baseline I/O performance for this 20 GiB lab; no
  provisioned IOPS or extra storage throughput is planned. Standard data
  transfer can apply, but the planned ECS-to-RDS traffic stays inside one VPC
  and is intentionally tiny.
- Secrets Manager: USD 0.40/secret-month plus USD 0.05 per 10,000 API calls,
  prorated. Lambda-based rotation adds Lambda execution and possibly network
  costs; it is not part of today's scope.
- S3 Standard in Mumbai: USD 0.025/GB-month for the first 50 TB; USD 0.005 per
  1,000 PUT/COPY/POST/LIST requests; USD 0.004 per 10,000 GET and other Tier 2
  requests. DELETE and cancel requests are free. Internet ingress and
  same-Region S3-to-AWS-service transfer have no transfer charge; other
  transfer can be billed. Incomplete multipart data remains billable until
  completed or aborted, so the future bucket will use an abort lifecycle rule.
- No Fargate task, ALB, public IPv4, CloudWatch log group, NAT Gateway, or VPC
  endpoint is proposed for today's one-hour session. Each remains behind a
  fresh price review, time-box, cost cap, ledger update, and explicit approval
  if proposed later. The planned design does not require NAT or endpoints.

## One-hour session boundary — 2026-08-07

Today's target is limited to the preflight and three no-direct-charge controls:

1. DB subnet group `order-platform-phase5-db-subnet-group`, containing only the
   retained private A and private B subnets.
2. DB security group `order-platform-phase5-db-sg`, allowing inbound TCP/5432
   only from `order-platform-phase4-task-sg`, with no public CIDR ingress; add
   reciprocal task-group outbound TCP/5432 only to the new DB group because the
   retained task group currently allows outbound HTTPS only.
3. PostgreSQL 16 parameter group `order-platform-phase5-postgres16` with
   `rds.force_ssl=1` explicitly enforced.

These controls have USD 0 expected direct idle service cost. No RDS instance,
secret, S3 bucket/object, task, service, ALB, NAT, endpoint, public IPv4, ENI, or
log group is approved at this checkpoint. Traffic could incur charges only
after a workload is separately approved and created.

## Proposed later database configuration — not approved for creation

- PostgreSQL 16.14, Single-AZ, `db.t4g.micro`, 20 GiB gp3, storage autoscaling
  disabled, encrypted at rest with the AWS managed RDS key, not publicly
  accessible, and attached to the Phase 5 subnet/security/parameter controls.
- No Multi-AZ, read replica, Performance Insights paid tier, Database Insights
  Advanced mode, Enhanced Monitoring, log export, provisioned IOPS, public
  IPv4, RDS Proxy, or deletion protection for this disposable learning runtime.
- Automated backups and the exact retention/final-snapshot choice will follow
  the user-approved RTO/RPO decision before database creation.
- Database credentials will be generated and managed without appearing in Git,
  images, task-definition plaintext, logs, shell history, or user-facing
  messages. Application retrieval will be scoped to the intended workload role
  and secret only.

## Billable database gate — 2026-08-08

- A fresh read-only baseline verified the expected Identity Center caller and
  Mumbai (`ap-south-1`), budget actual spend of USD 0.144 against the USD 5
  monthly warning threshold, and zero RDS databases/clusters/snapshots,
  secrets, Phase 5 buckets, ECS services/tasks, ALBs/target groups, NAT/EIP,
  endpoints, VPC ENIs/public IPv4, or Phase 4/5 log groups. Billing is delayed
  and is not cleanup evidence.
- The retained private subnet group, reciprocal task-to-database security-group
  path, and PostgreSQL 16 parameter group with effective `rds.force_ssl=1`
  were re-verified before reuse.
- Current Mumbai Price List values remain USD 0.021/hour for Single-AZ
  `db.t4g.micro`, USD 0.131/GB-month for gp3 (20 GiB minimum = USD 2.62/month),
  and USD 0.095/GB-month for charged backup storage. Secrets Manager remains
  USD 0.40/secret-month plus USD 0.05 per 10,000 API calls.
- The proposed billable group is one private Single-AZ RDS PostgreSQL instance
  plus its RDS-managed master secret. The conservative active-session cap is
  USD 0.15 before tax for up to two running hours, excluding any separately
  approved restore exercise. No Fargate, ALB, public IPv4, NAT, endpoint, or
  CloudWatch runtime is included.
- If stopped after the lesson, compute billing stops but 20 GiB storage remains
  about USD 0.087/day (USD 2.62/month), charged backups remain usage-based, and
  the secret remains about USD 0.40/month. Stop and verify the DB at pause;
  review/delete or deliberately start-stop it no later than 2026-08-14, before
  RDS automatically restarts a continuously stopped instance after seven days.
- Deleting the database or its RDS-managed secret requires separate confirmation
  of data, restore, and final-snapshot intent. Cleanup verification must also
  prove temporary ECS/network/log runtime absent and re-audit retained Phase
  4/5 resources.

## Creation evidence — 2026-08-07

### RDS creation verification — 2026-08-08

- The user manually created `order-platform-phase5-postgres`. Its initial
  console estimate was USD 18.98/month for the instance plus USD 2.62/month
  for 20 GiB storage (USD 21.60/month before the managed secret, backup,
  monitoring, requests, transfer, and tax). Provisioning began in `creating`.
- Read-only verification confirmed PostgreSQL 16.14, Single-AZ, encrypted 20
  GiB gp3, no public accessibility, database `order_platform`, master username
  `order_admin`, the intended two-private-subnet group, only the intended DB
  security group, the intended PostgreSQL parameter group in sync, password
  authentication, and deletion protection off. All four project tags match.
- The RDS-owned managed secret is `creating` and has the four project tags plus
  AWS service tags. No secret value was requested or read.
- Five creation settings differ from the approved bounded configuration:
  `db.t3.micro` instead of `db.t4g.micro`; storage autoscaling enabled to 1,000
  GiB; seven-day instead of one-day backup retention; automatic minor upgrades
  enabled; and Performance Insights plus 60-second Enhanced Monitoring enabled.
  Correct these after the database becomes available rather than disrupting
  provisioning. The two-hour session remains under the USD 0.15 cap.
- Enhanced Monitoring created `rds-monitoring-role`, which trusts the RDS
  monitoring service. No `RDSOSMetrics` log group existed at the verification
  point. Disable Enhanced Monitoring, inventory/delete any resulting temporary
  log group, and delete or retain the role only after dependency verification.
- Follow-up verification after the user's manual modification found the class
  change to `db.t4g.micro` pending while status was `modifying`; storage
  autoscaling was disabled, backup retention reduced to one day, automatic
  minor upgrades disabled, and Enhanced Monitoring set to zero. The managed
  secret was active. Performance Insights remains enabled with exactly seven
  days retention, which is the free Standard tier and is useful for the later
  query exercise; Advanced mode and paid long-term retention are not enabled.
- The brief Enhanced Monitoring period created `RDSOSMetrics` with 30-day
  retention and zero stored bytes. Record it for deletion/absence verification
  at cleanup. The monitoring role remains referenced at this checkpoint and
  has no direct IAM charge; delete it only after confirming no DB dependency.
- Final post-modification verification found status `available`, no pending
  modifications, `db.t4g.micro`, autoscaling off, one-day backup retention,
  auto-minor upgrades off, Enhanced Monitoring off, and the private/encrypted
  subnet, SG, and parameter controls intact. The managed secret is active.
  AWS also reported an initial latest-restorable time. This is evidence that
  point-in-time recovery data exists, not evidence of Multi-AZ availability or
  of a completed restore; a separate controlled restore exercise remains due.

### Connection-pool design and local verification — 2026-08-08

- The existing shared `pg` pool used a fixed maximum of ten connections per
  process. Four API tasks could therefore reach 40 connections; adding two
  worker tasks could raise the application ceiling to 60 before deployment
  overlap, migrations, administration, or recovery sessions.
- `DATABASE_POOL_MAX` is now validated from 1–20 with a conservative default
  of five and is passed explicitly by both API and worker processes. At the
  learning scale target of four API tasks and two workers, the application
  ceiling is 30 connections, leaving headroom on the small RDS instance.
- Three configuration tests prove the default, a valid override, and rejection
  of zero, values above 20, fractions, and non-numeric input. Config, database,
  API, and worker type checks pass; the touched files pass formatting and
  whitespace checks.
- This proves the pool-budget design but not runtime connection behavior.
  Observe `pg_stat_activity` while task count changes or is safely simulated
  before satisfying the Phase 5 connection-scaling exit criterion.

### DB subnet group

- The user manually created `order-platform-phase5-db-subnet-group` in Mumbai.
- Read-only verification confirmed status `Complete`, the retained Phase 4 VPC,
  and exactly two members: private A (`10.40.10.0/24`, `ap-south-1a`) and
  private B (`10.40.11.0/24`, `ap-south-1b`). Automatic public IPv4 assignment
  remains disabled on both subnets.
- All five required tags were verified exactly, and zero RDS instances use the
  group. Direct idle service cost is USD 0.
- The group is retained for the next Phase 5 session with review on 2026-08-31
  and at the Phase 8/9 boundary.

### DB security group and task egress

- The user manually created `order-platform-phase5-db-sg` in the retained VPC.
- Read-only verification confirmed exactly one inbound TCP/5432 rule sourced
  from `order-platform-phase4-task-sg`; there is no IPv4 CIDR, IPv6 CIDR,
  prefix-list, or public ingress and no outbound rule.
- The exact five required tags were verified, and the group has zero attached
  ENIs. Direct idle service cost is USD 0.
- The user then added reciprocal outbound TCP/5432 from the retained task group
  only to the new DB group while preserving its existing outbound HTTPS rule.
- Read-only verification confirmed each SG reference exactly once, no extra
  task egress, no DB CIDR ingress or outbound rule, and zero ENIs attached to
  either group. The least-privilege ECS-to-RDS network path is complete and
  retained at USD 0 expected direct idle cost.

### Controlled parameter-group selection error

- The user created `order-platform-phase5-postgres16`, but read-only
  verification found family `aurora-postgresql16` rather than the intended
  RDS family `postgres16`. This explains why the expected RDS parameter was not
  visible in the intended context.
- Mumbai still has zero RDS instances and zero Aurora/RDS clusters, and no
  instance references the mistaken group. It has USD 0 direct service cost and
  is safe to delete before recreating the correct group with the same name.
- Cleanup remains pending until the mistaken group is deleted and its exact
  name is verified absent.
- Follow-up read-only verification returned `DBParameterGroupNotFound` for the
  exact name. Mistaken Aurora-group cleanup is `DELETED — VERIFIED`; the correct
  `postgres16` group is not yet created.

### Correct PostgreSQL 16 parameter group

- The user recreated `order-platform-phase5-postgres16`. Read-only verification
  confirmed the correct ordinary RDS family `postgres16`.
- `rds.force_ssl` is present at value `1`, is modifiable/dynamic, and is
  inherited from source `system`, matching the secure PostgreSQL 16 default.
  The user's same-value modify operation did not produce a redundant `user`
  source override. A later controlled non-TLS connection denial will be the
  decisive enforcement evidence after RDS exists.
- All five required tags were added and verified exactly. Zero RDS instances
  use the group. It is retained at USD 0 expected direct idle cost.

## Session close-out — 2026-08-07

- Today's planned no-direct-charge foundation is complete: the DB subnet group,
  paired ECS-to-RDS SG path, and PostgreSQL 16 parameter group are created,
  tagged, verified, ledgered, and retained.
- Final audit found zero RDS instances or clusters, manual snapshots, Phase 5
  secrets or S3 buckets, ECS services or running tasks, ALBs or target groups,
  VPC ENIs/public IPv4, endpoints, active/deleting NAT Gateways, Elastic IPs,
  and Phase 4/5 log groups.
- Phase 5 active runtime cleanup is `VERIFIED`; no billable Phase 5 runtime was
  created. Today's retained Phase 5 controls have USD 0 expected direct idle
  cost. The previously retained ECR image remains about USD 0.019/month.
- Overall account cleanup remains `PARTIAL` for the documented retained Phase
  4/5 foundation and the separate overdue inactive-root-key review, which was
  not inspected or modified.
- Phase 5 remains in progress. RDS, Secrets Manager, S3, application changes,
  workbook demonstrations, restore evidence, and final phase cleanup are not
  yet complete.

## Exact stop/delete/retention and verification procedures

### Today's no-direct-charge controls

1. If any control is incorrect, delete it only after confirming no RDS instance
   depends on it; verify it is absent by exact name.
2. If correct, retain it for the next Phase 5 session at USD 0 expected direct
   idle cost; re-verify tags, subnet membership, parameter value, DB-group
   inbound, and task-group outbound rules.
3. At pause, verify zero RDS instances/snapshots, Phase 5 secrets/buckets,
   running or pending ECS tasks/services, ALBs/target groups, NAT/EIP/endpoints,
   VPC ENIs/public IPv4, and Phase 5 log groups.
4. Review the retained controls on 2026-08-31 and at the Phase 8/9 boundary.
   Normally delete them before Terraform recreation unless an import exercise
   is explicitly approved.

### Later billable database/runtime

1. Stop all request generators and capture only non-secret evidence.
2. Scale/delete ECS services and stop standalone tasks; verify running,
   pending, deprovisioning, and stopping task inventories are empty and task
   ENIs/public IPv4 addresses are gone.
3. Delete any temporary ALB/listener/target group, NAT/EIP, endpoint, and
   unneeded log group; verify each dependency separately.
4. Stop RDS and wait for `stopped`. Record the stop time, storage/backup cost,
   and a review date before the automatic seven-day restart. Start it only for
   active work. Delete it instead only after the user confirms data/snapshot
   intent and dependencies.
5. Retain S3 data or Secrets Manager secrets only when a later phase genuinely
   needs them, with measured residual cost and review/delete date. Confirm
   incomplete multipart uploads and public-access state separately.
6. Re-audit the retained Phase 4/5 foundation and delayed billing. Record Phase
   5 runtime cleanup separately from overall `PARTIAL` account cleanup.

## Phase review (complete only at exit)

```text
Confidence (0-4):
Concurrency result:
Connection-scaling result:
Query-plan/index decision:
Migration compatibility reasoning:
RTO/RPO decision and restore evidence:
Secret retrieval/rotation result:
Presigned upload result:
Retained data and cost:
Phase 5 runtime cleanup status:
Overall cleanup status:
```
