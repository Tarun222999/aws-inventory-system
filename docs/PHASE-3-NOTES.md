# Phase 3 — VPC networking and failure domains

## Scope and safety

- Phase 3 preflight began on 2026-07-27.
- AWS access was verified through the `aws-learning` IAM Identity Center
  profile. The caller is the expected `AWSReservedSSO_AdministratorAccess`
  assumed role; the account identifier is intentionally omitted.
- The working Region is Mumbai (`ap-south-1`).
- Phase 2 cleanup remains `VERIFIED` with USD 0 expected residual cost. The
  latest recorded July estimate through 2026-07-27 is approximately USD
  0.1017 and can be delayed.
- Overall account cleanup remains `PARTIAL` solely because two inactive root
  access keys are scheduled for a separate 2026-07-28 review at USD 0 expected
  cost. Phase 3 will not inspect, modify, or delete those credentials.
- Phase 3 is limited to VPC networking, two tiny diagnostic EC2 probes, and
  their direct prerequisites. Do not create ECR, ECS/Fargate, an ALB, RDS,
  Route 53, CloudFront, or other later-phase application infrastructure.
- All creation is manual and incremental. No billable resource may be created
  until the user approves the concrete step after reviewing its billing,
  lifetime, cleanup, and verification procedure. NAT Gateway creation requires
  a fresh explicit approval immediately before creation.

All supported resources will use these tags:

```text
Project=aws-order-platform
Environment=learning
Owner=Tarun222999
AutoCleanup=false
```

## Verified pre-creation baseline — 2026-07-27

- The repository working tree was clean on `main` and matched `origin/main`.
  Commit `6ecda52` contains the intentional Phase 1 progress correction and
  commit `dcc7de3` contains the Phase 2 close-out documents; both are preserved.
- Mumbai contains only the default VPC `172.31.0.0/16`, its three default
  public subnets in `ap-south-1a`, `ap-south-1b`, and `ap-south-1c`, one main
  route table with local and Internet Gateway default routes, the attached
  default Internet Gateway, default security group, default network ACL, and
  Amazon-provided DHCP/DNS settings.
- No active or stopped EC2 instance, EBS volume, owned EBS snapshot, Elastic
  IP, NAT Gateway, VPC endpoint, or ENI exists in Mumbai. No Phase 3 log group
  exists.
- The Phase 2 instance is directly verified `terminated`; its volume ID returns
  `InvalidVolume.NotFound`. The Resource Groups Tagging API still indexes both
  deleted IDs, which is treated as stale tag-index metadata rather than active
  resource evidence.
- No new Cost Explorer call was made during preflight because Cost Explorer API
  requests can themselves add cost. The approximately USD 0.1017 delayed July
  estimate recorded at Phase 2 close-out is the working cost baseline.

## Resume preflight — 2026-07-28

- The existing Phase 3 ledger update and this notes file were preserved without
  modifying prior Phase 1 or Phase 2 work.
- The `aws-learning` session again resolved to the expected Identity Center
  administrator role and `ap-south-1` remained the configured Region.
- Read-only checks again found no active/stopped lesson instance, NAT Gateway,
  Elastic IP, project-tagged VPC, or VPC endpoint in Mumbai. No Phase 3 AWS
  resource has been created.
- The July estimate remains approximately USD 0.1017 as a delayed working
  baseline. Another potentially billable Cost Explorer request was avoided.
- The separate two-inactive-root-key review due on 2026-07-28 remains outside
  Phase 3 scope and the credentials were not inspected or modified.

## CIDR and Availability Zone plan

Use `10.30.0.0/16` for the lesson VPC. It does not overlap the account's default
VPC CIDR (`172.31.0.0/16`) and leaves ample address space for later design work
without pre-creating later-phase infrastructure.

| Tier | Availability Zone | CIDR | Intended route |
| --- | --- | --- | --- |
| Public A | `ap-south-1a` | `10.30.0.0/24` | `10.30.0.0/16 local`; `0.0.0.0/0` to the lesson IGW |
| Public B | `ap-south-1b` | `10.30.1.0/24` | `10.30.0.0/16 local`; `0.0.0.0/0` to the lesson IGW |
| Private A | `ap-south-1a` | `10.30.10.0/24` | local only before NAT; temporary `0.0.0.0/0` to NAT A during the NAT exercise |
| Private B | `ap-south-1b` | `10.30.11.0/24` | local only before NAT; temporary `0.0.0.0/0` to NAT A during the NAT exercise |

Each `/24` has 256 addresses; AWS reserves five, leaving 251 usable. The spaced
allocation makes tier and AZ placement visible and leaves `10.30.2.0/23` and
`10.30.12.0/22` available for future growth. A subnet is public because its
effective route table has a route to an attached Internet Gateway—not because
of its name. A resource still needs a public address and permissive security
controls for direct IPv4 internet reachability.

The lesson deliberately uses one zonal NAT Gateway in `ap-south-1a`. This keeps
cost low but makes it a single-AZ outbound dependency; Private B traffic to it
crosses AZs and can add Regional Data Transfer cost. A production design would
normally use same-AZ egress per AZ (or evaluate newer regional NAT options),
balanced against the extra hourly cost.

