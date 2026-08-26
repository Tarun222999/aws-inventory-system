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

### Workload-secret and temporary-task preparation — 2026-08-08

- The application now supports either the existing local `DATABASE_URL` or
  one startup retrieval identified by `DB_SECRET_ID`. The AWS SDK uses the ECS
  task-role credential provider; it requests only `GetSecretValue`, constructs
  the encoded PostgreSQL URL in process memory, and never logs or persists the
  secret. Malformed JSON, missing fields, an invalid port/name, or a non-
  PostgreSQL engine fails closed.
- The connection pool accepts an explicit CA bundle and uses Node TLS with
  certificate verification enabled. The backend image includes the official
  global RDS CA bundle; the AWS task will set its path explicitly while local
  Docker remains compatible with non-TLS local PostgreSQL.
- A bounded `phase5:lab` command is prepared to apply existing migrations,
  report TLS protocol/cipher, prove a non-TLS connection is denied, safely
  simulate one/two/four application-task pools via `pg_stat_activity`, run two
  concurrent final-item purchases, capture a parameterized SKU query plan,
  delete its test rows, close all pools, and exit. It sanitizes failures to
  error name/code and does not print endpoints, identities, or credentials.
- Six config/secret tests, all affected workspace type checks, formatting,
  whitespace checks, and the full repository linter pass. Docker Desktop was
  started and the narrowed backend image built successfully with the SDK, CA
  bundle, and lab command present. Its local uncompressed size is about 311 MB;
  the production-only dependency audit reports zero vulnerabilities. A first
  build exposed that the backend image unnecessarily installed the frontend
  workspace and inherited its advisories; the Dockerfile now installs only the
  API, worker, shared backend packages, and required root runtime tooling.
- The planned runtime group is one temporary ECR image, a no-cost task-
  definition revision, an exact task-role secret permission, a one-day log
  group, and at most two sequential ten-minute Fargate/public-IPv4 tasks. No
  service, ALB, NAT, endpoint, or inbound task rule is included. Its incremental
  pre-tax cap is USD 0.10; the combined RDS-plus-runtime session cap is USD
  0.25. Creation still requires a final immediate explicit approval.
- Immediate pre-creation refresh verified the expected Identity Center caller
  and Mumbai, budget actual USD 0.144 of USD 5, one private/available
  `db.t4g.micro`, one retained ECR image, and zero ECS services/tasks, ALBs,
  target groups, NATs, EIPs, endpoints, public IPv4 associations, or Phase 5
  lab log groups. The retained task role still has zero inline or attached
  policies. No account identifier or secret value was recorded.

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

## Session pause and verified cleanup — 2026-08-08

- The user chose to pause deployment and return to concept-first learning.
  The proposed Phase 5 image push, task-definition revision, task-role secret
  permission, lab log group, and two Fargate tasks were not approved or
  created. The locally built image and uncommitted source changes remain only
  on the workstation and have no AWS charge.
- RDS was stopped and AWS eventually reported `stopped`. Instance-hour billing
  is now USD 0. AWS reports automatic restart at 2026-08-15 17:42 IST; review,
  delete, or deliberately start-stop it no later than 2026-08-14.
- Retained RDS residuals are 20 GiB gp3 at about USD 2.62/month, the active
  managed secret at about USD 0.40/month plus tiny API-call usage, and backup
  storage above any applicable allocation at USD 0.095/GB-month. A conservative
  full additional 20 GB of charged backup would be USD 1.90/month. The prior
  healthy ECR image remains about USD 0.019/month. Thus known base residual is
  about USD 3.039/month, or conservatively up to about USD 4.939/month if the
  full 20 GB backup amount were separately charged, before tax. Billing is
  delayed and the USD 5 budget is a warning rather than a cap.
