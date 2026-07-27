# Phase 2 — First manual deployment on EC2

## Scope and safety

- Phase 2 preflight began on 2026-07-24.
- AWS account was verified through the `aws-learning` IAM Identity Center
  profile. The caller is the expected `AWSReservedSSO_AdministratorAccess`
  assumed role; the account identifier is intentionally omitted from this
  document.
- Working Region is verified as Mumbai (`ap-south-1`).
- Use the existing default VPC only. Do not create the Phase 3 VPC early.
- Phase 2 is limited to one small EC2 instance, its root EBS volume, one
  security group, one instance role/profile, and one CloudWatch log group.
- Do not create a NAT Gateway, load balancer, RDS, ECS/Fargate, VPC endpoint,
  Route 53, CloudFront, or another later-phase resource.
- Overall Phase 0 cleanup remains `PARTIAL`: two inactive root access keys are
  retained until review on 2026-07-28 at USD 0 expected cost. Phase 2 will not
  modify them.

## Verified pre-deployment baseline — 2026-07-24

- Default VPC exists and is available in `ap-south-1`.
- Mumbai inventory found no EC2 instances, EBS volumes, owned EBS snapshots,
  Elastic IPs, public-IP network interfaces, project-tagged security groups,
  EC2 key pairs, CloudWatch log groups, SSM managed instances, or IAM instance
  profiles.
- No S3 buckets or Secrets Manager secrets were found in the enabled Regions.
- Month-to-date Cost Explorer estimate was approximately USD 0.00018: tiny S3
  request/data-transfer and Secrets Manager API-request usage associated with
  account inventory checks, not retained storage or workload infrastructure.
- Free Tier usage showed only small always-free API request counts and no EC2
  allowance. The lesson will therefore be treated as billable.

## Proposed minimal lesson resources — awaiting explicit approval

All supported resources use these tags:

```text
Project=aws-order-platform
Environment=learning
Owner=Tarun222999
AutoCleanup=false
```

```text
COST-SENSITIVE RESOURCE
Resource: EC2 On-Demand Linux instance
Name/ID: order-platform-phase2-ec2 / assigned after creation
Region: ap-south-1
Billing dimensions: t3.micro compute at USD 0.0112 per running instance-hour;
  one automatically assigned public IPv4 at USD 0.005 per hour; outbound data
  transfer if applicable; T3 CPU credit mode will be Standard to prevent
  Unlimited surplus-credit charges
Expected lifetime: one interactive Phase 2 session; stop once for the lifecycle
  demonstration, then terminate before phase close-out
Stop/delete procedure: stop for the lifecycle exercise; final action is
  terminate, not merely stop
Verification procedure: wait for state terminated; verify no instance remains
  active, its network interface is gone, and no public IPv4 or Elastic IP is
  allocated to the lesson
```

```text
COST-SENSITIVE RESOURCE
Resource: EBS gp3 root volume
Name/ID: created with order-platform-phase2-ec2 / assigned after creation
Region: ap-south-1
Billing dimensions: 8 GiB provisioned storage at USD 0.0912 per GB-month
  (approximately USD 0.73 for a full month, prorated); baseline gp3 IOPS and
  throughput only, with no paid extra provisioning
Expected lifetime: same lesson session
Stop/delete procedure: set DeleteOnTermination=true; after instance termination,
  delete any unexpected remaining lesson volume; create no snapshots
Verification procedure: query volumes and owned snapshots in ap-south-1 and
  confirm no Phase 2 volume or snapshot remains
```

```text
COST-SENSITIVE RESOURCE
Resource: CloudWatch Logs
Name/ID: /aws/order-platform/phase2/api
Region: ap-south-1
Billing dimensions: log ingestion, retained log bytes, and Logs Insights data
  scanned; tiny structured lesson logs are expected, but usage can be billable
Expected lifetime: same lesson session; one-day retention is a safety backstop
Stop/delete procedure: stop the agent with the instance, then delete the lesson
  log group at final cleanup
Verification procedure: confirm the log group no longer appears and no other
  lesson log group was created
```

Resources without direct service charges:

- `order-platform-phase2-sg`: one security group, initially with no inbound
  rules. For the network exercise only, TCP 3000 will be allowed from the
  user's current public `/32`, then removed to demonstrate a timeout and
  restored only as needed. SSM access requires no inbound SSH rule or key pair.
- `order-platform-phase2-ec2-role` and matching instance profile: IAM and the
  standard EC2 use of Systems Manager have no direct idle charge. The role
  begins with `AmazonSSMManagedInstanceCore`. A controlled CloudWatch Logs
  denial will be predicted and observed, then repaired with only the necessary
  log-stream/write actions scoped to the lesson log group.

