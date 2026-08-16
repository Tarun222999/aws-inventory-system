# AWS Learning Project — Cost Safety Checklist

This checklist is mandatory for every hands-on AWS session. A session is not
complete until cleanup has been performed and verified.

## Safety rules

1. Use only the agreed AWS account and Region (`ap-south-1`, Mumbai, unless the
   lesson explicitly says otherwise).
2. Never create a paid resource without first identifying how it is billed and
   how it will be stopped or deleted.
3. Tag every supported resource:
   - `Project=aws-order-platform`
   - `Environment=learning`
   - `Owner=<your-name>`
   - `AutoCleanup=false` (until automation is deliberately introduced)
4. Do not leave a cost-sensitive resource running merely because a lesson did
   not work.
5. Budget alerts are warnings, not spending caps. Cleanup must still be
   performed and verified.
6. Never assume that closing the browser, signing out, or stopping an
   application stops AWS billing.

## Before the first deployment

- [ ] Root account MFA is enabled.
- [ ] Daily work uses an administrative identity, not the root user.
- [ ] Free Tier/credit balance and expiration have been recorded.
- [ ] Billing access is available to the working identity.
- [ ] A monthly cost budget is configured.
- [ ] Budget notifications go to an email address that is actively monitored.
- [ ] Free Tier usage alerts are enabled where applicable.
- [ ] The default working Region is confirmed as Mumbai (`ap-south-1`).
- [ ] No unexplained resources already exist in the account.

Suggested initial budget alerts:

| Threshold | Meaning                                           |
| --------- | ------------------------------------------------- |
| 25%       | Early warning; review the bill                    |
| 50%       | Review every active resource                      |
| 75%       | Do not create new paid resources until reviewed   |
| 100%      | Stop the lesson and perform the emergency cleanup |

The budget amount will be chosen after we inspect the account's credits and
existing usage.

## Retained-foundation policy

From Phase 4 through Phase 8, use a middle-ground lifecycle instead of deleting
and rebuilding every resource after every phase.

### Eligible to retain when the next phase needs them

- Dedicated learning VPC, subnets, route tables, and Internet Gateway
- Empty ECS cluster and task definitions
- Least-privilege task/execution roles and reusable security groups
- One known-good versioned ECR image and its repository
- Low-usage S3/queue/secret state genuinely needed by the next phase
- A stopped RDS instance between closely spaced sessions, only with storage and
  backup cost plus its automatic seven-day restart deadline recorded

### Remove after every active session

- Running ECS/Fargate tasks and temporary services
- Application/Network Load Balancers, listeners, and target groups
- NAT Gateways and their Elastic IP addresses
- Unneeded public IPv4 addresses, endpoints, ENIs, and test artifacts
- Unneeded log ingestion, temporary images, failed revisions, and disposable
  state

Every retained resource must be tagged, listed in the resource ledger and
retained-resource record, assigned an expected residual cost and review/delete
date, and re-verified during close-out. Retention changes overall account
cleanup to `PARTIAL` even when the active phase runtime cleanup is `VERIFIED`.
At the Phase 8/9 boundary, delete the manually created foundation before
Terraform recreation unless an explicit import exercise is approved.

## Resource ledger

Update this table whenever a resource is created, even if it is expected to
exist for only a few minutes.