- The accidentally created `RDSOSMetrics` group had zero stored bytes and was
  deleted after all DB monitoring intervals were verified zero. Its IAM role
  had only the standard Enhanced Monitoring managed policy; that policy was
  detached, the role deleted, and exact absence verified.
- Final inventory verified zero ECS services/running/pending tasks, ALBs,
  target groups, NAT Gateways, EIPs, VPC endpoints, public IPv4 associations,
  Phase 4/5 or Enhanced Monitoring log groups, Phase 5 S3 buckets, manual RDS
  snapshots, and task-role policies. Exactly one retained ECR image remains.
  One expected private `RDSNetworkInterface` remains attached to the stopped
  private database and has no public address.
- Phase 5 active-runtime cleanup is `VERIFIED`. Overall cleanup is `PARTIAL`
  because the stopped RDS storage/backups/secret and documented Phase 4/5
  foundation are intentionally retained, and because the separate overdue
  inactive-root-key review remains untouched.

## Resume preflight and proposed workload-role lab — 2026-08-10

- The expected Identity Center caller and Mumbai (`ap-south-1`) were verified
  without recording the account identifier. The budget showed USD 0.364 actual
  against the USD 5 warning threshold at its latest update; billing is delayed
  and this is not a cap or cleanup evidence.
- RDS remains stopped, private, Single-AZ, and scheduled for automatic restart
  on 2026-08-15 at 17:42 IST. The ECS cluster has zero services and zero
  running/pending tasks. The task role still has zero policies. There are zero
  ALBs, target groups, NAT Gateways, EIPs, VPC endpoints, public IPv4
  associations, or relevant log groups. One private RDS ENI and the one retained
  Phase 4 ECR image remain as expected.
- Official pricing was refreshed through AWS documentation and the AWS Price
  List API: RDS `db.t4g.micro` USD 0.021/running hour; Fargate Linux/x86 USD
  0.04256/vCPU-hour plus USD 0.004655/GB-hour; public IPv4 USD 0.005/hour; ECR
  USD 0.10/GB-month; CloudWatch Logs Standard ingestion USD 0.67/GB and storage
  USD 0.03/GB-month; Secrets Manager USD 0.40/secret-month plus USD 0.05 per
  10,000 calls.
- The proposed 60-minute group starts the retained RDS instance, pushes one
  Phase 5 image, creates a one-day log group and task-definition revision, and
  runs at most two sequential ten-minute 0.25-vCPU/0.5-GB tasks. The first task
  proves `AccessDenied` with the permissionless task role; the second uses only
  exact-secret `GetSecretValue` and runs the TLS, connection-count, concurrency,
  and query-plan lab. No service, ALB, NAT, endpoint, or S3 resource is included.
- Expected time-boxed compute/public-IPv4 cost is about USD 0.027 before tiny
  secret calls, ECR storage, and bounded logs. The conservative incremental cap
  is USD 0.10 before tax. The user explicitly approved this complete group and
  its 60-minute RDS running limit on 2026-08-10; no resource had been started or
  created at the approval-record checkpoint.
- Cleanup must stop tasks, remove their ENIs/public IPv4, stop and verify RDS,
  delete the lab log group, remove the task-role policy, reconcile ECR to one
  separately confirmed healthy retained image, and repeat the zero-runtime
  inventory. The stopped-database review date must be reset before AWS's next
  automatic seven-day restart.

## Exact stop/delete/retention and verification procedures

## Controlled workload-role denial evidence — 2026-08-10

- Task definition revision 2 was manually created and sanitized verification
  confirmed the intended Fargate sizing/platform, existing execution and task
  roles, immutable Phase 5 image tag, lab command, exact managed-secret name
  reference, no plaintext or injected credential, no port mapping, exact log
  settings, and required tags. Revision 1 contains configuration errors and
  was not run.