## Proposed minimal resources — awaiting approval

Resources without a direct hourly service charge in this design:

- one ordinary VPC with DNS resolution and DNS hostnames enabled;
- four `/24` subnets across two AZs;
- one Internet Gateway;
- one public route table and two private route tables;
- two workload security groups;
- one custom private-subnet network ACL, initially allow-all, used for one
  temporary ordered deny-rule experiment;
- one IAM role/profile with only `AmazonSSMManagedInstanceCore` for the two
  diagnostic instances.

No VPC Flow Logs or CloudWatch log group is planned; evidence will use route,
address, rule, instance, DNS, and request results to avoid persistent log cost.
No VPC endpoint is planned. Gateway endpoints for S3/DynamoDB have no hourly or
data-processing charge, but they do not prove general internet egress.
Interface endpoints in Mumbai are currently USD 0.013 per endpoint-AZ-hour plus
USD 0.01/GB for the first PB; multiple endpoints are needed for Systems Manager,
so they are not cheaper for this short two-hour general-egress lesson.

## Network-foundation approval — 2026-07-28

- After reviewing CIDR ranges, subnet route-table association, Internet Gateway
  routing, direct/idle charges, resource lifetime, and the dependency-aware
  cleanup procedure, the user explicitly approved manual creation of the Phase
  3 network foundation in Mumbai.
- This approval covers only the ordinary VPC, four subnets, Internet Gateway,
  route tables/associations, security groups, and private-subnet NACL recorded
  in the ledger. These controls have no direct hourly charge in the planned
  configuration, although later traffic can incur transfer charges.
- This approval does not cover NAT Gateway, Elastic IP, EC2, EBS, VPC endpoint,
  Flow Logs, or any later-phase service. NAT and temporary compute/storage each
  retain separate billable approval gates.

```text
COST-SENSITIVE RESOURCE
Resource: Public NAT Gateway plus one Elastic IP
Name/ID: order-platform-phase3-nat-a / assigned after creation
Region/AZ: ap-south-1 / ap-south-1a
Billing dimensions: USD 0.056 per NAT Gateway-hour (each partial hour is a full
  hour); USD 0.056 per GB processed; standard data transfer; cross-AZ transfer
  when Private B uses NAT A; one public IPv4 at USD 0.005/hour
Expected lifetime: no more than two hours after creation; delete immediately
  after the outbound and route-failure exercises
Stop/delete procedure: delete the NAT Gateway and wait for state deleted; then
  separately release the Elastic IP after confirming no dependency remains
Verification procedure: NAT list contains no lesson gateway; the allocation ID
  returns absent; no NAT-managed ENI or public IPv4 remains
```

```text
COST-SENSITIVE RESOURCE
Resource: Two Linux EC2 diagnostic probes
Name/ID: order-platform-phase3-public-a and
  order-platform-phase3-private-b / assigned after creation
Region/AZ: ap-south-1a and ap-south-1b
Billing dimensions: two t3.nano On-Demand instances at USD 0.0056 each per
  running hour; T3 Standard credits; one automatic public IPv4 on only the
  public probe at USD 0.005/hour; network transfer where applicable
Expected lifetime: same interactive session, no more than two hours after NAT
  creation; terminate rather than stop
Stop/delete procedure: terminate both after evidence capture
Verification procedure: wait for terminated; verify their ENIs, automatic
  public IPv4, SSM managed-node entries, and attached storage are absent
```

```text
COST-SENSITIVE RESOURCE
Resource: Two encrypted gp3 root volumes
Name/ID: one 8 GiB root for each diagnostic probe / assigned after creation
Region/AZ: ap-south-1a and ap-south-1b
Billing dimensions: 16 GiB total at USD 0.0912 per GB-month, prorated; baseline
  gp3 performance only
Expected lifetime: same interactive session
Stop/delete procedure: DeleteOnTermination=true; create no snapshots; delete
  only an unexpected survivor after confirming the disposable lesson data
Verification procedure: both volume IDs absent and owned snapshot inventory
  empty after instance termination
```

Approximate active rate before traffic and tax:

```text
NAT Gateway                         USD 0.0560/hour
NAT Elastic IP                      USD 0.0050/hour
two t3.nano instances               USD 0.0112/hour
public probe automatic IPv4         USD 0.0050/hour
two 8 GiB gp3 roots                 about USD 0.0020/hour
total                               about USD 0.0792/hour
```

The NAT charge rounds each partial NAT hour up to a full hour. A conservative
two-hour working estimate is under USD 0.25 before tax, assuming diagnostic
traffic remains below 100 MB; this includes margin above the roughly USD 0.16
time-based subtotal for setup/cleanup slippage and small NAT/cross-AZ/data
transfer usage. If the lesson approaches two hours after NAT creation, delete
the NAT and its EIP first, then continue only with no-hourly-cost review or
terminate the probes.

Idle/residual billing is not zero until cleanup is verified: NAT remains hourly
billable while provisioned; an allocated Elastic IP is billable even when idle;
EC2 compute bills while running; gp3 bills until deleted; the automatic public
IPv4 bills while assigned. Ordinary route tables, IGW, SGs, NACLs, and the IAM
role have no direct hourly charge, but they must still be deleted and verified.

