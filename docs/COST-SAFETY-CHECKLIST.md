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
| Phase 4 reusable VPC foundation                        | `order-platform-phase4-vpc` (`vpc-01f2e981ee69febad`); public A `subnet-022206a94faffa567`; public B `subnet-03d602d500bb7f64a`; private A `subnet-0959a93361d698088`; private B `subnet-0462c591e5d829fdd`; attached IGW `igw-03dcd901c5395fbf7`; main route table `rtb-0cf4de2df4c9d7be0`; public route table `rtb-069097f89f8bd5070`; private route table `rtb-0f14920dd8fddf372`; ALB SG `sg-037d90e37d307a692`; task SG `sg-09ee205b5eb8a0727` | `ap-south-1`; `ap-south-1a` and `ap-south-1b` | USD 0 expected direct idle service cost; traffic can incur transfer charges | Retained through Phase 8; final Phase 5 audit found one expected private stopped-RDS ENI, zero public IPv4 associations, NAT, EIP, or endpoints; review 2026-08-31 and normally delete at Phase 8/9 boundary | RETAINED — JUSTIFIED; RE-VERIFIED |
| Phase 4 ECR repository and images                      | `order-platform-phase4-api`; immutable/AES-256/basic scanning. The historical healthy Phase 4 tag is absent. A fresh 2026-09-21 inventory found the documented Phase 5 image plus two Phase 6 images recorded separately below | `ap-south-1` | Repository has no direct charge; image storage is recorded on the corresponding image rows; same-Region ECR-to-Fargate transfer is USD 0 | Retain the repository only while a reviewed image is needed; reconcile its contents at the Phase 8/9 boundary | REPOSITORY RETAINED; CONTENT RE-VERIFIED |
| Phase 4 ECS task execution and task roles              | `order-platform-phase4-execution-role` retains only `AmazonECSTaskExecutionRolePolicy`; `order-platform-phase4-task-role` now has the Phase 5 exact-secret and exact-product-prefix policies described below, with no wildcard resource | Global IAM service | USD 0 direct service cost; retained permissions remain a security obligation | Retain only these scoped reusable roles through Phase 8; re-review on 2026-08-31 and delete at Phase 8/9 boundary | RETAINED — JUSTIFIED; LEAST PRIVILEGE RE-VERIFIED |
| Phase 4 CloudWatch log group                           | `/aws/order-platform/phase4/api`; startup, health-failure, draining, and SIGTERM evidence captured before deletion | `ap-south-1` | USD 0 expected residual after deletion; delayed ingestion/storage usage may still appear | Phase 4 log-group prefix verified empty | DELETED — VERIFIED |
| Phase 4 ECS cluster                                    | `order-platform-phase4-cluster`; empty Fargate cluster with Container Insights disabled | `ap-south-1` | USD 0 direct service cost while empty | Retain empty cluster through Phase 8; re-verify zero services/tasks/EC2 capacity on 2026-08-31; delete at Phase 8/9 boundary | RETAINED — JUSTIFIED |
| Phase 4 task definitions, service, and Fargate tasks   | Family `order-platform-phase4-api`; revision 1 inactive; known-good revision 2 active; unhealthy revision 3 inactive; service deleted after scale-to-zero; all tasks stopped and task ENIs/public IPv4 absent | `ap-south-1` | USD 0 Fargate/public-IPv4 residual after verified task and ENI removal; task definitions have USD 0 direct cost; delayed compute/IPv4 usage may still appear | Retain only revision 2 through Phase 8; review 2026-08-31; delete at Phase 8/9 boundary | RUNTIME DELETED — VERIFIED; REVISION 2 RETAINED |
| Phase 4 target group                                   | IP target group `order-platform-phase4-api-tg`; health/draining evidence captured; deleted after ALB removal | `ap-south-1`; Phase 4 VPC | USD 0 residual | Regional and Phase 4 VPC target-group inventories verified empty | DELETED — VERIFIED |
| Phase 4 Application Load Balancer                      | `order-platform-phase4-alb`; prior HTTP/80 listener and two-AZ public frontend; deleted at about 00:51 IST on 2026-08-05 before the 01:48 deadline | `ap-south-1`; `ap-south-1a` and `ap-south-1b` | USD 0 expected residual after deletion; delayed ALB/LCU/public-IPv4 usage may still appear | ALB/listener absent; both managed ENIs and public IPv4 dependencies verified absent | DELETED — VERIFIED |
| Phase 5 DB subnet group                                | `order-platform-phase5-db-subnet-group`; exact private A/B membership verified | `ap-south-1`; `ap-south-1a` and `ap-south-1b` | USD 0 direct service cost; traffic only while the DB is active | Retain with the stopped DB through Phase 8; exact VPC/subnets/tags verified; review 2026-08-31 and Phase 8/9 boundary | RETAINED — JUSTIFIED |
| Phase 5 ECS-to-RDS security-group path                 | New `order-platform-phase5-db-sg` inbound PostgreSQL/5432 only from retained ECS task SG; retained task SG outbound 5432 only to new DB SG; paired references verified | `ap-south-1`; Phase 4 VPC | USD 0 direct service cost; rules are a security obligation | Retain verified least-privilege pair with no public DB ingress; review 2026-08-31 and Phase 8/9 boundary | RETAINED — JUSTIFIED |
| Phase 5 PostgreSQL parameter group                     | `order-platform-phase5-postgres16`; family `postgres16`; effective dynamic `rds.force_ssl=1` from PostgreSQL 16 system default; exact tags verified; prior mistaken Aurora group deleted; TLS 1.3 success and controlled non-TLS rejection demonstrated | `ap-south-1` | USD 0 direct service cost | Retain with the stopped DB through Phase 8; review 2026-08-31 and Phase 8/9 boundary | RETAINED — JUSTIFIED; TLS ENFORCEMENT VERIFIED |
| Phase 5 RDS PostgreSQL instance                        | `order-platform-phase5-postgres`; former private PostgreSQL 16.14, db.t4g.micro, 20-GiB gp3 | `ap-south-1` | No continuing instance/storage/backup charge after verified deletion; delayed historical charges may still appear | User confirmed practice data disposable. Deleted 2026-10-19 without final snapshot or retained automated backups; DBInstanceNotFound and empty snapshot/backup inventories independently verified. Recreate later through Terraform | DELETED — VERIFIED |
| Phase 5 RDS-managed master secret                      | Former RDS-owned managed secret for `order-platform-phase5-postgres`; value never read during cleanup | `ap-south-1` | No continuing secret charge after verified deletion; delayed historical charges may still appear | RDS removed the secret with the database on 2026-10-19; DescribeSecret returns ResourceNotFoundException. Update Terraform's old-secret policy reference when creating the new DB | DELETED — VERIFIED |
| Phase 5 Enhanced Monitoring role                       | `rds-monitoring-role`; was created by the database workflow and had only `AmazonRDSEnhancedMonitoringRole`; all DB monitoring intervals verified zero before removal | Global IAM service | USD 0 residual after verified deletion | Managed policy detached; exact role deleted and `NoSuchEntity` verified | DELETED — VERIFIED |
| Phase 5 Enhanced Monitoring log group                  | `RDSOSMetrics`; was created during the brief 60-second monitoring interval; contained zero stored bytes | `ap-south-1` | USD 0 residual after verified deletion | Exact log group deleted after monitoring was disabled; prefix inventory verified empty | DELETED — VERIFIED |
| Phase 5 application image                              | Clean integrated/migration image `phase5-migration-runner-20260816-v1`, 119,883,392 compressed bytes; ECR Basic scan COMPLETE with zero Critical/High/Medium/Low findings. It successfully ran the dedicated migration, presigned-S3 proof, and real API entrypoint. All superseded/quarantined tags are absent | `ap-south-1` | ECR storage USD 0.10/GB-month; retained size about 0.120 GB or USD 0.012/month; same-Region Fargate pull transfer USD 0; Basic scanning has no additional charge | Retain this one known-good integrated image through Phase 8; review 2026-08-31 and at the Phase 8/9 boundary | ONE CLEAN IMAGE RETAINED — RE-VERIFIED |
| Phase 6 unreviewed ECR images                          | `phase6-lab-20260828-v1` (120,122,334 compressed bytes) and `phase6-diagnostic-20260828-v2` (120,117,270 compressed bytes), freshly observed in `order-platform-phase4-api` on 2026-09-21; neither is a documented Phase 8 retained artifact | `ap-south-1` | About 0.240 GB of ECR storage, or about USD 0.024/month at the ledger's USD 0.10/GB-month reference rate, plus no direct repository cost | Do not run. Obtain explicit learner confirmation that the images are disposable, then delete by digest and verify absence; otherwise document a Phase 8 use and review date | UNKNOWN — ACTION REQUIRED |
| Phase 5 task definition and workload permissions      | Revision 5 is the successful DB-lab baseline; revision 8 completed rotation; revision 11 completed the dedicated migration; revision 12 completed S3 proof; revision 15 is the corrected real API blueprint with TCP/3000 and `API_HOST=0.0.0.0`. Revisions 6/7 and superseded application revisions remain inert. The task role has exactly two scoped policies allowing only `secretsmanager:GetSecretValue` on the intended secret and `s3:GetObject`/`PutObject`/`DeleteObject` on the exact product prefix; no wildcard resource. Execution role is unchanged | `ap-south-1` / global IAM | USD 0 direct service cost; retained permissions and obsolete active revisions are security/configuration obligations | Never run known-bad/superseded revisions; retain revision 15 plus scoped permissions through Phase 8 and review/deregister obsolete revisions at the Phase 8/9 boundary | REVISION 15 APPLICATION SUCCESS VERIFIED; LEAST PRIVILEGE RE-VERIFIED |
| Phase 5 standalone Fargate lab tasks                   | Revisions 5/8/11/12 completed DB, rotation, migration, and S3 labs. During final application work, one wrong-SG task and one loopback-bound task were stopped before target registration; revision 15 then proved healthy ALB routing, database-backed readiness, real product/image flows, and concurrent last-item behavior | `ap-south-1` | Per-second Fargate plus temporary public-IPv4 usage; final gate allowed up to USD 0.20 including RDS/ALB/log/request dimensions. Delayed usage may appear | Final audit verified zero services, running/pending tasks, container instances, task ENIs, or public IPv4 associations | STOPPED — RUNTIME CLEANUP VERIFIED |
| Phase 5 lab log group                                  | `/aws/order-platform/phase5/lab`, Standard class and one-day retention, captured sanitized success evidence and reported zero stored bytes before deletion | `ap-south-1` | Delayed ingestion usage may still appear; USD 0 storage residual after deletion | User deleted the group after evidence capture; exact absence verified at 00:44:59 IST on 2026-08-12 | DELETED — VERIFIED |
| Phase 5 rotation log group                             | `/aws/order-platform/phase5/rotation`; Standard class, one-day retention, required learning tags, and zero stored bytes verified after creation; sanitized success evidence captured before deletion | `ap-south-1` | Delayed ingestion usage may still appear; USD 0 storage residual after deletion | User deleted the group after evidence capture; exact name verified absent on 2026-08-16 | DELETED — VERIFIED |
| Phase 5 migration, S3, proof, and API log groups       | Temporary groups captured sanitized migration, presigned-operation, startup, health, and application evidence without credentials, endpoints, object keys, or presigned URLs | `ap-south-1` | Delayed ingestion usage may still appear; USD 0 storage residual after deletion | Evidence was recorded, every temporary group was deleted, and the complete Phase 5 log-group prefix inventory was verified empty on 2026-08-18 | DELETED — VERIFIED |
| Phase 5 private product-image bucket                   | `order-platform-phase5-product-images-2bf589a4`; general-purpose S3 bucket in Mumbai with Bucket owner enforced/ACLs disabled, all four Block Public Access controls, default SSE-S3/AES-256, versioning off, exact learning tags, no public bucket policy, and no idle CORS rule. Exactly one confirmed 29,792-byte JPEG is retained; zero incomplete multipart uploads | `ap-south-1` | S3 Standard USD 0.025/GB-month; retained object about USD 0.00000075/month, plus tiny requests and applicable egress | User approved retaining the one DB-referenced image for Phase 8. Keep private/no CORS while idle; review/delete object and bucket by 2026-08-31 or the Phase 8/9 boundary | RETAINED — JUSTIFIED; PRIVATE STATE RE-VERIFIED |
| Phase 5 product-image task-role policy                 | Inline `order-platform-phase5-product-images` on the application task role; exactly one Allow statement for `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` on the exact private bucket `products/*` object prefix; no ListBucket, bucket-management actions, wildcard bucket, condition, or attachment to the execution role | Global IAM service / S3 resource in `ap-south-1` | USD 0 direct service cost; retained permission remains a security obligation | Retain only with the private product-image bucket for near-term application work; re-review 2026-08-31 and remove before bucket deletion/Phase 8-9 recreation | CREATED — LEAST PRIVILEGE VERIFIED |
| Phase 5 presigned-S3 proof runtime                     | Revision 10 provided a safely cleaned controlled failure that exposed malformed anonymous-request construction. Corrected revision 12 reused the final clean image and S3-only configuration; its single task exited 0 after proving unsigned PUT 403, signed PUT 200, overwrite replay 412, unsigned GET 403, signed GET 200 with matching downloaded bytes/type, private-bucket status, no URL/key logging, and exact-object deletion | `ap-south-1` | Corrected task ran below the ten-minute cap at about USD 0.0129675/task-hour plus USD 0.005/public-IPv4-hour, before tiny S3/log request usage | Verified task stopped, public ENI absent, exact proof object deleted, zero incomplete multipart uploads, sanitized evidence recorded, and proof log group deleted; the later retained UI object is documented separately | CORRECTED PROOF VERIFIED — RUNTIME CLEANUP VERIFIED |
| Phase 5 final API/ALB application runtime              | Temporary HTTP ALB/listener/IP target group plus one revision-15 standalone task proved `/health`, database-backed `/ready`, real product create/list, browser presigned upload/confirm/download/image rendering, and concurrent last-item `201`/`409` with final inventory zero | `ap-south-1`; retained public A/B plus task in public A | Final approved cap USD 0.20; deletion crossed slightly beyond the target time and delayed second-hour ALB/public-IPv4/LCU usage may appear | Task stopped and ENI/public IPv4 absent; target deregistered; listener, ALB, both managed ENIs/public IPv4s, and target group deleted; API log and temporary CORS deleted; RDS stopped | DELETED/STOPPED — RUNTIME CLEANUP VERIFIED |
| Phase 6 Standard source queue and DLQ                  | `order-platform-phase6-order-processing` and `order-platform-phase6-order-processing-dlq`; source has 20-second long polling, 60-second visibility, one-day retention, SSE-SQS, and redrive after three receives; DLQ has 30-second visibility and four-day retention | `ap-south-1` | No idle queue fee; Standard SQS requests are usage-billed, with the first one million monthly requests in the SQS Free Tier; same-Region transfer is not charged. SSE-SQS does not use a customer-managed KMS key | Retain through Phase 6; re-verify message counts at every session close and review/delete both queues by 2026-08-31 or the Phase 8/9 boundary | RETAINED — JUSTIFIED; EMPTY RE-VERIFIED |
| Phase 7 custom EventBridge bus                         | `order-platform-phase7-lab`; custom application event bus created manually by the user for the EventBridge/SNS/SQS routing lab | `ap-south-1` | No residual charge after verified deletion; test event ingestion may appear as delayed usage | Deleted after the lab; exact bus absence verified by fresh regional inventory | DELETED — VERIFIED |
| Phase 7 SNS operations topic                           | `order-platform-phase7-ops-lab` (Standard); created manually by the user as the EventBridge rule target and fan-out boundary | `ap-south-1` | No residual charge after verified deletion; publish/delivery requests may appear as delayed usage | Exact topic absence verified by fresh regional inventory | DELETED — VERIFIED |
| Phase 7 SQS observer queue                             | `order-platform-phase7-ops-observer-lab` (Standard, SSE-SQS, one-day retention, 20-second long polling); created manually by the user to inspect SNS deliveries | `ap-south-1` | No residual charge after verified deletion; test polling requests may appear as delayed usage | Queue and its lingering test message deleted; exact queue absence verified | DELETED — VERIFIED |
| Phase 7 SNS-to-SQS subscription                        | Standard SNS subscription from `order-platform-phase7-ops-lab` to `order-platform-phase7-ops-observer-lab`; created manually by the user | `ap-south-1` | No residual charge after verified deletion; prior delivery usage may appear later | Exact subscription absence verified by fresh regional inventory | DELETED — VERIFIED |
| Phase 7 EventBridge routing rule                       | `order-platform-phase7-order-confirmed-lab` on `order-platform-phase7-lab`; enabled rule matching source `com.order-platform.orders` and detail type `OrderConfirmed`, targeting the Phase 7 SNS topic | `ap-south-1` | No residual charge after target removal and verified rule/bus deletion | Target removed, rule deleted, and Phase 7 rule prefix verified absent from the default bus | DELETED — VERIFIED |
| Phase 7 real-publisher integration bus                 | `order-platform-phase7-integration-lab`; custom bus created manually by the user for the real local outbox-publisher proof | `ap-south-1` | No residual charge after verified deletion; custom-event ingestion may appear as delayed usage | Deleted after successful proof; exact bus absence verified | DELETED — VERIFIED |
| Phase 7 real-publisher observer queue                  | `order-platform-phase7-event-observer-lab`; temporary Standard SSE-SQS queue created manually by the user for direct EventBridge delivery evidence | `ap-south-1` | No residual charge after verified deletion; SQS requests may appear as delayed usage | Queue and its one observed event deleted; exact absence verified | DELETED — VERIFIED |
| Phase 7 real-publisher integration rule                | `order-platform-phase7-order-confirmed-integration` on `order-platform-phase7-integration-lab`; enabled exact `OrderConfirmed` rule with one direct SQS target and source-rule/source-account-scoped queue policy | `ap-south-1` | No residual charge after target removal and verified rule/bus deletion | Target removed, rule deleted, and exact Phase 7 rule prefix verified absent on the default bus | DELETED — VERIFIED |
| Phase 7 operational-notification bus                  | `order-platform-phase7-notifications-lab`; temporary custom bus used for the real-email SNS proof | `ap-south-1` | No residual charge after verified deletion; one custom-event ingestion may appear as delayed usage | Deleted after the proof and exact absence verified | DELETED — VERIFIED |
| Phase 7 operational-notification rule                 | `order-platform-phase7-order-confirmed-operations`; exact `OrderConfirmed` filter with one SNS target, sanitized input transformer, zero target retries/no DLQ, and SNS permission scoped to the exact rule ARN | `ap-south-1` | No residual charge after target removal and verified rule/bus deletion | Target removed first; rule then deleted; exact bus/rule absence verified | DELETED — VERIFIED |
| Phase 7 operational SNS topic and email subscription  | `order-platform-phase7-operations-lab` Standard topic plus one confirmed email subscription; address intentionally omitted | `ap-south-1` | No residual charge after verified deletion; one email delivery may appear as delayed usage | Topic and its subscription deleted; both exact topic variants verified absent | DELETED — VERIFIED |
| Phase 7 accidental FIFO SNS topic                    | `order-platform-phase7-operations-lab.fifo`; created during manual topic-type selection, with no subscription or message | `ap-south-1` | No residual charge after verified deletion; no delivery occurred | Deleted during emergency stop and exact absence verified | DELETED — VERIFIED |
| Phase 7 SES transactional-email identity             | One verified and tagged sandbox email-address identity used as sender/recipient for transactional and scheduled-report proofs; exact address intentionally omitted | `ap-south-1` | No residual identity charge after deletion; sent emails are irreversible external deliveries and usage may appear later | Identity deleted after proof; fresh SES inventory verified zero identities | DELETED — VERIFIED |
| Phase 7 low-stock Lambda security group              | `order-platform-phase7-low-stock-lambda-sg`; no inbound; outbound PostgreSQL/5432 only to the retained DB SG and HTTPS/443 only to the Phase 7 endpoint SG and Mumbai S3 managed prefix list | `ap-south-1`; retained Phase 4 VPC | No residual charge after deletion | Temporary DB ingress and Lambda-SG egress references removed; Lambda-managed ENI disappeared; fresh SG inventory verified exact absence | DELETED — VERIFIED |
| Phase 7 AWS-endpoint security group                  | `order-platform-phase7-aws-endpoints-sg`; inbound HTTPS/443 only from the Phase 7 Lambda SG; no outbound rules required for stateful replies | `ap-south-1`; retained Phase 4 VPC | No residual charge after deletion | Both interface endpoints and endpoint ENIs disappeared; fresh SG inventory verified exact absence | DELETED — VERIFIED |
| Phase 7 low-stock report bucket                     | `order-platform-phase7-low-stock-reports-992382645171`; private Mumbai bucket held one verified report object | `ap-south-1` | No residual storage charge after deletion; prior requests may appear later | Report object deleted first; bucket deleted; fresh bucket inventory verified exact absence | DELETED — VERIFIED |
| Phase 7 S3 gateway endpoint                        | `vpce-028f02b13982b287a`; `order-platform-phase7-s3-endpoint`; Gateway endpoint for Mumbai S3 on the private route table | `ap-south-1`; retained Phase 4 VPC | No residual endpoint charge | Endpoint deleted; fresh VPC endpoint inventory verified absence, which also removes its managed route | DELETED — VERIFIED |
| Phase 7 Secrets Manager interface endpoint         | `vpce-0ad015aafe865fe0a`; one private-b endpoint ENI; clock began 2026-09-20 22:03:18 IST | `ap-south-1b` | Prior endpoint-hour/data usage may appear later; no ongoing charge after deletion | Endpoint deleted before deadline; fresh endpoint and ENI inventories verified absence | DELETED — VERIFIED |
| Phase 7 SES API interface endpoint                 | `vpce-0e4900f2311bebc99`; one private-b endpoint ENI; conservative clock began 2026-09-20 22:10:47 IST | `ap-south-1b` | Prior endpoint-hour/data usage may appear later; no ongoing charge after deletion | Endpoint deleted before deadline; fresh endpoint and ENI inventories verified absence | DELETED — VERIFIED |
| Phase 7 low-stock Lambda execution role           | `order-platform-phase7-low-stock-lambda-role`; trust limited to `lambda.amazonaws.com`; required learning tags present; zero managed policies; one inline `order-platform-phase7-low-stock-lambda-access` policy with AWS-required ENI actions, exact log group, exact managed DB secret, exact report-object prefix, and exact SES sender identity | Global IAM resource used in `ap-south-1` | No residual IAM charge after deletion | Inline policy deleted first; role deleted; fresh Phase 7/low-stock role inventory verified absence | DELETED — VERIFIED |
| Phase 7 low-stock Lambda log group                | `/aws/lambda/order-platform-phase7-low-stock-report`; contained failure/success proof logs with one-day retention | `ap-south-1` | No residual log storage after deletion; prior ingestion may appear later | Log group deleted; fresh exact-prefix inventory verified absence | DELETED — VERIFIED |
| Phase 7 Scheduler dead-letter queue               | `order-platform-phase7-low-stock-scheduler-dlq`; contained one diagnosed `AccessDeniedException` controlled-failure message | `ap-south-1` | No residual queue/message state after deletion; prior requests may appear later | Queue deleted with test message; exact Phase 7 queue-prefix inventory verified absence | DELETED — VERIFIED |
| Phase 7 low-stock Scheduler execution role        | `order-platform-phase7-low-stock-scheduler-role`; scoped trust and inline target/DLQ policy used for success/failure proofs | Global IAM resource used in `ap-south-1` | No residual IAM charge after deletion | Inline policy deleted first; role deleted; fresh Phase 7/low-stock role inventory verified absence | DELETED — VERIFIED |
| Phase 7 low-stock Lambda function                 | `order-platform-phase7-low-stock-report`; deployed private Node.js 22 ZIP Lambda used for on-demand, idempotency, and scheduled-success proofs | `ap-south-1` | No residual function compute charge after deletion; prior invocations may appear later | Function deleted; exact Lambda inventory verified absence; managed ENI `eni-04e8eede44d17f466` later returned NotFound | DELETED — VERIFIED |
| Accidental console-generated Lambda IAM role/policy | Role `order-platform-phase7-low-stock-report-role-k6fu5m87` under `/service-role/`, with customer-managed policy `AWSLambdaBasicExecutionRole-61e14e16-1df1-486a-8707-b6740bf99391`; created automatically when the function initially did not use the intended existing role; role was never used | Global IAM resources | No residual charge after deletion | Function switched to intended role; generated role and policy deleted; final IAM inventory verified both accidental and intended Phase 7 roles absent | DELETED — VERIFIED |
| Phase 8 frontend S3 bucket                       | Private general-purpose bucket `order-platform-phase8-frontend-992382645171`; Block Public Access on, Bucket owner enforced, SSE-S3, versioning and website hosting off; three verified frontend objects totaling 216,737 bytes with intended content types/cache controls; anonymous read denied again at close | `ap-south-1` | Standard storage USD 0.025/GB-month for the first 50 TB; Tier 1 requests USD 0.005/1,000 and Tier 2 requests USD 0.004/10,000; current storage about USD 0.000005/month plus request usage | Intentionally retain only through 2026-09-26; final cleanup empties and deletes bucket, then verifies exact absence | RETAINED — JUSTIFIED |
| Phase 8 manually created CloudFront OAC          | OAC `order-platform-phase8-frontend-oac` (`E201JOYWPRNJRI`); S3 origin type, always-sign SigV4a; remained unattached after the recommended-settings wizard generated and attached a second OAC | Global CloudFront resource | No residual charge after deletion | User deleted the unused OAC; fresh OAC inventory verified the exact ID absent while the attached generated OAC and viewer path remained healthy | DELETED — VERIFIED |
| Phase 8 wizard-generated CloudFront OAC          | OAC `oac-order-platform-phase8-frontend-992382645171.s3.a-muf496ml8mt` (`E3IV91DFGUN3YF`); S3 origin type, always-sign SigV4; automatically created and attached to disabled distribution `EY6998IJC3CMS` | Global CloudFront resource | No direct OAC idle charge | Intentionally retain with the disabled distribution only through 2026-09-26; delete after the distribution during final cleanup | RETAINED — JUSTIFIED |
| Phase 8 CloudFront distribution                  | Distribution `EY6998IJC3CMS`, AWS domain `d23gq6mlv9cjnb.cloudfront.net`; private Mumbai S3 origin, generated OAC, default root `index.html`, HTTP-to-HTTPS redirect, GET/HEAD, compression, managed CachingOptimized policy, logging off, exact tags, custom alias `stockroom.tarunapps.com`, and exact ACM certificate; remains disabled while custom-domain deployment propagates | Global CloudFront resource; S3 origin in `ap-south-1` | Covered by the active FREE flat-rate plan; no monthly plan price or overage charge while that subscription is active | Enable only for the approved HTTPS proof, disable/verify at session close, and retain/delete only under the revised review record; final cleanup requires plan cancellation before distribution deletion | RUNNING — REQUIRED |
| Phase 8 CloudFront FREE flat-rate subscription   | Subscription `sub_3JlISIe7qHVRV49mqvjltBUs503`; CloudFront FREE tier associated with disabled distribution `EY6998IJC3CMS` and its generated WAF web ACL | Global pricing-plan resource | USD 0/month; includes 1 million requests and 100 GB transfer monthly with no overage charge; allowance is not a traffic hard stop | Intentionally retain only through 2026-09-26; cancel before distribution deletion; cancellation is immediate and remaining associated resources then use pay-as-you-go billing | RETAINED — JUSTIFIED |
| Phase 8 wizard-generated WAF web ACL             | `CreatedByCloudFront-d0f8a502` (`9ea40cdc-aa99-45ca-a5cd-6a7298218f68`), global CloudFront-scope WAF in us-east-1 with three AWS managed rule groups and 925 WCU; attached to disabled distribution `EY6998IJC3CMS` | `us-east-1` global scope | Included at USD 0 while the FREE flat-rate subscription is active; becomes ordinary pay-as-you-go WAF usage if the subscription is cancelled while the ACL remains | Intentionally retain only with the FREE plan through 2026-09-26; during final cleanup cancel plan, promptly detach/delete ACL, and verify absence | RETAINED — JUSTIFIED |
| Phase 8 custom-hostname ACM certificate          | Amazon-issued non-exportable RSA-2048 public certificate `16f68502-110d-4f4c-8d78-0efff4d91eb2` for exact hostname `stockroom.tarunapps.com`; issued 2026-09-26 10:06:04 IST; attached only to distribution `EY6998IJC3CMS`; ACM renewal eligibility verified ELIGIBLE; exact four tags present | `us-east-1`, required by CloudFront | Non-exportable ACM public certificate for an integrated AWS service has no additional certificate charge | Retain validation CNAME for managed renewal while in use; detach before certificate deletion during final cleanup | RUNNING — REQUIRED |
| Phase 8 ACM validation DNS record                | DNS-only CNAME `_190db993ca2d7b9fbb96b66a70257f64.stockroom.tarunapps.com` to `_f1c38f424c3880652fbd9e67228adf4c.wzccmgtwzk.acm-validations.aws`; created manually in the Cloudflare-authoritative `tarunapps.com` zone and verified from both authoritative nameservers | Cloudflare authoritative DNS; validates ACM certificate in `us-east-1` | No expected incremental Cloudflare DNS charge | Retain while the certificate is retained/in use so ACM can renew; delete after certificate removal during final cleanup | RUNNING — REQUIRED |
| Phase 8 custom-hostname traffic DNS record       | DNS-only CNAME `stockroom.tarunapps.com` to `d23gq6mlv9cjnb.cloudfront.net`; created manually in Cloudflare and verified from both authoritative nameservers plus a recursive resolver with 300-second TTL | Cloudflare authoritative DNS to global CloudFront | No expected incremental Cloudflare DNS charge; traffic remains under the CloudFront FREE plan while active | Retain only under the reviewed custom-hostname scope; remove before final CloudFront/domain teardown and verify absence | RUNNING — REQUIRED |

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
| Phase 4 ECR repository; historical Phase 4 image is absent and current storage is listed under Phase 5 | Reusable immutable repository; retain one final Phase 5 image | counted in Phase 5   | 2026-08-22 and Phase 8/9 boundary      |
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