- The original RDS 60-minute running limit expired during manual preparation.
  The overrun was detected from the RDS start event, stop was requested
  immediately, and AWS later verified `stopped`. The new automatic restart is
  2026-08-17 at 20:04 IST; review/delete or deliberately start-stop no later
  than 2026-08-16. The cost cap was not exhausted, but the time-box boundary was
  enforced rather than silently extended.
- Under a separate explicit USD 0.01 extension, one permissionless-task-role
  Fargate task ran from 20:08:24 to 20:09:03 IST. ECS execution-role duties
  succeeded: the immutable image was pulled, the container started, and logs
  arrived. The application then reached Secrets Manager using the task role
  and produced one sanitized `AccessDeniedException`, proving network
  reachability, workload identity, IAM default deny, and that knowledge of the
  secret name alone grants no access.
- The essential container exited with code 1 as designed. Verification found
  zero running/pending tasks, zero task ENIs, and zero public IPv4 associations;
  only the expected private stopped-RDS ENI remains. RDS is stopped. After the
  user inspected the evidence, the one-day lab log group and temporary Phase 5
  image were deleted and exact absence was verified. The repository contains
  exactly the one prior healthy Phase 4 image, and the task role still has zero
  inline or attached policies.
- Session active-runtime cleanup is `VERIFIED`. Overall cleanup is `PARTIAL`
  for the intentionally retained stopped RDS storage/backups/managed secret,
  documented Phase 4/5 foundation, and separate untouched overdue inactive-
  root-key review. Budget actual remained USD 0.364 at its delayed update; the
  session is estimated below USD 0.04 before tax and below the combined USD
  0.11 approved caps. Review RDS no later than 2026-08-16 before its automatic
  restart on 2026-08-17 at 20:04 IST.

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

## Successful database-lab preflight — 2026-08-11

- The expected Identity Center caller and Mumbai Region were re-verified without
  recording the account identifier. Budget actual was USD 0.517 against the USD
  5 warning threshold at its latest delayed update.
- RDS is stopped/private/Single-AZ with automatic restart on 2026-08-17 at
  20:04 IST. The managed secret is active. ECS has zero services and zero
  running/pending tasks; the task role has zero policies. There are zero ALBs,
  target groups, NAT Gateways, EIPs, endpoints, task ENIs/public IPv4, relevant
  logs, or Phase 5 buckets. One expected private RDS ENI and one prior healthy
  ECR image remain.
- Current Mumbai rates were refreshed from official AWS documentation and the
  Price List API. The proposed group prepares image/log/IAM controls while RDS
  stays stopped, then permits at most 75 running RDS minutes and one ten-minute
  0.25-vCPU/0.5-GB task. Expected incremental usage is below USD 0.04 and the
  conservative pre-tax cap is USD 0.07.
- The one task is designed to prove exact-secret task-role access, verified TLS
  and non-TLS denial, connection scaling, final-item concurrency, query-plan
  evidence, and test-row cleanup. No service, ALB, NAT, endpoint, S3, restore,
  rotation Lambda, or Phase 6+ service belongs to this group. The user
  explicitly approved the USD 0.07 cap, 75-minute RDS limit, and one ten-minute
  task on 2026-08-11; no resource had been created or started at the approval-
  record checkpoint.
- The user manually authenticated Docker to ECR with a temporary token and
  re-uploaded the locally verified immutable `phase5-lab-20260810` image.
  Read-only verification found the expected digest prefix, 111 MB compressed
  size, and two temporary repository images. RDS remained stopped.
- The user manually recreated the one-day Standard lab log group; exact name,
  retention, tags, and zero stored bytes were verified. The user then created
  one inline policy on the application task role. Sanitized verification found
  exactly one Allow statement, only `secretsmanager:GetSecretValue`, and the
  exact RDS-managed secret with no wildcard. The execution role remains limited
  to its standard ECS execution policy. RDS was still stopped after all non-RDS
  preparation completed.
- The user then manually started RDS. AWS verified it private and `available`
  at 23:13:04 IST. The approved 75-minute available-state deadline is
  2026-08-12 at 00:28:04 IST; stop immediately after the single lab task rather
  than consuming the full time box.