## Planned manual learning sequence

1. The user explains the CIDR allocation and predicts which route makes each
   subnet public, private-with-egress, or isolated.
2. Manually create and tag the VPC, enable both DNS attributes, create the four
   subnets, IGW, route tables, associations, security groups, and private NACL.
3. Before NAT creation, manually launch the two minimal probes only after a
   separate concrete approval. The public probe has one automatic public IPv4;
   the private probe has no public IPv4.
4. Trace and test user to public probe, public probe to private probe through a
   private DNS name, and private probe outbound through NAT. The probe HTTP
   port is limited to the learner's current `/32` at the public tier and to the
   public probe security group at the private tier. No SSH ingress is created.
5. Remove the private default route, predict the symptom, observe failed new
   outbound/SSM connectivity, diagnose the route-table evidence, and restore
   the exact NAT route from the console.
6. Insert one temporary higher-priority NACL deny for the private HTTP port,
   contrast the subnet-level stateless result with stateful SG behavior, then
   remove the deny and verify recovery.
7. Trace the future user-to-ALB, ALB-to-application, and application-to-RDS paths
   on paper only. ALB and RDS are Phase 4/5 resources and are not created here.
8. Explain DNS resolution, longest-prefix route selection, cross-AZ failure and
   cost, single-NAT learning versus per-AZ production design, and endpoint
   trade-offs.
9. Perform the dependency-aware cleanup below and complete the Phase 3 workbook
   review and architecture decision record.

## Resource creation evidence

### Custom VPC — 2026-07-28

- The user manually created `order-platform-phase3-vpc`
  (`vpc-093de7534f39d3432`) in Mumbai using the VPC-only console path.
- Read-only verification confirmed state `available`, CIDR `10.30.0.0/16`,
  default tenancy, nondefault-VPC status, and all required project tags.
- AWS automatically created main route table `rtb-04125e395be434fa9` with only
  the active `10.30.0.0/16 -> local` route, default security group
  `sg-0539d7c1b7d05cae6`, and default network ACL
  `acl-0030cb76834bfbf68`. The account's existing DHCP option set is associated;
  no custom DHCP option set was created.
- Verification found no subnet, attached Internet Gateway, NAT Gateway, Elastic
  IP, VPC endpoint, or other unintended billable network resource.
- DNS resolution was initially enabled while DNS hostnames was disabled. The
  user manually enabled DNS hostnames; read-only verification then confirmed
  both VPC DNS attributes are `true` before subnet creation continued.
- Ledger status is `RUNNING — REQUIRED`. Direct/idle service cost remains USD 0
  for the VPC configuration currently created; final deletion and absence
  verification are still mandatory.

### Four subnets — 2026-07-28

- The user manually created Public A `subnet-0b54d72001042648a`
  (`10.30.0.0/24`, `ap-south-1a`), Public B `subnet-02fad5e68f8003c27`
  (`10.30.1.0/24`, `ap-south-1b`), Private A
  `subnet-0d1369a591af84326` (`10.30.10.0/24`, `ap-south-1a`), and Private B
  `subnet-080f85a707b9ca167` (`10.30.11.0/24`, `ap-south-1b`).
- Read-only verification confirmed all four are `available`, each has 251
  available IPv4 addresses, and automatic public IPv4 assignment is disabled.
- No explicit route-table association exists yet, so all four implicitly use
  the main route table with only `10.30.0.0/16 -> local`. Their public/private
  names do not yet create different reachability.
- No Internet Gateway, NAT Gateway, Elastic IP, or VPC endpoint exists.
- Exact-key tag verification found a manual-entry discrepancy that the console
  display initially concealed. Public A's `Owner`, `Environment`, `AutoCleanup`,
  and `Project` keys contain trailing spaces; Public B, Private A, and Private B
  each have trailing spaces on the `Environment` key. AWS therefore treats them
  as different keys from the required exact names. Raw `DescribeSubnets` output
  exposed the whitespace, while the console and table-formatted CLI output
  visually collapsed it. The affected keys must be removed and re-added without
  trailing spaces before routing work continues.
- The user retyped the affected keys without padding. Raw read-only verification
  confirmed all four subnets now contain exact `Project`, `Environment`,
  `Owner`, and `AutoCleanup` keys with the required values and no trailing-space
  key remains. Tag remediation status: `VERIFIED`.
- Direct/idle service cost remains USD 0 for the current subnet configuration;
  ledger status is `RUNNING — REQUIRED` pending final verified deletion.

### Internet Gateway — 2026-07-28

- The user manually created `order-platform-phase3-igw`
  (`igw-05038a8b1b3c78a43`) and attached it to the intended lesson VPC.
- Read-only verification confirmed attachment state `available` and all five
  tags with exact keys and no trailing whitespace.
- The VPC still has only its main route table and its only route remains
  `10.30.0.0/16 -> local`. Attaching the IGW alone did not make any subnet
  public or provide internet reachability.
- No NAT Gateway, Elastic IP, or VPC endpoint exists. The IGW has no direct
  hourly charge in this configuration; traffic charges can apply only after
  routes and traffic-generating resources are added.
- Cleanup remains mandatory: remove dependencies/routes, detach the IGW, delete
  it, and verify its ID absent before deleting the VPC.