## Phase 5 dedicated migration-runner gate — 2026-08-16

```text
Status: MIGRATION VERIFIED; RUNTIME CLEANUP VERIFIED; OVERALL CLEANUP PARTIAL — retained foundation/data and the separately overdue inactive-root-key review remain
Identity and Region: The expected aws-learning Identity Center caller and Mumbai ap-south-1 were freshly verified; the account identifier is intentionally omitted.
Fresh baseline: RDS order-platform-phase5-postgres is stopped, private, encrypted, Single-AZ db.t4g.micro PostgreSQL 16.14 with 20 GiB gp3, one-day backups, active RDS-managed secret, and automatic restart scheduled for about 2026-08-23 01:02 IST. ECS cluster order-platform-phase4-cluster is ACTIVE with zero services, running tasks, pending tasks, or container instances. Zero order-platform ALBs/target groups, active NAT Gateways, EIPs, VPC endpoints, public ENIs, or active RDS ENIs were verified. The private product-image bucket has all four Block Public Access controls, versioning and CORS off, zero objects, and zero incomplete multipart uploads. ECR retains three images (about 0.356 GB combined); phase5-s3-20260816-v2 and v3 have completed Basic scans with zero Critical/High/Medium findings. One one-day S3 lab log group remains with zero stored bytes. Task-definition revision 5 is the sanitized database-connected source; current latest revision 10 is the S3 lab and must not be used as the migration configuration source.
Billing signal: Month-to-date unblended cost reports about USD 1.1632 through the 2026-08-17 exclusive boundary and the USD 5 warning budget reports about USD 1.163 actual. Both signals can be delayed; the budget is not a spending cap and neither signal proves cleanup.
Local readiness: Local image order-platform-backend:phase5-migration-runner-local exists and its packaged API script resolves migrate:run to tsx --env-file-if-exists=../../.env src/migrate.ts. API and database TypeScript checks pass. The focused migration-runner tests pass 2/2. A broader package-test attempt also selected two pre-existing database integration suites, which correctly refused to run without local DATABASE_URL; that mixed invocation is not counted as runner evidence.
Purpose and evidence: Apply the generated migrations through a dedicated one-off deployment task rather than API startup. Require TLS evidence from pg_stat_ssl, acquire a PostgreSQL session advisory lock on one checked-out connection, apply only pending Drizzle migrations transactionally, verify the latest generated journal timestamp in drizzle.__drizzle_migrations, release the lock, and exit. Logs must contain only sanitized lifecycle/TLS/target/completion evidence and no endpoint, secret identifier/value, credential, SQL text, account identifier, or presigned URL.
Planned billable group: Push exactly one immutable phase5-migration-runner-20260816-v1 image to the existing private ECR repository and perform one no-additional-charge Basic scan. Proceed only with zero Critical/High findings or after separate review. Create one Standard /aws/order-platform/phase5/migrate log group with one-day retention. Register the next task-definition revision from revision 5 while preserving its private DB/TLS/secret/task-role settings and changing only the image, command to npm run migrate:run --workspace @order-platform/api, and log destination. Start the existing RDS instance for at most 60 minutes, then run exactly one 0.25-vCPU/0.5-GB standalone Fargate task for at most 15 minutes. The task uses the existing public subnet plus one temporary public IPv4 for ECR, Secrets Manager, and CloudWatch access, while PostgreSQL traffic stays private through the existing task-to-DB security-group rule.
Current official pricing model: RDS charges db.t4g.micro instance time while running, provisioned storage while stopped or running, backup storage above the included allocation, possible burst CPU credits, and applicable data transfer; current recorded Mumbai instance rate is about USD 0.021/hour and retained 20 GiB gp3 is about USD 2.62/month. Fargate bills requested vCPU and memory from image download until task termination, per second with a one-minute minimum; recorded Mumbai Linux/x86 rates are USD 0.04256/vCPU-hour and USD 0.004655/GB-hour. A public IPv4 is USD 0.005/hour. ECR private storage is USD 0.10/GB-month and same-Region ECR-to-Fargate transfer is USD 0. CloudWatch Logs charges ingestion and retained bytes; recorded Mumbai Standard rates are USD 0.67/GB ingested and USD 0.03/GB-month stored. The existing managed secret remains about USD 0.40/month plus USD 0.05/10,000 API calls. S3 is not used by this migration task. Official references reviewed: https://aws.amazon.com/rds/postgresql/pricing/ ; https://aws.amazon.com/fargate/pricing/ ; https://aws.amazon.com/ecr/pricing/ ; https://aws.amazon.com/cloudwatch/pricing/ ; https://aws.amazon.com/secrets-manager/pricing/
Estimate and cap: One hour of RDS compute is about USD 0.021. A maximum 15-minute task is about USD 0.00325 Fargate plus USD 0.00125 public IPv4. Keep logs under 0.01 GB/about USD 0.0067 ingestion. One additional roughly 0.12-GB image is about USD 0.012/month if retained for a full month. Secret API calls are negligible at this scale. Conservative incremental pre-tax session cap: USD 0.06, excluding already documented retained RDS storage and managed-secret monthly residual.
Idle/residual billing: Stopping RDS ends instance compute but not 20 GiB storage, backup excess, or the managed secret. Fargate/public-IPv4 billing ends only after task termination and ENI/address removal. ECR image and CloudWatch log storage persist until deleted. If all four ECR images remain temporarily, their combined storage is approximately 0.476 GB/about USD 0.0476 per full month. An empty private S3 bucket has USD 0 storage cost but remains a configuration obligation.
Exact dependency-aware cleanup: Stop the migration task if it has not exited within 15 minutes; verify zero running/pending/stopping tasks and disappearance of its ENI/public IPv4. Capture only sanitized migration evidence, then delete the one-day migration log group and verify absence. Stop RDS immediately after verification, wait for stopped, and record its new automatic seven-day restart deadline and a review date at least one day earlier. Re-verify the private bucket remains empty with zero incomplete multipart uploads. Retain the new image only long enough for application verification; request separate exact-tag confirmation before deleting any superseded ECR images, then reconcile toward exactly one known-good image. Re-verify zero ECS services/tasks, ALB/listener/target group, NAT/EIP, endpoint, unexpected public ENI, or unneeded Phase 5 log group. Record delayed-billing caveat plus separate Phase 5 runtime-cleanup and overall-cleanup statuses.
Explicit exclusions: No ECS service, ALB/listener/target group, NAT Gateway/EIP, VPC endpoint, RDS Proxy, Multi-AZ change, new database/secret/bucket, S3 object, manual snapshot/restore, credential rotation, Phase 6+ service, or second migration task is included. Any application API end-to-end runtime is a separate later gate.
Approval: User explicitly approved one immutable migration image/Basic scan, one one-day migration log group, one task-definition revision based on revision 5, a maximum 60-minute RDS start, one maximum-15-minute Fargate task/public IPv4, the dependency-aware cleanup procedure, and the USD 0.06 incremental pre-tax cap.
Image outcome: phase5-migration-runner-20260816-v1 was pushed at 119,883,392 compressed bytes and its ECR Basic scan completed with zero Critical, High, Medium, or Low findings. It is approved for the one-off migration task.
Runtime checkpoint: /aws/order-platform/phase5/migrate was created with one-day retention and task-definition revision 11 was registered from revision 5 with the migration image/command/log changes only. RDS start returned starting while remaining private, encrypted, Single-AZ db.t4g.micro. The 60-minute maximum active-session window is now in force.
Migration evidence: The single revision-11 task ran from 2026-08-16 23:00:52 to 23:01:32 IST and stopped normally with EssentialContainerExited/exit code 0. Sanitized logs recorded migration.start at target index 3/tag 0003_panoramic_moon_knight, migration.tls_verified with encrypted true/TLSv1.3, and migration.complete with appliedThrough 0003_panoramic_moon_knight/verified true. This demonstrates that the runner reached the generated target while holding its session advisory lock; failure to acquire the lock would have stopped before migrate/verification.
Final cleanup verification: RDS reached stopped at about 23:13 IST with automatic restart 2026-08-23 23:13 IST and review deadline 2026-08-22. ECS reported zero running/pending tasks, services, and container instances; zero public ENIs, order-platform ALBs/target groups, NAT Gateways, EIPs, or VPC endpoints were present. Both the migration and prior empty S3 log groups were deleted and the Phase 5 log prefix inventory is empty. The private S3 bucket is empty with zero incomplete multipart uploads. The active managed secret remains with the stopped DB. After separate exact user approval, the three superseded Phase 5 ECR tags were deleted and verified absent; exactly one clean image remains at 119,883,392 bytes/about USD 0.012/month. The stopped RDS storage remains about USD 2.62/month and the managed secret about USD 0.40/month, plus any backup excess/tiny API charges. Delayed task, RDS, IPv4, log-ingestion, and request charges can still appear after this verification. Phase 5 active runtime cleanup is VERIFIED; overall cleanup is PARTIAL because the retained Phase 4/5 foundation is still needed and the separate inactive-root-key review is overdue and was not inspected or modified.
```

## Phase 5 final application and presigned-S3 verification gate — 2026-08-17

```text
Status: PHASE 5 COMPLETE AT CONFIDENCE 3; DISPOSABLE RUNTIME CLEANUP VERIFIED; OVERALL CLEANUP PARTIAL — final application, S3, concurrency, migration, restore, rotation, evidence, retention, and audit gates are complete; intentional Phase 4/5 foundation/data and the separately overdue inactive-root-key review remain
Identity and Region: Expected aws-learning Identity Center caller and Mumbai ap-south-1 freshly verified; account identifier intentionally omitted.
Fresh baseline: Source RDS is stopped/private/encrypted/Single-AZ with active managed secret and automatic restart 2026-08-23 23:13 IST. The ECS cluster is ACTIVE with zero services, running/pending tasks, or container instances. Zero public ENIs, active NAT Gateways, EIPs, VPC endpoints, order-platform ALBs, or target groups exist. The private S3 bucket has zero objects and incomplete multipart uploads and no CORS configuration. Phase 5 log-group count is zero. ECR contains exactly one clean 119,883,392-byte image, phase5-migration-runner-20260816-v1. Retained ALB/task/DB security-group rules were re-verified: internet TCP/80 to ALB; ALB TCP/3000 only to task; task TCP/3000 only from ALB; task HTTPS/443 to AWS public APIs and PostgreSQL/5432 only to the DB SG; DB TCP/5432 only from the task SG.
Billing signal: Month-to-date unblended cost and the USD 5 warning budget both report about USD 1.337 through the 2026-08-18 exclusive boundary. Billing is delayed; the budget is not a cap and neither signal proves cleanup.
Local readiness: Frontend Vite proxy target is now configurable through VITE_API_PROXY_TARGET while localhost:3000 remains the default. Frontend TypeScript, production build, and all 14 tests pass. API/database TypeScript and migration-runner tests passed in the prior verified checkpoint. No new backend image is required because the retained clean image contains the current API, S3, and migration code.
Purpose and required evidence: First run the corrected one-object S3 proof and require unsigned PUT 403, signed PUT 200, replay 412, unsigned GET 403, signed GET byte/type match, and exact cleanup. Then run the actual API entrypoint and prove /ready 200, product create/list, two concurrent HTTP order requests for a last item with exactly one success and non-negative inventory, presigned browser upload to the private bucket, API confirmation after checksum/type/size inspection, short-lived download grant, and UI image rendering. CORS is transport permission for the named browser origin only; IAM, signature, expiry, checksum/content-type/If-None-Match constraints, Block Public Access, and bucket ownership controls still authorize the operation.
Planned non-hourly setup: Reuse the retained clean image and exact workload-role secret/S3 permissions. Create one Standard one-day /aws/order-platform/phase5/s3-proof log group and one task-definition revision derived from the safe S3 configuration but using the retained image; run exactly one 0.25-vCPU/0.5-GB corrected proof task with one temporary public IPv4 for at most ten minutes, then delete its log group after evidence. Configure one temporary S3 CORS rule allowing only origin http://127.0.0.1:5173, methods PUT/GET/HEAD, only the headers required by the signed operation, and a 300-second preflight cache; do not use wildcard origins. Create one Standard one-day /aws/order-platform/phase5/api log group and one API task-definition revision derived from database revision 5 with the retained image, ordinary bucket configuration, API start command, and existing roles/TLS/DB settings.
Planned hourly runtime: Start the existing RDS instance for at most 75 minutes. Create one internet-facing IPv4 Application Load Balancer order-platform-phase5-api across retained public A/B, one HTTP/3000 IP target group order-platform-p5-api-tg with /health health checks, and one HTTP/80 listener using the retained ALB SG. Launch exactly one standalone 0.25-vCPU/0.5-GB Fargate API task in public A with one temporary public IPv4 and the retained task SG, then manually register only that task private IP in the target group. No ECS service is used, so no restart loop exists. The ALB must be deleted within 55 minutes of its creation request and the task within 45 minutes of launch.
Current official billing model and recorded Mumbai rates: ALB charges each started ALB hour as a full hour plus LCU usage per minute; recorded Mumbai rates are USD 0.0239/ALB-hour plus USD 0.008/LCU-hour, and the internet-facing two-AZ ALB uses two public IPv4 addresses at USD 0.005/address-hour. Fargate Linux/x86 is USD 0.04256/vCPU-hour plus USD 0.004655/GB-hour from image download to termination with a one-minute minimum; each task public IPv4 is USD 0.005/hour. RDS db.t4g.micro is about USD 0.021/running hour with a ten-minute minimum after start; stopped storage/backup/secret residual continues separately. CloudWatch Logs Standard is USD 0.67/GB ingested and USD 0.03/GB-month stored. S3 Standard is USD 0.025/GB-month, PUT/LIST USD 0.005/1,000, GET/other Tier-2 USD 0.004/10,000, DELETE free; data transfer in and same-Region AWS-service transfer are USD 0, while applicable internet egress can be charged. CORS configuration and task definitions have no direct charge. Official references reviewed: https://aws.amazon.com/elasticloadbalancing/pricing/ ; https://aws.amazon.com/fargate/pricing/ ; https://aws.amazon.com/rds/postgresql/pricing/ ; https://aws.amazon.com/s3/pricing/ ; https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html ; https://aws.amazon.com/cloudwatch/pricing/ ; https://aws.amazon.com/secrets-manager/pricing/
Estimate and cap: One started ALB hour plus up to one low-traffic LCU and two ALB public IPv4 addresses is about USD 0.0419. A 45-minute API task/public IPv4 is about USD 0.0135; a ten-minute S3 proof task/public IPv4 is about USD 0.003. Seventy-five RDS minutes is about USD 0.0263. Keep combined logs below 0.02 GB/about USD 0.0134 ingestion. Tiny S3 requests/storage/transfer and secret calls should remain below USD 0.002. Conservative incremental pre-tax cap: USD 0.15. Crossing into a second ALB started hour, extending any limit, launching another task, or retrying after failure requires a fresh gate.
Idle/residual billing: Stopping RDS ends compute but not 20 GiB storage, backup excess, or the managed secret. Fargate/task-public-IPv4 billing ends only after task termination and ENI/address removal. ALB/LCU and its two public IPv4 charges end only after ALB deletion and managed ENI/address removal. Log storage persists until deletion. One retained product-image object would incur size-proportional S3 storage and request/egress costs; retain at most one small demonstrated object only if needed for Phase 8, with exact size/cost/review date. The single ECR image remains about USD 0.012/month.
Exact dependency-aware cleanup: Capture sanitized proof/API/UI evidence without credentials, account identifier, secret value/identifier, endpoint, or presigned URL. Stop the API task; verify zero running/pending tasks; deregister its target; delete listener then ALB, wait for ALB deletion and both managed ENIs/public IPv4 addresses to disappear, then delete the target group. Stop RDS immediately and wait for stopped; record its new automatic seven-day restart deadline and review date at least one day earlier. Delete both temporary log groups after evidence and verify the Phase 5 log prefix empty. Remove the temporary localhost S3 CORS rule and verify absence. Verify bucket current-object and incomplete-multipart inventories; retain at most one intentional demonstrated image object with exact residual cost/review date or delete it after explicit confirmation. Re-verify one clean ECR image, active managed secret, private DB, zero service/task, ALB/listener/TG, NAT/EIP/endpoint, public ENI, or unneeded log. Record delayed-billing caveat and separate Phase 5 runtime versus overall cleanup statuses.
Explicit exclusions: No ECS service, second API/proof task, NAT Gateway/EIP, VPC endpoint, RDS Proxy, Multi-AZ change, new database/secret/bucket/image, HTTPS/ACM, CloudFront, Route 53, SQS/SNS/SES/EventBridge, scheduled job, or Phase 6+ service. Frontend hosting remains Phase 8; only the local development server is used here.
Approval: User explicitly approved one corrected maximum-ten-minute S3 proof task, temporary localhost-only S3 CORS, one maximum-45-minute API task, one maximum-55-minute ALB/listener/target group, a maximum-75-minute RDS run, exact dependency-aware cleanup, and the USD 0.15 incremental pre-tax cap.
S3 proof outcome: Task-definition revision 12 reused the retained clean image and S3-only configuration. Its single Fargate task exited 0 and sanitized logs proved unsigned PUT 403, signed PUT 200, replay 412, unsigned GET 403, signed GET 200/downloaded true, bucketPublic false, and exact deletion requested without logging the presigned URL or object key. Post-task verification found zero bucket objects, zero incomplete multipart uploads, and zero public ENIs.
Application setup checkpoint: The proof log group was deleted and verified absent. The bucket now has exactly one temporary CORS rule for http://127.0.0.1:5173 with PUT/GET/HEAD, only content-type/if-none-match/x-amz-checksum-sha256 request headers, ETag exposure, and 300-second preflight caching. The one-day API log group exists. Revision 13 correctly inherited DB/TLS/secret/bucket/API settings but was caught before launch because the standalone source had no explicit port mapping. Revision 14 adds only explicit awsvpc TCP/3000 host/container mapping and is the approved API blueprint.
Hourly-runtime checkpoint: CloudTrail records the approved RDS start at 2026-08-17 21:50:46 IST, so its 75-minute stop deadline is 23:05:46 IST. The source DB is available, private, encrypted, and Single-AZ. The IP target group exists with HTTP/3000 and /health; deregistration delay is 30 seconds and no target is registered yet. The first console ALB attempt failed because the browser session expired and was verified to have created no ALB. The successful internet-facing IPv4 ALB creation time is 2026-08-17 22:32:34 IST, so its 55-minute deletion deadline is 23:27:34 IST. It is provisioning across retained public A/B, uses only the retained ALB security group, has an HTTP/80 listener forwarding to the Phase 5 target group, and carries all four required tags. No API task has launched yet.
Task-launch checkpoint: One revision-14 standalone task was created at 2026-08-17 22:43:19 IST with the expected public-A placement and temporary public IPv4, but read-only verification caught that its ENI used the ALB security group instead of the task security group while the task was still pending. Do not register this private IP. Stop and verify this incorrect task immediately; any corrected retry requires the fresh approval required by this gate.
Incorrect-task cleanup checkpoint: At 2026-08-17 22:46:56 IST, the cluster reported zero running and zero pending tasks, the incorrect task ENI/private IP and its public association were absent, and the target group still had zero registered targets. The source RDS remained available and the ALB remained active. Incorrect-task cleanup is VERIFIED.
Corrected-retry approval: User explicitly approved exactly one corrected revision-14 Fargate task for at most 35 minutes with only the retained task security group, plus extending the RDS stop deadline by 20 minutes to 2026-08-17 23:25 IST. The ALB deletion deadline remains 23:27 IST; no second task/service/NAT/endpoint/image is authorized. The brief incorrect task plus the added RDS time is estimated below USD 0.01 and the existing USD 0.15 conservative cap remains unchanged.
Corrected-task checkpoint: Revision 14 was created at 2026-08-17 22:51:30 IST and reached RUNNING at 22:51:47 IST in retained public A with exactly the retained task security group, one temporary public IPv4, and private IP 10.40.0.26. The sanitized API-log check found a startup signal and zero error signals. Stop this task no later than 23:22 IST; it is not yet registered in the target group.
API-bind diagnosis: The revision-14 startup log showed the normal API command running but binding to 127.0.0.1:3000 because API_HOST was absent and the application default is loopback. An ALB request to the task ENI private IP cannot reach a process bound only to container loopback. Do not register this task. Stop and verify it, then create a non-billable task-definition revision adding API_HOST=0.0.0.0 before any separately approved retry; no image rebuild is required.
Loopback-task cleanup checkpoint: At 2026-08-17 22:58:16 IST, the cluster reported zero running and zero pending tasks, the revision-14 task ENI/private IP and public association were absent, and the target group remained empty. RDS remained available and the ALB active. Loopback-task cleanup is VERIFIED. A revision adding only API_HOST=0.0.0.0 may be created without direct charge, but another task launch still requires fresh approval.
Revision-15 checkpoint: Read-only comparison at 2026-08-17 23:01:32 IST verified exactly one API_HOST=0.0.0.0 setting, the normal API command, TCP/3000 mapping, and unchanged image, all other environment settings, secret references, roles, CPU/memory, and log configuration. Revision 15 is READY but has not launched; another Fargate run requires fresh approval.
Final-retry approval: User explicitly approved exactly one revision-15 Fargate task in retained public A with only the retained task security group and one temporary public IPv4, manual registration of only its private IP, an 18-minute maximum with task stop by 23:20 IST, RDS stop by 23:25 IST, and ALB deletion by 23:27 IST. The retry is estimated below USD 0.01 and the existing USD 0.15 cap remains unchanged; any further failure triggers cleanup rather than another launch.
Final-task checkpoint: Revision 15 was created at 2026-08-17 23:12:04 IST and reached RUNNING at 23:12:23 IST in retained public A with exactly the retained task security group, one temporary public IPv4, and private IP 10.40.0.64. Sanitized CloudWatch verification found the API listening on 0.0.0.0 with zero startup error signals. Stop by the approved 23:20 IST deadline.
Application-path checkpoint: The task private IP was manually registered on TCP/3000 and reached target-group HEALTHY. At 2026-08-17 23:16:41 IST, sanitized requests through the ALB returned HTTP 200 from both /health and database-backed /ready; the latter returned only status ready. This proves ALB-to-task routing plus API-to-private-RDS connectivity for revision 15 without exposing an endpoint, credential, or secret identifier.
Final-runtime extension approval: User explicitly approved extending the one existing revision-15 task to 23:45 IST, the source RDS to 23:48 IST, and ALB deletion to 23:50 IST so the real UI/S3/concurrency demonstrations can finish without rushing. Crossing into a second started ALB hour is acknowledged at about USD 0.0419 plus roughly USD 0.01 of added task/RDS/log/request allowance. The conservative session cap is raised from USD 0.15 to USD 0.20. No additional task, image, database, service, NAT, endpoint, or later-phase resource is authorized.
Real product-image checkpoint: The local frontend completed the API-grant/direct-S3/upload-confirm/download-grant path for one JPEG. At 2026-08-17 23:34:09 IST, the private bucket contained exactly one 29,792-byte object, all four S3 Block Public Access controls were enabled, no bucket policy existed, and an unsigned GET returned 403. The user demonstrated that the API returned a 60-second presigned GET URL; the URL itself is intentionally omitted because it is bearer authorization while valid. Retention versus deletion remains to be decided before cleanup.
Real concurrency checkpoint: Through the deployed ALB/API/RDS path, the user created a dedicated product with opening quantity one and released two order POSTs concurrently. Attempt 1 returned 201, attempt 2 returned 409, and the final available quantity was zero. This verifies that the transaction plus deterministic row-level SELECT FOR UPDATE locking serialized access to the last unit, rechecked stock after lock acquisition, committed exactly one order/decrement, and prevented negative inventory. Required concurrent last-item evidence is VERIFIED.
Application-task cleanup checkpoint: At 2026-08-17 23:38:33 IST, the cluster reported zero running and zero pending tasks and the final task ENI/private IP/public association were absent. The target-group entry remained temporarily unhealthy with Target.Timeout only because its task had stopped and must now be deregistered. Fargate/public-IPv4 runtime cleanup is VERIFIED.
Hourly-runtime cleanup checkpoint: The user requested the RDS stop and deregistered the target; RDS later reached STOPPED and the target group became empty. The HTTP listener was deleted first. An initial check caught that only the listener, not the ALB, had been deleted; the user then deleted the ALB itself. At 2026-08-17 23:58:01 IST, the named ALB was absent and both managed ALB ENIs/public IPv4 associations were absent. The approved deletion time was exceeded by several minutes, so delayed second-hour/IPv4/LCU billing may appear. ALB/listener/network and RDS compute cleanup are VERIFIED; the empty target group, temporary API log group, temporary S3 CORS rule, and product-object retention decision remain.
Post-runtime checkpoint: The empty Phase 5 target group was deleted and verified absent. RDS is stopped/private with 20 GiB allocated storage, one-day backup retention, automatic restart scheduled for 2026-08-24 23:46 IST, and a review/stop-or-delete date of 2026-08-23. The temporary API log group and localhost CORS rule remain to be deleted. The private bucket contains one 29,792-byte demonstrated image and zero incomplete multipart uploads; retention requires an explicit decision.
Temporary-configuration cleanup checkpoint: At 2026-08-18 00:00 IST, the Phase 5 API log group and temporary localhost-only S3 CORS rule were verified absent. ECS reported zero services/running/pending tasks; order-platform ALB and target-group counts were zero; RDS remained stopped/private; the bucket retained exactly one 29,792-byte completed object. A corrected non-null-record check verified zero actual incomplete multipart uploads. Temporary log/CORS/multipart cleanup is VERIFIED; the single object still requires an explicit retain/delete decision.
Product-image retention decision: User explicitly approved retaining exactly one 29,792-byte demonstrated JPEG through Phase 8 because the stopped database contains its confirmed product-image record and Phase 8 will exercise the deployed frontend. At the recorded S3 Standard rate its storage is about USD 0.00000075/month, plus tiny request and applicable egress charges. Keep the bucket private with no CORS while idle; review/delete the object and bucket by 2026-08-31 or at the Phase 8/9 boundary, whichever comes first.
Final audit: Expected aws-learning Identity Center access and Mumbai ap-south-1 were re-verified without recording the account identifier. ECS has zero services, running/pending tasks, or container instances. There are zero order-platform ALBs/target groups, public ENI associations, NAT Gateways, VPC Elastic IPs, or VPC endpoints; one expected private stopped-RDS ENI remains. RDS is stopped/private/encrypted/Single-AZ PostgreSQL 16.14 db.t4g.micro with 20 GiB gp3, one-day backups, in-sync parameter group, zero manual Phase 5 snapshots/clusters, active managed secret, and managed rotation enabled. Automatic restart is 2026-08-24 23:46 IST; review/start-stop/delete by 2026-08-23. The task role has exactly the intended secret retrieval and S3 object actions with no wildcard resource. The bucket has SSE-S3, all public-access blocks, no bucket policy or CORS, exactly one approved 29,792-byte image, and zero incomplete multipart uploads. ECR has exactly one 119,883,392-byte image with completed Basic scan and zero Critical/High/Medium/Low findings. Phase 5 log-group count is zero.
Residual cost and review: Fixed retained estimate is about USD 3.032001/month: RDS storage USD 2.62, managed secret USD 0.40, ECR image about USD 0.012, and the S3 object about USD 0.00000075. Backup excess, API/request, transfer, and tax are variable. Review RDS by 2026-08-23 and all retained foundation/data by 2026-08-31 and at the Phase 8/9 boundary. Delayed RDS/Fargate/ALB/LCU/public-IPv4/log/request/transfer/tax usage may still appear; the USD 5 budget is a delayed warning, not a cap or cleanup proof.
Cleanup conclusion: Phase 5 disposable runtime is VERIFIED clean. Overall cleanup remains PARTIAL because the documented VPC/ECS/IAM/security groups/task definitions, stopped RDS/storage/backups/managed secret, one clean ECR image, private bucket, and one product image are intentionally retained for Phases 6-8. The separate overdue inactive-root-key review was not inspected, exposed, modified, or deleted. Phase 5 is COMPLETE; do not begin Phase 6 under this gate.
```