Approximate active infrastructure rate before log/data-transfer usage:

```text
t3.micro compute       USD 0.0112/hour while running
public IPv4            USD 0.0050/hour while assigned
8 GiB gp3 root volume  about USD 0.0010/hour while provisioned
total                  about USD 0.0172/hour
```

Stopping the instance ends the instance-compute charge and releases its
automatically assigned public IPv4, but the EBS volume remains provisioned and
billable. An Elastic IP would remain allocated and billable, which is why this
lesson will not allocate one. On start after stop, an automatically assigned
public IPv4 can change. Security groups and IAM objects have no direct idle
service charge. CloudWatch log storage can persist and charge independently of
the instance until retention or deletion removes it.

## Exact final cleanup and verification procedure

1. End SSM/port-forwarding sessions and stop the application/CloudWatch agent.
2. Terminate `order-platform-phase2-ec2` and wait for `terminated`.
3. Verify the attached root volume was deleted. Delete only an unexpected
   Phase 2 volume after confirming its data is disposable. Verify no Phase 2
   EBS snapshot exists.
4. Verify the automatic public IPv4 and instance network interface are gone;
   verify the account has no lesson Elastic IP.
5. Delete `order-platform-phase2-sg` after its dependencies are gone and verify
   it is absent.
6. Remove lesson policies, remove the role from its instance profile, delete
   the instance profile, and delete `order-platform-phase2-ec2-role`; verify
   both are absent.
7. Delete `/aws/order-platform/phase2/api` and verify no Phase 2 log group
   remains. One-day retention is not a substitute for explicit deletion.
8. Verify the instance is no longer an SSM managed node and no lesson ENI or
   related regional resource remains.
9. Re-run the Mumbai EC2/EBS/snapshot/public-IP/security-group/CloudWatch
   inventory and the relevant global IAM inventory. Review Cost Explorer while
   remembering that billing data is delayed.
10. Update the resource ledger and session close-out as `VERIFIED`, `PARTIAL`,
    or `NOT VERIFIED`. Phase 0 remains separately `PARTIAL` due only to the two
    inactive root access keys retained through 2026-07-28.

## Planned learning sequence

1. Predict the lifecycle, addressing, security-group, and IAM outcomes.
2. Manually create the role/profile, log group, security group, and instance.
3. Connect with Session Manager and inspect the temporary role credentials
   without displaying secret values.
4. Deploy the API and PostgreSQL locally on the single lesson instance, keeping
   database access private to the instance.
5. Find a structured request log by correlation identifier in CloudWatch.
6. Cause and diagnose one scoped IAM `AccessDenied`, then grant only the
   missing log-write permission.
7. Cause and diagnose one security-group timeout on TCP 3000, contrasting it
   with connection-refused and application authorization failures.
8. Stop/start the instance and identify the continuing EBS cost and changed
   public addressing.
9. Perform and verify the complete cleanup procedure above.

## Creation approval

- On 2026-07-24, after reviewing the concrete resource list, billing dimensions,
  idle/residual costs, cleanup actions, and verification procedure, the user
  explicitly approved creation of the listed Phase 2 lesson resources.
- Creation remains manual and incremental. The instance will not be launched
  until its no-direct-cost prerequisites have been created and verified.

Phase status: creation approved; prerequisite creation is in progress and no
billable EC2/EBS/public-IPv4 resource has yet been created.

## Resource creation evidence

### IAM role and instance profile — 2026-07-24

- The user manually created `order-platform-phase2-ec2-role` through the IAM
  console; IAM also created the matching instance profile.
- Read-only verification confirmed the trust principal is only
  `ec2.amazonaws.com` with `sts:AssumeRole`.
- Exactly one managed policy is attached: `AmazonSSMManagedInstanceCore`.
  There are no inline policies yet; CloudWatch Logs access remains deliberately
  absent for the controlled `AccessDenied` exercise.
- All four required project tags were verified.
- Direct/idle service cost: USD 0. Cleanup status: `RUNNING — REQUIRED` until
  final role/profile deletion and verification.

### CloudWatch log group — 2026-07-24

- The user manually created `/aws/order-platform/phase2/api` in `ap-south-1`.
- Read-only verification confirmed Standard log class, one-day retention, zero
  stored bytes, and all four required tags. Deletion protection is not enabled.
- The group is deliberately empty because the instance role still lacks log
  write permission. The upcoming `AccessDenied` is part of the lesson.
- Cleanup status: `RUNNING — REQUIRED` until the log group is deleted and its
  absence is verified.

### Security group — 2026-07-24