### Custom route tables — 2026-07-28

- The user manually created public route table `rtb-016b93b2a47453997`, Private
  A route table `rtb-0bdced1ea8dad7f98`, and Private B route table
  `rtb-025eda73e10129ead` in the lesson VPC.
- Read-only verification confirmed each table has exact required tags, no
  trailing-space key, no subnet association, and only the automatic active
  `10.30.0.0/16 -> local` route.
- Together with the automatic main route table, the VPC now has four route
  tables. No custom default route exists yet, so internet reachability remains
  absent despite the attached IGW.
- No NAT Gateway, Elastic IP, or VPC endpoint exists. Custom route tables have
  no direct hourly service charge; final association removal, deletion, and
  absence verification remain mandatory.

## Emergency-stop pause — 2026-07-28

- The user requested to stop for the day, immediately triggering the mandatory
  emergency-stop audit before ending the session.
- Read-only verification confirmed the lesson VPC and all four subnets remain
  `available`; automatic public IPv4 is disabled on every subnet.
- The main and three custom route tables each contain only the active
  `10.30.0.0/16 -> local` route and no explicit subnet association. Although
  the IGW is attached, there is no route to it and no lesson internet traffic.
- The automatic default NACL is associated with all four subnets and contains
  its standard allow-all rules followed by default deny rules. Only the default
  security group exists. The account's existing DHCP option set remains
  associated; no custom DHCP options were created.
- Audit results were empty for active/stopped EC2, EBS volumes, owned snapshots,
  NAT Gateways, Elastic IPs/public IPv4, lesson ENIs, VPC endpoints, Flow Logs,
  load balancers, Phase 3 log groups, RDS instances, ECS clusters, Scheduler
  schedules, and SSM managed nodes.
- No resource required stopping or deletion to halt billing. The VPC, subnets,
  IGW, route tables, and automatic controls are intentionally retained for the
  next session at USD 0 expected direct/idle service cost, with review on
  2026-07-29 or the next learning session.
- Pause cleanup status: `PARTIAL` because resources are intentionally retained
  and final phase teardown has not occurred. All retained Phase 3 resources are
  accounted for; no active or residual Phase 3 billing source was found.
- The delayed July estimate remains approximately USD 0.1017 through
  2026-07-27. No new Cost Explorer request was made. The separate Phase 0
  inactive-root-key review was not inspected or modified.

## Resume preflight — 2026-07-29

- The repository still contains only the intentional Phase 3 notes and ledger
  changes; prior Phase 1/2 work remains preserved.
- The `aws-learning` Identity Center caller and Mumbai (`ap-south-1`) Region
  were re-verified.
- Read-only AWS checks confirmed the lesson VPC, four subnets, attached IGW,
  and three custom route tables are unchanged. Every route table remains
  local-only and has no explicit subnet association.
- No active/stopped EC2 instance, NAT Gateway, Elastic IP, EBS volume, VPC
  endpoint, or lesson ENI appeared while paused. Expected Phase 3 residual cost
  at resume remains USD 0.
- No Cost Explorer request was made, and the separate root-key review remained
  outside Phase 3 scope and untouched.

### Route-table associations — 2026-07-29

- The user explicitly associated Public A and Public B with
  `order-platform-phase3-public-rt`, Private A with its Private A table, and
  Private B with its Private B table.
- Read-only effective-route verification confirmed all four mappings exactly.
  Each table still contains only the active `10.30.0.0/16 -> local` route.
- Associating the custom tables therefore changed routing ownership but not
  reachability: all subnets can route to private destinations inside the VPC,
  and none has an internet default route yet.
- Route availability alone does not prove `ping` or application connectivity.
  Security groups, NACLs, destination OS behavior, and a listening service must
  also permit the relevant protocol/port.
- No EC2 instance, NAT Gateway, or Elastic IP exists. Direct/idle Phase 3 cost
  remains USD 0 at this checkpoint.

### Public Internet Gateway route — 2026-07-29

- The user manually added active route `0.0.0.0/0 ->
  igw-05038a8b1b3c78a43` to `order-platform-phase3-public-rt` only.
- Read-only verification confirmed that table remains associated exactly with
  Public A and Public B. Both private tables and the unused main table still
  contain only `10.30.0.0/16 -> local`.
- Public A and Public B are now technically public subnets because their
  effective route table reaches the attached IGW. No resource is directly
  internet-reachable yet: automatic public IPv4 remains disabled on all four
  subnets and no ENI/instance exists.
- The route supports outbound internet destinations and the return path for a
  resource that later receives a public IPv4; it is not an inbound permission
  rule. Security controls and a listening service remain separate requirements.
- No NAT Gateway, Elastic IP, active/stopped EC2 instance, or lesson ENI exists.
  Direct/idle Phase 3 cost remains USD 0.

### Probe security groups — 2026-07-29

- The user manually created public-probe security group
  `sg-0042867f85ab12b0f` and private-probe security group
  `sg-0dddbd0d8891af388` in the lesson VPC.
- Exact verification confirmed all required tags with no trailing-space keys.
- The public group has zero ingress rules and one all-IPv4 egress rule. A
  temporary TCP/8080 rule from the learner's current `/32` will be added only
  during the later user-to-public test and then removed.