## Phase 6 pre-deployment checkpoint — 2026-08-26

- Fresh read-only baseline: expected `aws-learning` Identity Center administrator caller and `ap-south-1` were verified. The retained RDS instance `order-platform-phase5-postgres` is private and `stopped`, with 20 GiB allocated storage and automatic restart at 2026-08-31 21:34 IST. Both Phase 6 queues report zero visible, in-flight, and delayed messages. ECS has zero services and zero tasks.
- Budget signal: USD 2.455 actual and USD 3.093 forecast against the USD 5 monthly budget. This is a delayed warning, not a spending cap.
- Local code is formatted and type-checked: transactional outbox schema/migration, order transaction write, publisher lease/retry repository, isolated SQS adapter and unit test, strict publisher configuration, and publisher entrypoint are ready. No Phase 6 migration, image build/push, IAM policy change, RDS start, ECS task, or SQS application message has been performed under this checkpoint.
- Proposed later deployment requires a fresh explicit approval: start the stopped RDS only for the bounded migration/publisher lab, build and retain at most one replacement ECR image, add only exact-source-queue `sqs:SendMessage` task-role permission, and run only the required disposable migration/publisher task(s). RDS compute, Fargate/public-IPv4 runtime, ECR storage, CloudWatch ingestion, and SQS requests can be billable. Stop every task, remove temporary ENIs/public IPv4/log groups as applicable, stop RDS, and directly verify queue/task/RDS state at session close.

## Phase 6 approved bounded integration window — 2026-08-28

- Fresh read-only baseline verified the expected `aws-learning` Identity Center caller in Mumbai `ap-south-1`; the source queue and DLQ have zero visible, in-flight, and delayed messages; the retained ECS cluster has zero services, running tasks, and pending tasks; the private 20-GiB RDS instance is stopped. Its automatic-restart deadline is 2026-08-31 21:34 IST, so it must be stopped again before session close and reviewed no later than 2026-08-30.
- User explicitly approved: add narrowly scoped source-queue SQS access to the retained ECS task role, build/push one Phase 6 replacement image, start this existing RDS instance, run one migration task and one bounded end-to-end lab task, then perform direct cleanup verification. No ECS service, load balancer, NAT gateway, endpoint, new database, secret, bucket, queue, or Phase 7+ resource is approved.
- Expected variable charges: RDS `db.t4g.micro` running time (recorded Mumbai rate USD 0.021/hour; storage/backup persists while stopped), one or two short 0.25-vCPU/0.5-GB Fargate tasks plus temporary public IPv4 (recorded prior lab rate about USD 0.0129675/task-hour plus USD 0.005/address-hour), CloudWatch Logs ingestion/storage until deletion, incremental ECR storage at USD 0.10/GB-month, and SQS request/payload usage. The queues have no idle hourly fee and the first one million SQS requests/month are free; same-Region traffic is expected to be negligible. Cleanup must verify tasks/ENIs/public IPv4 absent, queues empty, temporary logs removed, and RDS stopped.

## Phase 6 real-project pre-deployment checkpoint — 2026-08-29

- Fresh baseline: expected `aws-learning` Identity Center caller and `ap-south-1` were verified. The user requested start of the existing private RDS instance; it is currently `starting`. ECS has zero services/running/pending tasks, and both Phase 6 queues have zero visible, in-flight, and delayed messages. No real-project API, outbox-publisher, or SQS-worker runtime is yet approved or launched.
- Budget signal: the current monthly budget is USD 5.00; it reports USD 2.784 actual and USD 3.161 forecast. It is a delayed warning, not a spending cap. ECR now has the retained Phase 5 image plus two Phase 6 images (about 0.360 GB total); after selecting one final known-good Phase 6 image, superseded images require a separate deliberate deletion decision.
- Proposed real-project runtime must use separate API, outbox-publisher, and SQS-worker processes and directly prove an API-created order reaches the SQS worker. Any temporary ALB/client path, Fargate tasks, public IPv4 addresses, CloudWatch log groups, and continued RDS compute must be explicitly priced, time-boxed, approved, then stopped/deleted/verified. No Phase 7+ resources are included.

## Phase 6 real-project runtime approval — 2026-08-29

- Fresh pre-launch verification found the expected `aws-learning` Identity Center caller in `ap-south-1`; private RDS is `available`; ECS has zero services/running/pending tasks; and both Phase 6 queues are empty. The budget remains USD 2.784 actual / USD 3.161 forecast against USD 5.00.
- User approved one 45-minute, real-project Phase 6 runtime: one temporary ALB/API path, one API task, one outbox-publisher task, one SQS-worker task, local frontend use only, and complete cleanup. No ECS service, NAT gateway, VPC endpoint, new database/secret/bucket/queue, or Phase 7+ resource is approved.
- Conservative incremental pre-tax cap is USD 0.12: one started ALB hour plus modest LCU/two ALB public IPv4 addresses about USD 0.0419; three 0.25-vCPU/0.5-GB Fargate tasks with temporary public IPv4 for up to 45 minutes about USD 0.0405 at recorded prior rates; RDS running time about USD 0.0263; plus up to USD 0.012 for logs/SQS/secret/transfer variance. ALB/public-IP, Fargate, RDS, and logs can bill while idle or waiting; SQS has no idle hourly fee. At session close stop tasks, delete listener/ALB/target group and temporary log groups, verify task/ALB ENIs and public IPv4 addresses absent, verify queues empty, stop RDS, and record actual verification. The local frontend has no AWS hosting cost.

## Phase 6 Lambda supplement checkpoint — 2026-09-02

- Fresh baseline: expected `aws-learning` Identity Center caller and `ap-south-1` were verified. ECS has zero services/running/pending tasks; the existing source and DLQ each report zero visible/in-flight/delayed messages; Lambda initially had zero functions/mappings; RDS is stopped/private with automatic restart about 2026-09-05 13:25 IST; no ALB, target group, public ENI, or Phase 6 log group existed.
- User explicitly approved one bounded Lambda lab: a 128-MB Node.js Lambda, one least-privilege execution role, one one-day log group, one SQS event-source mapping, no more than 20 synthetic messages, a 20-minute enabled-mapping limit, and a conservative USD 0.02 incremental pre-tax cap. No RDS/VPC/NAT/interface endpoint/ECS worker/database permission is included.
- Created and verified: one tagged one-day log group `/aws/lambda/order-platform-phase6-sqs-lab`; one tagged Lambda-only trust role `order-platform-phase6-lambda-sqs-lab-role`; an exact inline policy allowing only `ReceiveMessage`, `DeleteMessage`, and `GetQueueAttributes` on the Phase 6 source queue plus `CreateLogStream`/`PutLogEvents` on that exact log group; tagged `order-platform-phase6-sqs-lab` on Node.js 22.x/arm64 with no VPC, 128 MB, and 10-second timeout; and an enabled mapping from the exact source queue with batch size 2, no batching window, the minimum allowed maximum concurrency 2, and `ReportBatchItemFailures`. The source/DLQ were empty before enabling; no synthetic message has yet been sent.
- Billing/cleanup: Lambda bills invocation requests and GB-seconds; SQS has no hourly queue fee but mapping polling uses requests; CloudWatch Logs charges ingestion/storage. Expected use is within the published Lambda/SQS free tiers, but the USD 0.02 cap covers variance. Delete and verify the mapping, function, role/policy, and log group after evidence; confirm source and DLQ have no important/retrying messages. Official references: https://aws.amazon.com/lambda/pricing/ ; https://aws.amazon.com/sqs/pricing/ ; https://aws.amazon.com/cloudwatch/pricing/ .

## Phase 6 Lambda redrive extension checkpoint — 2026-09-02

- The original 20-minute enabled-mapping window elapsed. Fresh baseline at 20:25 IST found the mapping disabled, source queue empty, and one synthetic `partial-failure` message in the existing SQS DLQ. A repaired handler was directly verified queue-free to return an empty `batchItemFailures` list for that message type. No redrive or re-enable has occurred under this checkpoint.
- Unexpected exception: the excluded private RDS instance reported `starting` even though this Lambda lab has no RDS scope. An immediate stop request was rejected only because RDS is not yet `available`; retry the stop as soon as AWS permits and verify `stopped` before closing the session. This is not authorization to use RDS.
- Proposed final extension, requiring explicit approval after RDS is contained: redrive exactly the one synthetic DLQ message, enable the existing mapping for at most 10 minutes, verify its successful deletion, observe metrics, then delete mapping/function/Lambda log group/lesson role and policy. No additional messages or resource types. The prior USD 0.02 cap remains; added Lambda/SQS/log use is negligible, while unintended RDS time is separately tracked and must be stopped immediately.

- Approval: User explicitly approved the final redrive extension and a few additional minutes of the unexpectedly starting RDS instance, with stop required immediately after the redrive/cleanup evidence. The Lambda mapping remains disabled until the synthetic message is redriven to the source queue.

## Phase 6 Lambda supplement close-out — 2026-09-02

- Evidence: one successful synthetic message was invoked and deleted. One intentionally returned `partial-failure` stayed undeleted, retried under the source queue's existing redrive policy, reached the existing SQS DLQ after three receives, was diagnosed, safely redriven only after handler correction, then logged as recovered and deleted. CloudWatch recorded Lambda invocations with zero Lambda function errors; source queue visible depth briefly reached two while staged.
- Resources deleted and verified absent: the SQS event-source mapping, `order-platform-phase6-sqs-lab` Lambda function, `/aws/lambda/order-platform-phase6-sqs-lab` log group, and `order-platform-phase6-lambda-sqs-lab-role` plus its exact inline policy. ECS remained zero services/running/pending tasks. Both retained queues report visible=0, in-flight=0, delayed=0.
- RDS exception cleanup: the excluded private RDS instance unexpectedly started during the Lambda session. It was stopped immediately once AWS allowed the request and is now `stopped`/private, with automatic restart 2026-09-09 about 20:45 IST; review/start-stop/delete by 2026-09-08. The extra RDS time is delayed billable usage at the recorded about USD 0.021/hour; storage/backups/managed-secret residual continues separately.
- Cleanup status: VERIFIED for Lambda disposable runtime, temporary IAM/log resources, synthetic message cleanup, and RDS compute stop. Overall account cleanup remains PARTIAL because documented foundation, stopped RDS storage/backups/managed secret, ECR images, private S3 data, and the empty retained queues remain. No root credentials were inspected or modified. Do not start Phase 7. Phase 6 still requires its workbook review and any outstanding canonical ECS-worker database idempotency/crash-after-commit-before-ack evidence before it can be declared complete.

## Phase 6 workbook close-out — 2026-09-04

- Workbook review completed interactively. The user correctly explained the
  crash-before-ack redelivery window and idempotency, transactional outbox,
  visibility-timeout overlap, retryable versus poison failures, DLQ
  inspect/fix/redrive discipline, Lambda SQS mapping acknowledgement, and the
  asynchronous API boundary.
- Phase 6 is COMPLETE at confidence 3. The canonical ECS worker
  crash-after-database-commit-before-SQS-acknowledgement exercise is explicitly
  deferred as a future confidence-raising revisit, and is not claimed as
  demonstrated. No AWS resource was started, created, modified, or deployed
  for this close-out.

## Phase 7 local event-publishing checkpoint — 2026-09-09

- Local implementation and verification: added the versioned `OrderConfirmed`
  contract, transactional event-outbox write and rollback evidence, isolated
  EventBridge publisher with partial-failure handling, message-type routing,
  and required publisher configuration. The repository test suite, TypeScript
  checks, lint, formatting, and Git whitespace check all pass. No EventBridge,
  SNS, SES, Scheduler, Lambda, IAM, ECS, or other Phase 7 AWS resource was
  created or modified, and the outbox publisher was not started against AWS.
- RDS exception and cost: the retained private Single-AZ PostgreSQL
  `db.t4g.micro` instance was restarted by the user during local verification
  and was not needed by the Phase 7 AWS path. Running instance time is billable
  at the previously recorded approximate Mumbai rate of USD 0.021/hour, with
  delayed billing possible; the short window is expected to remain below about
  USD 0.02. The retained 20-GiB storage, backups, and managed secret continue
  to incur their previously documented residual costs while compute is stopped.
- Cleanup verification: the stop completed at approximately 2026-09-09 20:19
  IST. A direct `DescribeDBInstances` check returned `stopped`; its next
  automatic restart is 2026-09-16 20:19 IST. Review/start-stop/delete it no
  later than 2026-09-15. RDS compute cleanup is VERIFIED. Overall cleanup
  remains PARTIAL because the documented retained foundation, database
  storage/backups/secret, ECR images, private S3 data, and empty Phase 6 queues
  remain intentionally retained for later phases.

## Phase 7 EventBridge/SNS/SQS routing-lab close-out — 2026-09-09

```text
Date: 2026-09-09
Lesson/phase: Phase 7 — EventBridge content routing, SNS delivery envelopes, raw delivery, and SQS observation
Resources created manually by the user: Custom EventBridge bus order-platform-phase7-lab; enabled OrderConfirmed rule with one SNS target; Standard SNS topic; Standard SSE-SQS observer queue; confirmed SNS-to-SQS subscription and scoped resource policies
Evidence: One OrderConfirmed event matched and reached SQS through EventBridge and SNS. Delivery was inspected first with the SNS notification envelope and then with RawMessageDelivery enabled, where the EventBridge envelope became the direct SQS body. An OrderCancelled event was accepted by the bus but did not reach the queue because it did not match the OrderConfirmed rule. Repeated receipt of the undeleted OrderConfirmed message demonstrated SQS visibility timeout and at-least-once redelivery behavior.
Resources stopped: None; this lab created no compute, database, schedule, Lambda, load balancer, NAT Gateway, endpoint, or public IPv4 runtime
Resources deleted: EventBridge target removed; EventBridge rule deleted; SNS-to-SQS subscription deleted; SNS topic deleted; SQS queue and its remaining test message deleted; custom event bus deleted
Resources intentionally retained from this lab: None
Expected Phase 7 lab residual cost: USD 0 active or storage residual; only tiny delayed request/event/delivery usage, expected below the approved USD 0.01 pre-tax cap
Current billing signal: The same-session preflight budget signal was USD 0.975 actual and USD 3.361 forecast against the USD 5 monthly warning budget; billing is delayed and is not cleanup evidence
Verification: Exact custom bus, SNS topic, SNS subscription, and SQS queue are absent in ap-south-1; no Phase 7-prefixed rule exists on the default bus. The retained Phase 5 RDS instance remains stopped.
Phase 7 lab cleanup status: VERIFIED
Overall account cleanup status: PARTIAL — previously documented retained foundation, stopped RDS storage/backups/managed secret, ECR/S3 data, and empty Phase 6 queues remain intentionally retained and were not created by this lab
Unresolved Phase 7 lab items: None
```

## Phase 7 real-publisher integration gate — 2026-09-11

```text
Status: APPROVED by the user on 2026-09-11; no integration-lab AWS resource had been created at this checkpoint
Identity and Region: Expected aws-learning Identity Center caller and Mumbai ap-south-1 verified; account identifier omitted
Fresh baseline: Existing Phase 6 source queue and DLQ each report zero visible, in-flight, and delayed messages. Retained Phase 5 RDS is stopped with automatic restart scheduled for 2026-09-16 20:19 IST. No Phase 7-prefixed EventBridge bus, SNS topic, or SQS queue exists. Docker Desktop was initially stopped and the user then started it.
Purpose: Prove that the real local API/worker/outbox-publisher flow emits its application-generated OrderConfirmed event through EventBridge, with a direct EventBridge-to-SQS observer target, and inspect the event/correlation/causation fields.
Approved temporary AWS resources: Custom bus order-platform-phase7-integration-lab; rule order-platform-phase7-order-confirmed-integration matching source com.order-platform.orders and detail type OrderConfirmed; Standard SSE-SQS queue order-platform-phase7-event-observer-lab; exact EventBridge-to-SQS resource policy
Approved traffic: At most three application-generated/test events; existing Phase 6 queues may be used only after a fresh empty-state check
Billing and cap: EventBridge custom ingestion/target delivery and SQS requests are usage-billed; the bus, rule, and queue have no hourly idle charge. Conservative incremental pre-tax cap USD 0.01.
Explicit exclusions: No SNS, SES, Lambda, Scheduler, ECS/Fargate, RDS start, ALB, NAT Gateway, endpoint, public IPv4, new database, secret, bucket, or email
Required cleanup: Stop local processes/containers as appropriate; remove the EventBridge target; delete the rule, observer queue, and custom bus; verify exact absence; verify retained Phase 6 source/DLQ empty and retained RDS stopped; record cleanup status
Approval: User explicitly approved the temporary three-resource integration lab and USD 0.01 cap
```

## Phase 7 real-publisher integration close-out — 2026-09-11