- The user manually created `order-platform-phase2-sg`
  (`sg-0e6b30eac97af101d`) in the Mumbai default VPC.
- Read-only verification confirmed zero inbound rules, one all-traffic IPv4
  outbound rule, and all four required tags.
- The outbound rule is an explicit short-lived learning trade-off so the
  instance can reach Systems Manager, CloudWatch, DNS, and software sources.
  It does not permit unsolicited inbound traffic. Phase 3 will cover more
  restrictive network designs.
- Direct/idle service cost: USD 0. Cleanup status: `RUNNING — REQUIRED` until
  dependency removal, group deletion, and absence verification.

### EC2 instance and EBS root volume — 2026-07-24

- After explicit cost approval, the user manually launched
  `i-06b61c413fadf9be0` in `ap-south-1b` from the current AWS-provided Amazon
  Linux 2023 x86_64 AMI.
- Verified configuration: `t3.micro`; T3 Standard credits; detailed monitoring
  off; IMDSv2 required; default VPC/subnet; only
  `order-platform-phase2-sg`; no inbound rules; intended instance profile; one
  automatically assigned public IPv4; and SSM Agent online.
- Root volume `vol-031abb9d1193c2d52` is 8 GiB gp3, encrypted with the
  AWS-managed EBS key, 3000 baseline IOPS, 125 MiB/s baseline throughput, and
  `DeleteOnTermination=true`.
- Tag verification found a launch-form discrepancy: the instance has the four
  project tags but no `Name` tag, while the volume has no tags. This must be
  corrected before continuing.
- The user manually corrected the tags. Follow-up verification confirmed the
  instance and root volume now each have the intended `Name` plus all four
  required project tags. Both EC2 system and instance reachability checks are
  `ok`, and the instance is online in Systems Manager.
- Current cleanup status: both resources are `RUNNING — REQUIRED`. Approximate
  active infrastructure rate remains USD 0.0172/hour before small log/data
  transfer usage.

### Controlled IAM denial — 2026-07-25

- Through Session Manager, `whoami` showed the Linux `ssm-user`, the SSM Agent
  service reported `active`, and `aws sts get-caller-identity` identified the
  principal as the assumed `order-platform-phase2-ec2-role` session for the
  lesson instance. No credential values were requested or displayed.
- Prediction: `logs:CreateLogStream` would be denied because the role contained
  only Systems Manager permissions.
- Test: the instance requested creation of stream `iam-denial-test` in
  `/aws/order-platform/phase2/api`.
- Result: `AccessDeniedException` identified the assumed role, denied
  `logs:CreateLogStream` action, target stream ARN, and absence of an allowing
  identity-based policy.
- Follow-up read-only verification found no stream in the group, proving the
  denied write made no resource change.
- Next repair: add only create-stream, describe-stream, and put-event access
  scoped to the lesson log group; do not grant broad CloudWatch access.
- The user added inline policy `Phase2WriteApplicationLogs` to the same EC2
  role. Read-only verification confirmed only `logs:DescribeLogStreams`,
  `logs:CreateLogStream`, and `logs:PutLogEvents`, scoped to the Phase 2 log
  group/streams. The existing Systems Manager policy was unchanged and no
  broad CloudWatch permission was added.
- Retrying the identical `CreateLogStream` request succeeded. Read-only
  verification found `iam-denial-test` with zero stored bytes, establishing a
  before/after result in which only the missing permission changed.

### Application deployment — 2026-07-25

- The user connected through browser Session Manager without an SSH key or
  inbound port 22. The instance reported roughly 916 MiB RAM and 8 GiB root
  storage. Git, Docker, and the CloudWatch Agent were installed from Amazon
  Linux packages.
- A 1 GiB swap file was created inside the existing encrypted root EBS volume
  to reduce out-of-memory risk during the container build. This is not a
  separate AWS resource or provisioned volume.
- Public repository revision `7b66ebc` was shallow-cloned and used to build
  local image `order-platform-backend:7b66ebc`, image digest beginning
  `sha256:153b86e4e08b`. No ECR resource was created.
- Docker network `order-platform-net`, local PostgreSQL data volume, PostgreSQL
  16.4 container, one-time migration container, and API container were created
  on the single EC2 host. PostgreSQL port 5432 is not published to the host.
- The API publishes host port 3000 but the AWS security group still has no
  inbound rules. Local `/health` and database-dependent `/ready` both returned
  HTTP 200 with distinct request/correlation IDs.

### Emergency stop / session pause — 2026-07-25

- The user requested to stop and resume tomorrow, triggering the mandatory
  emergency-stop procedure.