- The private group has exactly one ingress rule: TCP/8080 sourced from the
  public group's ID, with no IPv4/IPv6 CIDR source. It has one all-IPv4 egress
  rule. No SSH, ICMP, broad ingress, or IPv6 ingress exists.
- The security-group reference expresses the intended public-tier-to-private-
  tier path without relying on changing instance IP addresses. Route, NACL,
  security-group, and listening-process conditions must all succeed before the
  path works.
- No instance/ENI, NAT Gateway, or Elastic IP exists. Security groups have no
  direct hourly charge; deletion after ENI removal and absence verification
  remain mandatory.

### Private-subnet NACL — 2026-07-29

- The user manually created `order-platform-phase3-private-nacl`
  (`acl-0b70d803555c9b2d6`) and associated it exactly with Private A and Private
  B. Public A and Public B remain associated with the automatic default NACL.
- Exact tags and absence of trailing-space keys were verified. Both NACLs retain
  their automatic final deny rules.
- Initial verification found that custom rule 100 in both directions was
  created as all TCP (protocol 6), not the intended all-traffic neutral baseline
  (protocol -1). This would allow TCP but deny unmatched UDP and ICMP.
- No instance/ENI exists, so the rule discrepancy caused no workload failure.
- The user corrected both rule 100 entries. Read-only verification then
  confirmed protocol `-1` (all traffic), `0.0.0.0/0`, and `allow` for both
  inbound and outbound directions. The automatic final deny rules remain, and
  the custom NACL remains associated exactly with Private A and Private B.
  Neutral-baseline correction status: `VERIFIED`.
- The NACL has no direct hourly charge; final subnet disassociation/deletion and
  absence verification remain mandatory.

### Probe IAM role and instance profile — 2026-07-29

- The user manually created `order-platform-phase3-probe-role` for EC2.
- Read-only verification confirmed that its trust policy permits only the EC2
  service to call `sts:AssumeRole`; exactly one managed policy,
  `AmazonSSMManagedInstanceCore`, is attached; and there are no inline policies.
- A matching instance profile exists and contains exactly this role. All five
  required tags were verified exactly.
- IAM has no direct service charge. The role, policy attachment, and instance
  profile remain `RUNNING — REQUIRED` until the probes are terminated and the
  IAM resources are removed and verified absent.

### Initial public-probe launch verification — 2026-07-29

- The user manually launched `order-platform-phase3-public-a`
  (`i-096bc330cdc68ab9b`). It is running and therefore billable.
- Correct settings: `t3.nano`, Linux/UNIX x86_64, the lesson VPC, public-probe
  security group, an automatically assigned public IPv4, no key pair, IMDSv2
  required, basic monitoring, one 8 GiB gp3 root volume, and delete-on-
  termination enabled.
- The launch does not match the approved design: it is in Public B
  (`ap-south-1b`) rather than Public A (`ap-south-1a`); no IAM instance profile
  is attached; only the `Name` tag exists; and root volume
  `vol-03e1378d66dc3ab41` is not encrypted.
- Because subnet/AZ placement cannot be changed in place and the existing root
  volume cannot be encrypted in place, the safe design-consistent remediation
  is to terminate this probe, verify its volume/public IPv4/ENI are absent, and
  relaunch it with the approved settings. No remediation has been performed by
  Codex.

### Replacement public-probe verification — 2026-07-29

- The incorrect first probe is terminated. Its former root volume returns
  `InvalidVolume.NotFound`, no attached ENI remains, and its public address is
  no longer present.
- Replacement `order-platform-phase3-public-a` (`i-0d3e72bcd91720016`) is
  running in Public A (`ap-south-1a`) on `t3.nano` with the intended Amazon
  Linux 2023 image, automatic public IPv4, public-probe security group, no key
  pair, and the verified SSM instance profile.
- IMDSv2 is required with hop limit 1, CPU credits use Standard mode, and both
  detailed monitoring and termination protection are disabled. Systems Manager
  reports the instance `Online`.
- Encrypted 8 GiB gp3 root volume `vol-0b6dbf03b74485f69` and primary ENI
  `eni-038322815d33d3f41` are both configured for deletion on termination.
- The five required tags are exact on the instance, but neither the root volume
  nor primary ENI inherited tags. Tag correction and read-only verification are
  required before the public probe is accepted as fully configured.
- The user added resource-specific `Name` values plus the four common project
  tags to both resources. Read-only verification confirmed all tags exactly on
  the attached volume and ENI. Public-probe configuration status: `VERIFIED`.

## Pause audit — 2026-07-29

- At the user's request to stop and continue later, the emergency-stop
  procedure was applied immediately. Replacement public probe
  `i-0d3e72bcd91720016` was stopped and independently verified `stopped`.
- Its automatic public IPv4 is absent, so compute and public IPv4 billing are
  halted. Its tagged ENI remains attached without a public address.
- Encrypted 8 GiB gp3 volume `vol-0b6dbf03b74485f69` remains attached and
  billable while retained: approximately USD 0.001/hour, USD 0.024/day, or USD
  0.73/month. It is intentionally retained until the next Phase 3 session.