```text
Outcome: VERIFIED. One real local API-created order followed the complete asynchronous path: transactional fulfill_order outbox record, existing Phase 6 source queue, SQS worker completion, transactional OrderConfirmed outbox record, EventBridge publication, exact rule match, and direct delivery to the temporary SQS observer.
Database evidence: The new order reached ready_to_ship and its job reached completed. Both fulfill_order and OrderConfirmed outbox messages were published in exactly one attempt. The domain eventId equaled the OrderConfirmed outbox ID; correlationId equaled the order ID; causationId equaled the original fulfill_order outbox ID; order amount and INR currency matched.
AWS delivery evidence: The observer held exactly one raw EventBridge envelope. Existing Phase 6 source queue and DLQ returned to zero visible, in-flight, and delayed messages. The queue resource policy preserved owner access and allowed only events.amazonaws.com to call sqs:SendMessage from the exact rule and source account.
Resources deleted: EventBridge target removed; integration rule deleted; observer queue and its event deleted; custom integration bus deleted
AWS cleanup verification: Exact integration bus and observer queue are absent in ap-south-1; the Phase 7 integration rule prefix is absent on the default bus; retained Phase 6 source/DLQ remain empty; retained Phase 5 RDS remains stopped
Local cleanup: API, outbox publisher, and SQS worker have no matching process or port-3000 listener. Local PostgreSQL container is stopped with exit code 0; named volume order-platform_postgres_data remains preserved intentionally for future local development at USD 0 AWS cost.
Expected incremental AWS cost: Below the approved USD 0.01 pre-tax cap; only tiny delayed EventBridge/SQS request usage may appear
Billing signal: Same-session budget check reported USD 1.221 actual and USD 3.446 forecast against the USD 5 warning budget; billing is delayed and is not cleanup evidence
Phase 7 integration-lab cleanup status: VERIFIED
Overall account cleanup status: PARTIAL — previously documented retained foundation, stopped RDS storage/backups/managed secret, ECR/S3 data, and empty Phase 6 queues remain intentionally retained
Unresolved integration-lab items: None
```

## Phase 7 operational SNS approval gate — 2026-09-12

```text
Status: APPROVED by the user on 2026-09-12, including the corrected SNS subject behavior; no resource has been created at this checkpoint
Identity and Region: Expected aws-learning IAM Identity Center caller and Mumbai ap-south-1 verified; account identifier omitted
Fresh baseline: No custom EventBridge bus, Phase 7 rule, SNS topic, Lambda function, Scheduler schedule, Phase 7 IAM role, or Phase 7 log group exists. Both retained Phase 6 queues are empty. ECS has zero services/running/pending tasks. Zero ALB, target group, active NAT Gateway, Elastic IP, VPC endpoint, or public ENI exists. Retained RDS is stopped/private with automatic restart about 2026-09-16 20:19 IST. SES is enabled but sandboxed with zero identities; SES is excluded from this gate.
Billing signal: USD 1.303 actual and USD 3.371 forecast against the USD 5 monthly warning budget at its 2026-09-12 update; billing is delayed and is not cleanup evidence
Approved resources: Temporary custom bus order-platform-phase7-notifications-lab; exact OrderConfirmed rule order-platform-phase7-order-confirmed-operations; Standard topic order-platform-phase7-operations-lab; one email subscription whose address remains outside repository evidence
Approved externally visible actions: One AWS SNS subscription-confirmation email and, only after confirmation, one operational email whose subject is generated by the EventBridge-to-SNS email integration and whose transformed body begins [TEST] AWS Order Platform operational notification and contains a sanitized OrderConfirmed lab message with no credentials or personal data. EventBridge target input transformation controls the body but does not provide the SNS email Subject parameter.
Billing and cap: EventBridge custom ingestion plus SNS requests/email delivery are usage-billed with no hourly idle fee. The bounded proof has a conservative incremental pre-tax cap of USD 0.01.
Explicit exclusions: No SES identity or SES send, Lambda, Scheduler, IAM role, CloudWatch log group, RDS start, ECS/Fargate task, ALB, NAT Gateway, endpoint, public IPv4, database/schema change, S3 object, or Phase 8 resource
Required cleanup: Remove the EventBridge target; delete the rule, email subscription, SNS topic, and custom bus; verify exact absence; verify retained queues empty and RDS stopped; record delayed-billing caveat and separate disposable versus overall cleanup status
Approval: User explicitly approved the SNS lab resources and USD 0.01 cap, then separately approved the corrected AWS-generated-subject/transformed-body behavior before creation or sending.
```

## Phase 7 operational SNS aborted-lab close-out — 2026-09-12

```text
Outcome: The user stopped the exercise after the subscription form rejected a typed topic name as an invalid ARN. Fresh inventory showed that the intended Standard topic had never been created; the form text was not a selected ARN. The only lab resource was the earlier mistaken FIFO topic, which had zero subscriptions and zero messages.
Emergency cleanup: The exact mistaken FIFO topic was deleted and both approved topic names were verified absent. No subscription-confirmation or operational email was sent.
AWS verification: Zero custom EventBridge buses, Phase 7 rules, Lambda functions, and Scheduler schedules exist. RDS remains stopped. ECS has zero running/pending tasks. Both retained Phase 6 source and DLQ queues report zero visible, in-flight, and delayed messages.
Expected incremental cost: Effectively USD 0 apart from any tiny delayed control-plane/request usage; no notification delivery occurred
Phase 7 aborted-lab cleanup status: VERIFIED
Overall account cleanup status: PARTIAL — previously documented retained foundation, stopped RDS storage/backups/managed secret, ECR/S3 data, and empty Phase 6 queues remain intentionally retained
Unresolved item: The operational SNS email path remains undemonstrated.
Resumption: The user immediately asked to continue the same operational SNS lab. The previously approved resource scope, externally visible actions, cleanup plan, and USD 0.01 cap remain unchanged; no additional resource or action is authorized.
```

## Phase 7 operational SNS successful close-out — 2026-09-12

```text
Outcome: VERIFIED. One synthetic OrderConfirmed v1 event was accepted by the temporary custom EventBridge bus. The enabled rule matched only source com.order-platform.orders and detail type OrderConfirmed, transformed the event into a sanitized operational message, and targeted the Standard SNS topic. The topic delivered one email to its single confirmed subscription; the user supplied the received body as evidence. No email address, account identifier, subscription ARN, or unsubscribe URL is retained in repository evidence.
Permission evidence: Initial read-only verification found that target creation had not added an SNS resource-policy grant. Before the event was sent, the existing owner policy was preserved and one statement was added allowing only events.amazonaws.com to call SNS:Publish on the exact topic when aws:SourceArn equals the exact Phase 7 rule ARN. Post-change verification found exactly one such scoped statement.
Failure/diagnostic evidence: A first mistaken FIFO topic had been safely deleted before the successful attempt. The later invalid-ARN subscription error was diagnosed as typing a topic name when the intended Standard topic did not yet exist. During final cleanup, an initial automated deletion command was rejected before execution because its bus name was mistyped; exact targets were re-resolved read-only and then deleted individually in dependency order.
Resources deleted: EventBridge target removed; rule deleted; SNS Standard topic and its email subscription deleted; custom event bus deleted. The earlier mistaken FIFO topic was already deleted.
AWS cleanup verification: Both exact topic variants and the exact custom bus are absent; no Phase 7 rule exists on the default bus; zero Lambda functions, Lambda event-source mappings, Scheduler schedules, SES identities, or Phase 7 log groups exist. Both retained Phase 6 queues report zero visible, in-flight, and delayed messages. ECS has zero running/pending tasks. Zero public ENIs, VPC endpoints, active NAT Gateways, EIPs, ALBs, or target groups exist. Retained RDS remains stopped/private with automatic restart about 2026-09-16 20:19 IST and must be reviewed by 2026-09-15.
Expected incremental cost: Below the approved USD 0.01 pre-tax cap; only one custom event plus tiny SNS request/email-delivery usage may appear later
Billing signal: Preflight reported USD 1.303 actual and USD 3.371 forecast against the USD 5 warning budget; billing is delayed and is not cleanup evidence
Phase 7 operational SNS disposable cleanup status: VERIFIED
Overall account cleanup status: PARTIAL — previously documented retained foundation, stopped RDS storage/backups/managed secret, ECR/S3 data, and empty Phase 6 queues remain intentionally retained
Remaining Phase 7 work: SES transactional order email, scheduled low-stock Lambda/RDS/S3 report, Scheduler retry/DLQ, reporting-period idempotency, schema-evolution compatibility, independent consumer failure, ADR, and workbook review
```

## Phase 7 SES transactional-email approval gate — 2026-09-13

```text
Status: APPROVED by the user on 2026-09-13; no SES identity or message has been created/sent at this checkpoint
Identity and Region: Expected aws-learning IAM Identity Center caller and Mumbai ap-south-1 verified; account identifier omitted
Fresh baseline: SES production access false (sandbox), sending enabled, enforcement healthy, daily maximum 200, sent in last 24 hours zero, and identity count zero. No custom EventBridge bus, SNS topic, Lambda function, or Scheduler schedule exists. Retained RDS is stopped/private with automatic restart about 2026-09-16 20:19 IST and review deadline 2026-09-15. Both retained Phase 6 queues are empty.
Billing signal: USD 1.424 actual and USD 3.381 forecast against the USD 5 monthly warning budget at its 2026-09-13 update; billing is delayed and is not cleanup evidence
Approved AWS resource: One SES email-address identity, entered privately in the console and used as both sandbox sender and recipient; address must remain out of Git, logs, screenshots, and repository evidence
Approved externally visible actions: One SES identity-verification email and, only after verification and local consumer validation, one transactional email with subject [TEST] Your order is confirmed — AWS learning and body containing a lab order UUID, INR 125.00, and No action required
Implementation scope: Local OrderConfirmed-to-SES consumer with tests plus a compatible additive event-schema evolution exercise; no deployed Lambda or other AWS compute
Billing and cap: SES identity has no idle fee; outbound email is usage-billed. One bounded transactional message plus verification remains under a conservative USD 0.01 incremental pre-tax cap.
Explicit exclusions: No production-access request, domain/DNS identity, dedicated IP, Virtual Deliverability Manager paid option, EventBridge/SNS resource, Lambda deployment, Scheduler, IAM role, CloudWatch log group, RDS start, ECS/Fargate, ALB, NAT Gateway, endpoint, public IPv4, S3 object, or Phase 8 resource
Required cleanup: Delete the SES identity after evidence; verify identity count zero, no Phase 7 runtime, retained queues empty, and RDS stopped; record delivered-message irreversibility and delayed-billing caveat
Approval: User approved this exact identity/message scope, local implementation, cleanup, and USD 0.01 cap
```

## Phase 7 SES transactional-email implementation checkpoint — 2026-09-13

```text
Outcome: Local implementation VERIFIED. The user manually added the SES v2 SDK, OrderConfirmed-to-SES consumer, four focused tests, and one bounded manual lab runner. TypeScript type checking and compilation pass. Direct execution of the compiled focused test file passes 4/4: valid delivery command, invalid-schema rejection before the side effect, additive-field compatibility, and missing-MessageId failure handling. The ordinary Node test-runner command was blocked by a local Windows spawn EPERM restriction before tests executed; this is not counted as an application failure.
AWS evidence: Read-only SES account verification in ap-south-1 reports sending enabled, production access false (sandbox), exactly 1 message sent in the preceding 24 hours, and a daily maximum of 200. No second message was sent during verification. The email address and SES message identifier are intentionally omitted.
Recipient behavior: For this sandbox lab, SES_LAB_EMAIL is intentionally used as both FromEmailAddress and the sole ToAddress. A production design will separate the verified sender identity from the customer recipient and will not require each customer to create an SNS-style subscription.
Cost status: The single usage-billed message remains within the approved USD 0.01 incremental pre-tax cap; billing signals can be delayed.
Cleanup status: PARTIAL. On 2026-09-14 the user explicitly approved retaining the verified/tagged SES identity, which has no idle identity fee, only through the scheduled-report proof to avoid repeating verification. No additional email send is authorized by this retention decision. Delete and verify the identity absent at Phase 7 close, no later than 2026-09-16.
```

## Phase 7 scheduled low-stock report local checkpoint — 2026-09-14

```text
Outcome: Local implementation checkpoint VERIFIED. The user manually implemented a deterministic low-stock report document and reporting-period S3 key, the inventory query repository, dependency-injected orchestration, conditional S3 storage with checksum and short-lived download URL, SES report notifier, and the Scheduler-facing Lambda handler with Asia/Kolkata reporting-date conversion.
Idempotency and failure semantics: Repeated runs for one reporting period target the same S3 key and use If-None-Match *, so the report is not overwritten. A retry after report storage can attempt notification again; report storage is idempotent while SES notification remains at-least-once and can rarely duplicate.
Verification: Worker TypeScript checking, ESLint, and repository formatting checks pass. Direct execution of the focused compiled tests passes 23/23 across report generation, orchestration, S3 adapter, SES notifier, Lambda handler, and the prior transactional-order SES consumer. The normal multi-file Node test runner remains subject to the previously recorded local Windows spawn EPERM restriction.
AWS impact: No Lambda, Scheduler, S3 object, email, database connection, or other AWS operation was created or invoked by this local implementation. The retained RDS remains stopped and the separately approved verified SES identity remains retained only through the scheduled-report proof.
Remaining local work: Compose the real repository/storage/notifier into the exported Lambda entry point, add strict environment configuration, and run the real PostgreSQL repository integration test locally before any AWS deployment gate.
```

## Phase 7 session safety checkpoint — 2026-09-16

```text
Status: EMERGENCY STOP VERIFIED
Identity and Region: Expected aws-learning Identity Center caller and Mumbai ap-south-1 were used for the read-only audit; account identifier omitted.
RDS finding: The retained private RDS instance exceeded AWS's seven-day stopped limit and automatically started at about 2026-09-16 21:03 IST. Events recorded automatic start, restart, a backup, and a managed-master-credential reset transition. At 21:55 IST it was resetting-master-credentials; a stop request was accepted shortly afterward and the instance entered stopping. AutomaticRestartTime was null during the transition. Compute is billable from automatic start until stop completion; storage/backups/managed-secret residual remains separately billable.
Immediate action and result: Mandatory emergency-stop procedure activated. No Phase 7 deployment, Lambda, Scheduler, S3 report object, or new email was started. AWS accepted the stop request and later verified the instance stopped and private. Its next automatic restart is 2026-09-23 22:04 IST; review/start-stop/delete by 2026-09-22.
Estimated unexpected runtime cost: The automatic-start event occurred about 21:03 IST and stop completion was reflected by the new 22:04 IST restart anchor, approximately one hour of db.t4g.micro compute or about USD 0.021 before tax at the previously recorded Mumbai rate, plus any ordinary backup/API usage. Billing is delayed and may differ slightly.
Other Phase 7 state: One previously approved SES sandbox identity remains retained for the scheduled-report proof. Phase 7 Lambda-function and Scheduler-schedule counts are zero.
Cleanup status: VERIFIED for the unexpected RDS runtime; overall account cleanup remains PARTIAL for documented retained storage, backup, managed-secret, ECR/S3/queue/foundation state, and the temporarily retained SES identity.
```

## Phase 7 local packaging and network-design checkpoint — 2026-09-17

```text
Outcome: Local PostgreSQL repository integration passed against Docker, worker type checking passed, and the low-stock Lambda composition root was bundled locally into an ignored deployment ZIP. No deployment was attempted.
AWS verification: Expected aws-learning Identity Center caller and Mumbai ap-south-1 verified. Retained RDS is stopped and private; its next automatic restart is 2026-09-23 22:04 IST, so review/start-stop/delete by 2026-09-22. The retained learning VPC has zero VPC endpoints and zero active/pending NAT Gateways. Zero Phase 7/low-stock Lambda functions, Scheduler schedules, Phase 7 queues, or Phase 7/low-stock S3 buckets exist.
Local cleanup: Docker Compose reports zero running project containers.
Retained Phase 7 state: One previously approved, tagged SES sandbox email identity remains for the scheduled-report proof. It has no idle identity charge and does not authorize another email send. Delete immediately after proof, or review/delete by 2026-09-20 if the proof is not resumed.
Next learning checkpoint before deployment: Revisit network interfaces and ENIs; route-table VPC ownership versus subnet association; private DNS versus public DNS; Route 53 Resolver scope; and whether DNS resolution requires workload IAM permission.
Cleanup status: VERIFIED for disposable Phase 7 runtime; overall account cleanup remains PARTIAL because the documented foundation/data and SES identity are intentionally retained.
```

## Phase 7 scheduled-report deployment approval gate — 2026-09-20

```text
Status: APPROVED by the user on 2026-09-20; no deployment resource had been created or existing resource started at this checkpoint.
Identity and Region: Expected aws-learning Identity Center caller and Mumbai ap-south-1 freshly verified; account identifier omitted.
Fresh baseline: Retained private Single-AZ db.t4g.micro RDS is stopped in ap-south-1b with automatic restart 2026-09-23 22:04 IST. Zero Phase 7/low-stock Lambda functions, VPC endpoints, Scheduler schedules, Phase 7 queues, or Phase 7/low-stock buckets exist. One previously approved SES sandbox identity remains. Budget reports USD 2.186 actual and USD 3.471 forecast against the USD 5 warning threshold; billing is delayed and the budget is not a cap or cleanup proof.
Local readiness: The ignored Lambda ZIP contains index.mjs, index.mjs.map, and the AWS RDS global CA bundle. Local repository integration, focused tests, type checking, lint, formatting, composition, and packaging were previously verified.
Approved non-hourly foundation: Dedicated Lambda and endpoint security groups; exact Lambda execution role/policy; exact Scheduler invocation role/policy; one private Phase 7 report bucket; one S3 gateway endpoint; one one-day Lambda log group; one 512-MB Node.js Lambda with no provisioned concurrency; one Scheduler DLQ; and temporary schedules required for one controlled delivery failure and one successful invocation.
Approved cost-sensitive runtime: One Secrets Manager and one SES API interface endpoint, each in one ap-south-1b subnet/AZ for at most three started endpoint-hours; start the existing RDS instance for at most 90 running minutes; invoke Lambda at most ten times; send at most three report emails to the already verified identity.
Billing: Interface endpoints bill per endpoint-AZ-hour with partial hours rounded to full hours plus processed data; deletion ends hourly billing. RDS compute is recorded at about USD 0.021/running hour. Lambda, S3, SES, Scheduler, SQS, Secrets Manager calls, and CloudWatch Logs are usage-billed; S3 gateway endpoints have no additional endpoint charge. No Lambda provisioned concurrency is allowed.
Conservative incremental cap: USD 0.20 pre-tax, excluding already documented retained RDS storage/backups/managed-secret, ECR, and S3 baseline costs.
Explicit exclusions: No NAT Gateway, Elastic/public IPv4, ECS/Fargate, load balancer, new database, new secret, production SES request, dedicated IP, Multi-AZ conversion, or Phase 8 resource.
Break rule: Take the planned approximately 25-minute break before interface endpoints are created and before RDS is started; schedules must remain absent/disabled during the break.
Mandatory cleanup: Disable/delete schedules first; stop RDS and verify stopped with a new automatic-restart deadline; delete both interface endpoints and verify endpoint ENIs absent; delete the S3 gateway endpoint; delete Lambda/log group, temporary roles/policies, DLQ/messages, report object/bucket, and temporary security groups/rules; delete the retained SES identity; verify zero Phase 7 Lambda, schedules, endpoints, queues, buckets, and SES identities; record delayed-billing caveat and separate disposable-runtime versus overall cleanup status.
Approval: User explicitly approved this complete scope, USD 0.20 cap, maximum 90-minute RDS runtime, maximum three started hours per interface endpoint, maximum ten Lambda invocations, maximum three report emails, controlled Scheduler failure/success proof, and mandatory cleanup.
```

## Phase 7 scheduled-report network security checkpoint — 2026-09-20

```text
Configuration verification: The retained Phase 5 database security group permits inbound PostgreSQL/TCP 5432 from both the existing ECS task security group and the dedicated Phase 7 low-stock Lambda security group. The Phase 7 Lambda security group has no inbound rules and limits outbound database access to the database security group, HTTPS access to the endpoint security group, and HTTPS access to the Mumbai S3 managed prefix list. The endpoint security group accepts inbound HTTPS/TCP 443 only from the Lambda security group and has no outbound rules; stateful return traffic is implicit.
Cost/state: Security-group rules have no direct service charge. No Lambda, VPC endpoint, S3 bucket, schedule, queue, or other Phase 7 runtime resource was created by this checkpoint, and RDS was not started.
Cleanup obligation: Remove the temporary database ingress rule and delete both Phase 7 security groups after dependent Lambda and endpoint ENIs are removed; verify their exact absence at Phase 7 close.
Status: CREATED — CONFIGURATION VERIFIED
```

## Phase 7 scheduled-report pre-runtime breakpoint — 2026-09-20

```text
Verified foundation: Dedicated Lambda and endpoint security groups, private report bucket, restricted S3 gateway endpoint, scoped Lambda and Scheduler roles, one-day Lambda log group, encrypted one-day Scheduler DLQ, and the fully configured Lambda function exist. The deployed ZIP hash matches the local artifact. Lambda is attached only to private-b through its dedicated security group and has all intended non-secret environment settings.
Runtime state: Lambda has zero log streams and has not been invoked. Provisioned concurrency and function URL are absent. Scheduler schedules and interface endpoints remain absent. RDS remains stopped with automatic restart scheduled for 2026-09-23 22:04 IST.
Cost state: No approved hourly interface-endpoint or RDS runtime window has started. Existing foundation has no fixed hourly compute charge; ordinary storage/request charges remain as documented.
Next action: Take the planned approximately 25-minute break. After resuming, create the one-AZ Secrets Manager and SES interface endpoints, start the maximum-three-hour endpoint clocks, then start RDS only when immediate invocation testing is ready.
Cleanup status: PARTIAL because the documented Phase 7 foundation is intentionally retained for same-session proof; no paid runtime cleanup is currently required.
```

## Phase 7 scheduled-report paid-runtime checkpoint — 2026-09-20

```text
Interface endpoints: Secrets Manager endpoint vpce-0ad015aafe865fe0a became available with its one private-b ENI; conservative clock start 22:03:18 IST and hard delete deadline 01:03:18 IST on 2026-09-21. SES API endpoint vpce-0e4900f2311bebc99 was created at 22:10:47 IST, then corrected from zero subnets/default SG to one private-b ENI and the dedicated endpoint SG; conservative hard delete deadline 01:10:47 IST on 2026-09-21.
RDS runtime: CloudTrail records StartDBInstance for order-platform-phase5-postgres at 21:59:05 IST. The instance is available, private, Single-AZ db.t4g.micro in ap-south-1b with the retained database SG. The approved 90-minute maximum gives a hard stop-request deadline of 23:29:05 IST on 2026-09-20.
RDS stop checkpoint: User submitted Stop temporarily before the deadline; state was `stopping` and private at 23:11:19 IST and later verified `stopped`. The next automatic restart is 2026-09-27 23:16:38 IST, so review/stop/delete by 2026-09-26. The restart anchor implies stop completion around 23:16:38 IST and approximately 77 minutes 33 seconds from the conservative 21:59:05 start event, below the approved 90-minute maximum. CloudTrail had not yet indexed the new StopDBInstance event at the initial stop check.
Current proof state: Lambda remains configured but not yet invoked; schedules remain absent. Proceed directly to on-demand proof, Scheduler success/failure evidence, then disable/delete schedules first and stop RDS before endpoint cleanup.
Cleanup status: NOT YET DUE — PAID RUNTIME ACTIVE; mandatory same-session cleanup remains required.
```

## Phase 7 low-stock first-invocation failure — 2026-09-20

```text
Invocation budget: Invocation 1 of maximum 10 used.
Observed failure: Lambda initialization failed before the exported handler ran with `Dynamic require of "node:https" is not supported`, originating from bundled CommonJS Smithy/AWS SDK code inside the ESM index.mjs artifact.
Root cause: The esbuild ESM bundle did not provide a Node createRequire bridge for bundled CommonJS dependencies that dynamically require built-in modules.
Impact evidence: One Lambda log stream exists. The report bucket contains zero low-stock objects, so the orchestration did not reach S3 or SES and no report email was sent. RDS and both interface endpoints remain active under their existing deadlines.
Repair: Rebuilt the ignored deployment artifact with an ESM banner importing createRequire from node:module and defining require from import.meta.url; Node syntax validation passed; the loose and ZIP-embedded index.mjs hashes matched. Uploaded ZIP size 1,147,773 bytes and base64 SHA-256 `VUPjELN/uONUrlXSH6Dcr7RZxn0y5bkQOAr4/HzyiSY=` exactly match Lambda. Application source behavior was unchanged.
Status: FAILURE DIAGNOSED — REPAIRED ARTIFACT VERIFIED; ONE RETRY PENDING
```

## Phase 7 low-stock on-demand success — 2026-09-20