- The user stopped `i-06b61c413fadf9be0`. Read-only verification initially
  observed the transitional `stopping` state, then confirmed `stopped`.
- The automatically assigned public IPv4 was released. No Elastic IP and no
  owned EBS snapshot exists. The retained ENI remains attached with only the
  private address, and Systems Manager no longer reports an online node.
- Encrypted 8 GiB root volume `vol-031abb9d1193c2d52` remains attached and
  billable, with `DeleteOnTermination=true`. Expected residual cost is about
  USD 0.73/month prorated (roughly USD 0.001/hour).
- The one-day CloudWatch log group remains empty at zero stored bytes. The
  security group and IAM role/profile have no direct idle cost.
- Pause cleanup status: `PARTIAL`, with all retained resources explicitly
  recorded for review/resumption on 2026-07-26. Final Phase 2 cleanup remains
  mandatory and has not been claimed.

### Resume and lifecycle evidence — 2026-07-27

- Resume was delayed from the recorded 2026-07-26 review date to 2026-07-27.
  Pre-start verification found the instance stopped, EBS intact, no public or
  Elastic IP, no owned snapshot, and the log group empty.
- Cost Explorer reported approximately USD 0.0915 across 2026-07-24 through
  2026-07-27: about USD 0.0160 EC2 compute, USD 0.0072 public IPv4, roughly USD
  0.0481 EC2-other/EBS, USD 0.02 Cost Explorer API requests, and tiny inventory
  API/data-transfer usage. Further Cost Explorer calls will be minimized
  because its API requests are themselves billable.
- The user restarted the existing instance. Verification confirmed the same
  private IP `172.31.5.185`, same encrypted EBS volume, and a changed automatic
  public IPv4 (`13.204.67.42` before stop; `13.233.105.136` after start).
- SSM returned online immediately; EC2 reachability checks were still
  initializing at the first post-start observation. Approximate active rate is
  again USD 0.0172/hour before small log/data-transfer usage.
- Post-restart inspection found the API container running because it had
  `restart=unless-stopped`, while PostgreSQL was cleanly exited because it had
  no restart policy. `/health` returned HTTP 200 and `/ready` returned HTTP 503.
  This demonstrated live process versus unavailable dependency readiness.
- The user added `restart=unless-stopped` to the local PostgreSQL container and
  started it. `/ready` recovered to HTTP 200 without restarting the API,
  demonstrating dependency recovery and retained Docker/EBS state.

### CloudWatch structured-log correlation — 2026-07-27

- The CloudWatch Agent was configured to tail only the API container's Docker
  JSON log file and write to instance-specific stream
  `i-06b61c413fadf9be0/api` in the existing one-day log group. It runs as local
  root to read Docker's protected log directory and authenticates through the
  EC2 role; no access key or password was stored.
- Both validation phases succeeded and the agent service reported active. The
  instance-specific stream was created alongside the earlier IAM-test stream.
- A successful `/ready` request with a fixed ID was not logged because the API
  intentionally avoids noisy success logs. The user then briefly stopped only
  PostgreSQL, requested `/ready` using `phase2-db-failure-20260727`, observed
  HTTP 503, restarted PostgreSQL, and verified HTTP 200 recovery.
- Direct stream inspection found the same correlation ID in CloudWatch with
  component `api`, message `Readiness check failed`, and root cause
  `getaddrinfo ENOTFOUND order-platform-postgres`. The event is wrapped in
  Docker's outer JSON record, a formatting trade-off to revisit in later
  container logging design.
- An initial filter-pattern query returned no result despite the event being
  present in direct stream output, demonstrating that query syntax/encoding is
  part of diagnosis and an empty search result is not proof that no event
  exists.

### Controlled network failure — 2026-07-27

- With the API locally healthy and the security group containing zero inbound
  rules, the user predicted and observed an external browser timeout to public
  port 3000. This indicated silent network filtering before the request reached
  the API.
- The user added one temporary TCP/3000 inbound rule restricted to the current
  learner public IPv4 `/32`. Read-only verification confirmed the exact port,
  single IPv4 source, description, and absence of broad IPv4/IPv6 or SSH
  ingress. The same browser request then returned `{"status":"ok"}`.
- With that network path still allowed, the user manually stopped only the API
  container. The browser immediately reported connection refused, showing that
  traffic reached the host but no process listened on port 3000. Restarting the
  container restored local HTTP 200.
- The exercise distinguished timeout (silent network drop), connection refused
  (reachable host/no listener), HTTP 503 (reachable application with failed
  dependency), and IAM `AccessDenied` (authenticated AWS request rejected by
  authorization).