- Revision 2 ran from 23:18:29 to 23:19:06 IST and exited 1. CloudTrail proved
  the task role's exact `GetSecretValue` call succeeded, completing the
  workload-role-only retrieval evidence. No stable RDS connection was observed,
  and the final sanitizer exposed only generic `Error`. A local diagnostic
  change now records only a safe stage and error/cause name/code. Type-check,
  unit tests, formatting, and whitespace checks passed; integration tests were
  not pointed at live RDS. One replacement-image/revision/task group remains
  pending a separate explicit USD 0.02 approval; the RDS deadline is unchanged.
- The approved diagnostic rerun used corrected task-definition revision 4;
  revision 3 was never run because read-only comparison caught an unintended
  container-name change. Revision 4 ran from 00:05:15 to 00:05:52 IST and
  exited at the safe `resolve-database-secret` stage. CloudTrail again proved
  successful workload-role `GetSecretValue` at 00:05:27 with no AWS error.
- Official AWS guidance and the controlled failure established the mismatch:
  the RDS-managed secret supplies `username` and `password`, while the local
  code incorrectly required `host`, `port`, and `engine` in the same JSON.
  Without retrieving the secret value, the code was corrected to accept
  `DB_HOST`/`DB_PORT` as non-secret deployment configuration and keep only
  credentials in Secrets Manager. Six config tests and config type-check pass.
- A separate proposed rerun gate permits at most 30 additional RDS minutes from
  00:10:16 IST (hard stop 00:40:16), one corrected image/revision, and one
  ten-minute task, with a conservative incremental pre-tax cap of USD 0.03.
  The user explicitly approved this complete gate after the ledger update.
- The corrected image and task-definition revision 5 were verified before use:
  only the intended image and non-secret `DB_HOST`/`DB_PORT` settings changed,
  both topology values matched live RDS, and all other roles, command, logging,
  environment values, resources, and tags matched the prior revision.
- Revision 5 ran from 00:28:46 to 00:29:24 IST and exited 0. Evidence proved
  migrations applied; TLS 1.3 with `TLS_AES_256_GCM_SHA384`; controlled non-TLS
  rejection with PostgreSQL code `28000`; observed connections 1/2/4 for safely
  simulated task counts 1/2/4 with pool ceilings 5/10/20; exactly one successful
  order and one insufficient-stock failure for the final item with quantity 0;
  an `Index Scan` using `products_sku_unique` (one actual row, 0.035 ms execution
  in this tiny lab); and deletion of all test rows.
- The RDS stop request was accepted at 00:40:02 IST, 14 seconds before the
  approved 00:40:16 hard deadline. At 00:41 it remained `stopping`; zero
  running/pending tasks and absence of the task ENI/public IPv4 were verified.
  The zero-byte lab log group, two-image ECR retention decision, exact-secret
  task-role policy, final `stopped` state, and full retained-foundation audit
  remain cleanup-pending and must not be treated as complete yet.
- The user deleted the zero-byte Phase 5 lab log group after evidence capture;
  exact absence was verified at 00:44:59 IST. Delayed ingestion usage may
  still appear, but there is no remaining log-storage resource.
- With separate confirmation, the user deleted only the older Phase 4 image.
  Read-only verification found exactly one repository image: the corrected
  111-MB Phase 5 image used by the successful lab. It is retained as the new
  known-good baseline at about USD 0.0111/month, with review on 2026-08-31 and
  at the Phase 8/9 boundary.
- Resume verification on 2026-08-12 found RDS fully `stopped`, private, and
  Single-AZ, with automatic restart scheduled for 2026-08-19 at 00:48 IST;
  review, delete, or deliberately start-stop it no later than 2026-08-18.
  The expected Identity Center role and Mumbai Region were verified, with zero
  running/pending ECS tasks, no lab log group, and exactly the corrected Phase
  5 image retained.