| Resource                                                  | Name/ID                                                         | Region                                        | Idle charge?                                                                     | End-of-session action                                                                       | Status               |
| --------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------- |
| Example: EC2 instance                                     | `learning-web-01`                                               | `ap-south-1`                                  | Disk remains billable when stopped                                               | Terminate after exercise                                                                    | Deleted/verified     |
| IAM Identity Center organization instance                 | Account identity foundation (identifier intentionally omitted)  | `ap-south-1`                                  | No direct or idle service charge                                                 | Retain for daily federated access; review at final teardown                                 | RETAINED — JUSTIFIED |
| IAM Identity Center user                                  | Daily learning administrator (identifier intentionally omitted) | Global identity / primary Region `ap-south-1` | No direct or idle service charge                                                 | Retain for daily learning administration; review at final teardown                          | RETAINED — JUSTIFIED |
| IAM Identity Center permission set and account assignment | `AdministratorAccess` for daily learning administrator          | Global identity / primary Region `ap-south-1` | No direct or idle service charge                                                 | Retain for learning administration; reduce privilege as project roles mature                | RETAINED — JUSTIFIED |
| AWS monthly cost budget                                   | `aws-order-platform-monthly-cost`                               | Global billing service                        | Monitoring and email notifications are free; no actions or reports intended      | Retain with USD 5 monthly limit and 25/50/75/100% alerts                                    | RETAINED — JUSTIFIED |
| Legacy IAM user                                           | Identifier intentionally omitted                                | Global IAM service                            | No direct or idle service charge; password-only access was a security risk       | Login profile removed, policies detached, and user deleted; IAM user count verified as zero | DELETED — VERIFIED   |
| Root access keys (2)                                      | Identifiers intentionally omitted                               | Global account credentials                    | No direct or idle service charge; inactive credentials remain a security concern | Both inactive; verify no dependency and delete by 2026-07-28                                | RETAINED — JUSTIFIED |
| Phase 2 EC2 instance                                     | `i-06b61c413fadf9be0` (`order-platform-phase2-ec2`)               | `ap-south-1`                                  | No residual charge after verified termination                                       | Terminated; public IPv4, ENI, and SSM state verified absent                                  | DELETED — VERIFIED |
| Phase 2 EBS root volume                                  | `vol-031abb9d1193c2d52`                                          | `ap-south-1`                                  | No residual charge after verified deletion                                          | Deleted through `DeleteOnTermination`; volume and owned snapshots verified absent            | DELETED — VERIFIED |
| Phase 2 security group                                   | `order-platform-phase2-sg` (`sg-0e6b30eac97af101d`)              | `ap-south-1`                                  | No residual charge                                                                   | Deleted after ENI removal; absence verified; default security group retained                 | DELETED — VERIFIED |
| Phase 2 IAM role and instance profile                    | `order-platform-phase2-ec2-role`                                | Global IAM service                            | No residual charge                                                                   | Role, policies, and instance profile deleted and verified absent                             | DELETED — VERIFIED |
| Phase 2 CloudWatch log group                             | `/aws/order-platform/phase2/api`                                | `ap-south-1`                                  | No residual charge after verified deletion                                          | Deleted after evidence capture; Phase 2 prefix verified absent                               | DELETED — VERIFIED |
| Phase 3 custom VPC                                      | `order-platform-phase3-vpc` (`vpc-093de7534f39d3432`)            | `ap-south-1`                                  | No residual charge after verified deletion                                          | Dependencies removed; VPC and its automatic main route table/default SG/default NACL verified absent | DELETED — VERIFIED |
| Phase 3 subnets                                         | Public A `subnet-0b54d72001042648a`; Public B `subnet-02fad5e68f8003c27`; Private A `subnet-0d1369a591af84326`; Private B `subnet-080f85a707b9ca167` | `ap-south-1a` / `ap-south-1b` | No residual charge | All four deleted after probe termination; direct ID and VPC inventory checks verified absence | DELETED — VERIFIED |
| Phase 3 Internet Gateway                                | `order-platform-phase3-igw` (`igw-05038a8b1b3c78a43`)           | Formerly attached in `ap-south-1`             | No residual charge                                                                  | Detached, deleted, and verified absent before VPC deletion                              | DELETED — VERIFIED |
| Phase 3 custom route tables                             | Public `rtb-016b93b2a47453997`; Private A `rtb-0bdced1ea8dad7f98`; Private B `rtb-025eda73e10129ead` | `ap-south-1` | No residual charge | Associations removed with subnets; all three tables deleted and verified absent | DELETED — VERIFIED |
| Phase 3 probe security groups                           | Public `sg-0042867f85ab12b0f`; Private `sg-0dddbd0d8891af388`  | `ap-south-1`                                  | No residual charge                                                                  | Deleted after probe ENIs disappeared; tagged inventory verified empty                    | DELETED — VERIFIED |
| Phase 3 private-subnet NACL                             | `order-platform-phase3-private-nacl` (`acl-0b70d803555c9b2d6`)  | `ap-south-1`                                  | No residual charge                                                                  | Subnet associations removed; custom NACL deleted and verified absent                     | DELETED — VERIFIED |
| Phase 3 NAT Gateway and Elastic IP                      | Zonal NAT `nat-084188a4c2090c5df`, its EIP `eipalloc-07761ce6446df7372`, and ENI `eni-092309b67c218bfc3`; prior mistaken regional NAT and its service-managed EIPs | Mumbai `ap-south-1`; Private B route returned to local-only | No residual NAT/EIP charge after verified deletion/release; delayed NAT/data/cross-AZ usage may still appear | Verified zero active NATs, zero EIPs, zero NAT ENIs, and zero NAT-target routes at 18:53 IST on 2026-07-31 | DELETED — VERIFIED |
| Phase 3 temporary EC2 probes and root volumes           | Public probe `i-0d3e72bcd91720016` with encrypted root `vol-0b6dbf03b74485f69`; private probe `i-011a920420e6bc428` with encrypted root `vol-0c825fe303f46b730` | Public A in `ap-south-1a`; Private B in `ap-south-1b` | No residual charge after verified termination/deletion; delayed usage may still appear | Both terminated; volumes, snapshots, ENIs, automatic public IPv4, and active SSM inventory verified absent | DELETED — VERIFIED |
| Phase 3 IAM role and instance profile                   | `order-platform-phase3-probe-role`                              | Global IAM service                            | No residual charge                                                                  | Managed policy detached by console deletion; role and matching instance profile both return `NoSuchEntity` | DELETED — VERIFIED |
| Phase 4 reusable VPC foundation                        | `order-platform-phase4-vpc` (`vpc-01f2e981ee69febad`); public A `subnet-022206a94faffa567`; public B `subnet-03d602d500bb7f64a`; private A `subnet-0959a93361d698088`; private B `subnet-0462c591e5d829fdd`; attached IGW `igw-03dcd901c5395fbf7`; main route table `rtb-0cf4de2df4c9d7be0`; public route table `rtb-069097f89f8bd5070`; private route table `rtb-0f14920dd8fddf372`; ALB SG `sg-037d90e37d307a692`; task SG `sg-09ee205b5eb8a0727` | `ap-south-1`; `ap-south-1a` and `ap-south-1b` | USD 0 expected direct idle service cost; traffic can incur transfer charges | Retained through Phase 8; verified available/tagged with zero ENIs, public IPv4, NAT, EIP, or endpoints; review 2026-08-31 and normally delete at Phase 8/9 boundary | RETAINED — JUSTIFIED; RE-VERIFIED |
| Phase 4 ECR repository and images                      | `order-platform-phase4-api`; immutable/AES-256/basic scanning; only healthy tag `phase4-healthy-v1` remains at digest `sha256:f14819c56db20d6cd8c500011abd30f111b067aaa56505fd20e360a91086442a`; unhealthy image deleted and verified absent | `ap-south-1` | Retained compressed size 190,003,692 bytes, about 0.190 GB / USD 0.019/month at USD 0.10/GB-month; same-Region ECR-to-Fargate transfer USD 0 | Retain known-good image through Phase 8; review 2026-08-31 and normally delete at Phase 8/9 boundary | RETAINED — JUSTIFIED; TEST IMAGE DELETED |
| Phase 4 ECS task execution and task roles              | `order-platform-phase4-execution-role` with `AmazonECSTaskExecutionRolePolicy`; permissionless `order-platform-phase4-task-role` | Global IAM service | USD 0 direct service cost; retained permissions remain a security concern | Retain only scoped reusable roles through Phase 8; re-review least privilege each phase and on 2026-08-31; delete at Phase 8/9 boundary | RETAINED — JUSTIFIED |
| Phase 4 CloudWatch log group                           | `/aws/order-platform/phase4/api`; startup, health-failure, draining, and SIGTERM evidence captured before deletion | `ap-south-1` | USD 0 expected residual after deletion; delayed ingestion/storage usage may still appear | Phase 4 log-group prefix verified empty | DELETED — VERIFIED |
| Phase 4 ECS cluster                                    | `order-platform-phase4-cluster`; empty Fargate cluster with Container Insights disabled | `ap-south-1` | USD 0 direct service cost while empty | Retain empty cluster through Phase 8; re-verify zero services/tasks/EC2 capacity on 2026-08-31; delete at Phase 8/9 boundary | RETAINED — JUSTIFIED |
| Phase 4 task definitions, service, and Fargate tasks   | Family `order-platform-phase4-api`; revision 1 inactive; known-good revision 2 active; unhealthy revision 3 inactive; service deleted after scale-to-zero; all tasks stopped and task ENIs/public IPv4 absent | `ap-south-1` | USD 0 Fargate/public-IPv4 residual after verified task and ENI removal; task definitions have USD 0 direct cost; delayed compute/IPv4 usage may still appear | Retain only revision 2 through Phase 8; review 2026-08-31; delete at Phase 8/9 boundary | RUNTIME DELETED — VERIFIED; REVISION 2 RETAINED |
| Phase 4 target group                                   | IP target group `order-platform-phase4-api-tg`; health/draining evidence captured; deleted after ALB removal | `ap-south-1`; Phase 4 VPC | USD 0 residual | Regional and Phase 4 VPC target-group inventories verified empty | DELETED — VERIFIED |
| Phase 4 Application Load Balancer                      | `order-platform-phase4-alb`; prior HTTP/80 listener and two-AZ public frontend; deleted at about 00:51 IST on 2026-08-05 before the 01:48 deadline | `ap-south-1`; `ap-south-1a` and `ap-south-1b` | USD 0 expected residual after deletion; delayed ALB/LCU/public-IPv4 usage may still appear | ALB/listener absent; both managed ENIs and public IPv4 dependencies verified absent | DELETED — VERIFIED |
| Phase 5 DB subnet group                                | `order-platform-phase5-db-subnet-group`; exact private A/B membership verified | `ap-south-1`; `ap-south-1a` and `ap-south-1b` | USD 0 direct service cost; traffic only after a DB is created | Retain for the next Phase 5 session; exact VPC/subnets/tags verified; review 2026-08-31 and Phase 8/9 boundary | RETAINED — JUSTIFIED |
| Phase 5 ECS-to-RDS security-group path                 | New `order-platform-phase5-db-sg` inbound PostgreSQL/5432 only from retained ECS task SG; retained task SG outbound 5432 only to new DB SG; paired references verified | `ap-south-1`; Phase 4 VPC | USD 0 direct service cost; rules are a security obligation | Retain verified least-privilege pair with no public DB ingress; review 2026-08-31 and Phase 8/9 boundary | RETAINED — JUSTIFIED |
| Phase 5 PostgreSQL parameter group                     | `order-platform-phase5-postgres16`; family `postgres16`; effective dynamic `rds.force_ssl=1` from PostgreSQL 16 system default; exact tags verified; prior mistaken Aurora group deleted | `ap-south-1` | USD 0 direct service cost | Retain for later TLS failure proof; review 2026-08-31 and Phase 8/9 boundary | RETAINED — JUSTIFIED |
| Phase 5 RDS PostgreSQL instance                        | `order-platform-phase5-postgres`; PostgreSQL 16.14; Single-AZ `db.t4g.micro`; encrypted 20 GiB gp3; private only; autoscaling off; one-day backups; auto-minor upgrades off; free seven-day Performance Insights retained; Enhanced Monitoring off | `ap-south-1` | USD 0 instance compute while stopped; USD 0.021/running hour during the approved rotation; retained 20 GiB storage about USD 2.62/month and charged backup above allocation USD 0.095/GB-month | Rotation start requested 2026-08-16 00:32:36 IST; available by 00:36:44; stop requested before the 01:32:36 hard deadline and `stopped` verified 01:02:05; automatic restart 2026-08-23 01:02 IST; review/start-stop/delete by 2026-08-22 | STOPPED — VERIFIED; STORAGE RETAINED |
| Phase 5 RDS-managed master secret                      | RDS-owned managed secret for `order-platform-phase5-postgres`; exact identifier and value omitted; project tags verified; status active | `ap-south-1` | USD 0.40/secret-month plus USD 0.05/10,000 API calls, prorated; remains billable while retained | Retain only with the stopped database for the rotation exercise and near-term application work; review 2026-08-18; RDS-managed secret is deleted with its DB, so confirm recovery/data intent first | RETAINED — JUSTIFIED |
| Phase 5 Enhanced Monitoring role                       | `rds-monitoring-role`; was created by the database workflow and had only `AmazonRDSEnhancedMonitoringRole`; all DB monitoring intervals verified zero before removal | Global IAM service | USD 0 residual after verified deletion | Managed policy detached; exact role deleted and `NoSuchEntity` verified | DELETED — VERIFIED |
| Phase 5 Enhanced Monitoring log group                  | `RDSOSMetrics`; was created during the brief 60-second monitoring interval; contained zero stored bytes | `ap-south-1` | USD 0 residual after verified deletion | Exact log group deleted after monitoring was disabled; prefix inventory verified empty | DELETED — VERIFIED |
| Phase 5 application images                             | Rotation baseline `phase5-rotation-20260815-v1`, 116,359,328 bytes; clean S3 v2, 119,877,829 bytes; and corrected S3 evidence candidate v3, 119,877,093 bytes. V2 has patched SSL, zero production npm-audit findings, and zero ECR Basic-scan findings. V3 contains the corrected anonymous-request/stage diagnostic and patched SSL but its ECR Basic scan has not started. Quarantined S3 v1 was separately approved for deletion and verified absent before any run | `ap-south-1` | ECR storage USD 0.10/GB-month; current combined compressed size 356,114,250 bytes/about 0.356 GB or USD 0.0356/month while all three remain; same-Region Fargate pull transfer USD 0; Basic scanning has no additional charge | Basic-scan v3 before any run. After successful S3 evidence, separately reconcile obsolete evidence/rotation images. Product-image API/database integration will require a later final rebuild, scan, and one-image retention decision before Phase 5 close-out | V3 PUSHED — SCAN PENDING; THREE IMAGES TEMPORARILY RETAINED |
| Phase 5 task definition and secret permission          | Revision 5 remains the successful database-lab baseline. Rotation revision 8 was verified against revision 5 and the live source DB: corrected image/command/timing/logging, unchanged roles and required environment, exact source host, and required tags. Revision 7 safely caught before launch because it inherited the deleted restore endpoint from revision 6; revisions 6/7 are inert. Revision 8 then completed managed rotation recovery with exit 0. Exact managed-secret name remains an ordinary reference; task role has one Allow for only `secretsmanager:GetSecretValue` on the exact secret and no wildcard; execution role unchanged | `ap-south-1` / global IAM | USD 0 direct service cost; retained permissions and obsolete active revisions are security/configuration obligations | Never run revisions 6/7; deregister obsolete revisions during final cleanup if separately confirmed; retain the exact secret permission only if justified for near-term application work and re-review at Phase 5 close-out | REVISION 8 SUCCESS VERIFIED; POLICY REVIEW PENDING |
| Phase 5 standalone Fargate lab tasks                   | Revision 5 previously completed the main DB lab. Revision 8 ran one approved 0.25-vCPU/0.5-GB rotation task in public A with one temporary public IPv4 and no inbound/service/ALB; ran 00:39:30–00:47:16 IST, detected the rotated version, proved stale credential denial, recovered over TLS 1.3, and exited 0 | `ap-south-1` | Rotation task ran about 7.8 minutes at USD 0.0129675/task-hour plus USD 0.005/public-IPv4-hour, approximately USD 0.0023 before tiny logs/transfer/secret calls | Verified zero running/pending tasks and exact task ENI/public IPv4 absent by 00:54:51 IST; no NAT/endpoint/ALB | STOPPED — RUNTIME CLEANUP VERIFIED |
| Phase 5 lab log group                                  | `/aws/order-platform/phase5/lab`, Standard class and one-day retention, captured sanitized success evidence and reported zero stored bytes before deletion | `ap-south-1` | Delayed ingestion usage may still appear; USD 0 storage residual after deletion | User deleted the group after evidence capture; exact absence verified at 00:44:59 IST on 2026-08-12 | DELETED — VERIFIED |
| Phase 5 rotation log group                             | `/aws/order-platform/phase5/rotation`; Standard class, one-day retention, required learning tags, and zero stored bytes verified after creation; sanitized success evidence captured before deletion | `ap-south-1` | Delayed ingestion usage may still appear; USD 0 storage residual after deletion | User deleted the group after evidence capture; exact name verified absent on 2026-08-16 | DELETED — VERIFIED |
| Phase 5 private product-image bucket                   | `order-platform-phase5-product-images-2bf589a4`; general-purpose S3 bucket verified in Mumbai with Bucket owner enforced/ACLs disabled, all four Block Public Access controls, default SSE-S3/AES-256, versioning off, exact learning tags, and no public bucket policy, CORS, or lifecycle rule for the single-object server-side lab; initially empty with zero incomplete multipart uploads | `ap-south-1` | S3 Standard USD 0.025/GB-month for the first 50 TB; PUT/LIST USD 0.005/1,000; GET and other Tier-2 requests USD 0.004/10,000; DELETE free; empty bucket has USD 0 storage cost but remains a security/configuration obligation | Lab must delete its exact object in `finally`; verify zero current objects and incomplete multipart uploads. If the proof succeeds, retain only the empty private bucket for later product-image work through Phase 8; review 2026-08-31 and normally delete at the Phase 8/9 boundary | CREATED — CONFIG VERIFIED; EMPTY |
| Phase 5 product-image task-role policy                 | Inline `order-platform-phase5-product-images` on the application task role; exactly one Allow statement for `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` on the exact private bucket `products/*` object prefix; no ListBucket, bucket-management actions, wildcard bucket, condition, or attachment to the execution role | Global IAM service / S3 resource in `ap-south-1` | USD 0 direct service cost; retained permission remains a security obligation | Retain only with the private product-image bucket for near-term application work; re-review 2026-08-31 and remove before bucket deletion/Phase 8-9 recreation | CREATED — LEAST PRIVILEGE VERIFIED |
| Phase 5 presigned-S3 proof runtime                     | Private bucket, exact-prefix task-role policy, clean immutable v2 image, and Standard one-day S3 log group were verified. Revision 9 was caught before launch due to inherited DB configuration and remains inert. One revision-10 task ran 19:08:03–19:08:55 IST, reached application start, then exited 1 after a sanitized AssertionError before the first proof log. Cleanup ran and requested exact-object deletion. The unsigned PUT had incorrectly reused signature/checksum headers after URL query removal, allowing a structural 4xx before the expected private-bucket 403; successful cleanup also masked the original stage. Local code now sends a structurally valid anonymous PUT with Content-Type only, logs safe status before assertion, and restores the original stage after successful cleanup. Formatting/type-check/six tests pass; local v3 contains the correction and patched SSL 3.5.7-r0 | `ap-south-1` | First task incurred the one-minute minimum, roughly USD 0.0003 before tiny S3/log/request usage. No corrected image/runtime cost exists yet; proposed rerun is separately capped below | Verified zero running/pending tasks, exact task ENI/public IPv4 absent, bucket empty, zero incomplete multipart uploads, and RDS stopped. Keep bounded log group only for one separately approved corrected rerun; require v3 push/clean Basic scan/review before revision/task | CONTROLLED FAILURE CLEANED; LOCAL V3 VERIFIED; FRESH APPROVAL PENDING |