```text
Invocation budget: Invocation 2 of maximum 10 used.
Result: Request 6877a4d6-5b1f-4546-814c-157225e8ef94 completed successfully. Handler duration was 410.29 ms; billed duration 956 ms including 545.41 ms initialization; configured memory 512 MB and maximum used 116 MB.
Evidence: Structured logs show invocation started and completed. S3 object reports/low-stock/2026-09-20.json exists at 442 bytes with application/json content type, AES256 SSE-S3 encryption, and ETag 067e5a76daab3d4d543c847f9a3d3a5c. Scheduler DLQ remains empty. RDS remains available. The user confirmed that the SES report email arrived and its short-lived presigned S3 link successfully opened the private report object; SendEmail was not returned by CloudTrail Event History.
Next proof: Invoke the identical reporting period once more, expecting storageOutcome already-exists and an unchanged S3 ETag/LastModified; this intentionally consumes one additional invocation and up to one additional approved report email.
Duplicate-period evidence: Invocation 3 of maximum 10, request 8a692d18-c800-4965-91ba-1bd5b40899df, completed successfully in 479.02 ms with 480 ms billed duration and no cold-start initialization. Afterward, the object retained the original 2026-09-20T17:14:09Z LastModified value, ETag 067e5a76daab3d4d543c847f9a3d3a5c, 442-byte size, application/json type, and AES256 encryption. This verifies the conditional S3 write prevented a conflicting overwrite for the same reporting period.
Status: ON-DEMAND EXECUTION AND DUPLICATE-PERIOD IDEMPOTENCY VERIFIED
```

## Phase 7 one-time Scheduler success checkpoint — 2026-09-20

```text
Schedule: order-platform-phase7-low-stock-success in the default group; created 23:00:18 IST; enabled for one-time execution at 23:05:00 Asia/Calcutta (IANA alias of Asia/Kolkata); flexible window off; ActionAfterCompletion DELETE.
Target: Exact low-stock Lambda ARN using the scoped Scheduler role; input uses the Scheduler context value `<aws.scheduler.scheduled-time>`; exact Scheduler DLQ configured; maximum event age 60 seconds. AWS saved zero retry attempts on this success schedule, so the controlled-failure schedule will carry the required one-retry configuration instead.
Tag note: EventBridge Scheduler supports tags on schedule groups, not individual schedules; the default group is used and no schedule-level tags exist.
Observed effect: Scheduler invoked Lambda as invocation 4 of maximum 10 at 23:05 IST. Request 3e6ab019-44d1-43be-a93e-57b4b114ca22 completed in 389.14 ms with 913 ms billed duration, 523.49 ms initialization, and 117 MB maximum memory. The same-period S3 object retained its original LastModified, ETag, and 442-byte size; the DLQ remained empty. GetSchedule returned ResourceNotFound afterward, verifying ActionAfterCompletion DELETE removed the schedule.
Status: SCHEDULED SUCCESS VERIFIED — SCHEDULE AUTO-DELETED
```

## Phase 7 controlled Scheduler delivery failure — 2026-09-20

```text
Failure injection: Removed only lambda:InvokeFunction from the existing Scheduler role inline policy while preserving exact sqs:SendMessage permission to the Scheduler DLQ. The role trust policy remains scoped to this account and the default schedule group.
Schedule: order-platform-phase7-low-stock-failure; enabled one-time execution at 23:20:00 Asia/Calcutta; flexible window off; exact Lambda target and Scheduler context payload; 60-second maximum event age; exactly one retry; exact DLQ; ActionAfterCompletion DELETE.
Observed result: DLQ message 8a104881-5755-4d08-8962-7dd67553b584 recorded `AccessDeniedException` because the assumed Scheduler role had no identity-based permission for `lambda:InvokeFunction` on the exact function. The payload was valid and not truncated; execution id 676ab01c-c8ff-48ee-be78-78ea04ac445e and scheduled time 2026-09-20T17:50:00Z were preserved. No new Lambda log stream appeared, proving the function did not run. The schedule auto-deleted. One retry was configured, but the DLQ message reports `RETRY_ATTEMPTS` 0; the 60-second event-age limit expired before an actual retry, demonstrating that the retry setting is a maximum rather than a guarantee.
Status: CONTROLLED DELIVERY FAILURE AND DLQ DIAGNOSIS VERIFIED — TEST MESSAGE PENDING CLEANUP
```

## Phase 7 scheduled-report final close-out — 2026-09-20

```text
Cleanup action: Disabled/deleted temporary schedules first, stopped the retained RDS instance, then removed the three VPC endpoints, Lambda function/log group, report object/bucket, Scheduler DLQ/message, SES identity, temporary IAM policies/roles, temporary database ingress rule, and both temporary security groups. The Lambda-managed ENI was allowed to detach normally and was later verified absent.
AWS verification: Fresh ap-south-1/account inventories contain zero Phase 7/low-stock Lambda functions, Lambda log groups, S3 buckets, SQS queues, SES identities, Scheduler schedules, IAM roles, SNS topics, custom EventBridge buses/rules, VPC endpoints, endpoint/Lambda ENIs, or Phase 7 security groups. The private route table contains only the VPC-local route. The retained database security group again permits PostgreSQL only from the retained ECS task security group. A broader runtime sweep also found zero ECS services/running/pending tasks, load balancers, target groups, active NAT Gateways, Elastic IPs, or public ENIs; the empty Phase 4 ECS cluster remains as retained foundation.
Retained state: The existing Phase 5 RDS instance is intentionally retained, stopped, private, and storage/backup/managed-secret charges continue. Its next automatic restart is 2026-09-27 23:16:38 IST; review and stop again or delete by 2026-09-26. The locally ignored Lambda deployment ZIP remains only as a local learning artifact and has no AWS cost.
Cost note: RDS ran for approximately 77 minutes 33 seconds, below the approved 90-minute cap. Interface endpoints were deleted before their three-hour limits. Prior RDS, interface-endpoint, Lambda, S3, SQS, SES, Scheduler, CloudWatch Logs, EventBridge, and SNS usage can appear later because billing is delayed. Delivered emails cannot be recalled.
Disposable Phase 7 cleanup status: VERIFIED
Overall account cleanup status: PARTIAL — documented retained foundation/data remains, including stopped RDS storage/backups/managed secret, and must continue to follow its review deadline.
```

## Phase 8 static-edge deployment approval gate — 2026-09-24

```text
Status: APPROVED by the user on 2026-09-24; no Phase 8 AWS resource had been created at this checkpoint.
Identity and Region: Expected aws-learning Identity Center caller and Mumbai ap-south-1 freshly verified. CloudFront is global; its private S3 origin will remain in ap-south-1.
Fresh baseline: Zero CloudFront distributions, zero viewer ACM certificates in us-east-1, zero Phase 8/frontend S3 buckets, zero load balancers, zero ECS services, and zero running ECS tasks. The retained private RDS instance is stopped with automatic restart 2026-09-27 23:16:38 IST, so review/start-stop/delete by 2026-09-26. Budget reports USD 2.812 actual and USD 3.563 forecast against the USD 5 warning threshold; billing is delayed and the budget is not a cap or cleanup proof.
Local readiness: The production frontend build contains index.html plus one hashed JavaScript and one hashed CSS asset, approximately 217 KB total. The bundle uses the intended relative /api base and contains no localhost, 127.0.0.1, or hard-coded backend endpoint.
Approved resources: One private general-purpose S3 bucket named order-platform-phase8-frontend-992382645171; one OAC named order-platform-phase8-frontend-oac using always-signed requests; and one pay-as-you-go CloudFront distribution commented order-platform-phase8-frontend using the AWS-provided hostname, Price Class 200, default root index.html, HTTP-to-HTTPS redirect, and GET/HEAD only.
Object policy: index.html uses Content-Type text/html and Cache-Control no-cache. The hashed JavaScript and CSS assets use their correct content types and Cache-Control public,max-age=31536000,immutable. No invalidation is planned for this session.
Security: All S3 Block Public Access settings remain enabled; Bucket owner enforced; website hosting and versioning disabled; SSE-S3 enabled. The bucket is readable only through CloudFront OAC after its exact distribution-scoped bucket policy is installed.
Billing: S3 storage and requests and CloudFront requests/data transfer are usage-billed. CloudFront pay-as-you-go has no fixed hourly distribution charge and eligible usage may fall within its monthly free allowance, which is not a spending cap. Expected S3 storage is about USD 0.000005/month and three upload PUTs about USD 0.000015. Conservative incremental session cap is USD 0.05 pre-tax.
Explicit exclusions: No ACM certificate, custom DNS, Cloudflare change, ALB, ECS/Fargate runtime, RDS start, WAF, CloudFront access logging, S3 website endpoint, public bucket access, or invalidation.
Session-close cleanup: Disable the distribution; wait until status is Deployed and Enabled is false; verify its public hostname no longer serves; verify the bucket remains private; retain only the disabled distribution, OAC, private bucket, and three small files through 2026-09-26; re-verify the retained RDS instance is stopped before its automatic-restart deadline.
Final removal: Disable and delete the distribution, delete the OAC, empty and delete the bucket, then freshly verify all exact Phase 8 resources absent. If the lesson is not resumed, perform this by the 2026-09-26 review date.
Approval: User explicitly approved this complete scope, USD 0.05 cap, stated exclusions, session-close disablement and verification, and temporary retention through 2026-09-26.
```

## Phase 8 private frontend bucket checkpoint — 2026-09-24

```text
Resource: order-platform-phase8-frontend-992382645171, created manually by the user in ap-south-1.
Verified configuration: General-purpose bucket; BucketOwnerEnforced ownership; all four S3 Block Public Access controls true; default AES256 SSE-S3 encryption; versioning unconfigured/disabled; exact four learning tags present.
Negative verification: S3 returned NoSuchWebsiteConfiguration and NoSuchBucketPolicy, confirming website hosting and a bucket policy are absent. No frontend objects had been uploaded at this checkpoint.
Cost/cleanup: Only S3 request usage exists while empty. The approved three-object upload is expected to add approximately 217 KB. Verify privacy at session close, retain only through 2026-09-26, then empty/delete and verify absence during final removal.
Status: CREATED — PRIVATE CONFIGURATION VERIFIED; UPLOAD PENDING
```

## Phase 8 frontend object-upload checkpoint — 2026-09-24

```text
Inventory: Exactly the intended keys are present: index.html at 588 bytes, assets/index-BIgNoBro.js at 207,694 bytes, and assets/index-ne3Eu0rz.css at 8,455 bytes; total 216,737 bytes.
Metadata: index.html is text/html with Cache-Control no-cache. The JavaScript is application/javascript and the CSS is text/css; both use Cache-Control public,max-age=31536000,immutable.
Encryption/privacy: Every object reports AES256 SSE-S3. All four bucket-level Block Public Access controls remain true. An unsigned HeadObject request for index.html returned 403 Forbidden, verifying anonymous access is denied.
Cost/cleanup: Three upload PUT requests and approximately 0.000202 GB of storage were added within the approved USD 0.05 session cap. Retain only under the approved Phase 8 review date and cleanup procedure.
Status: UPLOAD AND PRIVATE-ACCESS BOUNDARY VERIFIED; OAC/DISTRIBUTION PENDING
```

## Phase 8 CloudFront OAC checkpoint — 2026-09-24

```text
Resource: order-platform-phase8-frontend-oac, ID E201JOYWPRNJRI, created manually by the user.
Verified configuration: Origin type s3; SigningBehavior always; SigningProtocol sigv4a; intended description present. The current AWS CLI reference accepts both sigv4 and sigv4a, although some older Developer Guide examples still show only sigv4.
Security effect: The OAC has no S3 permission by itself. Access remains denied until it is attached to an exact distribution and a distribution-scoped bucket policy is installed.
Cost/cleanup: OAC has no direct idle charge. Retain only with the approved disabled distribution through 2026-09-26; delete after the distribution during final cleanup.
Status: CREATED — CONFIGURATION VERIFIED; DISTRIBUTION ATTACHMENT PENDING
```

## Phase 8 initial CloudFront distribution verification — 2026-09-24

```text
Distribution: EY6998IJC3CMS, domain d23gq6mlv9cjnb.cloudfront.net, deployed and enabled. The private Mumbai S3 origin, HTTP-to-HTTPS redirect, GET/HEAD-only behavior, compression, managed CachingOptimized policy, default CloudFront viewer certificate, disabled logging, no alternate domains, no functions/Lambda@Edge, and exact five tags were verified.
Private-origin policy: The wizard installed an exact S3 read-only policy for cloudfront.amazonaws.com conditioned by the distribution ARN. The distribution uses generated OAC E3IV91DFGUN3YF with always-sign SigV4. The previously created OAC E201JOYWPRNJRI remains unattached and must be reconciled.
Initial configuration gaps: DefaultRootObject was empty, so / did not map to index.html. PriceClass was PriceClass_All rather than the initially approved PriceClass_200; PriceClass_All is part of the subsequently selected FREE flat-rate plan decision.
Viewer proof: Before correction, HTTPS / returned 403 Error from cloudfront/S3 as predicted from the missing default root object. After the user set DefaultRootObject to index.html and deployment completed, HTTPS / returned 200 with text/html, 588 bytes, AES256 and Cache-Control no-cache. HTTPS /index.html and the hashed JavaScript also returned 200 with their intended metadata. Successful requests traversed CloudFront at the Hyderabad edge and reached the private S3 origin through OAC.
Automatic resources: The wizard attached WAF web ACL CreatedByCloudFront-d0f8a502 with three AWS managed rule groups and created FREE flat-rate subscription sub_3JlISIe7qHVRV49mqvjltBUs503 associating the distribution and WAF.
Cost evidence: CloudTrail CreateSubscription records planFamily CloudFront, planTier FREE, approvalMode IMMEDIATE, and the exact distribution/WAF resources. The plan is USD 0/month with no overage charge while active. If cancelled, the distribution and still-attached WAF revert to pay-as-you-go billing; prompt WAF detach/delete is therefore required if returning to the originally approved no-WAF design.
Decision required: Either explicitly revise the lesson to retain the FREE plan/bundled WAF, or cancel the FREE plan and correct the resources to the approved pay-as-you-go, no-WAF, PriceClass_200 configuration. No corrective mutation has been performed.
Status: DEPLOYED — SAFE UNDER FREE PLAN; CONFIGURATION DECISION REQUIRED
```

## Phase 8 OAC reconciliation checkpoint — 2026-09-24

```text
Cleanup: The user deleted only the unused manually created OAC E201JOYWPRNJRI. It held no data and was never attached to the distribution.
Verification: Fresh CloudFront OAC inventory contains only E3IV91DFGUN3YF, the wizard-generated always-sign SigV4 OAC. Distribution EY6998IJC3CMS is Deployed and Enabled, references that exact OAC, and has DefaultRootObject index.html.
Viewer regression check: HTTPS / returned 200 text/html, 588 bytes, AES256 and Cache-Control no-cache. X-Cache RefreshHit from CloudFront at the Hyderabad edge confirms the private-origin viewer path remained healthy after cleanup.
Status: UNUSED OAC DELETED — ATTACHED OAC AND SITE VERIFIED
```

## Phase 8 static-edge session close-out — 2026-09-24

```text
CloudFront shutdown: The user disabled distribution EY6998IJC3CMS. Fresh verification reached Status Deployed with Enabled false. A subsequent HTTPS request could not resolve d23gq6mlv9cjnb.cloudfront.net, confirming the public hostname no longer served the application.
Private storage: All four S3 Block Public Access controls remain true. An unsigned HeadObject request for index.html returned 403 Forbidden. The retained bucket contains exactly three intended objects totaling 216,737 bytes.
Runtime sweep: The retained RDS instance remains stopped and private with automatic restart 2026-09-27 23:16:38 IST; review/stop/delete by 2026-09-26. The retained ECS cluster has zero services and zero running tasks. Mumbai has zero load balancers.
Intentionally retained through 2026-09-26: Disabled CloudFront distribution EY6998IJC3CMS; attached OAC E3IV91DFGUN3YF; FREE flat-rate subscription sub_3JlISIe7qHVRV49mqvjltBUs503; bundled WAF web ACL 9ea40cdc-aa99-45ca-a5cd-6a7298218f68; private S3 bucket and its three frontend objects.
Residual cost: CloudFront FREE plan and bundled WAF are USD 0/month while the subscription remains active; disabled distribution and OAC have no direct idle charge under that plan. S3 storage is approximately USD 0.000005/month plus ordinary request usage. Existing stopped-RDS storage/backups/managed-secret and other documented retained-foundation costs continue separately.
Final-removal order: Cancel the FREE plan first; promptly detach/delete the WAF before ordinary pay-as-you-go WAF usage can accumulate; delete the disabled distribution; delete the OAC; empty and delete the bucket; verify every exact resource absent. Recheck RDS before its automatic-restart deadline.
Disposable hourly runtime cleanup: VERIFIED — no ECS tasks/services, load balancers, or running RDS compute.
Overall account cleanup: PARTIAL — explicitly retained low-cost Phase 8 resources and pre-existing foundation/data remain, with review/delete date 2026-09-26.
```

## Phase 8 custom-hostname approval gate — 2026-09-26

```text
Status: APPROVED by the user on 2026-09-26; no ACM certificate or Cloudflare DNS record for the selected hostname existed at this checkpoint.
Identity and state: Expected aws-learning Identity Center caller and account verified. Distribution EY6998IJC3CMS is Deployed and disabled; its FREE flat-rate plan, bundled WAF, attached OAC, private S3 bucket, and three frontend objects remain. Zero ECS services/running tasks and zero load balancers exist. Retained RDS is stopped/private with automatic restart 2026-09-27 23:16:38 IST.
Selected hostname: stockroom.tarunapps.com under the active Cloudflare-authoritative tarunapps.com zone.
Approved resources and changes: One exact-name non-exportable ACM public certificate for stockroom.tarunapps.com in us-east-1 using DNS validation; one ACM validation CNAME in Cloudflare set DNS only; attach the issued certificate and exact alternate hostname to the existing CloudFront distribution; one traffic CNAME stockroom.tarunapps.com to d23gq6mlv9cjnb.cloudfront.net set DNS only; temporarily enable the existing distribution for HTTPS/DNS verification and disable it again at session close.
Billing: ACM public certificates used with CloudFront have no additional certificate charge. The existing CloudFront FREE plan and bundled WAF remain USD 0/month while active; Cloudflare DNS records have no expected incremental charge; S3 storage remains approximately USD 0.000005/month plus ordinary requests. Conservative incremental cap is USD 0.05 pre-tax.
Explicit exclusions: No Cloudflare proxying, wildcard certificate, apex-domain change, Route 53 hosted zone, ALB, ECS/Fargate runtime, RDS start, NAT Gateway, public IPv4, new WAF, logging, alarm, or Phase 9 resource.
Security: Both Cloudflare records begin DNS only. The validation record proves domain control and remains for ACM managed renewal while the certificate is retained. The traffic CNAME only directs the selected subdomain; existing apex and unrelated DNS records remain unchanged.
Session-close procedure: Disable CloudFront, wait for Deployed with Enabled false, and verify the custom hostname no longer serves. Inventory and record the certificate and both DNS records. Retain only explicitly reviewed no/low-cost resources with a new review/delete date; separately resolve the retained RDS automatic-restart deadline before ending the session.
Final-removal order: Remove the traffic CNAME; cancel the CloudFront FREE plan; promptly detach/delete bundled WAF if it leaves plan coverage; delete the disabled distribution; delete attached OAC; empty/delete the frontend bucket; delete the ACM certificate after detachment; remove the ACM validation CNAME; verify all exact resources absent.
Approval: User explicitly approved this hostname, USD 0.05 cap, no-runtime scope, DNS-only design, and mandatory verification/cleanup procedure.
```

## Phase 8 ACM request checkpoint — 2026-09-26

```text
Certificate: arn:aws:acm:us-east-1:992382645171:certificate/16f68502-110d-4f4c-8d78-0efff4d91eb2 for exact hostname stockroom.tarunapps.com.
Verified configuration: Amazon-issued, non-exportable, RSA-2048, DNS validation, PENDING_VALIDATION, not attached to any resource. Non-exportable public certificates used with CloudFront have no additional certificate charge.
Validation CNAME: Name _190db993ca2d7b9fbb96b66a70257f64.stockroom.tarunapps.com. and target _f1c38f424c3880652fbd9e67228adf4c.wzccmgtwzk.acm-validations.aws. No Cloudflare record had been created by this checkpoint.
Tag correction: The user replaced AutoCleanupx with AutoCleanup=false; a fresh ACM tag query verified all four exact learning tags.
DNS proof: The user created the exact validation CNAME as DNS only in Cloudflare. Both authoritative nameservers, ariella.ns.cloudflare.com and merlin.ns.cloudflare.com, returned the expected CNAME target. An earlier recursive lookup returned NXDOMAIN because of negative caching; no record correction was needed.
Status: CREATED — TAGS AND AUTHORITATIVE DNS VERIFIED; ACM ISSUANCE PENDING
```

## Phase 8 ACM issuance checkpoint — 2026-09-26

```text
Result: ACM status ISSUED and domain validation status SUCCESS at 2026-09-26 10:06:04 IST. Certificate expiry is 2027-04-12 05:29:59 IST under the current 198-day public-certificate lifetime.
DNS evidence: Both Cloudflare authoritative nameservers returned the exact validation CNAME. ACM issuance followed without any DNS correction.
Usage state: InUseBy is empty and renewal eligibility is currently INELIGIBLE because the certificate has not yet been attached to an integrated AWS service. The validation CNAME remains required for managed renewal after attachment.
Status: ISSUED — CLOUDFRONT ATTACHMENT PENDING
```

## Phase 8 CloudFront certificate-attachment checkpoint — 2026-09-26

```text
Distribution update: EY6998IJC3CMS now has exact alias stockroom.tarunapps.com and exact ACM certificate 16f68502-110d-4f4c-8d78-0efff4d91eb2, using sni-only and minimum protocol policy TLSv1.2_2021. The distribution remained Enabled false during deployment.
ACM verification: InUseBy contains only the intended CloudFront distribution ARN and RenewalEligibility changed to ELIGIBLE.
Traffic safety: No stockroom traffic CNAME has been created. CloudFront status remained InProgress at this checkpoint, so DNS routing and enablement are intentionally deferred until status Deployed.
Status: CONFIGURATION VERIFIED — GLOBAL DEPLOYMENT IN PROGRESS
```

## Phase 8 custom-hostname traffic-DNS checkpoint — 2026-09-26

```text
Record: stockroom.tarunapps.com CNAME d23gq6mlv9cjnb.cloudfront.net, TTL 300 seconds, created manually by the user in the Cloudflare-authoritative tarunapps.com zone.
Verification: Both ariella.ns.cloudflare.com and merlin.ns.cloudflare.com returned the exact CNAME target. A recursive resolver returned the same CNAME. Returning the CloudFront hostname rather than Cloudflare anycast addresses confirms DNS-only mode.
CloudFront readiness: Distribution EY6998IJC3CMS was Deployed with the exact alias and ACM certificate, but remained disabled at this checkpoint. Therefore DNS was correct while application traffic was intentionally unavailable.
Status: DNS VERIFIED — TEMPORARY CLOUDFRONT ENABLEMENT PENDING
```

## Phase 8 custom-hostname live verification — 2026-09-26

```text
CloudFront state: Distribution EY6998IJC3CMS reached Deployed with Enabled true. Its only alternate hostname is stockroom.tarunapps.com; it uses the intended ACM certificate, sni-only, TLSv1.2_2021, and default root object index.html.
DNS: Public resolver 1.1.1.1 returned stockroom.tarunapps.com CNAME d23gq6mlv9cjnb.cloudfront.net and the CloudFront IPv4/IPv6 addresses. This continues to prove Cloudflare DNS-only routing. The workstation resolver still held an earlier negative response, so viewer tests pinned the public CloudFront edge IP while preserving stockroom.tarunapps.com as the HTTP Host and TLS SNI name.
Viewer/TLS proof: HTTP / returned 301 to https://stockroom.tarunapps.com/. HTTPS / returned 200 text/html with 588 bytes through the Hyderabad CloudFront edge and Amazon S3 origin. curl certificate verification returned ssl_verify_result 0, proving the ACM-backed certificate was trusted and valid for the requested hostname.
Caching: index.html returned Cache-Control no-cache as intended. The hashed JavaScript returned 200 application/javascript and Cache-Control public,max-age=31536000,immutable. These command-line requests reported Miss from cloudfront; earlier browser evidence reported Hit from cloudfront, so cacheability and an actual edge hit have both been demonstrated.
Origin privacy: An unsigned HeadObject for the Mumbai S3 index.html object returned 403 Forbidden while the same object remained available through CloudFront, verifying the OAC/private-origin boundary.
Cost/runtime: No ALB, ECS/Fargate, RDS start, NAT Gateway, public IPv4, new WAF, logging, or other hourly runtime was created. The existing FREE CloudFront plan and bundled WAF remain USD 0/month while the subscription is active; ordinary S3 and request usage remains within the approved USD 0.05 cap.
Status: CUSTOM DNS, ACM TLS, REDIRECT, PRIVATE ORIGIN, AND STATIC DELIVERY VERIFIED; SESSION-CLOSE DISABLEMENT STILL REQUIRED
```

## Phase 8 custom-hostname session close-out — 2026-09-26