```text
Confidence (0-4): 3 — can explain and demonstrate independently; repeat the
  production trade-off analysis before claiming level 4.
Concurrency result: Two concurrent HTTP orders raced for quantity one. Exactly
  one returned 201, one returned 409, and final available quantity was zero.
  The transaction, deterministic SELECT FOR UPDATE locking, stock recheck, and
  non-negative constraint prevented overselling.
Connection-scaling result: Safe simulations observed 1/2/4 database sessions
  for 1/2/4 application instances. With pool max 5, the corresponding ceilings
  are 5/10/20; four API plus two worker tasks budget 30 connections rather than
  the previous 60, leaving deployment/administrative headroom.
Query-plan/index decision: EXPLAIN ANALYZE used products_sku_unique through an
  Index Scan for the representative parameterized SKU lookup. Keep the existing
  unique index; the tiny data set does not justify another index.
Migration compatibility reasoning: Expand with a nullable new column, deploy
  dual-read/dual-write compatibility, backfill and validate separately, then
  contract only after old tasks and the rollback window are gone. The old app
  failed only after the deliberate contract step.
RTO/RPO decision and restore evidence: Learning RTO 60 minutes and RPO 5
  minutes. A private PITR target became available in about 13.5 minutes, passed
  TLS/schema/workload-role checks, and was deleted without a final snapshot.
Secret retrieval/rotation result: Only the workload task role retrieved the
  exact managed secret. TLS 1.3 succeeded, non-TLS failed, old credentials
  failed after rotation, and a fresh AWSCURRENT retrieval reconnected without
  exposing values.
Presigned upload result: A private bucket denied unsigned PUT/GET, accepted a
  checksum/type/If-None-Match-bound signed PUT, rejected overwrite replay, and
  served a signed GET. The real local UI then completed upload, confirmation,
  short-lived download, and image rendering without public bucket access.
Retained data and cost: Stopped 20-GiB RDS storage about USD 2.62/month; one
  managed secret about USD 0.40/month; one 119,883,392-byte ECR image about USD
  0.012/month; one 29,792-byte S3 image about USD 0.00000075/month; backup
  excess, requests, transfer, and tax remain variable. Review RDS by 2026-08-23
  before automatic restart on 2026-08-24 23:46 IST; review all retained Phase
  4/5 resources by 2026-08-31 and the Phase 8/9 boundary.
Phase 5 runtime cleanup status: VERIFIED — zero services/tasks, ALB/listener/
  target group, task or ALB public ENIs/IPv4s, NAT/EIP/endpoints, temporary
  CORS, incomplete multipart uploads, or Phase 5 log groups; RDS is stopped.
Overall cleanup status: PARTIAL — the documented Phase 4/5 foundation, stopped
  RDS/storage/backups/managed secret, scoped task permissions, one clean ECR
  image, private bucket, and one product image remain intentionally retained.
  The separate overdue inactive-root-key review was not inspected or modified.
```

## Backward-compatible migration demonstration — 2026-08-12

- A disposable local PostgreSQL 16.4 container on loopback port 55432 was used;
  no AWS resource or project database was started or modified. The lab
  container and its anonymous data volume were removed afterward, and exact
  container absence was verified.
- The scenario migrated `products.price_paise` to `unit_price_paise` using the
  expand/backfill/contract pattern. The expanded schema kept the old column and
  added the new column as nullable, so the old reader and old writer continued
  to work during a simulated rolling deployment.
- Existing rows were backfilled. A new compatible reader used
  `COALESCE(unit_price_paise, price_paise)`, allowing it to read both migrated
  rows and a row concurrently created by old code. New-code dual writes kept a
  newly inserted row readable by old code and therefore rollback-compatible.
- A final backfill reported zero null or mismatched rows. The new column was
  validated with a separately validated `NOT VALID` check before `SET NOT
  NULL`, illustrating how validation work can be separated on a large table.