- The user removed the temporary TCP/3000 rule after the exercise. Read-only
  verification confirmed the security group returned to zero inbound rules.

## Workbook review — 2026-07-27

- The user explained that stopping removes execution/compute charge, releases
  the automatic public IPv4, retains the private IP/primary ENI and EBS data,
  and preserves Docker definitions while restart policy controls automatic
  process recovery.
- The user explained the instance role as the EC2 workload identity used to
  call Systems Manager and CloudWatch without storing access keys. The review
  added that role credentials are temporary and automatically rotated.
- The user explained that Session Manager works with zero inbound rules because
  the SSM Agent establishes an outbound connection and the stateful security
  group allows response traffic for that established flow.
- The IAM denial was decomposed into principal, action, resource, and missing
  identity-based allow; the role-policy authorization was distinguished from
  the agent's local-file/destination configuration.
- The user diagnosed the PostgreSQL failure from API liveness, readiness, and
  structured log evidence, and correctly distinguished timeout, refused
  connection, HTTP 503, and IAM denial.
- The user identified EBS as a residual stopped-instance cost and IAM/security
  groups as no-direct-charge retained resources. Review added snapshot,
  Elastic-IP, ENI, CloudWatch retention, and delayed-billing verification.
- The user defended Session Manager over SSH because an SSH key can be stolen
  and inbound port 22 adds an unnecessary entry point. ADR 0004 records the
  complete choice and trade-offs.

```text
Confidence (0-4): 4 (user self-assessment)
IAM failure explained: Yes — assumed role, denied action/resource, missing allow,
  and least-privilege repair demonstrated
Network failure explained: Yes — timeout, refused connection, HTTP 503, and IAM
  denial distinguished with controlled evidence
Residual cost found: 8 GiB gp3 while stopped; public IPv4 and compute only while
  running; CloudWatch usage independent of EC2
Cleanup status: NOT YET VERIFIED — final teardown is the remaining exit gate
```

## Final teardown — 2026-07-27

- The user explicitly confirmed that the Phase 2 EC2, EBS, local PostgreSQL,
  Docker, and CloudWatch log data was disposable and authorized final teardown.
- The user gracefully stopped the API/PostgreSQL containers and CloudWatch
  Agent, ended Session Manager, and terminated the lesson instance.
- AWS waiter and read-only verification confirmed instance
  `i-06b61c413fadf9be0` reached `terminated`, root volume
  `vol-031abb9d1193c2d52` no longer exists, no owned snapshot exists, no public
  or Elastic IP remains, the lesson ENI is gone, and the SSM managed-node entry
  is absent.
- EC2/EBS/network cleanup status: `DELETED — VERIFIED`. Supporting security
  group, IAM role/profile, and CloudWatch log group remain to be deleted and
  verified before final phase completion.
- The user deleted `order-platform-phase2-sg` after instance/ENI removal.
  Verification returned `InvalidGroup.NotFound` for the lesson ID and confirmed
  the default VPC security group remains intact.
- The user deleted `order-platform-phase2-ec2-role`. Verification returned
  `NoSuchEntity` for both the role and matching instance profile, while the
  Identity Center `AWSReservedSSO_AdministratorAccess` role remained present
  and unchanged.
- The user deleted `/aws/order-platform/phase2/api`. The final read-only audit
  returned empty results for the Phase 2 log-group prefix, active project-tagged
  EC2 instances, project EBS volumes, owned snapshots, Elastic IPs, project
  ENIs, project security groups, the lesson SSM node, and the lesson IAM
  role/profile.
- Final July estimate through 2026-07-27 was approximately USD 0.1017 and
  remained estimated/delayed. Phase 2 expected residual cost is USD 0.
- Phase 2 cleanup status: `VERIFIED`. Overall account cleanup remains `PARTIAL`
  solely because Phase 0 retains two inactive root access keys for their
  separately scheduled 2026-07-28 review at USD 0 expected cost.

## Phase review (complete at exit)

```text
Confidence (0-4): 4 (user self-assessment)
IAM failure explained: Assumed EC2 role lacked logs:CreateLogStream; error named
  principal/action/resource; only scoped stream describe/create/write access was
  added and the identical request then succeeded.
Network failure explained: Missing ingress caused timeout; allowed path with no
  listener caused connection refused; reachable API with failed PostgreSQL
  returned 503; IAM denial was an authenticated authorization failure.
Residual cost found: EBS continued while stopped; compute/public IPv4 applied
  while running; CloudWatch persisted independently until deletion.
Cleanup status: VERIFIED for Phase 2. Overall account PARTIAL only for the
  Phase 0 inactive-root-key review on 2026-07-28.
```