Allowed status values:

- `PLANNED — NOT CREATED`
- `RUNNING — REQUIRED`
- `STOPPED — RESIDUAL COST`
- `RETAINED — JUSTIFIED`
- `DELETED — VERIFIED`
- `UNKNOWN — ACTION REQUIRED`

## Cost-sensitive resource warning

Before creating a resource from the red or amber lists below, record this:

```text
COST-SENSITIVE RESOURCE
Resource:
Name/ID:
Region:
Billing dimensions:
Expected lifetime:
Stop/delete procedure:
Verification procedure:
```

### Red — always check before leaving

- NAT Gateway
- Application, Network, or Gateway Load Balancer
- Running EC2 instance
- Running ECS/Fargate task or service
- Running RDS database
- Elastic IP or other public IPv4 address
- Interface VPC endpoint
- Unattached EBS volume
- Provisioned IOPS storage
- Lambda provisioned concurrency
- OpenSearch domain, ElastiCache cluster, or other provisioned service

### Amber — usually inexpensive, but can accumulate

- RDS/EBS snapshots and backups
- CloudWatch logs, custom metrics, dashboards, and alarms
- S3 objects and incomplete multipart uploads
- ECR container images
- Secrets Manager secrets
- Route 53 hosted zones and registered domains
- CloudFront distributions and data transfer
- SQS queues, SNS topics/subscriptions, and EventBridge schedules
- CloudTrail trails writing data events

## End-of-session cleanup

### 1. Stop active execution

- [ ] EC2 instances are stopped or terminated as required by the lesson.
- [ ] ECS services have desired count `0`, or have been deleted.
- [ ] Standalone ECS tasks are stopped.
- [ ] RDS instances are stopped or deleted.
- [ ] Lambda provisioned concurrency is not configured.
- [ ] EventBridge schedules that can launch work are disabled or deleted.

Important: a stopped RDS instance automatically starts again after seven
consecutive days. Stopping it is not a permanent cleanup method.

### 2. Remove hourly network charges

- [ ] NAT Gateways created for the lesson are deleted.
- [ ] Load balancers created for the lesson are deleted.
- [ ] Unneeded interface VPC endpoints are deleted.
- [ ] Unused Elastic IP addresses are released after their dependency is gone.
- [ ] Public IPv4 addresses are reviewed.

Deleting a NAT Gateway does not automatically guarantee that its Elastic IP has
been released. Verify both resources separately.

### 3. Review persistent storage

- [ ] Unneeded EBS volumes are deleted.
- [ ] Snapshots and RDS manual snapshots are intentional and recorded.
- [ ] RDS storage/backups are accounted for if the database is stopped.
- [ ] S3 objects and incomplete uploads are intentional.
- [ ] Old ECR image versions are removed when no longer needed.
- [ ] CloudWatch log retention is set rather than left unlimited.

Never delete a database, volume, snapshot, bucket, or secret until its data is
confirmed to be disposable or safely backed up.

### 4. Inspect all relevant locations

- [ ] The console Region selector is set to `ap-south-1` and resources are
      checked there.
- [ ] Global services such as IAM, Route 53, CloudFront, and billing are checked
      separately.
- [ ] Other Regions are checked if the console may have switched Regions during
      the lesson.
- [ ] The resource ledger contains no `UNKNOWN — ACTION REQUIRED` entries.

### 5. Verify billing and cleanup

- [ ] Billing and Cost Management shows no unexplained service usage.
- [ ] The current-month bill and Free Tier/credit usage have been reviewed.
- [ ] Deleted resources no longer appear as active in their service consoles.
- [ ] Failed deletion messages have been resolved.
- [ ] Resources deliberately retained are listed below with expected cost.

Billing data can be delayed. A zero or unchanged current estimate is not proof
that active resources are free.

## Retained-resource record

Nothing may be retained silently.

| Resource                                                                                             | Reason retained                                                | Expected residual cost | Review/delete date                     |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------: | -------------------------------------- |
| IAM Identity Center organization instance, AWS Organization, daily learning user, and permission set | Secure temporary-credential access for the learning account    | $0 direct service cost | Final project teardown/security review |
| Two inactive root access keys                                                                        | Short observation period after replacement access was verified |                     $0 | 2026-07-28                             |
| Phase 4 VPC, four subnets, route tables, IGW, and two reusable security groups                        | Reusable network foundation for Phases 5–8                     | $0 direct idle cost   | 2026-08-31 and Phase 8/9 boundary      |
| Empty Phase 4 ECS cluster, known-good task definition revision 2, and two scoped IAM roles            | Reusable container foundation for Phases 5–8                   | $0 direct idle cost   | 2026-08-31 and Phase 8/9 boundary      |
| Phase 4 ECR repository and one known-good image (190,003,692 compressed bytes)                         | Immutable healthy deployment baseline                          | about $0.019/month    | 2026-08-31 and Phase 8/9 boundary      |
| Phase 5 DB subnet group using only private A/B                                                   | Required private RDS placement foundation for the next Phase 5 session | $0 direct idle cost | 2026-08-31 and Phase 8/9 boundary      |
| Phase 5 ECS-task-to-RDS paired security-group rules                                               | Least-privilege PostgreSQL path for the next Phase 5 session     | $0 direct idle cost | 2026-08-31 and Phase 8/9 boundary      |
| Phase 5 PostgreSQL 16 parameter group                                                              | TLS-required engine configuration for later Phase 5 exercises    | $0 direct idle cost | 2026-08-31 and Phase 8/9 boundary      |

## Emergency stop procedure

Use this when the session must end immediately, including when tired,
frustrated, interrupted, or unsure of the environment's state.

1. Stop running EC2 instances.
2. Scale ECS services to zero and stop standalone tasks.
3. Stop the RDS database.
4. Delete lesson NAT Gateways and verify associated Elastic IPs.
5. Delete lesson load balancers.
6. Disable schedules that can start work.
7. Check for interface VPC endpoints, unattached EBS volumes, and public IPv4
   addresses.
8. Review the resource ledger and the Billing dashboard.
9. Mark the session `NOT VERIFIED` if any step could not be confirmed.

Do not make rushed destructive decisions about persistent data. If necessary,
stop compute first, record the unresolved storage resource, and review it safely
in the next session.

## Session close-out record

Copy and complete this at the end of each session:

```text
Date:
Lesson/phase:
Resources created:
Resources stopped:
Resources deleted:
Resources intentionally retained:
Expected residual cost:
Current billing estimate:
Cleanup status: VERIFIED | PARTIAL | NOT VERIFIED
Unresolved items:
```

`VERIFIED` means every created resource has been accounted for. `PARTIAL` means
retained resources are explicitly documented and justified. `NOT VERIFIED`
means the session remains operationally incomplete.

## Session close-out — 2026-07-21

```text
Date: 2026-07-21
Lesson/phase: Phase 0 — Account, IAM, and cost safety
Resources created: AWS Organization; IAM Identity Center organization instance; daily Identity Center user; AdministratorAccess permission set/account assignment; USD 5 monthly cost budget
Resources stopped: Two legacy root access keys deactivated
Resources deleted: Legacy IAM user's login profile and user; direct policy attachments removed
Resources intentionally retained: Identity Center foundation, daily user and permission set, monitoring-only budget, two inactive root access keys through 2026-07-28
Expected residual cost: USD 0 direct service cost
Current billing estimate: USD 0.00
Cleanup status: PARTIAL
Unresolved items: Permanently delete the two inactive root access keys after the observation period; revisit global-versus-Regional scope and idle-charge concepts
```

## Session close-out — 2026-07-25

```text
Date: 2026-07-25
Lesson/phase: Phase 2 — EC2 deployment paused after application startup and IAM denial exercise
Resources created: IAM role/profile; CloudWatch log group; security group; t3.micro EC2 instance; encrypted 8 GiB gp3 root volume; automatic public IPv4 while running
Resources stopped: EC2 instance i-06b61c413fadf9be0; local Docker API/PostgreSQL execution stopped with the instance
Resources deleted/released: Automatically assigned public IPv4 released by EC2 stop; no Elastic IP or snapshot existed
Resources intentionally retained: Stopped EC2 instance and attached EBS root volume; lesson security group; IAM role/profile and policies; empty one-day CloudWatch log group
Expected residual cost: About USD 0.73/month prorated (roughly USD 0.001/hour) for 8 GiB gp3; USD 0 compute; USD 0 public IPv4; IAM/security group USD 0; log group currently 0 stored bytes
Current billing estimate: Approximately USD 0.00018 before delayed Phase 2 usage appears; not proof of zero active cost
Cleanup status: PARTIAL
Unresolved items: Resume on 2026-07-26; finish CloudWatch Agent/correlation, network failure, lifecycle, workbook, then terminate/delete and verify all Phase 2 resources. Phase 0 separately retains two inactive root keys through 2026-07-28 at USD 0.
```

## Session close-out — 2026-07-27

```text
Date: 2026-07-27
Lesson/phase: Phase 2 — First manual deployment on EC2
Resources created: One t3.micro EC2 instance; encrypted 8 GiB gp3 root volume; automatic public IPv4 while running; lesson security group; IAM role/profile and scoped policies; one-day CloudWatch log group/streams
Resources stopped: API/PostgreSQL containers and CloudWatch Agent before termination; EC2 lifecycle stop/start was separately demonstrated
Resources deleted: EC2 terminated; EBS deleted; automatic public IPv4 released; lesson ENI/SSM state absent; security group deleted; IAM policies/role/profile deleted; CloudWatch log group/streams deleted
Resources intentionally retained: No Phase 2 resources. Separate Phase 0 Identity Center/budget foundation remains justified; two inactive root access keys remain scheduled for review on 2026-07-28.
Expected residual cost: USD 0 for Phase 2
Current billing estimate: Approximately USD 0.1017 for July through 2026-07-27; estimated/delayed and includes EC2/EBS/public IPv4, Cost Explorer API, tax, and tiny request usage
Cleanup status: VERIFIED for Phase 2; overall account status remains PARTIAL solely for the separately recorded Phase 0 root-key follow-up
Unresolved items: No Phase 2 resource cleanup item. Review the two inactive root keys on 2026-07-28 without conflating that credential task with Phase 2.
```