- Read-only audit found no NAT Gateway, Elastic IP, VPC endpoint, project
  snapshot, Flow Log, Phase 3 log group, load balancer, RDS instance, or ECS
  cluster. No private probe exists.
- The VPC foundation, security controls, IAM role/profile, stopped probe,
  volume, and ENI are retained and recorded. Pause cleanup status is `PARTIAL`;
  final Phase 3 teardown and absence verification remain mandatory.
- No Cost Explorer request was made. The prior July estimate remains delayed,
  and the separate inactive-root-key review stayed outside Phase 3 scope and
  was not inspected or modified.

## Resume preflight — 2026-07-31

- The working tree still contains only the intentional Phase 3 ledger and notes
  changes; prior Phase 1 and Phase 2 work remains preserved.
- The expected `aws-learning` Identity Center role and Mumbai
  (`ap-south-1`) Region were re-verified. No NAT Gateway, Elastic IP, or VPC
  endpoint exists.
- The public probe remained stopped with no public IPv4 and its encrypted 8 GiB
  gp3 root volume retained. Current official EC2, public-IPv4, and EBS billing
  behavior was reviewed before restart.
- The user explicitly approved restarting only the existing public probe for a
  maximum of two hours at a conservative expected session cost under USD 0.03;
  this approval does not cover the private probe or NAT Gateway/EIP.
- The user manually started `i-0d3e72bcd91720016`. Read-only verification
  confirmed `running`, both EC2 status checks `ok`, Systems Manager `Online`,
  Public A placement, the intended IAM profile and security group, an active
  `0.0.0.0/0 -> IGW` route, and zero inbound security-group rules.
- The public probe has a newly assigned automatic public IPv4. Expected cost is
  about USD 0.0116/hour while running; it must be stopped and its public address
  verified absent whenever the session pauses.

### Initial private-probe launch verification — 2026-07-31

- The user manually launched `order-platform-phase3-private-b`
  (`i-0dbc13a7ad8190a22`) in Private B (`ap-south-1b`). Correct settings include
  `t3.nano`, the intended Amazon Linux 2023 image, private IP only, the private-
  probe security group, no key pair, IMDSv2 required with hop limit 1, healthy
  EC2 status checks, an 8 GiB gp3 root, and volume/ENI deletion on termination.
- The local-only Private B route table is effective and Systems Manager has no
  entry, which is the expected isolation symptom before NAT exists.
- The launch does not match the approved design: the IAM instance profile is
  absent; the root volume `vol-029a966690765aed2` is unencrypted; T3 CPU credits
  are Unlimited; the instance uses a trailing-space `Environment ` tag key; and
  root volume plus ENI `eni-04c1f3b7bd273e32a` have no tags.
- Root-volume encryption cannot be enabled in place. The safe, design-
  consistent remediation is to terminate this private probe, verify its root
  volume and ENI absent, and recreate it with the approved settings. No
  remediation has been performed by Codex.

### Replacement private-probe verification — 2026-07-31

- The incorrect private probe is terminated. Its former unencrypted root volume
  returns `InvalidVolume.NotFound`, and no attached ENI remains.
- Replacement `order-platform-phase3-private-b` (`i-011a920420e6bc428`) is
  running in Private B (`ap-south-1b`) with private IP only, the intended
  security group and SSM instance profile, no key pair, IMDSv2 required with hop
  limit 1, Standard CPU-credit mode, and both EC2 status checks `ok`.
- Encrypted 8 GiB gp3 root `vol-0c825fe303f46b730` and primary ENI
  `eni-07159eb6c2a7db153` are both configured for deletion on termination.
- Systems Manager has no entry while the effective route table remains local-
  only. This is the intended pre-NAT isolation result, not a launch failure.
- Remaining tag corrections: the instance's `Environment` value is
  `aws-order-platform` instead of `learning`, and the root volume and ENI have
  no tags. No further instance replacement is required.
- The user corrected the instance value and tagged the root volume and ENI.
  Read-only verification confirmed exactly five required tags on each resource,
  with the intended resource-specific `Name` values and no trailing-space key.
  Replacement private-probe configuration status: `VERIFIED`.
- The user manually inspected Systems Manager and the Private B route table,
  confirming that only the public probe appears as a managed node while Private
  B has only the active `10.30.0.0/16 -> local` route. With the intended IAM
  profile present and permissive outbound SG/NACL baselines, this is evidence
  that missing outbound reachability—not missing identity permission—prevents
  the private probe from registering with the public SSM service.

### NAT Gateway approval gate — 2026-07-31

- Immediately before creation, the user explicitly approved exactly one public
  NAT Gateway, `order-platform-phase3-nat-a`, in Public A and one allocated
  Elastic IP for a maximum of 45 minutes from NAT state `Available`.
- The approval followed review of the current Mumbai NAT-hour, data-processing,
  public-IPv4, cross-AZ, probe-compute/storage, and endpoint-alternative costs;
  idle/residual billing; and the exact route/NAT/EIP/ENI cleanup procedure.
- The approved experiment does not include a VPC endpoint or later-phase
  infrastructure. Creation remains manual; no NAT Gateway or EIP has yet been
  created at this checkpoint.