```text
CloudFront shutdown: The user disabled distribution EY6998IJC3CMS. Fresh AWS verification reached Status Deployed with Enabled false. A viewer request preserving stockroom.tarunapps.com as both HTTP Host and TLS SNI failed during TLS negotiation, confirming the disabled distribution no longer serves the application.
Private storage: The retained Mumbai frontend bucket contains only the three intended objects totaling 216,737 bytes. An unsigned HeadObject request for index.html returned 403 Forbidden.
Runtime sweep: Account 992382645171 was re-verified. The retained ECS cluster has zero services and zero running tasks, Mumbai has zero load balancers, and the RDS instance remains stopped and private. Its automatic restart remains scheduled for 2026-09-27 23:16:38 IST.
Retained hostname resources: The DNS-only traffic CNAME and ACM validation CNAME remain in Cloudflare. The ACM certificate remains ISSUED, ELIGIBLE for renewal, attached only to the intended disabled distribution, and expires 2027-04-12 under its current issuance.
Retained Phase 8 AWS resources: Disabled distribution EY6998IJC3CMS, OAC E3IV91DFGUN3YF, FREE subscription sub_3JlISIe7qHVRV49mqvjltBUs503, bundled WAF 9ea40cdc-aa99-45ca-a5cd-6a7298218f68, private frontend bucket and three objects, and the ACM certificate. The FREE plan/bundled WAF remain USD 0/month while plan coverage stays active; S3 storage remains approximately USD 0.000005/month plus tiny request usage; ACM adds no certificate charge.
Disposable hourly runtime cleanup: VERIFIED — CloudFront disabled; no ECS tasks/services or load balancers; RDS compute stopped.
Overall account cleanup: PARTIAL — retained low-cost Phase 8 resources and pre-existing foundation/data remain. Their prior review date is today and must be explicitly extended or the resources must be removed. The RDS auto-restart deadline must be resolved before 2026-09-27 23:16:38 IST.
```

## Phase 8 same-origin API approval gate — 2026-09-27

```text
Status: APPROVED by the user for a two-hour session with a conservative USD 0.25 incremental cap.
Identity and baseline: Expected aws-learning Identity Center caller and account 992382645171 verified; primary Region ap-south-1. CloudFront EY6998IJC3CMS is Deployed and disabled. The retained ECS cluster has zero services/tasks, Mumbai has zero load balancers, and RDS order-platform-phase5-postgres is stopped/private with automatic restart scheduled for 2026-09-27 23:16:38 IST. Budget reports USD 3.136 actual and USD 3.617 forecast against the USD 5 warning budget; billing data is delayed and the budget is not a cap.
Approved design: Keep stockroom.tarunapps.com as the DNS-only viewer hostname. Add a DNS-only custom ALB-origin hostname, one exact-name non-exportable ACM public certificate in ap-south-1 with DNS validation, a temporary public ALB/HTTPS listener/IP target group, one temporary ECS API service/task, and CloudFront /api/* routing to the HTTPS ALB origin with API caching disabled. Start the private RDS instance only for active verification.
Billing: Running RDS, ALB capacity, Fargate CPU/memory, ALB and task public IPv4 addresses, logs, requests, and transfer are usage-billed. ACM public certificates used with an integrated AWS service and Cloudflare DNS records have no expected incremental charge. ALB, task/public IPv4, and RDS compute accrue while active even when idle.
Session-close action: Disable CloudFront and wait for Deployed/Enabled false; delete the ECS service/tasks and verify task ENIs/public IPv4 absent; delete ALB/listeners/target group and verify ALB ENIs/public IPv4 absent; stop RDS and verify stopped with a refreshed automatic-restart deadline; delete disposable logs; inventory any retained ACM/DNS/CloudFront configuration and assign a review date.
Verification: Fresh AWS API inventories, not console closure, will prove zero ECS runtime and load balancers, stopped RDS, disabled CloudFront, private S3, and the status of any retained certificate/DNS records.
Explicit exclusions: No NAT Gateway, Route 53 hosted zone, Cloudflare proxying, wildcard certificate, additional WAF, Phase 9 Terraform, or unrelated infrastructure.
Approval: The user accepted the described two-hour scope, temporary billable runtime, USD 0.25 cap, and mandatory cleanup.
```

## Phase 8 ALB-origin ACM request checkpoint — 2026-09-27

```text
Certificate: arn:aws:acm:ap-south-1:992382645171:certificate/53875af6-8342-48b1-aa80-e9f61a38f8e7 for exact hostname api-origin.tarunapps.com.
Verified configuration: Amazon-issued, non-exportable, RSA-2048, certificate-transparency logging enabled, DNS validation, PENDING_VALIDATION, and not attached to any resource. Exact tags Project=aws-order-platform, Environment=learning, Owner=Tarun, and AutoCleanup=false were verified.
Validation CNAME: _7b591442b1a26ba9ac2508b55553ce5c.api-origin.tarunapps.com. points to _89586d966431d24203058113c132e0f2.wzccmgtwzk.acm-validations.aws.
Cost/cleanup: No additional certificate charge is expected when the non-exportable public certificate is used with the intended ALB. Keep the validation record DNS only for issuance and managed renewal. Delete the certificate only after it is detached and no longer needed.
Status: CREATED AND TAGS VERIFIED — CLOUDFLARE VALIDATION RECORD PENDING
```

## Phase 8 same-origin runtime start checkpoint — 2026-09-27

```text
RDS start: The user started order-platform-phase5-postgres for the approved API integration lab. At 2026-09-27 11:54:12 IST it was available, private, and in ap-south-1b; AutomaticRestartTime was null while running. Approximate ledger compute rate is USD 0.021/running hour plus already-retained storage/backup/secret costs.
ACM validation: Both Cloudflare authoritative nameservers returned the exact DNS-only validation CNAME. ACM domain validation reached SUCCESS while overall certificate status remained PENDING_VALIDATION at this checkpoint; no DNS correction is required.
Mandatory close: Stop the database after active testing, wait for stopped, record the refreshed automatic-restart deadline, and verify PubliclyAccessible remains false.
Status: RDS ACTIVE — COST TIMER RUNNING; ACM ISSUANCE PENDING
```

## Phase 8 ALB-origin certificate and target-group checkpoint — 2026-09-27

```text
Certificate result: ACM certificate 53875af6-8342-48b1-aa80-e9f61a38f8e7 reached ISSUED with DNS validation SUCCESS at 2026-09-27 11:54:07 IST. It covers only api-origin.tarunapps.com, remains unattached at this checkpoint, and expires 2027-04-13 under the current issuance. The DNS-only validation CNAME remains for managed renewal.
Target group: order-platform-phase8-api-tg, ARN suffix 4d02f14d52312f69, IP/IPv4 target type in the intended Phase 4 VPC, HTTP/3000 and HTTP1. Health checks use HTTP /health on the traffic port, 15-second interval, 5-second timeout, healthy/unhealthy thresholds 2/2, and matcher 200.
Tags and targets: Exact Project, Environment, Owner, and AutoCleanup=true tags verified. No targets were manually registered and no load balancer is attached yet; ECS will own task-IP registration.
Billing/cleanup: Target groups have no separate hourly charge, but must be deleted after the temporary ALB/service exercise. The certificate has no expected additional charge while used with the intended integrated AWS service.
Status: CERTIFICATE ISSUED; EMPTY TARGET GROUP VERIFIED — ALB PENDING
```

## Phase 8 CloudFront-to-ALB security-group checkpoint — 2026-09-27

```text
Security group: Existing order-platform-phase4-alb-sg (sg-037d90e37d307a692) was tightened before ALB creation. The prior public HTTP/80 rule from 0.0.0.0/0 was removed.
Verified ingress: Only TCP/443 from AWS-managed CloudFront origin-facing prefix list pl-9aa247f3. AWS maintains the list's changing CIDRs while the security-group reference remains stable.
Verified egress: Only TCP/3000 to the exact retained ECS task security group sg-09ee205b5eb8a0727. The task group reciprocally permits TCP/3000 only from this ALB group.
Security meaning: Direct arbitrary internet sources cannot reach the ALB listener. A later listener header condition will additionally distinguish this distribution from other CloudFront distributions.
Status: LEAST-PRIVILEGE CLOUDFRONT-TO-ALB NETWORK PATH VERIFIED
```

## Phase 8 API ALB creation checkpoint — 2026-09-27

```text
ALB: order-platform-phase8-api-alb, ARN suffix 13d1e03525f91c3e, created 2026-09-27 12:22:02 IST. It is internet-facing/IPv4 in the intended Phase 4 public subnets across ap-south-1a and ap-south-1b and uses only sg-037d90e37d307a692. State was provisioning at this checkpoint.
Listener: HTTPS/443 only, exact regional ACM certificate 53875af6-8342-48b1-aa80-e9f61a38f8e7, and current recommended policy ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09. The default action is fixed 403 text/plain Forbidden; mutual TLS is off. No HTTP listener exists.
Tags: Exact Project=aws-order-platform, Environment=learning, Owner=Tarun, and AutoCleanup=true tags verified.
Origin DNS target: order-platform-phase8-api-alb-1728600586.ap-south-1.elb.amazonaws.com. The DNS-only api-origin.tarunapps.com traffic CNAME is not yet recorded at this checkpoint.
Billing/cleanup: ALB capacity and two service-managed public IPv4 addresses are now usage-billed even with no targets/traffic. Delete the listener/ALB and target group after the exercise; wait for ALB ENIs/public IPv4 dependencies to disappear and verify fresh regional inventories empty.
Status: ALB COST TIMER RUNNING — ORIGIN DNS, PROTECTED RULE, AND ECS TARGET PENDING
```

## Phase 8 ALB-origin traffic-DNS checkpoint — 2026-09-27

```text
Record: api-origin.tarunapps.com CNAME order-platform-phase8-api-alb-1728600586.ap-south-1.elb.amazonaws.com, TTL 300 seconds, created manually by the user in the Cloudflare-authoritative tarunapps.com zone with proxy disabled/DNS-only mode.
Verification: Both ariella.ns.cloudflare.com and merlin.ns.cloudflare.com returned the exact CNAME target. The separate underscored ACM validation CNAME remains intact.
ALB readiness: The ALB reached active across ap-south-1a and ap-south-1b with the exact CloudFront-restricted security group. The target group still contains zero targets, and the HTTPS listener default remains 403 until the protected rule is created.
Status: ORIGIN DNS AND ALB ACTIVE VERIFIED — PROTECTED FORWARD/REWRITE RULE PENDING
```

## Phase 8 protected ALB listener-rule checkpoint — 2026-09-27

```text
Rule: HTTPS listener priority 10 requires both path /api/* and exact HTTP header name X-Origin-Verify with one private value. Matching requests forward to order-platform-phase8-api-tg; the default listener rule remains fixed 403.
Rewrite: Console evidence verified URL rewrite regex ^/api/(.*)$ with replacement /$1, converting frontend paths such as /api/products into the API's expected /products path. The installed AWS CLI service model did not expose the newer Transforms response field, so console state is the transform evidence.
Credential hygiene: An initial private header value was exposed in a screenshot before CloudFront configuration. The user generated and installed a replacement value; CloudTrail recorded ModifyRule at 2026-09-27 12:38:59 IST. The exposed value was never configured in CloudFront and is no longer accepted by the listener. The replacement value is intentionally omitted from this ledger and must not be sent in chat or committed.
Security boundary: Network ingress requires the AWS-managed CloudFront origin-facing prefix list, and application forwarding additionally requires the distribution-specific private header. Requests failing either listener condition receive 403 and cannot reach the target group.
Status: PROTECTED FORWARD AND PATH REWRITE CONFIGURED — CLOUDFRONT HEADER PENDING
```

## Phase 8 temporary API log-group checkpoint — 2026-09-27

```text
Log group: /aws/order-platform/phase6/api recreated as the exact dependency referenced by verified API task definition order-platform-phase5-lab:21. It uses Standard class, one-day retention, default service-side encryption with no customer KMS key, and initially stores zero bytes.
Tags: Exact Project=aws-order-platform, Environment=learning, Owner=Tarun, and AutoCleanup=true tags verified.
Billing/cleanup: CloudWatch Logs ingestion and retained bytes are usage-billed. Capture only sanitized evidence, then delete this temporary group after the ECS service/task is stopped and verify exact absence.
Status: EMPTY TEMPORARY LOG DESTINATION VERIFIED — ECS SERVICE PENDING
```

## Phase 8 ECS API service checkpoint — 2026-09-27

```text
Service: Console-generated name order-platform-phase5-lab-service-sh6nhkk3 in cluster order-platform-phase4-cluster. It uses Fargate/LATEST, verified API task definition order-platform-phase5-lab:21, desired/running/pending 1/1/0, and completed deployment with zero failed tasks at 2026-09-27 12:54:10 IST. Circuit breaker and rollback are enabled with 100/200 minimum/maximum healthy percentages.
Networking: Both intended Phase 4 public subnets are configured, assignPublicIp is enabled because no NAT Gateway or VPC endpoints exist, and only task security group sg-09ee205b5eb8a0727 is attached. Running task eee7db3a31694f70aa519759c3c739ac uses ENI eni-01ca4f54e4030ca93, private IP 10.40.0.168, and one temporary public IPv4; the public address is intentionally omitted from this ledger.
Load balancing: Container phase5-lab port 3000 is attached to order-platform-phase8-api-tg. The target is healthy in ap-south-1a. ECS task/container status is RUNNING and connectivity CONNECTED; ECS container health is UNKNOWN because the task definition has no container-level health check, while the authoritative ALB target health is healthy.
Tags/logs: Exact learning tags with AutoCleanup=true verified on the service. The expected ecs/phase5-lab task log stream exists in /aws/order-platform/phase6/api.
Billing/cleanup: Fargate CPU/memory and one task public IPv4 are now usage-billed. At close, set desired count zero/delete the service, wait for task STOPPED and target unused, verify ENI/public IPv4 absent, then delete the temporary log group after sanitized evidence capture.
Status: ECS API RUNTIME AND ALB TARGET HEALTH VERIFIED — CLOUDFRONT API ORIGIN PENDING
```

## Phase 8 CloudFront ALB-origin checkpoint — 2026-09-27

```text
Origin: Existing disabled distribution EY6998IJC3CMS now contains origin ID api-origin.tarunapps.com with domain api-origin.tarunapps.com and no origin path. The distribution remained Deployed and Enabled=false after the update.
TLS: Custom origin policy is HTTPS-only on port 443 with TLSv1.2, three connection attempts, and ten-second connection timeout. The origin hostname matches the exact regional ACM certificate presented by the ALB.
Authentication: The origin has exactly one custom header named X-Origin-Verify. Its rotated private value is intentionally omitted. This value matches the protected ALB listener rule and is injected only on CloudFront-to-origin requests.
Status: HTTPS ALB ORIGIN AND PRIVATE HEADER VERIFIED — /api/* BEHAVIOR PENDING
```

## Phase 8 CloudFront API-behavior checkpoint — 2026-09-27

```text
Behavior: /api/* targets origin api-origin.tarunapps.com, redirects HTTP viewers to HTTPS, enables compression, and permits GET/HEAD/OPTIONS/PUT/POST/PATCH/DELETE. Only GET/HEAD are technically cacheable methods, but the selected cache policy sets every TTL to zero.
Policies: Managed-CachingDisabled (minimum/default/maximum TTL 0/0/0) and Managed-AllViewerExceptHostHeader. The origin policy forwards all query strings and cookies and all viewer headers except Host, allowing CloudFront to use the origin hostname that matches the ALB certificate.
Security: No signed-URL requirement, CloudFront Function, Lambda@Edge, response-headers policy, field-level encryption, or real-time logging was added. The distribution remained Enabled=false while global deployment moved to InProgress.
Status: API ROUTING CONFIGURATION VERIFIED — GLOBAL DEPLOYMENT AND LIVE TEST PENDING
```

## Phase 8 same-origin API live verification — 2026-09-27

```text
CloudFront state: Distribution EY6998IJC3CMS reached Deployed with Enabled=true after the API-origin and behavior updates.
Viewer/frontend proof: HTTP stockroom.tarunapps.com/ returned 301 to HTTPS. HTTPS / returned 200 text/html, 588 bytes, through the Hyderabad CloudFront edge and private S3 origin. Viewer certificate verification returned ssl_verify_result 0.
API path proof: HTTPS /api/health returned 200 application/json. HTTPS /api/ready returned 200 application/json, proving the chain reached the private RDS dependency. HTTPS /api/products?limit=12 returned 200 application/json with 576 bytes, proving the frontend-compatible database-backed route. Each response included a distinct application x-request-id.
Routing/TLS meaning: Successful API responses prove CloudFront selected /api/*, injected the private origin header, established HTTPS to api-origin.tarunapps.com with the matching ALB certificate, passed the protected listener rule, rewrote /api/... to /..., forwarded to the healthy ECS task, and reached RDS for readiness/data.
Cache proof: Two consecutive identical /api/products?limit=12 requests both returned X-Cache: Miss from cloudfront and distinct request IDs. Managed-CachingDisabled therefore sent each request to the API rather than reusing an edge response.
Origin protection: A direct local HTTPS connection to api-origin.tarunapps.com timed out at the network boundary because the ALB security group accepts only the AWS-managed CloudFront origin-facing prefix list. Unauthorized CloudFront-origin requests would additionally fail the private-header listener condition and receive default 403.
Status: SAME-ORIGIN FRONTEND/API, TWO TLS SESSIONS, PATH REWRITE, PRIVATE HEADER, DATABASE READINESS, NO-CACHE, AND DIRECT-ORIGIN BLOCK VERIFIED — BROWSER CHECK AND CLEANUP PENDING
```

## Phase 8 browser image-upload/CORS diagnosis — 2026-09-27

```text
Observed failure: The production browser successfully created a product through the same-origin API, then its direct presigned S3 image PUT failed at the browser preflight. The console reported missing Access-Control-Allow-Origin for origin https://stockroom.tarunapps.com. The original 60-second presigned URL was exposed in chat; it was scoped to one object/request shape and expired. Future presigned URLs must be treated as short-lived bearer-style permissions and omitted from chat/logs.
Root cause evidence: The private product-image bucket had no CORS configuration because its earlier temporary development rule had been removed during cleanup. The frontend code sends PUT with content-type, if-none-match, and x-amz-checksum-sha256, exactly matching the browser's requested headers. All four S3 Block Public Access settings remained true.
Correction: The user added one exact-origin CORS rule allowing only PUT from https://stockroom.tarunapps.com with only those three request headers and a 300-second preflight cache. No wildcard origin/header, GET exposure, public ACL, public policy, or bucket-access change was introduced.
Result: The browser retry succeeded. Sanitized authenticated inventory shows the bucket now contains two Standard objects totaling 352,041 bytes; the new object is 322,249 bytes and was written at 2026-09-27 13:22:54 IST. Anonymous object access remained 403 and Block Public Access remained fully enabled.
Persistence/cost: The newly created database product row and 322,249-byte image are persistent user data and will not be deleted without confirmation. Incremental S3 storage is negligible at the documented Standard rate, but the retained data and CORS rule require an explicit review date. Remove the temporary CORS rule at runtime cleanup unless near-term browser upload work is explicitly retained.
Incident lesson: API success and object-upload failure were independent partial outcomes. Browser console/preflight evidence plus S3 configuration distinguished a CORS policy failure from IAM, presigning, CloudFront, ALB, ECS, RDS, or public-access failure.
Status: CONTROLLED BROWSER FAILURE DIAGNOSED AND CORRECTED; PRIVATE IMAGE UPLOAD VERIFIED
```

## Phase 8 same-origin API session close-out — 2026-09-27

```text
AWS runtime shutdown: CloudFront distribution EY6998IJC3CMS reached Deployed with Enabled=false. ECS service order-platform-phase5-lab-service-sh6nhkk3 became INACTIVE, the only task stopped, and its task ENI/public IPv4 disappeared. Fresh regional inventories showed zero ECS services/running tasks, zero load balancers, and zero target groups. Temporary ALB order-platform-phase8-api-alb, its HTTPS listener/rules, target group order-platform-phase8-api-tg, and temporary log group /aws/order-platform/phase6/api were deleted.
Database: order-platform-phase5-postgres was stopped and remained private. Its refreshed mandatory automatic-restart time is 2026-10-04 13:32:43 IST. It must be reviewed and stopped again, or intentionally deleted, before that time if another session starts it or AWS automatically restarts it.
Temporary browser policy: The exact-origin product-image bucket CORS configuration was removed after the successful upload test; GetBucketCors returned NoSuchCORSConfiguration. The persistent product row and two private image objects were intentionally retained. The image bucket contains two objects totaling 352,041 bytes; residual Standard storage cost is negligible but nonzero.
Origin DNS cleanup: The user explicitly approved deletion of the now-dangling DNS-only traffic CNAME api-origin.tarunapps.com after the ALB was deleted. Cloudflare showed the record removed, and both authoritative nameservers returned no CNAME (zone SOA only). The separate ACM validation CNAME _7b591442b1a26ba9ac2508b55553ce5c.api-origin.tarunapps.com still returned _89586d966431d24203058113c132e0f2.wzccmgtwzk.acm-validations.aws and was intentionally retained.
Retained API-origin foundation: Regional ACM certificate arn:aws:acm:ap-south-1:992382645171:certificate/53875af6-8342-48b1-aa80-e9f61a38f8e7 remains ISSUED, unattached, and without an expected incremental certificate charge. The disabled CloudFront distribution retains the HTTPS api-origin.tarunapps.com origin, private X-Origin-Verify header, and non-caching /api/* behavior so the next session can recreate an ALB and repoint the traffic CNAME without changing the stable origin name. The improved ALB security group remains restricted to the AWS-managed CloudFront origin-facing prefix list on 443 and TCP/3000 egress to the task security group.
Retained frontend foundation: Disabled distribution EY6998IJC3CMS, OAC E3IV91DFGUN3YF, FREE CloudFront subscription, bundled WAF, private frontend S3 objects, viewer ACM certificate, stockroom.tarunapps.com DNS-only traffic CNAME, and both ACM validation CNAMEs remain. Expected residual direct hourly cost is USD 0 for the FREE plan, bundled WAF, ACM certificates, empty ECS cluster, task definitions, IAM roles, and security groups; S3/RDS storage, backups, Secrets Manager, ECR, and ordinary request usage remain low but nonzero.
Review/delete date: Review every retained Phase 8/API-origin resource and persistent test product no later than 2026-10-03, before the RDS automatic-restart deadline on 2026-10-04. Delete the manually created foundation before Phase 9 Terraform recreation unless an explicit import exercise is chosen.
Verification note: The AWS states above were verified immediately after the cleanup operations. A later repeat inventory after the Cloudflare deletion could not authenticate because the temporary AWS session token had expired; it produced no state changes and is not counted as fresh verification.
Disposable hourly runtime cleanup: VERIFIED — CloudFront disabled; ECS service/task and task ENI/public IPv4 absent; ALB/listener/target group and ALB networking absent; RDS stopped/private; temporary log group and bucket CORS absent; dangling origin traffic CNAME removed.
Overall account cleanup: PARTIAL — only the explicitly listed reusable foundation and persistent low-volume data remain, with review date 2026-10-03 and the RDS auto-restart deadline recorded above.
```

## Phase 8 observability-session approval gate — 2026-09-28

```text
Status: APPROVED by the user for a 1.5-hour session with a conservative USD 0.05 incremental cap.
Identity and Region: AWS console shows account 992382645171 using AdministratorAccess/aws-learning-admin in ap-south-1 (Mumbai). Console billing widget shows approximately USD 3.41 current-month cost and USD 3.79 forecast against the existing USD 5 warning budget; estimates are delayed and are not spending caps.
Approved scope: Inventory existing CloudWatch/SNS resources; create at most one temporary custom CloudWatch dashboard, three standard-resolution metric alarms, and one temporary SNS Standard topic with one user-controlled email subscription; test one alarm transition and notification; capture a sanitized incident timeline.
Billing: CloudWatch dashboards and alarm metrics are usage-billed when outside applicable free-tier allowances; alarms are prorated hourly while they exist. SNS is request/delivery billed with no idle topic fee and has a usage-based free tier. No ECS/Fargate, ALB, RDS start, NAT Gateway, public IPv4, custom metrics, high-resolution alarms, anomaly detection, or paid CloudTrail trail is approved.
Privacy/notification: The user will enter and confirm their own email address; it must not be copied into chat or the ledger. Only a controlled learning notification will be sent.
Cleanup: Delete the temporary alarms, dashboard, SNS subscription/topic, and verify their exact absence before session close. If any item is intentionally retained, record its expected residual cost and a review/delete date; disable alarm actions if notification testing has ended.
Approval: User accepted the scope, cost cap, notification test, and mandatory cleanup.
```

## Phase 8 SNS topic checkpoint — 2026-09-28

```text
Correction: The first topic was accidentally created as FIFO under order-platform-phase8-ops-alerts.fifo. FIFO ordering/deduplication is unnecessary for operational alerts and is not the intended CloudWatch alarm destination. The user deleted it; a fresh topic inventory verified it absent.
Topic: order-platform-phase8-ops-alerts, ARN arn:aws:sns:ap-south-1:992382645171:order-platform-phase8-ops-alerts, type Standard, in ap-south-1. Inventory shows exactly this one topic.
Verified settings: Four exact tags Project=aws-order-platform, Environment=learning, Owner=Tarun, AutoCleanup=false; server-side encryption disabled; no delivery-status logging preferences; zero subscriptions at this checkpoint.
Billing/cleanup: Standard topics have no idle topic fee; requests and deliveries are usage billed with applicable free-tier allowance. Delete the topic and its temporary email subscription after the controlled alarm test, then verify both topic and subscription inventories empty.
Status: CORRECT STANDARD TOPIC VERIFIED — EMAIL SUBSCRIPTION PENDING
```