## Session close-out — 2026-07-28

```text
Date: 2026-07-28
Lesson/phase: Phase 3 — Networking and isolation paused after local-only VPC foundation
Resources created: One custom VPC; four /24 subnets across ap-south-1a/ap-south-1b; one attached Internet Gateway; three custom route tables; automatic main route table/default security group/default NACL
Resources stopped: None; no compute or traffic-generating workload was created
Resources deleted: None; the no-direct-cost foundation is intentionally retained for the next lesson session
Resources intentionally retained: Phase 3 VPC foundation listed above; separate Phase 0 Identity Center/budget foundation; two inactive root access keys remain outside Phase 3 scope
Expected residual cost: USD 0 direct/idle service cost for retained Phase 3 resources; no NAT, Elastic IP, public IPv4, endpoint, ENI, EC2, EBS, snapshot, load balancer, RDS, ECS, schedule, Flow Log, or Phase 3 log group exists
Current billing estimate: Approximately USD 0.1017 through 2026-07-27; delayed and not refreshed because another potentially billable Cost Explorer request was unnecessary
Cleanup status: PARTIAL — retained Phase 3 resources are explicitly recorded and verified non-running; final Phase 3 teardown remains mandatory
Unresolved items: Resume route-table associations and Phase 3 learning sequence; retain separate approval gates for temporary compute/storage and NAT; complete controlled failures, workbook/ADR, and verified final cleanup. The scheduled inactive-root-key review is separate and was not performed or modified by Phase 3.
```

## Session close-out — 2026-07-29

```text
Date: 2026-07-29
Lesson/phase: Phase 3 — Networking and isolation paused after verified public-probe creation
Resources created: Probe IAM role/profile; two probe security groups; private-subnet NACL; one initial public probe later terminated; one replacement t3.nano public probe with encrypted 8 GiB gp3 root volume, automatic public IPv4 while running, and attached ENI
Resources stopped: Replacement public probe i-0d3e72bcd91720016; AWS verified state stopped
Resources deleted/released: Incorrect first probe terminated; its root volume verified absent and no ENI remains; both automatically assigned public IPv4 addresses released; no Elastic IP existed
Resources intentionally retained: Stopped replacement public probe, attached encrypted 8 GiB gp3 volume and ENI; VPC/four subnets/IGW/route tables/security groups/private NACL; probe IAM role/profile; separate Phase 0 Identity Center/budget foundation and inactive root keys outside Phase 3 scope
Expected residual cost: About USD 0.001/hour, USD 0.024/day, or USD 0.73/month for the retained 8 GiB gp3 volume; USD 0 compute; USD 0 public IPv4; no direct hourly charge for the retained networking controls, ENI, or IAM role/profile
Current billing estimate: The prior delayed July estimate was approximately USD 0.1017 through 2026-07-27; it was not refreshed and does not yet prove or fully reflect 2026-07-29 probe usage
Cleanup status: PARTIAL — active compute and public IPv4 billing are stopped and verified; intentionally retained EBS storage remains billable; final Phase 3 teardown remains mandatory
Unresolved items: Resume the stopped public probe only during the next lesson; create the private probe only after its concrete approval; keep NAT Gateway and Elastic IP behind their separate immediate approval gate; complete path/failure experiments, workbook/ADR, and dependency-aware verified cleanup. The separate inactive-root-key review was not inspected or modified.
```

## Session close-out — 2026-07-31

```text
Date: 2026-07-31
Lesson/phase: Phase 3 — VPC networking, isolation, and failure domains
Resources created during Phase 3: Custom VPC; four /24 subnets across two AZs; IGW; three custom route tables; two probe security groups; one custom private NACL; probe IAM role/profile; two final t3.nano probes with encrypted 8 GiB gp3 roots plus earlier corrected launches; one short-lived zonal NAT/EIP plus an immediately deleted mistaken regional NAT
Resources stopped: Public probe was stopped during an earlier pause; final cleanup terminated both probes rather than retaining stopped storage
Resources deleted/released: Both probes and roots; all probe and NAT ENIs; automatic public IPv4; zonal and mistaken regional NATs; every NAT/customer/service-managed EIP; both custom SGs; IAM role/profile; four subnets; three custom route tables; custom NACL; IGW; VPC and its automatic main route table/default SG/default NACL
Resources intentionally retained: No Phase 3 resource. Separate Phase 0 Identity Center/budget foundation remains justified; two inactive root access keys remain outside Phase 3 scope and were not inspected or modified.
Expected residual cost: USD 0 for Phase 3; delayed NAT, public IPv4, EC2, EBS, transfer, and request usage already incurred may appear later
Current billing estimate: The last recorded delayed July estimate remains approximately USD 0.1017 through 2026-07-27; no additional potentially billable Cost Explorer request was made solely for close-out
Cleanup status: VERIFIED for Phase 3; final Mumbai inventories are empty for every created Phase 3 resource and billing dependency
Unresolved items: No Phase 3 cleanup item. Overall account cleanup remains PARTIAL solely for the separately scheduled two-inactive-root-key credential review at USD 0 expected cost.
```

## Session close-out — 2026-08-05

```text
Date: 2026-08-05
Lesson/phase: Phase 4 — Containers, scaling, health, draining, and deployment safety
Resources created during Phase 4: Dedicated reusable VPC with four subnets/two AZs, IGW and route tables; ALB/task security groups; ECR repository and healthy/unhealthy images; execution and permissionless task roles; ECS cluster; task-definition revisions 1–3; temporary ECS service/Fargate tasks/task public IPv4 addresses; ALB/listener/IP target group; one-day CloudWatch log group
Resources stopped: Service scaled to zero; every Fargate task stopped and each task ENI/public IPv4 removed before service deletion
Resources deleted/released: ECS service; ALB/listener and both ALB ENIs/public IPv4 dependencies; target group; unhealthy ECR image; CloudWatch log group/streams; every temporary task ENI/public IPv4; no NAT, EIP, endpoint, EC2, EBS, snapshot, RDS, or Phase 5 resource was created
Resources intentionally retained: Tagged VPC/four subnets/route tables/IGW/two reusable security groups; empty tagged ECS cluster; known-good active task-definition revision 2; scoped execution/task roles; immutable ECR repository with only healthy image phase4-healthy-v1 (190,003,692 compressed bytes); separate Identity Center/budget foundation
Expected residual cost: About USD 0.019/month prorated for 0.190 GB of retained ECR storage; USD 0 direct idle cost for the other retained Phase 4 foundation; traffic would cost only if reused
Current billing estimate: No additional Cost Explorer request was made solely for close-out. The last manually observed August estimate was USD 0.00 before Phase 4. Delayed Fargate, task/ALB public IPv4, ALB/LCU, ECR, CloudWatch Logs, request, transfer, and tax usage may appear; conservative Phase 4 usage remains below the approved USD 0.75 pre-tax cap and is expected below USD 0.25 before tax.
Cleanup status: VERIFIED for disposable Phase 4 runtime. Zero active services, running/pending tasks, ALBs, listeners, target groups, VPC ENIs/public IPv4, NATs, EIPs, endpoints, and Phase 4 log groups were verified. Overall account cleanup remains PARTIAL because the approved reusable foundation and one low-cost ECR image remain, and because the separate inactive-root-key review is overdue.
Unresolved items: No Phase 4 runtime or educational exit item. Reuse/review the retained foundation and ECR image on 2026-08-31 and normally delete at the Phase 8/9 boundary; separately review the two inactive root access keys whose 2026-07-28 review date is overdue. Phase 4 did not inspect, modify, or delete those credentials.
```

## Session close-out — 2026-08-07

```text
Date: 2026-08-07
Lesson/phase: Phase 5 — private database network and TLS configuration foundation
Resources created: Correct private-A/private-B DB subnet group; RDS DB security group; reciprocal TCP/5432 task-SG egress; PostgreSQL 16 DB parameter group; one mistaken Aurora PostgreSQL parameter group created during a controlled selection error
Resources stopped: None; no compute or database runtime was created
Resources deleted: Mistaken aurora-postgresql16 parameter group deleted and exact name verified absent before correct recreation
Resources intentionally retained: Verified Phase 5 DB subnet group, paired ECS-task-to-RDS security-group rules, and PostgreSQL 16 parameter group; previously retained Phase 4 VPC/ECS/IAM/security/ECR foundation
Expected residual cost: USD 0 direct idle cost for today's Phase 5 controls; about USD 0.019/month for the previously retained Phase 4 ECR image
Current billing estimate: Existing AWS Budget actual spend USD 0.144 at its 2026-08-07 update against the USD 5 monthly limit; delayed and not cleanup evidence
Phase 5 active runtime cleanup status: VERIFIED — zero RDS instances/clusters/manual snapshots, secrets, Phase 5 S3 buckets, ECS services/running tasks, ALBs/target groups, VPC ENIs/public IPv4, endpoints, active/deleting NAT Gateways, EIPs, or Phase 4/5 log groups
Overall cleanup status: PARTIAL — the documented Phase 4/5 foundation is intentionally retained, and the separate inactive-root-key review remains overdue and untouched
Unresolved items: Phase 5 remains in progress. Later create RDS/Secrets/S3/runtime only after fresh price/approval gates; prove TLS with a controlled non-TLS denial; tighten the dormant broad ALB-SG ingress before reuse; separately review inactive root keys only with explicit authorization.
```

## Session close-out — 2026-08-08