- The user subsequently created `nat-15cd4acc5ea23e0d9`. Read-only verification
  found no subnet ID and two address records in `associating`, identifying it as
  the newer regional public NAT mode rather than the approved zonal Public A
  design. AWS documentation confirms regional NAT attaches at VPC level,
  automatically expands by workload AZ, and can allocate multiple EIPs.
- No route was added. The regional NAT must be deleted immediately and every
  resulting EIP/managed ENI separately audited before reconsidering the zonal
  experiment.
- The user initiated deletion; read-only polling confirmed the regional NAT
  `deleted` and no NAT-managed ENI or route remained. Its two recorded service-
  managed EIPs disappeared automatically, consistent with the regional NAT
  service-linked role's automatic `ReleaseAddress` behavior.
- A separate unassociated customer EIP `eipalloc-07761ce6446df7372` then remained
  visible. It was not one of the regional NAT's recorded allocations and is
  billable at USD 0.005/hour while allocated. It is retained only for a possible
  correct zonal retry and must be tagged, associated promptly after renewed
  approval, or released.
- The user tagged the customer EIP and created zonal public NAT
  `nat-084188a4c2090c5df` before the renewed checkpoint. Read-only verification
  confirmed it matches the originally approved concrete design: Public A
  subnet, one associated customer EIP, one requester-managed ENI, public
  connectivity, and all five exact NAT/EIP tags.
- NAT creation time was 18:14 IST. The deletion deadline is 18:59 IST on
  2026-07-31, leaving a safety buffer before a second NAT billing hour. No route
  had been added at this verification point.
- The user added active `0.0.0.0/0 -> nat-084188a4c2090c5df` only to Private B;
  verification confirmed Private A remained local-only and the NAT remained
  available in Public A.
- The private probe did not immediately register with SSM. All route, IGW, DNS,
  IAM-profile association, SG egress, bidirectional NACL, and EC2-health
  dependencies verified correct. EC2 console evidence captured the pre-NAT SSM
  agent failure: DNS resolved the regional SSM endpoint, but TCP 443 timed out.
  This isolates the original failure to outbound network reachability. A reboot
  is planned to trigger an immediate post-NAT agent retry.
- The user manually rebooted only the private probe. Both EC2 checks returned
  `ok`, and SSM reported the private probe `Online` through NAT while it still
  had no public IPv4 and no unsolicited inbound permission. This verifies
  private outbound initiation and return-state behavior through the zonal NAT.
- The user initially started the temporary Python TCP/8080 server on the public
  probe, producing an immediate connection-refused diagnosis for the intended
  private address. The public-side listener was stopped and the server was
  correctly started on the private probe.
- Evidence then showed the private listener on `0.0.0.0:8080`, a successful
  private loopback request returning `private-probe-ok`, and a successful public-
  probe request to the private probe's private IP returning the same response.
  This verifies Public A -> VPC local route -> Private B NACL -> SG-referenced
  TCP/8080 -> private listener without using the NAT or IGW for that path.
- The user then demonstrated the outbound route lifecycle from the private
  probe: the AWS check-IP request returned the NAT EIP with the default route,
  failed after removing `0.0.0.0/0 -> NAT`, and recovered after restoring the
  exact route. This is controlled success -> failure -> evidence-based recovery
  for the Phase 3 route-table exercise.
- For the subnet-level failure experiment, the user added inbound NACL rule 90
  denying TCP/8080 from Public A `10.30.0.0/24`. A new public-to-private request
  timed out after five seconds, demonstrating that lower-numbered rule 90 won
  over allow-all rule 100 and silently dropped the packet.
- The user removed rule 90 and the request recovered. Read-only verification
  confirmed rule 90 absent, protocol `-1` allow rule 100 restored in both
  directions, automatic final denies intact, and associations unchanged on the
  two private subnets. Temporary NACL cleanup status: `VERIFIED`.
- Before the deadline, the user removed the Private B default route and deleted
  zonal NAT `nat-084188a4c2090c5df`. Verification confirmed the route table
  local-only, NAT `deleted`, and managed ENI `eni-092309b67c218bfc3` absent.
- Customer EIP `eipalloc-07761ce6446df7372` is disassociated but remains
  allocated and billable at USD 0.005/hour until the user releases it. EIP
  release and absence verification are the final NAT cleanup steps.
- The user released the customer EIP. Final read-only audit at 18:53 IST
  confirmed its allocation ID absent, zero EIPs in Mumbai, zero active NAT
  Gateways, zero NAT-managed ENIs, and no route targeting a NAT Gateway. NAT/EIP
  cleanup status: `DELETED — VERIFIED`; delayed usage may still appear later.
- For the user-to-public-tier experiment, the public probe ran a temporary
  TCP/8080 HTTP listener. With zero SG ingress, the user's browser timed out
  despite the public IPv4, IGW route, and listener.
- The user added a temporary TCP/8080 inbound rule sourced only from the
  console's current-client `/32`; browser access returned `public-probe-ok`.
  After the user removed the rule, access timed out again. Read-only
  verification confirmed the public SG returned to zero inbound permissions.
  Temporary public-ingress cleanup status: `VERIFIED`.

## Exact dependency-aware cleanup and verification