- The contract step dropped `price_paise` only after assuming old tasks were
  gone and the rollback window had closed. The old query then failed with the
  expected missing-column error, while the new query returned all three rows.
  This controlled failure proves the contract migration must be a later
  deployment rather than part of the initial expand release.
- Result: old app + expanded schema worked; new app + expanded schema worked;
  old app + contracted schema failed as designed; new app + contracted schema
  worked. No permanent repository migration was created because this was a
  learning scenario rather than an approved product-schema change.

## Proposed point-in-time restore evidence — 2026-08-13

- The expected Identity Center role and Mumbai Region were verified without
  recording the account identifier. Budget actual was USD 0.667 of the USD 5
  warning threshold at its latest delayed update.
- The source remains stopped/private/encrypted/Single-AZ with 20 GiB gp3 and an
  active one-day automated backup. It reports a latest restorable point from
  the successful database lab. The restore target name is unused; there is one
  source DB, zero manual snapshots, zero ECS tasks, no restore log group, one
  corrected image, one exact-source-secret policy, and no ALB, active NAT, EIP,
  or endpoint.
- The proposed evidence restores one temporary private Single-AZ db.t4g.micro
  to Latest restorable time, measures request-to-available time, runs one
  ten-minute workload-role verification task, and deletes the target without a
  final snapshot or retained automated backups. The source stays stopped.
- A 90-minute target lifetime plus one task and bounded logs is conservatively
  capped at USD 0.08 before tax. Target deletion is required immediately after
  evidence and no later than 90 minutes after the restore request. The user
  explicitly approved this complete gate before any restore resource existed.
- The user created the PITR target using Latest restorable time at 00:21:39 IST.
  Read-only verification found the intended private encrypted Single-AZ
  `db.t4g.micro`, 20 GiB gp3 with autoscaling off, zero-day backups, deletion
  protection and Enhanced Monitoring off, exact subnet/security/parameter
  groups, and required tags. The source remained stopped. The target became
  available by 00:35:08 IST, approximately 13.5 minutes after the restore
  request and within the proposed 60-minute RTO. Hard delete-request deadline
  remains 01:51:39 IST.
- Revision 6 changed only the restored endpoint and isolated restore log group.
  One task started at 00:50:36 IST and exited 0 in under one minute. It proved
  existing exact-secret credentials authenticated to the restored PostgreSQL
  copy, migrations/schema were usable, TLS 1.3 succeeded, non-TLS was rejected,
  connection simulations and final-item concurrency passed, the SKU index was
  used, and test rows were deleted.
- Target deletion without final snapshot or retained automated backups was
  requested about 33.4 minutes after restore request. Exact target absence was
  verified at 00:55:58 IST. Zero target backup, snapshot, or target-named secret
  remains; task ENI/public IPv4 and all running/pending tasks are absent. The
  isolated restore log group was deleted and exact absence verified.
- Measured PITR request-to-available time was approximately 13.5 minutes,
  meeting the learning RTO of 60 minutes. The chosen learning RPO remains five
  minutes, consistent with RDS transaction-log upload behavior but not a hard
  guarantee for every individual incident; the actual latest restorable time
  must always be checked during recovery.
- Restore active-runtime cleanup is `VERIFIED`. Overall cleanup is `PARTIAL`
  for the intentionally stopped source storage/backups/managed secret, exact-
  secret policy, one corrected image, retained network/ECS foundation, and the
  separate untouched overdue inactive-root-key review. Delayed restore usage
  may appear; the exercise is expected below USD 0.03 and its USD 0.08 cap.

## RDS-managed credential rotation and recovery — 2026-08-16

- A version-aware secret loader requests only the `AWSCURRENT` stage through
  the ECS task role. The rotation lab records the initial version only in
  memory, verifies an initial TLS connection, closes that pool, and polls at a
  bounded five-second interval without logging credential or version values.