```text
Date: 2026-08-08
Lesson/phase: Phase 5 — private RDS creation, cost correction, connection-pool and workload-secret preparation; paused for concept-first learning
Resources created: One private encrypted Single-AZ RDS PostgreSQL 16.14 db.t4g.micro with 20 GiB gp3 and one-day backups; one RDS-managed master secret; temporary Enhanced Monitoring role and empty RDSOSMetrics log group caused by initial console settings
Resources stopped: RDS instance order-platform-phase5-postgres; AWS verified stopped with automatic restart scheduled for 2026-08-15 17:42 IST
Resources deleted: Empty RDSOSMetrics log group; standard Enhanced Monitoring policy detached and unused rds-monitoring-role deleted; both verified absent
Resources not created: No Phase 5 ECR image push, task-definition revision, task-role policy, lab log group, Fargate task/service, ALB, target group, NAT/EIP, endpoint, public IPv4, manual snapshot, or S3 bucket
Resources intentionally retained: Stopped private RDS instance and its one automated-backup record/private ENI; active RDS-managed secret; Phase 5 subnet/SG/parameter controls; documented Phase 4 VPC/ECS/IAM/security/ECR foundation with exactly one healthy image
Expected residual cost: Known base about USD 3.039/month (RDS storage USD 2.62 + secret USD 0.40 + retained ECR image USD 0.019), plus secret API calls and backup storage above any applicable allocation at USD 0.095/GB-month; conservative full additional 20 GB backup would raise this to about USD 4.939/month before tax
Current billing estimate: Budget actual USD 0.144 at its 2026-08-08 update against the USD 5 warning threshold; delayed billing and tax can appear later and this is not cleanup evidence
Phase 5 active runtime cleanup status: VERIFIED — RDS stopped; zero ECS services/running/pending tasks, ALBs/target groups, NATs/EIPs/endpoints, public IPv4, Phase 4/5 or RDSOSMetrics log groups, and Phase 5 buckets; one expected private RDS ENI remains
Overall cleanup status: PARTIAL — stopped RDS storage/backups/secret and documented Phase 4/5 foundation are intentionally retained; separate overdue inactive-root-key review remains untouched
Unresolved items: Review/delete or deliberately start-stop RDS no later than 2026-08-14 before automatic restart; resume Phase 5 concept-first; complete workload-role denial/success, TLS, concurrency, connection-scaling, query-plan, migration, restore, rotation/recovery, S3 presigned-operation evidence, and final cleanup before marking Phase 5 complete
```

## Phase 5 runtime approval gate — 2026-08-10

```text
Status: APPROVED by the user on 2026-08-10 — creation/start not yet performed at this checkpoint
Identity and Region: Expected aws-learning IAM Identity Center caller verified; Mumbai ap-south-1 verified; account identifier omitted
Fresh baseline: RDS stopped/private/Single-AZ with automatic restart at 2026-08-15 17:42 IST; ECS cluster has zero services and zero running/pending tasks; task role has zero inline/attached policies; zero ALBs, target groups, NAT Gateways, EIPs, VPC endpoints, public IPv4 associations, or relevant log groups; one expected private RDS ENI and one retained ECR image
Budget signal: USD 0.364 actual at the 2026-08-10 update against the USD 5 warning threshold; delayed and not a cap or cleanup evidence
Proposed billable group: Start the existing RDS instance for at most 60 minutes; push one temporary Phase 5 image; create a one-day log group and task-definition revision; run at most two sequential 0.25-vCPU/0.5-GB Fargate tasks with temporary public IPv4 for at most 10 minutes each; first prove task-role AccessDenied, then grant GetSecretValue for only the intended managed secret and run the TLS/concurrency/connection/query-plan lab
Explicit exclusions: No ECS service, ALB/listener/target group, NAT Gateway/EIP, VPC endpoint, S3 resource, RDS Proxy, or other Phase 6+ service
Current official rates: RDS db.t4g.micro USD 0.021/running hour with per-second billing and a 10-minute minimum after start; Fargate Linux/x86 USD 0.04256/vCPU-hour plus USD 0.004655/GB-hour with a one-minute minimum; public IPv4 USD 0.005/hour; ECR USD 0.10/GB-month; CloudWatch Logs Standard ingestion USD 0.67/GB and storage USD 0.03/GB-month; Secrets Manager USD 0.40/secret-month plus USD 0.05/10,000 calls
Session estimate and cap: About USD 0.021 RDS compute + USD 0.00433 Fargate + USD 0.00167 public IPv4 for the time boxes, plus tiny secret calls/ECR storage and bounded logs. Conservative incremental pre-tax cap USD 0.10 for this group. Existing retained storage/secret/image residual is separate.
Idle/residual billing: Stopping RDS ends instance compute billing but not its 20-GiB storage, backups, or managed secret. The temporary public IPv4 and Fargate compute stop billing only after tasks stop and ENIs disappear. ECR/log storage persists until deleted.
Required cleanup: Stop both tasks and verify no running/pending/stopping tasks; verify task ENIs/public IPv4 absent; stop RDS and wait for stopped; delete the Phase 5 log group; remove the temporary task-role policy; retain at most one verified healthy ECR image after a separate image-retention/delete confirmation; re-verify zero services, ALB/TG, NAT/EIP/endpoints, public IPv4, and unneeded logs. Record a new RDS review date before its seven-day automatic restart.
Approval: User explicitly approved the complete group with a USD 0.10 incremental pre-tax cap and a 60-minute RDS running limit
```

## Phase 5 controlled-denial extension gate — 2026-08-10

```text
Reason: The original 60-minute RDS limit expired before task launch. RDS stop was requested immediately and must complete; the stop transition cannot be cancelled.
Status: APPROVED by the user on 2026-08-10
Approved group: Exactly one standalone Fargate task using task definition revision 2, 0.25 vCPU/0.5 GB, one temporary public IPv4, and the permissionless task role; maximum ten minutes; no RDS restart
Purpose: Prove the application reaches Secrets Manager but receives task-role AccessDenied before any database connection
Current rates and estimate: Fargate USD 0.0129675/task-hour plus public IPv4 USD 0.005/hour; expected one-minute minimum about USD 0.0003 plus tiny logs; conservative incremental pre-tax cap USD 0.01
Explicit exclusions: No second task, IAM permission addition, RDS restart, service, ALB, NAT, endpoint, S3, or Phase 6+ resource under this extension
Cleanup: Stop the task if it has not exited within ten minutes; verify zero running/pending/stopping tasks, task ENI, and public IPv4; verify RDS reaches stopped; then decide temporary image/log retention or deletion under the documented cleanup plan
```

## Session close-out — 2026-08-10

```text
Date: 2026-08-10
Lesson/phase: Phase 5 — ECS workload identity, Secrets Manager default deny, and sanitized failure evidence
Resources started/created: Existing private RDS started; one 111-MB immutable Phase 5 ECR image; one Standard one-day lab log group; task-definition revisions 1 and corrected 2; one standalone 0.25-vCPU/0.5-GB Fargate task with one temporary public IPv4
Controlled result: Revision 2 used the existing execution/task roles and exact secret-name reference without plaintext credentials. Execution-role image pull/logging succeeded; the permissionless application task role reached Secrets Manager and received one sanitized AccessDeniedException; essential container exited with code 1 after 39 seconds.
Time-box exception: RDS became available at 18:43:20 IST. The approved 60-minute limit expired at 19:43:20 before task launch; this was detected later, stop was requested immediately, and AWS verified stopped with a new automatic restart at 2026-08-17 20:04:29 IST. The time limit was exceeded and is recorded honestly; the monetary cap was not exhausted.
Resources stopped: RDS verified stopped; Fargate task stopped itself; zero running/pending ECS tasks or services
Resources deleted/released: Phase 5 image deleted; lab log group deleted; task ENI/public IPv4 removed; exact absence verified. No task-role policy was added. No ALB/TG, NAT/EIP, endpoint, S3, or Phase 6+ resource was created.
Resources intentionally retained: Stopped private RDS and one active RDS-managed secret; private RDS ENI; Phase 5 subnet/SG/parameter controls; corrected task definition revision 2 plus harmless erroneous revision 1; prior documented Phase 4 VPC/ECS/IAM/security foundation and exactly one healthy ECR image
Estimated session cost: RDS running interval approximately USD 0.029 before tax, one-minute-minimum Fargate/public IPv4 approximately USD 0.0003, plus tiny delayed ECR/log/API/transfer usage; expected below USD 0.04 and below the combined USD 0.11 approved pre-tax caps
Expected residual cost: Known base about USD 3.039/month (RDS storage USD 2.62 + managed secret USD 0.40 + prior ECR image USD 0.019), plus secret calls and charged backup above any applicable allocation at USD 0.095/GB-month; conservative full additional 20 GB backup would make about USD 4.939/month before tax
Current billing signal: Budget actual USD 0.364 at its 2026-08-10 update against the USD 5 warning threshold; delayed billing/tax can appear later and this is neither a cap nor cleanup evidence
Phase 5 active-runtime cleanup status: VERIFIED — RDS stopped; zero services/running/pending tasks, task ENIs/public IPv4, ALBs/TGs, NATs/EIPs/endpoints, Phase 5 image, lab log group, or task-role policies
Overall cleanup status: PARTIAL — stopped RDS storage/backups/secret and documented Phase 4/5 foundation remain intentionally retained; the separate overdue inactive-root-key review remains untouched
Review date: Review/delete or deliberately start-stop RDS no later than 2026-08-16 before AWS automatic restart; review the remaining foundation at the documented 2026-08-31 and Phase 8/9 boundaries
Remaining Phase 5 evidence: exact task-role secret success, TLS/non-TLS, connection scaling, final-item concurrency, query plan, compatible migration, RTO/RPO restore, rotation/recovery, and private S3 presigned upload
```

## Phase 5 successful database-lab approval gate — 2026-08-11

```text
Status: APPROVED by the user on 2026-08-11 — no resource created/started at the approval-record checkpoint
Identity and Region: Expected aws-learning IAM Identity Center caller verified; Mumbai ap-south-1 verified; account identifier omitted
Fresh baseline: RDS stopped/private/Single-AZ db.t4g.micro with automatic restart at 2026-08-17 20:04 IST; managed secret active; ECS cluster has zero services and zero running/pending tasks; task role has zero policies; zero ALBs, target groups, NAT Gateways, EIPs, VPC endpoints, task ENIs/public IPv4, relevant log groups, or Phase 5 buckets; one private RDS ENI, one retained ECR repository/image, and task definition revision 2 remain
Budget signal: USD 0.517 actual at the 2026-08-11 update against the USD 5 warning threshold; delayed and not a cap or cleanup proof
Manual-first sequence: While RDS remains stopped, the user rebuilds/verifies and uploads one immutable Phase 5 image, creates the one-day log group, and adds an inline task-role policy allowing only secretsmanager:GetSecretValue on the exact RDS-managed secret. Only after all three are verified does the user start RDS and run one revision-2 lab task.
Required evidence from the one task: workload-role-only secret retrieval; verified server-certificate TLS; controlled non-TLS rejection; simulated 1/2/4-task connection counts; two concurrent final-item purchases with exactly one success and non-negative inventory; representative EXPLAIN ANALYZE output and index decision; test-row deletion
Current official rates: RDS db.t4g.micro USD 0.021/running hour with per-second billing and a ten-minute minimum after start; retained gp3 USD 0.131/GB-month (20 GiB about USD 2.62/month) and charged backup USD 0.095/GB-month; gp3 baseline I/O is included for this lab and no provisioned IOPS is used; Fargate Linux/x86 USD 0.04256/vCPU-hour plus USD 0.004655/GB-hour with a one-minute minimum; public IPv4 USD 0.005/hour; ECR USD 0.10/GB-month with same-Region Fargate pulls at no transfer charge; CloudWatch Logs Standard ingestion USD 0.67/GB and storage USD 0.03/GB-month; Secrets Manager USD 0.40/secret-month plus USD 0.05/10,000 calls
Time boxes and estimate: Prepare all non-RDS controls first. After RDS becomes available, maximum 75 running minutes (about USD 0.02625). One 0.25-vCPU/0.5-GB task is capped at ten minutes (about USD 0.00216 Fargate plus USD 0.00083 public IPv4). Logs remain below 0.01 GB/about USD 0.0067 ingestion; temporary ECR storage and secret calls are tiny. Conservative incremental pre-tax cap USD 0.07.
Idle/residual billing: RDS storage/backups and the managed secret remain billable when stopped. Fargate/public IPv4 stop only after the task exits/stops and its ENI/address disappear. ECR/log storage persists until deleted. IAM/task definitions have no direct service charge but remain security obligations.
Explicit exclusions: No ECS service, ALB/listener/target group, NAT Gateway/EIP, VPC endpoint, RDS Proxy, S3 resource, restore instance, rotation Lambda, or Phase 6+ service in this group. Same-VPC database traffic is tiny; standard transfer dimensions can apply, including possible cross-AZ traffic.
Cleanup: Stop the task if it has not exited within ten minutes; verify zero running/pending/stopping tasks and task ENI/public IPv4; stop RDS immediately after evidence and wait for stopped; delete the one-day log group; separately confirm whether to delete the temporary Phase 5 image or replace the older retained image; remove the temporary secret policy unless separately justified for the retained foundation; verify zero ALB/TG, NAT/EIP/endpoints, public IPv4, unneeded logs, and Phase 5 buckets; record the new seven-day restart deadline and delayed-billing caveat.
Approval: User explicitly approved the USD 0.07 incremental pre-tax cap, 75-minute RDS running limit, and one ten-minute Fargate task
```

