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