- Task-definition revision 7 provided a useful pre-launch controlled failure:
  it accidentally inherited revision 6's deleted restore endpoint. Read-only
  comparison caught the mismatch. Revision 8 was explicitly based on the
  known-good source revision 5 and verified for image, command, roles,
  non-secret DB topology, TLS CA path, timing, logging, sizing, and tags before
  launch.
- Revision 8 started at 00:39:30 IST. It authenticated with the old current
  credential and confirmed certificate-validated TLS 1.3, then logged only the
  sanitized awaiting state. An initial immediate-rotation request returned the
  safe overlapping-rotation error; it was not assumed successful. Managed
  rotation completed at 00:46:47 IST and the task detected the version change.
- A new physical connection using the old credential retained only in process
  memory failed as intended with PostgreSQL code `28P01`. The task then used
  the new `AWSCURRENT` credential, created a fresh pool, reconnected over TLS
  1.3, and exited 0 at 00:47:16 IST. Recovery required neither a task restart
  nor task-definition change. No password, secret value, endpoint, ARN,
  account identifier, or version identifier was logged.
- This demonstrates application recovery from single-user managed rotation,
  not zero-downtime production rotation. Existing authenticated connections
  may survive a password change, while new connections using cached old
  credentials fail. A production application should use a least-privileged
  application DB user, deliberate caching/refresh behavior, retry with
  backoff, and consider alternating-user rotation when connection continuity
  requirements justify it.
- RDS was started at 00:32:36, became available at 00:36:44, and reached
  `stopped` at 01:02:05 IST, well before the approved 60-minute limit. Its new
  automatic restart is 2026-08-23 01:02 IST, so review/start-stop/delete it by
  2026-08-22. Revision 8 ran about 7.8 minutes; zero tasks/services and task
  ENI/public IPv4 absence were verified afterward.
- The temporary zero-byte rotation log group was deleted and verified absent.
  With separate explicit confirmation, the superseded Phase 5 image was
  deleted; exactly one successful 116,359,328-byte rotation image remains at
  about USD 0.0116/month. No ALB/target group, NAT/EIP, endpoint, public ENI,
  restore DB, Phase 5 log group, or Phase 5 bucket remains.
- Expected incremental rotation cost is below USD 0.02 and the approved USD
  0.06 cap; delayed usage may still appear. Rotation active-runtime cleanup is
  `VERIFIED`. Overall cleanup remains `PARTIAL` for the stopped DB
  storage/backups/managed secret, exact-secret policy, one ECR image, retained
  foundation, and separately untouched overdue inactive-root-key review.

## Dedicated migration runner — 2026-08-16

- Migration execution was separated from API startup. The dedicated
  `migrate:run` task checked out one PostgreSQL session, verified TLS, acquired
  a session-level advisory lock, applied only pending Drizzle migrations, and
  verified the latest journal target before releasing the lock and exiting.
- Revision 11 inherited the known-good private DB/TLS/secret configuration and
  changed only to the clean integrated image, migration command, and isolated
  log destination. It reported TLS 1.3, applied through
  `0003_panoramic_moon_knight`, verified the journal, and exited 0.
- The advisory lock serializes migration runners; transactional migrations
  preserve per-migration atomicity. A deployment should run this bounded job
  before replacing API tasks rather than allowing every API replica to race
  migrations during startup.
- The migration task, ENI, public IPv4, RDS compute, and migration log group
  were removed/stopped and verified. Superseded ECR images were deleted after
  separate exact approval, leaving one clean integrated image.

## Private S3 and real application integration — 2026-08-16 to 2026-08-18

- The private product-image bucket uses bucket-owner-enforced ownership,
  SSE-S3, all four Block Public Access controls, and no public bucket policy.
  The task role is limited to Get/Put/Delete on the exact `products/*` object
  prefix and cannot list or administer the bucket.
