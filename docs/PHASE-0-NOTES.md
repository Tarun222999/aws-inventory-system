# Phase 0 — Account, IAM, and cost safety

## Session evidence — 2026-07-20

- Primary learning Region confirmed: `ap-south-1` (Mumbai).
- Root MFA: enabled and verified by the user.
- Root access keys: two legacy keys found; both deactivated after confirming
  they are no longer needed. Permanent deletion is deferred until replacement
  access and an observation period are complete.
- IAM Identity Center organization instance: enabled in `ap-south-1`.
- Daily administrative identity: created in IAM Identity Center, MFA verified,
  and assigned the `AdministratorAccess` permission set for the learning
  account.
- Root session: signed out after daily-user access was verified.
- AWS CLI: SSO login verified using temporary credentials. Caller is an
  `AWSReservedSSO_AdministratorAccess` assumed role.
- CLI profile and default Region: `ap-south-1`.
- Initial baseline: current-month estimate reported as USD 0; no current
  service usage, S3 buckets, or resources in EC2 Global View were reported.
- Billing access for the daily Identity Center role was enabled and verified.
  Billing dashboard evidence: month-to-date USD 0.00, prior-month total USD
  0.00, and current-month forecast unavailable because there is no usage to
  forecast.
- Credits page verified: no active credit balance (USD 0.00 remaining and
  used). Free Tier page is visible.
- Monthly cost budget created: USD 5 fixed recurring budget across all AWS
  services with actual-cost email notifications at 25%, 50%, 75%, and 100%.
  No budget actions or paid budget reports are intended.
- No workload infrastructure or DNS resources were created.
- Cross-Region inventory verified all 17 enabled Regions have zero EC2
  instances, EBS volumes, Elastic IPs, NAT Gateways, VPC endpoints, RDS
  instances, Application/Network/Gateway Load Balancers, and Classic Load
  Balancers. Global checks found zero S3 buckets, Route 53 hosted zones, and
  CloudFront distributions.
- One legacy IAM user was found with a console password, no MFA, no access
  keys, direct `AmazonS3FullAccess` and `IAMUserChangePassword`, no group
  membership, and last use on 2025-02-27. After explicit user authorization,
  its preconditions were rechecked, its login profile and policy attachments
  were removed, and the user was deleted. Post-deletion IAM user count: zero.
- Free Tier usage alerts are enabled.
- User-defined cost-allocation tag keys `Project`, `Environment`, `Owner`, and
  `AutoCleanup` are activated.

## Exit status

- MFA and budget alerts: verified.
- CLI identity and selected Region: verified using refreshed SSO credentials.
- Existing account resources: inventoried across all enabled Regions and
  relevant global services; no paid workload resources found.
- Baseline cost: USD 0.00.
- Account plan label was not visible; credits were verified as zero.
- Cleanup: `PARTIAL` because two inactive root access keys are intentionally
  retained through 2026-07-28 for observation. Expected residual cost: USD 0.
- Phase status: complete, with the recorded concept revisit and credential
  follow-up.

## Phase review assessment

```text
Confidence (0-4): 2 — can explain core concepts with help and has completed the practical safety demonstrations
Strongest concept: Authentication versus authorization, root-user blast radius, and the danger of long-lived access keys
Weakest concept: Global versus Regional service scope and charges that continue while workloads are idle
Evidence reviewed: Root MFA; inactive root access keys; Identity Center MFA and account assignment; SSO CLI caller and Mumbai Region; IAM policy prediction; billing, credits, budget, tag, and cross-Region inventory evidence; deletion of the legacy IAM user
Question to revisit: How global/account-level services differ from Regional resources during inventory and cleanup, and why NAT Gateways/load balancers can charge while idle
Cleanup status: PARTIAL — no paid workload resources; two inactive root access keys retained through 2026-07-28 at USD 0 expected residual cost
```