## Phase 5 diagnostic rerun approval gate — 2026-08-11

```text
Status: APPROVED by the user on 2026-08-11 — no deletion/upload/revision/task performed at the approval-record checkpoint
Reason: The approved revision-2 task ran from 23:18:29 to 23:19:06 IST and exited 1. CloudTrail verified the task role successfully retrieved the exact secret; no stable RDS connection was observed. The original final sanitizer reported only generic Error, so a local-only safe diagnostic improvement now records stage plus error/cause name and code without messages, endpoints, or credentials.
Verified local preparation: Diagnostic image contains the new stage marker, RDS CA, lab, and secret SDK. API type-check passed; two unit tests passed; two integration suites correctly required a local DATABASE_URL and were not pointed at live RDS; formatting and diff whitespace checks passed.
Current state: RDS available under the existing 00:28:04 IST deadline with 45 minutes remaining at 23:42 IST; zero running/pending ECS tasks. Existing failed Phase 5 image and empty/bounded log group remain; exact task-role policy remains correct.
Proposed additional group: User deletes only failed ECR tag phase5-lab-20260810, uploads one immutable phase5-lab-20260811-v2 image, creates task-definition revision 3 changing only the image tag, and runs exactly one additional 0.25-vCPU/0.5-GB Fargate task with one temporary public IPv4 for at most ten minutes.
Cost: Fargate about USD 0.00216 and public IPv4 about USD 0.00083 at the ten-minute maximum; temporary 0.111-GB ECR storage and extra log/secret calls are tiny. Conservative incremental pre-tax cap USD 0.02. Existing RDS 75-minute deadline/cap is unchanged and not extended.
Explicit exclusions: No RDS time extension, service, ALB, NAT/EIP, endpoint, S3, restore, rotation, or Phase 6+ resource. No third task without a new gate.
Cleanup: Task must exit or be stopped within ten minutes; verify task ENI/public IPv4 absent; stop RDS by 00:28:04 IST regardless of result; delete lab log after evidence; separately decide successful image versus old retained image; remove exact secret policy unless separately retained; repeat full runtime audit.
Approval: User explicitly approved deletion of only the failed Phase 5 image, one replacement image/revision, one additional ten-minute task, and the USD 0.02 incremental pre-tax cap
```

## Phase 5 managed-secret compatibility rerun gate — 2026-08-12

```text
Status: APPROVED by the user on 2026-08-12; no corrected image, task-definition revision, or additional task created at the approval-record checkpoint
Reason and evidence: Revision 4 ran from 00:05:15 to 00:05:52 IST and exited 1 at the safe resolve-database-secret stage. CloudTrail verified the application task role successfully called GetSecretValue at 00:05:27 with no AWS error. Official AWS guidance confirms an RDS-managed master secret contains username/password while endpoint topology comes from RDS configuration; local code had incorrectly required host/port/engine inside the managed secret.
Verified local correction: Runtime configuration now accepts DB_HOST/DB_PORT as ordinary non-secret settings and reads only username/password from the managed secret, while retaining compatibility with richer custom PostgreSQL secrets. Six configuration tests and configuration-package type-check pass. No secret value or endpoint was retrieved or recorded.
Proposed additional group: Keep the currently available Single-AZ db.t4g.micro running for at most 30 additional minutes from 00:10:16 IST, hard stop by 00:40:16 IST; replace the temporary diagnostic image with one corrected immutable image; create one no-direct-cost task-definition revision adding DB_HOST and DB_PORT; run exactly one 0.25-vCPU/0.5-GB Fargate task with one temporary public IPv4 for at most ten minutes.
Current rates and cap: RDS USD 0.021/running hour, so 30 minutes is about USD 0.0105; ten-minute Fargate is about USD 0.00216 and public IPv4 about USD 0.00083; temporary ECR storage, secret calls, and bounded logs are small. Conservative incremental pre-tax cap USD 0.03.
Idle/residual billing: Stopping RDS ends instance compute but not 20-GiB storage, backups, or the managed secret. Fargate/public IPv4 stop only after task/ENI removal. ECR/log storage persists until deletion. A temporary corrected image would cost about USD 0.0111/month if retained for a full month.
Explicit exclusions: No service, ALB/listener/target group, NAT Gateway/EIP, VPC endpoint, RDS Proxy, S3, restore, rotation Lambda, or Phase 6+ service. No further task without another gate.
Cleanup: Stop the task within ten minutes; verify zero running/pending tasks and task ENI/public IPv4; stop RDS by 00:40:16 IST and wait for stopped; delete the temporary log group; reconcile ECR to one separately confirmed image; remove or separately justify the task-role secret policy; repeat the full zero-runtime inventory and record the new automatic-restart/review dates.
Approval: User explicitly approved the USD 0.03 incremental pre-tax cap, 30-minute RDS extension through 00:40:16 IST, and one additional ten-minute task
```

## Phase 5 point-in-time restore evidence gate — 2026-08-13

```text
Status: APPROVED by the user on 2026-08-13; no restore target, restore log group, task-definition revision, or verification task created at the approval-record checkpoint
Identity and Region: Expected aws-learning Identity Center role verified; Mumbai ap-south-1 verified; account identifier omitted
Fresh baseline: Source PostgreSQL is stopped/private/encrypted/Single-AZ db.t4g.micro with 20 GiB gp3 and one-day backup retention. Its automated backup is active and the source reports a latest restorable point from the successful database lab. One source DB, zero manual snapshots, zero running/pending ECS tasks, zero restore log groups, one corrected ECR image, one exact-source-secret task-role policy, and zero ALB, active NAT, EIP, or VPC endpoint were verified. The restore target identifier is unused.
Budget signal: USD 0.667 actual at the 2026-08-12 18:08 IST update against the USD 5 warning threshold; delayed, not a cap, and not cleanup evidence.
Purpose and evidence: Restore the stopped source to its latest restorable time as a separate private target; measure request-to-available recovery time against the learning RTO; verify restored engine/storage/encryption/network/parameter settings; run one workload-role verification task against the restored endpoint to prove the schema/data are usable; then delete the target. This demonstrates recovery and does not demonstrate Multi-AZ availability.
Proposed billable group: One temporary private encrypted Single-AZ db.t4g.micro target named order-platform-phase5-restore-lab, 20 GiB gp3, exact Phase 5 DB subnet/security/parameter groups, publicly accessible false, storage autoscaling disabled, deletion protection disabled, and required learning tags. Use Latest restorable time rather than inventing a custom timestamp. Create one Standard one-day restore log group, one no-direct-cost task-definition revision changing only DB_HOST/log destination as required, and run exactly one 0.25-vCPU/0.5-GB Fargate task with one temporary public IPv4 for at most ten minutes. The stopped source remains untouched.
Rates and conservative cap: RDS db.t4g.micro USD 0.021/hour, billed while creating and available with applicable minimums; 20-GiB gp3 about USD 2.62/month while the target exists; backup storage above applicable allocation USD 0.095/GB-month; Fargate USD 0.04256/vCPU-hour plus USD 0.004655/GB-hour; public IPv4 USD 0.005/hour; CloudWatch Logs Standard ingestion USD 0.67/GB and storage USD 0.03/GB-month. A maximum 90-minute target lifetime is about USD 0.0315 compute plus about USD 0.0055 prorated storage, ten-minute Fargate/public IPv4 about USD 0.003, and bounded logs below about USD 0.0067. Conservative incremental pre-tax cap USD 0.08, allowing small request/backup/I/O/transfer variance. gp3 baseline I/O is included; no provisioned IOPS, NAT, endpoint, ALB, or internet database transfer is proposed. Standard same-VPC/cross-AZ transfer dimensions may apply to tiny verification traffic.
Idle/residual billing: The temporary restored target incurs compute while creating/available and storage until deletion; stopping it is not the planned cleanup. Logs persist until deleted. Task/public IPv4 billing ends only after task exit and ENI/address removal. The stopped source continues its previously documented storage/backup/managed-secret residual. The target is not approved for retention.
Credential design: PostgreSQL PITR does not support selecting RDS-managed password creation in the same way as the source workflow. The exact existing source secret remains the only approved task-role secret. Connection success against the restored endpoint is treated as evidence that restored credentials match; no secret value is retrieved or exposed. No new plaintext credential, task-definition secret injection, or broad secret permission is allowed.
Exact dependency-aware cleanup: Stop the verification task if it has not exited within ten minutes; verify zero running/pending/stopping tasks and task ENI/public IPv4 absent; capture sanitized evidence; delete the restored DB immediately with no final snapshot, deletion protection off, and no retained automated backups; wait for exact target absence and verify its RDS ENI and any target-only secret absent; delete the restore log group and verify exact absence; retain the stopped source and existing exact-source-secret policy only for the separately planned rotation exercise; verify zero ALB/TG, NAT/EIP/endpoints, public IPv4, restore snapshots/backups, and unneeded logs. Record actual restore time, deletion time, delayed-billing caveat, and separate phase-runtime versus overall cleanup statuses.
Hard limits: Target deletion request no later than 90 minutes after restore request, and immediately after evidence. One verification task only; no source start, manual snapshot, Multi-AZ conversion, extra secret, service, ALB, NAT/EIP, endpoint, S3, rotation, or Phase 6+ resource under this gate.
Approval: User explicitly approved the USD 0.08 incremental pre-tax cap, maximum 90-minute restore-target lifetime, and one ten-minute Fargate verification task
```

## Phase 5 point-in-time restore close-out — 2026-08-13