1. Capture final route, rule, address, DNS, and request evidence; remove every
   temporary inbound or NACL deny rule.
2. End Session Manager sessions and stop probe HTTP processes.
3. Terminate both probe instances and wait for `terminated`.
4. Verify both root volumes are absent, no owned snapshots exist, their ENIs and
   automatic public IPv4 are gone, and their SSM managed-node entries are absent.
5. Delete the NAT Gateway and wait until it is `deleted`; deletion alone is not
   sufficient cleanup.
6. Separately release the NAT Elastic IP and verify its allocation ID and public
   IPv4 are absent. Verify no NAT-managed or other lesson ENI remains.
7. Verify no VPC endpoint or Flow Log was created. If an unexpected one exists,
   delete it and verify its ENI/log destination separately.
8. Delete lesson security groups after all ENIs are gone. Remove policies from
   the instance role/profile, remove the role from the profile, delete both,
   and verify absence.
9. Delete the four lesson subnets. Then delete the non-main route tables and the
   custom NACL after their associations are gone.
10. Detach and delete the lesson Internet Gateway. Delete the lesson VPC; its
    main route table, default security group, and default NACL should disappear
    with it.
11. Audit Mumbai for the lesson VPC, subnets, routes/associations, IGW, NAT,
    EIP/public IPv4, ENIs, SGs, NACLs, DHCP options, endpoints, instances,
    volumes, snapshots, SSM nodes, Flow Logs, and Phase 3 logs. Confirm the
    default VPC and its resources were not modified.
12. Review delayed billing without treating it as deletion evidence. Update the
    ledger and close-out record as `VERIFIED`, `PARTIAL`, or `NOT VERIFIED`.

## Phase review (complete at exit)

```text
Confidence (0-4): 3
Traffic path I can explain: DNS returns an IP; the operating system sends the
  packet through the ENI, and the AWS VPC router uses the route table associated
  with the source subnet. The most-specific destination route wins: VPC-local
  traffic uses 10.30.0.0/16 -> local, while other private outbound traffic used
  0.0.0.0/0 -> NAT. NACLs, security groups, and the listener still must allow it.
Availability failure impact: AZ A failure removes the demonstrated public probe
  and zonal NAT; AZ B failure removes the demonstrated private probe. The single
  cross-AZ NAT was economical for a short lesson, not the resilient production
  design, and Private B-to-NAT-A traffic can add cross-AZ cost.
NAT decision and cost: NAT allowed outbound initiation and return traffic but no
  unsolicited inbound path. It incurred hourly, public-IPv4, processing, and
  possible cross-AZ charges. An S3 gateway endpoint could replace NAT for S3;
  interface endpoints create per-AZ ENIs and hourly charges and were not cheaper
  for this short multi-service SSM exercise.
Cleanup status: VERIFIED on 2026-07-31; all Phase 3 resources and billing
  dependencies were deleted/released and verified absent in ap-south-1.
```

## Final cleanup and close-out — 2026-07-31

- The user confirmed that both probes and their temporary roots contained no
  data to retain, then manually terminated public probe
  `i-0d3e72bcd91720016` and private probe `i-011a920420e6bc428`.
- Read-only verification confirmed both instances `terminated`; encrypted root
  volumes `vol-0b6dbf03b74485f69` and `vol-0c825fe303f46b730` absent; no owned
  Phase 3 snapshot; both probe ENIs absent; and the public probe's automatic
  public IPv4 released. Later regional inventory found no non-terminated Phase
  3 instance, volume, snapshot, ENI, or SSM managed node.
- The user deleted both custom security groups. Verification found them absent
  and found zero ENIs in the lesson VPC. The user deleted the probe IAM role;
  both role and matching instance profile subsequently returned `NoSuchEntity`.
- The user deleted all four subnets. Verification found no subnet in the VPC and
  no remaining subnet or edge association on the three custom route tables or
  custom NACL. A stale console association warning cleared after a hard refresh;
  the user then deleted all three custom route tables and the custom NACL.
- The user detached and deleted the lesson Internet Gateway, then deleted the
  lesson VPC. Its automatic main route table, default security group, default
  NACL, and association to the existing account DHCP options disappeared with
  the VPC; the shared DHCP options set itself was intentionally not deleted.
- Final Mumbai queries returned empty for the lesson VPC, subnets, custom route
  tables, IGW, active NAT Gateways, Elastic IPs, public IPv4 dependencies, ENIs,
  Phase 3 security groups/NACLs, VPC endpoints, non-terminated probes, EBS
  volumes, owned snapshots, Flow Logs, and Phase 3 CloudWatch log groups.
- The default VPC was not modified. No ECR, ECS/Fargate, ALB, RDS, Route 53,
  CloudFront, or other later-phase infrastructure was created.
- Expected Phase 3 residual cost is USD 0. NAT, IPv4, EC2, EBS, transfer, and
  related usage already incurred can appear later because billing data is
  delayed. No extra Cost Explorer request was made solely for close-out.
- Phase 3 cleanup status: `VERIFIED`. Overall account cleanup remains `PARTIAL`
  solely because the two inactive root access keys remain a separate USD 0
  credential review; Phase 3 did not inspect or modify them.