## Phase 8 SNS email-subscription checkpoint — 2026-09-28

```text
Subscription: One EMAIL subscription exists on order-platform-phase8-ops-alerts and reached Confirmed after the user completed AWS's ownership-confirmation flow. The endpoint address is intentionally omitted from the ledger and chat response.
Policies: No subscription filter policy or redrive/dead-letter policy was configured. Topic encryption and delivery-status logging remain disabled for the temporary sanitized lab.
Operational meaning: A direct sanitized SNS publish will test topic-to-email delivery independently before CloudWatch alarm actions are attached. This separates notification-channel failure from alarm-evaluation failure.
Cleanup: Delete the subscription with the topic after the controlled alarm test and verify both inventories empty.
Status: EMAIL SUBSCRIPTION CONFIRMED — DIRECT SNS DELIVERY TEST PENDING
```

## Phase 8 direct SNS delivery verification — 2026-09-28

```text
Test: The user published one sanitized message directly to order-platform-phase8-ops-alerts and confirmed that it arrived at the subscribed email endpoint.
Meaning: Topic publication, the confirmed subscription, and email delivery all work independently of CloudWatch. If a later alarm notification fails, diagnosis can begin with alarm evaluation/action configuration rather than the already-proven SNS delivery path.
Data handling: The message explicitly identified itself as a controlled learning notification and contained no customer, credential, or production incident data. The endpoint remains omitted.
Status: SNS TOPIC-TO-EMAIL DELIVERY VERIFIED — CLOUDWATCH DASHBOARD/ALARM PENDING
```

## Phase 8 CloudWatch dashboard edge-widget checkpoint — 2026-09-28

```text
Dashboard: order-platform-phase8-operations created as the account's only custom CloudWatch dashboard. CLI GetDashboard verified one persisted metric widget.
Widget: CloudFront viewer error rate graphs AWS/CloudFront 4xxErrorRate and 5xxErrorRate for DistributionId EY6998IJC3CMS, Region dimension Global, with each metric explicitly sourced from us-east-1. Both use Average with a 300-second period; the left axis minimum is zero.
Historical signal: A displayed five-minute point showed 4xxErrorRate 100 and 5xxErrorRate 0. This is not sufficient to infer a large outage because a percentage without request volume lacks a denominator; a low-volume single failed request can produce 100 percent. A Requests/Sum widget is required for context before diagnosis.
Billing/cleanup: This temporary custom dashboard is usage-billed only if applicable free-tier allowances are exceeded. Delete it after the lesson and verify the dashboard inventory empty.
Status: FIRST EDGE ERROR WIDGET VERIFIED — TRAFFIC/DATABASE/QUEUE CONTEXT AND ALARMS PENDING
```

## Phase 8 operational-dashboard checkpoint — 2026-09-28

```text
Dashboard: CLI PutDashboard/GetDashboard verified five persisted widgets and zero validation messages in order-platform-phase8-operations.
Signals: CloudFront viewer error rate (4xx/5xx Average) and viewer requests (Sum), both five-minute us-east-1 metrics for EY6998IJC3CMS; RDS CPUUtilization Average for order-platform-phase5-postgres in ap-south-1; visible-message depth for both the main processing queue and DLQ; and Maximum age of the oldest main-queue message. All widgets use a five-minute period.
Operational model: Requests represent traffic, 4xx/5xx represent errors, RDS CPU and queue depth represent saturation, and oldest-message age is a lagging customer-impact signal. Request volume supplies the denominator needed to interpret percentage spikes safely.
Runtime: CloudFront remains disabled and RDS remains stopped; dashboard creation started no compute. SQS queues are retained low-usage state from Phase 6.
Status: FIVE-WIDGET DASHBOARD VERIFIED — ACTIONABLE ALARMS PENDING
```

## Phase 8 actionable-alarm creation checkpoint — 2026-09-28

```text
Alarms: Three standard-resolution metric alarms were created in ap-south-1, each with ActionsEnabled=true, AlarmActions and OKActions pointing only to order-platform-phase8-ops-alerts, and TreatMissingData=notBreaching.
DLQ alarm: order-platform-phase8-dlq-has-messages uses AWS/SQS ApproximateNumberOfMessagesVisible Maximum for order-platform-phase6-order-processing-dlq, threshold >=1, one of one five-minute datapoint. Any DLQ message is actionable.
Delay alarm: order-platform-phase8-orders-delayed uses AWS/SQS ApproximateAgeOfOldestMessage Maximum for the main queue, threshold >300 seconds, two of three five-minute datapoints. This filters a single transient point while detecting sustained customer delay.
Database alarm: order-platform-phase8-rds-high-cpu uses AWS/RDS CPUUtilization Average for order-platform-phase5-postgres, threshold >80 percent for three of three five-minute datapoints. Its description directs correlation with connections, slow queries, API latency, and queue age rather than treating CPU alone as root cause.
Tags: All alarms were created with the exact Project, Environment, Owner, and AutoCleanup=false tag set. Initial state was INSUFFICIENT_DATA as expected for newly created alarms on stopped/idle resources; missing data is configured as not breaching.
Billing/cleanup: Three standard alarm metrics are hourly prorated and within the approved maximum of three. Delete all three after the controlled state/action test and verify no Phase 8 alarms remain.
Status: THREE ACTIONABLE ALARMS VERIFIED — CONTROLLED STATE/ACTION TEST PENDING
```

## Phase 8 CORS-incident CloudTrail timeline — 2026-09-28

```text
Incident: On 2026-09-27 the same-origin production UI successfully created a product database row, but the browser's direct presigned S3 PUT failed its preflight because the private image bucket had no matching CORS rule. The symptom was a partial outcome: product created, image pending.
Evidence before correction: Browser console reported missing Access-Control-Allow-Origin. Authenticated bucket inspection found no CORS configuration while all S3 Block Public Access settings remained enabled. The API and database path had succeeded, isolating the failure to the browser-to-S3 upload leg rather than CloudFront, ALB, ECS, RDS, presigning identity, or public access.
13:21:52 IST: CloudTrail Event History records PutBucketCors by aws-learning-admin on order-platform-phase5-product-images-2bf589a4, event ID 5dd12ce1-03df-4433-a79b-d4dbf76d7fdf. The narrow rule allowed only the exact production origin, PUT, and the three required request headers.
13:22:54 IST: S3 object inventory records the successful 322,249-byte image write. Browser retry also succeeded. CloudTrail Event History contains no PutObject because object-level S3 operations are data events and no paid data-event trail was enabled; persisted S3 object state supplies this proof.
13:26:27 IST: CloudTrail Event History records DeleteBucketCors by aws-learning-admin on the same bucket, event ID 3faf9329-8747-4a3a-aa58-9df9a3cadd9c, during mandatory runtime cleanup. The uploaded object and database row were intentionally retained as user data.
Root cause: Missing S3 CORS permission for the production browser origin. CORS is enforced by the browser and is separate from IAM authorization, presigned-request validity, bucket privacy, and network routing.
Signals used: Browser console/preflight response, application partial-success message, S3 configuration and object inventory, CloudTrail management-event history, and previously verified API/database health.
Resilience gap/improvement: Product creation and image upload are a multi-step client workflow that can partially succeed. Production should manage the exact CORS rule as reviewed infrastructure, expose image-upload state clearly, support retry/reconciliation, and emit a metric/log for products remaining image-pending rather than relying only on browser reports.
Audit/cost trade-off: Free Event History was sufficient for management configuration changes. Enabling S3 object data events would improve per-object audit detail but adds CloudTrail event charges and should be scoped to the exact bucket/prefix if adopted.
Status: CONTROLLED FAILURE TIMELINE AND ROOT-CAUSE TRACE VERIFIED
```

## Phase 8 resilience review — 2026-09-28

```text
Evidence reused: Phase 6 already demonstrated the real API/database-outbox/SQS/worker path, duplicate handling, poison-message retry to the source queue's three-receive DLQ, diagnosis, and safe redrive. Phase 7 demonstrated a controlled IAM-denied target delivery captured in a DLQ. Phase 8 demonstrated a browser/S3 CORS partial failure and its audit timeline. No paid runtime was recreated for this review.
API unavailable: CloudFront can continue serving the static frontend while enabled, but new API operations fail. Already durable outbox/queue work can continue if the worker and database remain available.
Worker unavailable: Accepted order/job/outbox state remains in PostgreSQL; already published commands remain in SQS. Queue depth/oldest-message age or pending-outbox age grows, providing backpressure signals. Recovery resumes publication/processing without requiring clients to recreate accepted orders.
SQS unavailable: The database transaction preserves the order/job plus pending outbox record. Publication fails/retries rather than creating a database/message split; processing is delayed rather than silently lost.
Database unavailable: API /health may show a live process while /ready fails, so the load-balancer/readiness boundary must stop database-dependent traffic. Workers cannot commit effects and must not delete SQS messages; visibility expiry causes retry and persistent poison/failure eventually reaches the DLQ.
Poison message/IAM denial: Redrive isolates a repeatedly failing command after three receives so unrelated Standard-queue messages can proceed. Missing worker SQS permissions produces growing depth/age; missing publisher SendMessage permission leaves outbox work retryable. Prior Phase 7 evidence showed an AccessDenied delivery captured without invoking its target.
AZ/resilience boundary: SQS is Regional and the temporary ALB spanned two AZs, but one ECS task and the retained Single-AZ RDS instance do not provide application/database high availability. A database-AZ failure is the largest current availability gap. High availability would require redundant tasks and Multi-AZ database failover; disaster recovery instead concerns backup/restore and presently has no cross-Region design.
Graceful degradation: Static browsing can survive API/database downtime when CloudFront is enabled; order mutation and database-backed reads cannot. Queueing absorbs temporary worker slowness, but queue age becomes customer-visible delay and must be alarmed.
Status: DEPENDENCY FAILURE, GRACEFUL DEGRADATION, HA/DR, RETRY, AND DLQ TRADE-OFFS REVIEWED
```

## Phase 8 operational cost model — 2026-09-28

```text
Scope and assumptions: This is a learning estimate using the Mumbai rates already recorded in this ledger, not an invoice quote. The representative active system consists of three 0.25-vCPU/0.5-GB Fargate processes (API, outbox publisher, and worker), one low-traffic two-AZ internet-facing ALB, one public IPv4 per task, and db.t4g.micro RDS compute. CloudFront remains on the existing USD 0 FREE plan. CloudWatch Logs ingestion, request charges, data transfer, excess backup storage, and tax are excluded because workload volume is not specified.
Fresh retained inventory: Account 992382645171 in ap-south-1 has one stopped 20-GiB Single-AZ RDS instance, one managed RDS secret, one ECR repository containing three images totaling approximately 0.360 GB, and two private S3 buckets totaling 568,778 bytes. CloudFront EY6998IJC3CMS is Deployed and disabled. The earlier image tags remain in one repository named order-platform-phase4-api; the previously assumed phase-specific repository names do not exist.
Idle retained baseline: RDS gp3 storage approximately USD 2.62/month + one managed secret USD 0.40/month + ECR approximately USD 0.036/month + S3 approximately USD 0.000014/month = approximately USD 3.056/month, before backup/request/tax variance. Stopping RDS removes compute cost, not storage, backups, or secret cost.
Representative active hour: Each Fargate process is approximately USD 0.0129675/hour for CPU/memory plus public IPv4. Three processes are approximately USD 0.0539025/hour. A low-traffic started ALB hour is approximately USD 0.0419, including one LCU assumption and two ALB public IPv4s. RDS compute is approximately USD 0.021/hour. Total representative runtime is approximately USD 0.1168025/hour before excluded variable charges.
Cost per order: At 1,000 orders processed in that hour, representative runtime is approximately USD 0.0001168/order. At 10 orders in that hour, it is approximately USD 0.01168/order. This demonstrates that utilization, not merely resource price, determines unit economics because fixed hourly runtime is spread across the completed orders.
Scaling boundary: Adding Fargate tasks increases task CPU/memory and public-IPv4 cost roughly per task; ALB LCU, logs, database load/storage, cross-AZ traffic, and transfer can then rise nonlinearly with traffic patterns. NAT Gateway would add meaningful hourly and per-GB cost, so the lab deliberately used task public IPv4s and strict security groups instead.
Status: IDLE, REPRESENTATIVE LOAD, SCALING, AND PER-ORDER COSTS CALCULATED
```

## Phase 8 final review and cleanup verification — 2026-09-28

```text
Phase result: COMPLETE for the Phase 8 learning and exit criteria. The frontend and API were previously verified over HTTPS through the same CloudFront hostname; actionable CloudWatch alarms and SNS delivery were demonstrated; the CORS failure was traced from browser symptom to configuration root cause; and concrete security, resilience, and cost improvements were recorded.
Architecture decision: Use one CloudFront hostname with a private OAC-backed S3 default origin and a non-caching /api/* behavior to a TLS ALB origin. This avoids browser CORS and separate public API-hostname complexity for normal API calls, keeps static assets cacheable, and centralizes viewer TLS. The accepted trade-offs are CloudFront configuration complexity, two TLS hops, a protected origin header that requires rotation, and the need to manage direct presigned-S3 upload CORS separately. Alternatives considered were exposing the React build directly from EC2/ECS/ALB, using a separate public API hostname, or serving the S3 website endpoint; those alternatives lose private-origin/CDN benefits or add cross-origin/public-origin concerns.
Security review: Verified controls included private S3/OAC delivery, viewer and origin TLS, disabled API caching, CloudFront-prefix-list restriction on the temporary ALB, a private origin-verification header, private RDS, and IAM workload roles. Remaining improvements are managed rotation for the static origin header, exact CORS and operational alarms managed as code, selective S3 data-event auditing if justified, redundant ECS tasks, and a deliberate Multi-AZ RDS cost/availability decision.
Temporary observability cleanup: The three Phase 8 alarms, custom dashboard, SNS email subscription, and SNS topic are absent. Cleanup was initiated under the emergency-stop protocol while the user was frustrated, before the intended alarm-wiring explanation had been completed; that sequencing caused avoidable confusion. No persistent application data was deleted. Previously delivered test emails cannot be recalled.
Fresh AWS runtime verification: Account 992382645171 in ap-south-1 has zero pending/available NAT Gateways, zero Elastic IP allocations, zero pending/running EC2 instances, zero ECS services and running tasks in order-platform-phase4-cluster, zero load balancers, and no temporary /aws/order-platform/phase6/api log group. The product-image bucket has no CORS configuration. CloudFront EY6998IJC3CMS is Deployed with Enabled=false.
Database: order-platform-phase5-postgres is stopped, private, Single-AZ, and retains 20 GiB storage. AWS reports mandatory automatic restart at 2026-10-04 08:02:43 UTC / 2026-10-04 13:32:43 IST. Review and stop it again or intentionally delete it before that deadline.
Intentionally retained state: One RDS instance/storage and managed secret; one ECR repository with three images totaling about 0.360 GB; two private S3 buckets totaling 568,778 bytes; the disabled CloudFront distribution/OAC/WAF-free-plan configuration; ACM certificates and validation records; the documented DNS records; and reusable VPC, IAM, security-group, task-definition, queue, and empty-cluster foundation. Approximate known idle baseline is USD 3.056/month before backups, requests, and tax. Review/delete date remains 2026-10-03.
Boundary decision: Manual-foundation import versus deletion is intentionally not performed in this Phase 8 close-out. It is the first Phase 8/9 boundary decision before Terraform recreation; no Terraform apply should duplicate the retained manual foundation.
Disposable hourly runtime cleanup: VERIFIED.
Temporary Phase 8 observability cleanup: VERIFIED.
Overall account cleanup: PARTIAL — only the explicitly documented retained foundation and persistent low-volume data remain, with cost, reason, review date, and RDS automatic-restart deadline recorded.
```

## Phase 9 Session 1 local Terraform close-out — 2026-10-01

```text
Session scope: Installed and checksum-verified Terraform 1.16.4 locally; completed a local-only Terraform lifecycle exercise using one local_file resource, including init, fmt, validate, plan, apply, state inspection, replacement, controlled drift detection/repair, reviewed destroy, and direct cleanup verification.
AWS changes: None. No Terraform AWS provider was configured and no AWS or Cloudflare resource was created, started, modified, imported, or deleted.
Local cleanup: The managed hello.txt file is absent and terraform state list is empty after destroy. The learning configuration and provider lock file remain as local learning artifacts; generated Terraform working/state files are Git-ignored.
Fresh AWS identity and Region: Expected aws-learning Identity Center caller in account 992382645171 verified with explicit ap-south-1 queries.
Fresh AWS runtime verification: order-platform-phase5-postgres is stopped, private, and reports mandatory automatic restart at 2026-10-04 08:02:43 UTC / 2026-10-04 13:32:43 IST. The retained ECS cluster has zero active services and zero running/pending tasks. Fresh inventories contain zero load balancers, zero pending/available NAT Gateways, and zero Elastic IP allocations.
Resources intentionally retained: The previously documented Phase 4-8 foundation and persistent data remain unchanged. Review them by 2026-10-03, before the RDS automatic-restart deadline.
Expected incremental AWS cost: USD 0 from this local-only Terraform session. The previously documented approximate USD 3.056/month retained idle baseline continues before backups, requests, transfer, and tax.
Disposable Session 1 cleanup: VERIFIED.
Overall account cleanup: PARTIAL — previously documented retained foundation and persistent data remain intentionally present; no Phase 9 AWS resource exists yet.
```

## Phase 9 Session 1 completion — 2026-10-02

```text
Learning evidence: The learner resumed the local-only Terraform lab and implemented an input variable and output, supplied a value through TF_VAR_greeting, generated and reviewed a saved plan, applied that exact plan, inspected the managed resource and plaintext state attributes, explained how current inputs determine desired state, and observed how a removed environment override changes the next plan.
AWS changes: None. No Terraform AWS provider was configured and no AWS or Cloudflare resource was created, started, modified, imported, or deleted.
Local cleanup verification: terraform destroy completed; hello.txt is absent; terraform state list is empty; the obsolete lesson.tfplan is absent. Generated .terraform and local state files remain Git-ignored. main.tf and .terraform.lock.hcl remain as learning artifacts.
Fresh AWS verification: order-platform-phase5-postgres is stopped and private with mandatory automatic restart at 2026-10-04 08:02:43 UTC / 2026-10-04 13:32:43 IST. The retained ECS cluster has zero active services and zero running/pending tasks. Fresh inventories contain zero load balancers, zero pending/available NAT Gateways, and zero Elastic IP allocations.
Budget signal at session start: USD 3.738 actual and USD 3.786 forecast against the USD 5 warning budget, last updated 2026-10-01. Billing is delayed and the budget is not a cap or cleanup proof.
Expected incremental AWS cost: USD 0 for this local-only session. The previously documented retained idle baseline continues.
Session 1 cleanup: VERIFIED.
Overall account cleanup: PARTIAL — previously documented retained foundation and persistent data remain. Review them by 2026-10-03, before the RDS automatic-restart deadline.
```

## Phase 9 Session 2 AWS-provider close-out — 2026-10-02

```text
Session scope: Configured the Terraform AWS provider for ap-south-1, corrected the credential path from stale default shared credentials to the aws-learning IAM Identity Center profile, and verified account 992382645171. Read-only data sources inspected the caller identity, selected Region, and available Availability Zones. The learner reviewed provider locking, Git-ignore boundaries, outputs in state, and the distinction between data sources and managed resources.
AWS changes: None. Terraform made only read-only AWS API calls; no managed AWS resource was created, modified, imported, or deleted.
Local cleanup verification: terraform destroy removed the outputs and data-source records from local state; terraform state list was empty afterward. main.tf and .terraform.lock.hcl remain as learning artifacts; generated provider and state files remain Git-ignored.
Expected incremental AWS cost: USD 0 for the read-only provider lesson.
Session 2 cleanup: VERIFIED.
Overall account cleanup: PARTIAL — the previously documented retained foundation and persistent data remained outside this lab.
```

## Phase 9 Session 3 preflight and automatic-RDS-restart response — 2026-10-04

```text
Identity and Region: The aws-learning Identity Center caller was freshly verified as aws-learning-admin in account 992382645171. All workload checks used ap-south-1 (Mumbai).
Automatic restart detected: order-platform-phase5-postgres had automatically returned to available. It remained private, db.t4g.micro, and 20 GiB gp3. While available it incurred RDS compute charges in addition to retained storage/backup/secret costs.
Cost-safety action: With the learner's explicit approval, a stop was requested for only order-platform-phase5-postgres. Repeated direct AWS checks confirmed the terminal stopped state; no database, snapshot, secret, or persistent data was deleted. AWS now reports the next mandatory automatic restart at 2026-10-11 13:13:40 UTC / 2026-10-11 18:43:40 IST. Review, deliberately start-stop, or delete it by 2026-10-10.
Fresh runtime baseline: The retained ECS cluster is ACTIVE with zero services and zero running/pending tasks. There are zero load balancers, zero pending/available/deleting NAT Gateways, and zero Elastic IP allocations.
Budget signal: October actual USD 0.333 and forecast USD 3.311 against the USD 5 warning budget. Billing data is delayed; this is not a spending cap or cleanup proof.
Proposed Session 3 disposable resource: One Standard SQS queue, with no hourly idle charge. SQS is request/data-transfer billed; the planned lab uses only a handful of control-plane requests, sends no messages, and is expected to remain within the account's monthly free request allowance. The queue must be destroyed through Terraform and independently verified absent before session close.
Pre-lab cleanup status: VERIFIED for hourly runtime. Overall account cleanup remains PARTIAL because the documented retained foundation and persistent data remain.
```

## Phase 9 Session 3 SQS lifecycle and cleanup — 2026-10-04

```text
Learning resource: Terraform created exactly one Standard SQS queue, order-platform-phase9-tf-lab-20261004, in account 992382645171 and ap-south-1. Required tags were Project=aws-order-platform, Environment=learning, Owner=Tarun, and AutoCleanup=false. No messages, subscriptions, DLQ, customer-managed KMS key, or cross-Region transfer were used.
Billing contract: SQS has no hourly idle charge and is request/data-transfer billed. The exercise made only a small number of control-plane calls and sent no messages; expected incremental SQS cost is effectively USD 0 and within the monthly free request allowance, though the allowance was not treated as a spending cap.
Lifecycle evidence: A reviewed saved plan created one resource. Terraform state and a direct AWS attribute query agreed on the queue ARN, zero messages, 3,600-second retention, and 10-second long polling. A configuration change to 7,200-second retention produced an in-place update with the same ARN.
Controlled drift: The queue retention was manually changed through the AWS CLI from 7,200 to 900 seconds while configuration remained 7,200. Terraform refreshed AWS, detected 900 -> 7,200 as one in-place change, and a reviewed saved plan restored the configured value. A direct AWS query confirmed 7,200 afterward.
Destroy and verification: A reviewed destroy plan contained only aws_sqs_queue.learning. Apply reported one destroyed. terraform state list is empty; no *.tfplan files remain in the lab; an independent AWS GetQueueUrl call returns AWS.SimpleQueueService.NonExistentQueue for the exact queue name.
Retained runtime verification: order-platform-phase5-postgres remains stopped and private. Its next mandatory automatic restart is 2026-10-11 13:13:40 UTC / 2026-10-11 18:43:40 IST. Review or deliberately start-stop/delete it by 2026-10-10.
Session 3 disposable-resource cleanup: VERIFIED.
Overall account cleanup: PARTIAL — the previously documented retained foundation and persistent data remain intentionally retained with residual storage/secret costs.
```

## Phase 9 Session 4 remote-state bootstrap proposal — 2026-10-04

```text
Approved purpose: Create one dedicated Terraform-managed S3 bucket named aws-order-platform-tfstate-992382645171-ap-south-1 in account 992382645171 and ap-south-1. It will store separate encrypted state objects and native S3 lock files for the foundation, data, and runtime root modules. Existing application buckets will not store Terraform state.
Billing: S3 Standard storage plus PUT/GET/LIST requests. State files and lock files are expected to remain tiny and low request volume; expected residual cost is well below USD 0.01/month at the learning scale, but billing is usage-based and the estimate is not a cap.
Security/recovery controls in reviewed plan: default SSE-S3 encryption, all four Block Public Access settings, TLS-only bucket policy, versioning, 90-day noncurrent-version expiration, seven-day incomplete-multipart cleanup, force_destroy=false, and Terraform prevent_destroy lifecycle protection. Required project tags plus ManagedBy=Terraform and Stack=bootstrap are present.
Plan evidence: Saved bootstrap.tfplan contains exactly six creates, zero changes, and zero destroys: the bucket, versioning, encryption configuration, public-access block, lifecycle configuration, and TLS-only bucket policy. The IAM policy document is read-only plan data, not an AWS resource.
Retention and cleanup: Retain through Phase 9 because active Terraform roots will depend on it. Review/delete by 2026-10-31 or Phase 9 completion, whichever comes first. Before deletion, migrate or retire every active state, preserve any required recovery version, deliberately remove prevent_destroy, delete all object versions/lock files, delete the bucket, and independently verify absence in AWS.
Status: APPROVED DESIGN AND REVIEWED PLAN — APPLY/POST-APPLY VERIFICATION PENDING.
```