```text
Restore result: Latest-restorable-time request submitted at 00:21:39 IST; temporary private encrypted Single-AZ db.t4g.micro target became available by 00:35:08 IST, approximately 13.5 minutes later and within the learning RTO of 60 minutes. The source remained stopped throughout.
Configuration evidence: Restored target used PostgreSQL 16.14, 20 GiB gp3, storage autoscaling off, zero-day backup retention, deletion protection/Enhanced Monitoring/log exports off, publicly accessible false, and exact Phase 5 subnet, security, and TLS parameter groups with required tags.
Application evidence: One revision-6 Fargate task ran from 00:50:36 IST and exited 0 in under one minute. Existing exact-secret workload credentials authenticated to the restored endpoint; migrations were usable; TLS 1.3 succeeded; non-TLS was denied; simulated connection, final-item concurrency, and SKU index-plan checks passed; test rows were deleted.
Cleanup: Target deletion was requested without final snapshot or retained automated backups about 33.4 minutes after restore request and exact target absence was verified at 00:55:58 IST. Task stopped; zero running/pending tasks and task ENI/public IPv4 absence were verified. Zero target automated backups, snapshots, or target-named secrets remain. Restore log group was deleted and exact absence verified. Zero ALB, active NAT, EIP, or VPC endpoint exists.
Retained resources: The source RDS remains stopped with automatic restart 2026-08-19 00:48 IST; review/start-stop/delete by 2026-08-18. Its storage/backups/managed secret, one corrected ECR image, exact-secret policy, and documented Phase 4/5 foundation remain for the remaining Phase 5 exercises.
Estimated incremental cost: Target existed about 34.3 minutes, so RDS compute is roughly USD 0.012 before tax plus tiny prorated storage, one-minute-minimum Fargate/public IPv4, bounded log ingestion, and possible delayed request/I/O/transfer/backup dimensions. Expected below USD 0.03 and below the approved USD 0.08 cap. Billing is delayed and the budget is a warning, not cleanup evidence.
Phase 5 restore active-runtime cleanup status: VERIFIED
Overall account cleanup status: PARTIAL — documented retained source storage/backups/secret, exact-secret policy, one ECR image, reusable foundation, and separate overdue inactive-root-key review remain; credentials were not inspected or modified.
```

## Phase 5 credential-rotation close-out — 2026-08-16

```text
Rotation result: Revision 8 retrieved AWSCURRENT through the exact workload-role permission, connected over certificate-validated TLS 1.3, and entered its bounded polling state. An initial console modification attempt returned the controlled overlapping-rotation error and was not treated as success. RDS/Secrets Manager subsequently completed managed rotation at 00:46:47 IST. The task detected a changed version without logging its identifier, proved a fresh connection with the old in-memory credential failed with PostgreSQL authentication code 28P01, retrieved the current credential, reconnected over TLS 1.3, reported that no task-definition change was required, and exited 0 at 00:47:16 IST.
Security evidence: No password, secret value, endpoint, ARN, account identifier, or version identifier was logged or recorded. The managed secret remained active with one current and one previous credential version; secret values were never retrieved manually. The task role remained scoped to GetSecretValue for the exact managed secret, and the execution role was unchanged.
Controlled configuration failure: Revision 7 was caught before launch because it inherited the deleted restore endpoint from revision 6. Correct revision 8 was explicitly derived from revision 5 and verified against the live source endpoint. Revisions 6/7 never ran during rotation and have no direct runtime charge.
Timing and estimated incremental cost: RDS start was requested 00:32:36 IST, became available 00:36:44, and reached stopped at 01:02:05, about 29.5 minutes after the start request. At USD 0.021/hour this is roughly USD 0.0103 before tax. The 0.25-vCPU/0.5-GB Fargate task ran about 7.8 minutes, roughly USD 0.0017 compute plus about USD 0.00065 public IPv4; duplicate-image storage, bounded logs, secret polling calls, and tiny traffic were small. Expected total is below USD 0.02 and the approved USD 0.06 cap; billing is delayed and may differ slightly.
Cleanup: RDS is stopped/private/Single-AZ with automatic restart 2026-08-23 01:02 IST; review/start-stop/delete by 2026-08-22. Zero running/pending ECS tasks/services and exact task ENI/public IPv4 absence were verified. The rotation log group was deleted and exact absence verified. After separate explicit confirmation, the superseded Phase 5 image was deleted; exactly one 116,359,328-byte successful rotation image remains. Zero Phase 5 log groups, ALB/target group, active NAT Gateway, EIP, VPC endpoint, public ENI, restore DB, or Phase 5 bucket exists.
Retained residual: Stopped RDS storage about USD 2.62/month plus any charged backup excess, one managed secret about USD 0.40/month plus calls, and one ECR image about USD 0.0116/month. Network/ECS/IAM/task-definition foundation has no direct idle service charge but remains a security/configuration obligation. Review the stopped DB by 2026-08-22 and the wider foundation by 2026-08-31/Phase 8-9 boundary.
Phase 5 rotation active-runtime cleanup status: VERIFIED
Overall account cleanup status: PARTIAL — documented stopped RDS storage/backups/managed secret, exact-secret policy, one ECR image, reusable foundation, and the separate overdue inactive-root-key review remain; credentials were not inspected, exposed, or deleted.
```

## Phase 5 RDS-managed credential-rotation gate — 2026-08-15

```text
Status: APPROVED by the user on 2026-08-15 — no image push, log group, task-definition revision, RDS start, task launch, or password rotation performed at the approval-record checkpoint
Identity and Region: Expected aws-learning Identity Center role and Mumbai ap-south-1 verified; account identifier omitted
Fresh baseline: Source PostgreSQL is stopped/private/encrypted/Single-AZ db.t4g.micro with 20 GiB gp3 and PostgreSQL 16.14; automatic restart is 2026-08-19 00:48 IST, so review/start-stop/delete by 2026-08-18. Zero ECS running/pending tasks, zero Phase 5 log groups, one 116,359,936-byte Phase 5 image, one RDS-managed secret, and zero active NAT Gateways, Elastic IPs, or VPC endpoints were verified.
Billing signal: Month-to-date unblended cost reported about USD 1.0293 through the 2026-08-16 exclusive boundary. Cost Explorer is delayed, the USD 5 budget is a warning rather than a cap, and neither is cleanup evidence.
Purpose and evidence: Run an application task that retrieves the exact AWSCURRENT managed secret through its workload role, establishes certificate-validated TLS, waits for RDS-managed immediate rotation, detects the new secret version without logging its identifier, proves a fresh connection using the old in-memory credential is denied, retrieves AWSCURRENT again, and reconnects over TLS without a task-definition change. No secret value, endpoint, ARN, account identifier, or version identifier may be logged.
Proposed billable group: Build locally first; then upload one immutable rotation image, create one Standard one-day rotation log group and one no-direct-cost task-definition revision based on the source-database revision, start the existing RDS source for at most 60 minutes, launch exactly one 0.25-vCPU/0.5-GB Fargate task with one temporary public IPv4 for at most 15 minutes, and use RDS Modify > Rotate secret immediately > Apply immediately only after the task logs its sanitized awaiting state.
Current prices: RDS db.t4g.micro Single-AZ PostgreSQL USD 0.021/running hour; Fargate Linux/x86 USD 0.04256/vCPU-hour plus USD 0.004655/GB-hour with a one-minute minimum; public IPv4 USD 0.005/hour; private ECR storage USD 0.10/GB-month with same-Region ECR-to-Fargate transfer USD 0; CloudWatch Logs Standard ingestion/storage remain usage-billed; Secrets Manager USD 0.40/secret-month plus USD 0.05/10,000 API calls. Managed rotation creates a new version of the existing secret, not another billed secret or a rotation Lambda.
Estimate and cap: One hour of RDS is about USD 0.021; 15 minutes of the task is about USD 0.00324 plus about USD 0.00125 for public IPv4; temporary ECR storage, bounded logs, secret calls, and tiny same-VPC traffic are small. Conservative incremental pre-tax cap USD 0.06. The existing stopped-RDS storage/backup, managed-secret, and retained-image costs are residual baseline rather than new runtime.
Idle/residual billing: Stopping RDS ends instance compute but not its 20 GiB storage, charged backup excess, or managed secret. Fargate/public IPv4 billing ends only after the task stops and its ENI/address disappears. ECR and log storage persist until deleted. The rotated password remains the live password after cleanup; the old password is intentionally invalid.
Exact dependency-aware cleanup: Stop the task if it does not exit within 15 minutes; verify zero running/pending/stopping tasks and task ENI/public IPv4 absence; stop RDS immediately and wait for stopped; record the new automatic seven-day restart deadline and review date; delete the one-day rotation log group and verify absence; reconcile ECR back to exactly one known-good Phase 5 image after explicit image-deletion confirmation; retain the exact-secret task-role permission only if justified for the remaining application/S3 work; verify zero service, ALB/listener/target group, NAT/EIP, endpoint, unexpected public IPv4, or unneeded Phase 5 logs; record delayed-billing caveat and separate runtime versus overall cleanup statuses.
Explicit exclusions: No ECS service, ALB/listener/target group, NAT Gateway/EIP, VPC endpoint, RDS Proxy, new secret, rotation Lambda, manual snapshot, restore instance, S3 resource, or Phase 6+ service. No second task or extension beyond the limits without a fresh gate.
Approval: User explicitly approved the USD 0.06 incremental pre-tax cap, maximum 60-minute RDS run, one rotation image/log group/task-definition revision, one 15-minute Fargate task, and one RDS-managed immediate password rotation
```

## Phase 5 private-S3 presigned-operation gate — 2026-08-16

