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

Allowed status values:

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