## Phase 9 Session 4 remote-state bootstrap completion — 2026-10-04

```text
Applied result: The reviewed bootstrap plan created the dedicated state bucket and its five protection/configuration resources with zero unrelated changes or destroys. Bootstrap local state contains the expected three data addresses and six managed addresses. The obsolete bootstrap plan file is absent.
AWS verification: aws-order-platform-tfstate-992382645171-ap-south-1 has versioning Enabled, all four Block Public Access controls true, policy status IsPublic=false, explicit SSE-S3 encryption, the reviewed lifecycle controls, and the TLS-only deny policy. The foundation state object exists at foundation/terraform.tfstate, is 1,551 bytes, is AES256 encrypted, and has S3 version ID rDmRXMNF7CenUOtuKetddJqCqdWE27RK.
State migration: The foundation root first created a harmless local state containing only caller/Region data, then terraform init -migrate-state copied it into the S3 backend with native use_lockfile=true locking and the expected-account guard. Obsolete local terraform.tfstate and terraform.tfstate.backup files are absent; terraform state list still returns the two data addresses through the remote backend.
Retained-cost status: The state bucket and its tiny versioned objects are intentionally retained through Phase 9. Expected S3 storage/request cost remains well below USD 0.01/month at current learning scale. Review/delete by 2026-10-31 or Phase 9 completion, whichever comes first; use the documented state-migration/version-cleanup procedure before bucket deletion.
Hourly-runtime verification: RDS order-platform-phase5-postgres is stopped and private with mandatory automatic restart at 2026-10-11 13:13:40 UTC / 18:43:40 IST. ECS has zero services and zero running/pending tasks; there are zero load balancers, pending/available/deleting NAT Gateways, and Elastic IP allocations.
Session 4 disposable cleanup: VERIFIED — no disposable AWS runtime was created. The state bucket is intentionally retained infrastructure, not failed cleanup.
Overall account cleanup: PARTIAL — the Terraform state bucket plus the previously documented manual foundation and persistent data remain intentionally retained.
```

## Phase 9 Session 5 ECR-import preflight — 2026-10-06

```text
Identity and Region: Freshly verified aws-learning-admin in account 992382645171; all workload work remains in ap-south-1.
Budget gate: October actual USD 0.723 and forecast USD 6.051 against the USD 5 warning budget, last updated 2026-10-06 19:54 IST. Billing is delayed and the budget is not a cap. Because forecast exceeds the warning amount, this session must create no new paid service runtime or storage beyond tiny already-approved Terraform state requests/versions.
Runtime baseline: order-platform-phase5-postgres is stopped and private with mandatory automatic restart at 2026-10-11 13:13:40 UTC / 18:43:40 IST. ECS has zero services and zero running/pending tasks. There are zero load balancers, pending/available/deleting NAT Gateways, and Elastic IP allocations.
Import target: Existing ECR repository order-platform-phase4-api, AES256 encrypted, immutable tags, scan-on-push disabled, containing three retained tagged images totaling 360,122,996 bytes. Import must preserve all images, use force_delete=false and lifecycle prevent_destroy, and propose zero replacement or deletion. Expected incremental ECR cost from import is USD 0 because import changes ownership/state rather than stored image bytes.
Cleanup/verification: Confirm the post-import repository ARN and image digests/count directly in AWS, remove obsolete saved plan files, and retain the repository under its previously documented ECR storage cost. If the plan proposes replacement, repository deletion, or image deletion, do not apply.
Status: READ-ONLY PREFLIGHT VERIFIED — IMPORT CONFIGURATION/PLAN PENDING.
```

## Phase 9 Session 5 ECR adoption and root-state completion — 2026-10-07

```text
ECR adoption result: Existing repository order-platform-phase4-api was imported into foundation state as aws_ecr_repository.api. The reviewed plan had one import, zero creates, zero destroys, no replacement, and only state/config bookkeeping for force_delete=false and already-effective tags. lifecycle prevent_destroy is configured. A fresh Terraform plan reports No changes.
Image preservation evidence: Direct AWS verification still reports exactly three images totaling 360,122,996 bytes, with unchanged digests sha256:7ae8d36f79cdfe09383e8aa605ea4e7963224d609debe8d15b0da1df349fbe7a, sha256:d037cd3880bea4235a577811e738fa9cc4b233ee6f41053eb796f0c434eb71b1, and sha256:d28527248fa29eb7e62d18a6a51442e91602b9a812e0050f0576638e9bf89a82. No image was uploaded, downloaded, retagged, or deleted.
Remote-state roots: foundation, data, and runtime each use a separate encrypted S3 backend object with native S3 locking and the expected-account guard. Current object sizes are foundation 3,832 bytes, data 1,551 bytes, and runtime 3,653 bytes. Foundation exports the repository ARN/URL; runtime reads the URL through terraform_remote_state without owning the repository. Fresh plans for all three roots report No changes.
Local cleanup: No *.tfplan file remains under infrastructure/terraform. The only top-level local infrastructure state is bootstrap/terraform.tfstate, intentionally retained because it owns the backend bucket. Files under each root's ignored .terraform directory are backend working metadata, not active local architecture state.
Cost result: Import and state wiring created no new billable service resource and did not change stored ECR bytes. Incremental cost is limited to tiny already-approved S3 state versions/API requests. October budget remains USD 0.723 actual and USD 6.051 forecast against the USD 5 warning amount at the latest delayed update; no paid runtime was created.
End-of-session AWS verification: RDS is stopped and private with mandatory automatic restart at 2026-10-11 13:13:40 UTC / 18:43:40 IST. ECS has zero services and zero running/pending tasks; there are zero load balancers, NAT Gateways in billable transition states, and Elastic IP allocations.
Session 5 cleanup: VERIFIED. The ECR repository/images and Terraform backend are intentionally retained managed foundation.
Overall account cleanup: PARTIAL — the documented Terraform foundation, manual foundation, persistent data, stopped RDS storage, managed secret, and other retained low-volume resources remain.
```

## Phase 9 Session 6 network-import preflight — 2026-10-08

```text
Identity and Region: Freshly verified aws-learning-admin in account 992382645171; all network work remains in ap-south-1 (Mumbai).
Budget gate: October actual USD 0.873 and forecast USD 3.701 against the USD 5 warning budget, last updated 2026-10-08 02:14 IST. Billing is delayed and the budget is not a spending cap or cleanup proof.
Runtime baseline: order-platform-phase5-postgres is stopped and private. AWS reports its next mandatory automatic restart at 2026-10-11 13:13:40 UTC / 18:43:40 IST. Fresh checks found zero load balancers, zero NAT Gateways, zero Elastic IP allocations, and zero running ECS tasks.
Import target: Existing VPC vpc-01f2e981ee69febad (10.40.0.0/16), its attached Internet Gateway, four subnets, public/private route tables, routes, and associations. VPC DNS support and DNS hostnames are both enabled. The import must preserve IDs, CIDRs, Availability Zones, tags, routes, and associations and must propose zero creates, replacements, or destroys.
Billing contract: Terraform import only records existing resources in remote Terraform state; it does not duplicate the network or add AWS service cost. The retained VPC, subnets, route tables, associations, and Internet Gateway have no direct hourly charge. No NAT Gateway, VPC endpoint, Elastic IP, load balancer, or other paid runtime will be added in this session. Incremental cost is limited to tiny S3 state versions and requests.
Cleanup/verification: After each import stage, require a reviewed plan with zero creates/replacements/destroys and then a fresh no-change plan. At session close, recheck paid runtime directly in AWS and record VERIFIED, PARTIAL, or NOT VERIFIED. The imported network is intentionally retained for later Terraform architecture work.
Status: READ-ONLY PREFLIGHT VERIFIED — NETWORK IMPORT PENDING.
```

## Phase 9 Session 6 network adoption and cleanup — 2026-10-08

```text
Adoption result: The existing Phase 4 network was imported into the foundation remote state without creating, replacing, or destroying AWS resources. Reviewed saved plans imported VPC vpc-01f2e981ee69febad, Internet Gateway igw-03dcd901c5395fbf7, four subnets, the public and private route tables, four explicit subnet associations, and the VPC default/main route table. Every import plan showed zero adds, zero changes, and zero destroys; the learner's final Terraform reconciliation reported No changes.
Routing verification: Direct AWS inspection shows public subnets subnet-022206a94faffa567 and subnet-03d602d500bb7f64a associated with rtb-069097f89f8bd5070, whose 0.0.0.0/0 target remains igw-03dcd901c5395fbf7. Private subnets subnet-0959a93361d698088 and subnet-0462c591e5d829fdd remain associated with rtb-0f14920dd8fddf372 and have no default Internet route. The default/main route table rtb-0cf4de2df4c9d7be0 remains without a default gateway route.
Terraform state verification: Foundation state contains the VPC, Internet Gateway, four subnets, public/private/default route tables, four route-table associations, the previously imported ECR repository, and the caller/Region data sources. lifecycle prevent_destroy protects the adopted network resources and associations. All six obsolete saved import-plan files were removed; zero *.tfplan files remain in the foundation root.
Cost result: Importing the retained VPC graph added no AWS service runtime and did not add NAT Gateway, VPC endpoint, Elastic IP, or load-balancer charges. VPC, subnets, route tables, associations, and Internet Gateway have no direct hourly charge. Incremental cost remains limited to tiny S3 remote-state versions and API requests.
End-of-session AWS verification: RDS order-platform-phase5-postgres is stopped and private, with mandatory automatic restart at 2026-10-11 13:13:40 UTC / 18:43:40 IST. Fresh checks found zero load balancers, zero NAT Gateways in billable transition states, zero Elastic IP allocations, and zero running ECS tasks.
Session 6 disposable-runtime cleanup: VERIFIED — no disposable or paid runtime was created.
Overall account cleanup: PARTIAL — the Terraform-managed network/ECR/backend and previously documented persistent resources remain intentionally retained. Review the stopped RDS before its automatic restart deadline.
```

## Phase 9 security-group and ECS IAM adoption close-out — 2026-10-10

```text
Scope: Account 992382645171, workload Region ap-south-1. Imported three existing security groups and their six rules, two ECS IAM roles, one AWS-managed policy attachment, and three task-role inline policies into foundation remote state.
Changes reviewed: Security-group imports changed no traffic settings. The six rule imports added only the common project tags. IAM role, attachment, and inline-policy imports changed no permissions. The learner reported No changes after each final reconciliation. Remote state independently confirms all expected managed addresses.
Permissions retained: CloudFront HTTPS to ALB; ALB TCP 3000 to application; application TCP 5432 to DB and outgoing HTTPS. ECS execution role retains AmazonECSTaskExecutionRolePolicy. Application task role retains exact product-object-prefix access, exact database-secret read access, and exact order-queue send/receive/delete access. No secret value was fetched.
Local cleanup: Removed the twelve inspected obsolete saved plan files from the foundation root; configuration, lock file, and remote state were preserved.
Fresh AWS runtime checks: ECS cluster has zero services, running tasks, and pending tasks. There are zero load balancers, zero pending/available/deleting NAT Gateways, and zero Elastic IP allocations. RDS order-platform-phase5-postgres remains stopped and private; automatic restart is 2026-10-11 13:13:40 UTC / 18:43:40 IST.
Retention: Imported security groups, rules, IAM roles, and policies are retained for Terraform application deployment; they have no direct idle service charge. Review at Phase 9 completion or 2026-10-31, whichever comes first. Previously retained RDS storage, managed secret, ECR images, S3 objects/state and other foundation keep their documented residual costs; review RDS by its 2026-10-11 restart deadline.
Incremental cost: No new paid AWS runtime or persistent application storage. Only tiny existing S3 state-version/request usage.
Disposable-runtime cleanup: VERIFIED.
Overall account cleanup: PARTIAL — documented foundation and persistent data intentionally remain.
```

## Phase 9 disposable RDS deletion approval — 2026-10-19

```text
User decision: Practice database data does not need preserving; recreate the project-supporting database with Terraform later. Delete only order-platform-phase5-postgres in account 992382645171, ap-south-1, without a final snapshot and without retaining automated backups. RDS will delete its associated managed master secret. No other data store is authorized for deletion.
Preflight: Instance stopped, private, deletion protection false, no ECS services/running/pending tasks, no load balancers, no active NAT Gateways or Elastic IPs. Two automated snapshots exist; no manual snapshot was returned for this instance. Budget actual USD 5.632, forecast USD 8.913, warning limit USD 5. Cost Explorer attributes about USD 4.522 to RDS, USD 0.234 to Secrets Manager and USD 0.86 to tax; billing is delayed.
Recreation configuration: PostgreSQL 16.14, db.t4g.micro, database order_platform, master username order_admin, port 5432, encrypted 20-GiB gp3, private Single-AZ, backup retention one day, no storage autoscaling configured, automatic minor upgrades false, IAM DB authentication false, Performance Insights true, Enhanced Monitoring interval zero. Use RDS-managed credentials when recreated; never reuse the old secret ARN.
Reusable dependencies retained: order-platform-phase5-db-subnet-group (private A/B), order-platform-phase5-postgres16 parameter group, and Terraform-managed sg-065c024612a098e00. No direct idle charge; review by 2026-10-31 or Phase 9 completion. Existing Terraform task-role policy references the old secret ARN; rewire it to the new managed-secret ARN during database recreation. No existing aws_db_instance resource was found in Terraform configuration.
Deletion verification required: Instance returns DBInstanceNotFound, its automated-backup resource and snapshots are absent, and its managed master secret is absent. No snapshot will be created. No new AWS compute will be started for this cleanup.
Result: AWS completed deletion. Independent DescribeDBInstances returned DBInstanceNotFound; DescribeSecret returned ResourceNotFoundException; snapshot inventory and automated-backup inventory for db-ZRMP72DQH3SROK2FALJPOSEARM were both empty. No final snapshot was created. The practice database data has no retained recovery copy from this instance. Its previous automatic-restart deadline no longer applies.
Retained dependencies: Existing DB subnet group, parameter group, security group, network, IAM roles and application artifacts remain for Terraform recreation. The old exact-secret policy remains in code for now and will be updated when the replacement secret exists. No new billable runtime was created.
Database/storage/managed-secret cleanup: VERIFIED.
Overall account cleanup: PARTIAL — other documented ECR/S3/backend and low-cost foundation remain, with prior residual-cost records and review by 2026-10-31 or Phase 9 completion.
```

## Phase 9 product S3 and SQS adoption close-out — 2026-10-19

```text
Scope: Account 992382645171, ap-south-1. Imported existing product-image bucket order-platform-phase5-product-images-2bf589a4, public-access block, server-side encryption configuration, and ownership controls into the data remote state. Imported the existing order-platform-phase6-order-processing queue, its DLQ, and both queue access policies. No AWS resource was duplicated and no message or object was created or deleted by this adoption.
Terraform evidence: Independent data-root terraform plan completed successfully with No changes. Remote state contains exactly eight managed resource addresses plus caller and Region data. Native remote-state locking remains configured. The existing order queue's redrive policy references the managed DLQ ARN with maxReceiveCount=3.
Direct AWS S3 evidence: All four public-access-block flags true; AES256 encryption and reported BucketKeyEnabled=true preserved; BucketOwnerEnforced ownership. No bucket policy exists. Product bucket inventory contains two object versions totaling 352,041 bytes. Bucket versioning was not enabled. Objects are intentionally retained; force_destroy=false and prevent_destroy protect the bucket in Terraform. No object download was needed.
Direct AWS SQS evidence: Both queues have zero visible, in-flight, and delayed messages. Order queue has 60-second visibility, 86,400-second retention, 20-second long polling, managed encryption, and a three-receive DLQ policy. DLQ has 30-second visibility, 345,600-second retention, zero-second polling, and managed encryption. Both existing account-owner access policies were preserved.
Local cleanup: Removed the eight inspected obsolete saved import plans from the data root. Zero *.tfplan files remain there. Configuration, lock file, backend, and remote state were preserved.
Fresh cost/runtime verification: Zero RDS instances in ap-south-1; zero ECS services/running/pending tasks in the project cluster; zero load balancers, pending/available/deleting NAT Gateways, Elastic IPs, pending/running/stopping/stopped EC2 instances, unattached EBS volumes, and VPC endpoints in the project VPC. Earlier exact-instance checks verified the deleted database's secret, snapshots, and automated backups absent.
Intentionally retained: Product-image bucket and objects for application deployment; existing SQS order/DLQ pair for background processing. Review at Phase 9 completion or 2026-10-31, whichever comes first. S3 remains storage/request billed; 352,041 bytes imply a tiny storage residual under the earlier recorded S3 rate (well below USD 0.01/month, excluding request/transfer volume). SQS has no direct idle hourly charge and this session sent/received no messages. Existing ECR, frontend S3, Terraform backend and low-cost foundation retain their documented purposes/cost records and the same review date.
Billing gate: Latest session budget reading was USD 5.632 actual / USD 8.913 forecast against USD 5; delayed historical costs do not disappear after deletion. No new paid runtime was created. Incremental adoption cost is limited to existing S3 state versions and a small number of API requests.
Next configuration work: Frontend S3/CloudFront integration remains deferred. Database will be recreated through Terraform with fresh managed credentials and a deliberately disposable learning lifecycle; replace the old secret ARN in the task-role policy then. No current database can auto-restart.
Session disposable-runtime cleanup: VERIFIED.
Overall account cleanup: PARTIAL — intentional retained S3/ECR/state/queue objects and reusable foundation remain with the above residual costs and review date.
```

## Phase 9 ECS foundation and state-wiring preflight — 2026-10-20

```text
Identity: aws-learning-admin in account 992382645171 verified; workload Region ap-south-1.
Budget: Actual USD 5.705, forecast USD 6.987, warning limit USD 5. Previous RDS and managed secret were deleted and verified absent. Billing includes delayed historical charges. This lesson permits no new paid runtime.
Fresh baseline: order-platform-phase4-cluster is ACTIVE with zero services, running tasks, pending tasks and registered EC2 container instances. Zero RDS instances, load balancers, pending/available/deleting NAT Gateways, and Elastic IPs in the workload Region.
Approved lesson scope: Import existing empty ECS cluster and its capacity-provider association, preserving disabled Container Insights and execute-command logging DEFAULT. Existing capacity providers are FARGATE and FARGATE_SPOT, with no default strategy. Export foundation/data outputs and consume them in runtime remote state. Require reviewed plans with no new runtime, no replacement, no deletion or permission changes.
Cost/retention: Empty ECS cluster and capacity-provider associations have no direct idle charge; no tasks/services will launch. Only tiny S3 state versions/requests are expected. Retain with foundation through Phase 9; review by 2026-10-31 or Phase 9 completion. Close with fresh AWS runtime verification, no-change reconciliation and obsolete saved-plan cleanup.
Status: PREFLIGHT VERIFIED — LEARNER CONFIGURATION/IMPORT PENDING.
```

## Phase 9 ECS foundation and state-wiring close-out — 2026-10-20

```text
Scope/result: Adopted existing order-platform-phase4-cluster as aws_ecs_cluster.main and its existing FARGATE/FARGATE_SPOT association as aws_ecs_cluster_capacity_providers.main in foundation state. No default capacity strategy was added, Container Insights remains disabled, execute-command logging remains DEFAULT. Reviewed imports created, changed, and destroyed no AWS resources.
Published interfaces: Foundation exports the VPC ID, public/private subnet ID lists, ALB/application/database security-group IDs, execution/task role ARNs, ECS cluster ARN and existing ECR references. Data exports the product bucket name/ARN, order queue URL/ARN and DLQ ARN. Runtime reads foundation and data through separate terraform_remote_state sources; diagnostic outputs verified cluster ARN and queue URL. Outputs are interfaces, not security boundaries or secret stores.
Independent Terraform verification: Fresh plans for foundation, data and runtime all exited successfully with No changes. Runtime refreshed both remote states successfully. Source inspection verified the intended outputs and state references.
AWS verification at close: Cluster ACTIVE with zero services, running tasks, pending tasks and registered EC2 container instances. Capacity providers FARGATE/FARGATE_SPOT retained, no default strategy, Container Insights disabled. Zero RDS instances, load balancers, pending/available/deleting NAT Gateways and Elastic IPs in ap-south-1.
Local cleanup: Removed eight inspected obsolete saved plans from the foundation/data/runtime roots; verified zero *.tfplan files remain at those root levels. User-authored configuration, provider lock files, remote state and backend metadata preserved.
Cost: No new paid runtime or application storage. Empty cluster/capacity-provider association has no direct idle charge; incremental work uses tiny S3 state versions and API requests. Latest session budget actual USD 5.705, forecast USD 6.987 against USD 5; delayed historical costs remain after RDS deletion. No budget increase was made.
Retained resources: ECS cluster and association, network/security/IAM foundation, ECR, product/ frontend S3 objects, queues and Terraform backend retain their documented purpose and storage/request costs; review by Phase 9 completion or 2026-10-31. No RDS instance remains to auto-restart. Runtime owns no deployed application service yet.
Next lesson: Describe the runtime database and application task/service configuration, rewire the old exact-secret permission to the replacement managed secret, and use reviewed bounded deployment/destroy plans. Task subnet placement must account for the existing local-only private routes; do not assume those subnets can reach ECR/S3/SQS without an egress design.
Session disposable-runtime cleanup: VERIFIED.
Overall account cleanup: PARTIAL — intentionally retained foundation and low-volume storage/message/state resources remain with documented review dates.
```

## Phase 9 bounded Terraform RDS creation gate — 2026-10-27

```text
Authorization: User explicitly approved continuing a short paid test beyond the USD 5 warning amount. Budget alert configuration is unchanged. Fresh session budget was USD 5.720 actual and USD 5.775 forecast. Limit this approval to one disposable practice DB, metadata verification and same-session destruction; no application services, ALB, NAT Gateway or extra compute approved by this gate.
Target: aws_db_instance.main in runtime, identifier order-platform-phase9-postgres, account 992382645171, Region ap-south-1. Reviewed saved db-create.tfplan contains exactly one add, zero changes, zero destroys. PostgreSQL 16.14/db.t4g.micro/gp3 20-GiB is available in this Region and supports encrypted storage. DB subnet and parameter groups were separately imported into foundation with no changes and exported to runtime.
Cost contract: Official AWS Pricing API checked on 2026-10-27: Single-AZ PostgreSQL db.t4g.micro compute USD 0.021/hour; gp3 storage USD 0.131/GB-month (20 GiB is USD 2.62/month, prorated). RDS-managed Secrets Manager secret adds its separately metered storage/API cost. Compute bills while idle; stopped instances retain storage/secret charges and auto-restart, so stopping is not the chosen close-out. Expected short-test cost is a few US cents before tax/other variable usage, not a spending cap.
Safety/configuration: Private Single-AZ, encrypted, no storage autoscaling, Enhanced Monitoring off, Performance Insights off in reviewed plan. RDS manages master password; never output/fetch the secret value. Deletion protection false, backup retention zero, skip final snapshot true, delete automated backups true. Practice data explicitly disposable. No manual passwords enter Terraform configuration/state.
Bound: Start around 2026-10-27 07:25 IST; target deletion request by 08:10 IST and verified completion before session end, allowing creation/deletion latency. If user pauses or leaves, initiate authorized disposable-runtime cleanup immediately. Do not retain the DB between sessions.
Cleanup procedure: Learner reviews terraform plan -destroy in runtime; expect only aws_db_instance.main deletion and no foundation/data deletion. Apply exact destroy plan. Verify DBInstanceNotFound, the RDS-managed secret absent, and no instance snapshots/retained automated backups. Retain configuration and reusable foundation. Old task-role secret ARN remains a known pending application-integration fix; this gate does not claim application/database connectivity has been tested.
Resource ledger: order-platform-phase9-postgres and its RDS-managed secret are AUTHORIZED / NOT YET CREATED. Status must be updated after apply and deletion. Session cleanup NOT VERIFIED until post-destroy AWS checks complete.
```

## Phase 9 power-interruption RDS cleanup — 2026-10-27

```text
Trigger: User reported losing power during Terraform apply and asked to check whether creation completed. Mandatory interruption cleanup applies under the preapproved same-session disposable-database lifecycle.
Observed state: Direct AWS check confirms order-platform-phase9-postgres available and private, with active RDS-managed secret. Resource ID db-ORYQA4BDGI53EBWOQF3F4KWHH4. Terraform remote state independently contains aws_db_instance.main. No local Terraform process remained in the process inventory. Creation therefore completed and was recorded despite the lost terminal output.
Action: Review and apply a runtime destroy plan containing only this DB instance. No foundation/data resources, application data stores, or other secrets are in scope. The practice database data is already confirmed disposable; skip final snapshot and remove automated backups. RDS should remove its managed master secret. No secret value is read.
Status: CREATED / ACTIVE VERIFIED — AUTHORIZED CLEANUP IN PROGRESS. Cleanup NOT VERIFIED until AWS confirms absence and remote state reconciliation is checked.
```