- A controlled proof demonstrated unsigned PUT 403, signed PUT 200, replay
  overwrite 412, unsigned GET 403, and signed GET 200 with matching bytes/type.
  No presigned URL, object key, account identifier, endpoint, or credential was
  written to the retained evidence.
- The real frontend obtains an upload grant from the API, uploads bytes directly
  to S3 with the required content type, checksum, and `If-None-Match`, then asks
  the API to confirm object size/type/checksum before storing metadata. A failed
  confirmation is retryable without uploading a second object. Download grants
  are short-lived bearer URLs; expiry requires the client to request a new one.
- Temporary CORS allowed only the local development origin and required methods
  and headers. It was removed after the browser demonstration. CORS never
  replaced IAM/signature authorization.
- Revision 14 exposed two controlled deployment failures before traffic:
  selecting the ALB security group on the task broke the intended SG chain, and
  binding the API to `127.0.0.1` made it unreachable through the task ENI. Both
  tasks were stopped and their ENIs/public IPv4s verified absent. Revision 15
  used only the task security group and `API_HOST=0.0.0.0`.
- Revision 15 became a healthy IP target. Requests through the ALB returned 200
  for `/health` and database-backed `/ready`; product create/list worked; the
  local UI uploaded, confirmed, downloaded, and rendered an image. Two
  concurrently released HTTP orders for a stock-one product returned 201 and
  409, with final inventory zero.
- Frontend hosting, HTTPS/custom DNS, and automatic ECS-service target
  registration remain Phase 8 work. This Phase 5 lab used a local frontend and
  manually registered one standalone task private IP so the underlying target
  mechanism stayed visible.

## Final retained-resource and cleanup audit — 2026-08-18

- Expected Identity Center access and Mumbai were re-verified without recording
  the account identifier. The final VPC audit found one expected private
  stopped-RDS ENI and zero public IPv4 associations, NAT Gateways, Elastic IPs,
  or VPC endpoints.
- ECS is empty: zero services, running tasks, pending tasks, container instances,
  task ENIs, or task public IPv4s. There are zero order-platform ALBs, listeners,
  or target groups and zero Phase 5 log groups.
- RDS is stopped, private, encrypted, Single-AZ PostgreSQL 16.14 on
  `db.t4g.micro` with 20 GiB gp3 and one-day backup retention. Its parameter
  group is in sync, managed secret is active with rotation enabled, and there
  are zero Phase 5 manual snapshots or Aurora clusters. Automatic restart is
  2026-08-24 23:46 IST; review/start-stop/delete by 2026-08-23.
- The task role has exactly the intended secret retrieval plus S3 object actions
  and no wildcard resource. The private bucket has no CORS or bucket policy,
  all public-access blocks enabled, one approved 29,792-byte image, and zero
  incomplete multipart uploads. Review/delete it by 2026-08-31 or the Phase 8/9
  boundary.
- ECR contains exactly one 119,883,392-byte image with a completed Basic scan
  and zero Critical/High/Medium/Low findings. The stopped DB storage, active
  secret, clean image, and one S3 object have an estimated fixed residual of
  about USD 3.032001/month before backup excess, requests, transfer, and tax.
- Temporary task/ALB/RDS runtime exceeded one intermediate target time after
  two corrected task launches and a listener-only deletion was caught. Final
  deletion/stop was nevertheless verified directly. Delayed ALB/LCU/public-
  IPv4, Fargate, RDS, log-ingestion, request, transfer, and tax charges may
  still appear; the USD 5 budget is delayed and was never treated as a cap.
- Phase 5 is `COMPLETE` at confidence 3. Phase 5 disposable-runtime cleanup is
  `VERIFIED`; overall account cleanup is `PARTIAL` for the intentional retained
  foundation/data and the separate overdue inactive-root-key review, which was
  not inspected, exposed, modified, or deleted.