```text
Status: APPROVED by the user on 2026-08-16 — no bucket, IAM policy, image push, log group, task-definition revision, task, or S3 object created at this checkpoint
Identity and Region: Expected aws-learning Identity Center role and Mumbai ap-south-1 freshly verified; account identifier intentionally omitted.
Fresh baseline: Source PostgreSQL is stopped/private/encrypted/Single-AZ with 20 GiB storage and automatic restart 2026-08-23 01:02 IST; its RDS-managed secret is active, DB subnet group is complete across two subnets, and effective rds.force_ssl is 1. ECS has zero services/tasks; Phase 5 has zero log groups and buckets; ECR has exactly one 116,359,328-byte rotation image. The retained VPC has one expected private RDS ENI, zero public ENIs, and zero endpoints. Zero order-platform ALBs/TGs, active NAT Gateways, or EIPs were verified.
Billing signal: Month-to-date unblended cost and budget actual both report about USD 1.129 through the 2026-08-16 exclusive boundary against the USD 5 warning budget. Billing is delayed; the budget is not a cap and neither signal proves cleanup.
Local evidence: Product-image storage code and a safe one-object proof lab are present as uncommitted work. Six local S3 unit tests, API type-check, and formatting checks passed. The lab logs only sanitized status/boolean evidence, never bucket name, object key, presigned URL, credentials, account identifier, or secret data.
Purpose and evidence: Prove unsigned PUT and GET are denied while 60-second presigned PUT and GET succeed; bind the upload to image/png, SHA-256 checksum, a generated products/<product UUID>/<image UUID>.png key, and If-None-Match:*; prove reuse cannot overwrite the object; verify downloaded bytes/type; delete the exact object in finally. This proves delegated private access, not public bucket write.
Planned bucket: order-platform-phase5-product-images-2bf589a4 in ap-south-1; general-purpose S3; Bucket owner enforced with ACLs disabled; all four Block Public Access controls enabled; default SSE-S3; versioning disabled; no public bucket policy; no CORS because the proof uses server-side Node fetch; no lifecycle rule because one tiny object is deleted immediately. Add the required Project/Environment/Owner/AutoCleanup tags.
Least privilege: Add a separate inline task-role policy allowing only s3:PutObject, s3:GetObject, and s3:DeleteObject on the exact bucket products/* object ARN. Do not grant ListBucket, bucket-management actions, wildcard buckets, ACL actions, or any human/browser AWS credentials. Existing exact-secret permission is unchanged and unused by this lab.
Planned runtime: Build locally first; then push one immutable phase5-s3-20260816-v1 image, create one Standard one-day /aws/order-platform/phase5/s3 log group, register one task-definition revision based on the known source revision but with the S3 command/log destination/image plus ordinary PRODUCT_IMAGE_BUCKET configuration, and run exactly one 0.25-vCPU/0.5-GB standalone Fargate task in public A with one temporary public IPv4 for at most ten minutes. RDS stays stopped.
Current official prices: Mumbai S3 Standard USD 0.025/GB-month for the first 50 TB; PUT/COPY/POST/LIST USD 0.005/1,000; GET and other Tier-2 requests USD 0.004/10,000; DELETE/CANCEL free. Existing current runtime rates are Fargate Linux/x86 USD 0.04256/vCPU-hour plus USD 0.004655/GB-hour, public IPv4 USD 0.005/hour, ECR USD 0.10/GB-month, and CloudWatch Logs Standard ingestion USD 0.67/GB and storage USD 0.03/GB-month.
Estimate and cap: S3 storage/requests for one tiny object are below USD 0.001 and the object is removed. Ten-minute task maximum is about USD 0.00216 Fargate plus USD 0.00083 public IPv4. Logs are capped below 0.01 GB/about USD 0.0067 ingestion; temporary duplicate-image storage is tiny. Conservative incremental pre-tax cap USD 0.03.
Idle/residual billing: S3 charges for retained bytes/requests/transfer, not merely bucket existence; an empty retained bucket has USD 0 storage cost but remains a security obligation. Fargate/public IPv4 stop billing only after the task stops and its ENI/address disappears. ECR/log storage persists until deletion. The stopped RDS continues its already documented storage/backup/managed-secret residual and must not be started for this lab.
Transfer and optional-feature exclusions: Upload into S3 is not charged as internet data transfer; download/data transfer can be charged depending on path and destination, but this tiny same-Region proof is negligible. No S3 Transfer Acceleration, Intelligent-Tiering monitoring, KMS customer key, versioning, replication, inventory, analytics, lifecycle transition, browser CORS, multipart upload, NAT Gateway, VPC endpoint, ALB, ECS service, RDS start, or Phase 6+ service is included.
Exact dependency-aware cleanup: Let the lab delete its exact object in finally; stop the task if it has not exited within ten minutes; verify zero running/pending tasks and exact task ENI/public IPv4 absence; capture sanitized evidence then delete the S3 log group and verify absence; verify the bucket has zero current objects and zero incomplete multipart uploads; after separate confirmation delete the superseded ECR image so exactly one known-good image remains; retain the empty private bucket and exact prefix policy only if justified for near-term product-image work, otherwise remove policy then empty/delete bucket. Re-verify stopped RDS, source secret, ECR count, ECS zero runtime, and zero ALB/TG, NAT/EIP/endpoints, public ENIs, or unneeded logs. Record delayed-billing caveat and separate Phase 5 runtime versus overall cleanup statuses.
Approval: User explicitly approved the USD 0.03 incremental pre-tax cap, one private bucket and exact-prefix task-role policy, one image/log/task-definition revision, one maximum-ten-minute task/public IPv4, exact cleanup, and retention of the empty private bucket through the 2026-08-31 review
```

## Phase 5 S3 image-security replacement gate — 2026-08-16

```text
Status: APPROVED AND IMAGE VALIDATION COMPLETE — replacement v2 was pushed and manually Basic-scanned; no log group, task-definition revision, or task launch has occurred
Reason and controlled failure: The approved immutable phase5-s3-20260816-v1 push completed, but its manual no-additional-charge ECR Basic scan reported 1 Critical, 8 High, 4 Medium, and 2 Low findings. Every Critical/High finding mapped to OpenSSL 3.5.6-r0. The image was quarantined before any ECS revision/task/log creation, so active AWS runtime remained zero.
Local correction: Dockerfile.backend now upgrades only libcrypto3 and libssl3 from the base-image repository before npm installation. A clean --pull --no-cache local v2 build verified both packages at the official fixed 3.5.7-r0 release. An explicitly approved npm audit of the exact image with development dependencies omitted reported zero production dependency vulnerabilities at every severity. Type-check, six product-image unit tests, and formatting had already passed.
Proposed additional billable group: Push exactly one immutable phase5-s3-20260816-v2 replacement image to the existing private ECR repository and run one manual Basic scan. Do not create the log group, task-definition revision, or Fargate task unless the replacement scan is complete with zero Critical/High findings or any remaining finding is separately reviewed and accepted. Do not enable paid Inspector enhanced scanning.
Current cost and cap: Basic scanning has no additional charge. The replacement is expected near 0.117 GB, about USD 0.0117/month at ECR USD 0.10/GB-month if retained for a full month. Three images would temporarily total about 0.351 GB/USD 0.0351 per full month; the incremental replacement storage during a short scan/reconciliation interval is tiny. Conservative additional pre-tax cap USD 0.02. This is separate from the previously approved USD 0.03 bucket/runtime group.
Idle/residual billing and cleanup: ECR storage continues while each image exists. After a clean replacement scan, request separate exact-tag approval to delete the quarantined S3 v1 image. Do not delete the rotation baseline until the S3 task succeeds; then request separate exact-tag approval and reconcile to exactly one known-good image. If v2 remains unsafe, do not run it; retain only long enough to diagnose and separately approve its deletion. Verify image counts/digests after every deletion.
Explicit exclusions: No RDS start, S3 object, log group, task-definition revision, Fargate task/public IPv4, service, ALB/TG, NAT/EIP, endpoint, Inspector enhanced scan, or Phase 6+ resource under this replacement gate.
Approval: User explicitly approved one immutable v2 push, one manual Basic scan, and the USD 0.02 additional pre-tax cap; no other creation or runtime is included
Outcome: V2 compressed size is 119,877,829 bytes. ECR Basic scan completed with zero Critical, High, Medium, Low, Informational, or Undefined findings, compared with v1 at 1 Critical/8 High/4 Medium/2 Low. V2 is promoted for the S3 proof; v1 remains quarantined pending separate exact-tag deletion approval. Active runtime remains zero.
```

## Phase 5 corrected presigned-S3 rerun gate — 2026-08-16

```text
Status: APPROVED; V3 PUSHED, SCAN PENDING — no v3 task-definition revision or rerun has occurred
Identity, Region, and billing: Expected aws-learning Identity Center role and Mumbai ap-south-1 remain verified. Month-to-date unblended cost reports about USD 1.1504 through the 2026-08-16 exclusive boundary; budget actual reports USD 1.163 against the USD 5 warning threshold. Billing is delayed and the budget is not a cap or cleanup proof.
Fresh baseline: Immediately after revision-10 failure, zero running/pending ECS tasks, zero public ENIs, zero S3 objects/incomplete multipart uploads, and stopped RDS were verified. No AWS state changed during the local correction/build. The private bucket/exact-prefix task-role policy, clean v2 image, and bounded one-day S3 log group remain; exactly two ECR images exist before any v3 push.
Failure diagnosis and local correction: The unsigned PUT removed the presigned URL query but incorrectly reused checksum/If-None-Match headers whose companion signing data had also been removed, permitting a structural 4xx before the intended anonymous authorization denial. The lab now sends a valid anonymous PUT with Content-Type only, logs the safe status before asserting exact 403, and restores the original stage after successful cleanup. Formatting, API type-check, and all six product-image tests pass. Local phase5-s3-20260816-v3 contains the corrected source and libcrypto3/libssl3 3.5.7-r0; dependency set is unchanged from the zero-production-finding npm audit.
Proposed billable group: Push exactly one immutable phase5-s3-20260816-v3 image; perform one no-additional-charge ECR Basic scan; proceed only if Critical/High are zero or separately reviewed. Then register one no-direct-cost revision 11 changing revision 10 image only, and run exactly one 0.25-vCPU/0.5-GB standalone Fargate task in public A with one temporary public IPv4 for at most ten minutes. Reuse the existing private bucket, exact-prefix task-role policy, and one-day log group. RDS remains stopped.
Required evidence: Structurally valid unsigned PUT returns 403; signed checksum/content-type/If-None-Match PUT returns 200; replay returns 412; unsigned GET returns 403; signed GET returns matching PNG bytes/content type; exact object deletion is requested; final sanitized result reports completed true/bucketPublic false with no URL/key/bucket/account/credential/secret logged.
Current prices and cap: Temporary v3 near 0.12 GB is about USD 0.012/month if retained for a full month at ECR USD 0.10/GB-month; Basic scan has no additional charge. Ten-minute Fargate maximum is about USD 0.00216 plus USD 0.00083 public IPv4. S3 requests/tiny temporary storage are below USD 0.001; bounded logs remain below about USD 0.0067 if ingestion stays under 0.01 GB. Conservative additional pre-tax cap USD 0.03, separate from prior gates.
Idle/residual billing: ECR storage persists while each image exists; log storage persists until deletion; S3 charges for retained bytes/requests/transfer, though the lab object must be deleted and the empty bucket has USD 0 storage. Fargate/public IPv4 billing ends only after task stop and ENI/address removal. Existing stopped-RDS storage/backup/managed-secret residual is unchanged.
Exact cleanup: If v3 scan is clean, request separate exact-tag approval before deleting superseded v2; keep the rotation baseline until task success. Stop the task if not exited within ten minutes; verify zero running/pending tasks and task ENI/public IPv4 absent; verify bucket zero objects/versions/incomplete multipart uploads; capture sanitized evidence then delete S3 log group and verify absence; after success request separate exact-tag rotation-image deletion so exactly one scanned v3 image remains; retain empty private bucket/exact-prefix policy only through documented 2026-08-31 review. Re-verify stopped RDS, active managed secret, ECR image count, zero ALB/TG, NAT/EIP/endpoints, public ENIs, services, tasks, and unneeded logs.
Explicit exclusions: No RDS start, service, ALB/TG, NAT/EIP, endpoint, Inspector enhanced scan, new bucket/secret, rotation, restore, or Phase 6+ resource. No second corrected task without another gate.
Approval: User explicitly approved one v3 push/Basic scan, one revision-11 corrected task up to ten minutes, full dependency-aware cleanup, and the USD 0.03 additional pre-tax cap
```
