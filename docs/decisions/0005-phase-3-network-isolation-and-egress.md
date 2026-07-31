# ADR 0005: Phase 3 network isolation and controlled egress

## Status

Accepted and demonstrated on 2026-07-31. The lesson resources were subsequently
deleted and cleanup was verified.

## Context

The order platform needs a network design that separates internet-facing and
private workloads, makes Availability Zone placement explicit, and avoids
mistaking resource names for actual reachability. Phase 3 also needed to prove
the operational and cost differences between an Internet Gateway, NAT Gateway,
security group, network ACL, and VPC endpoint without creating Phase 4 or later
application infrastructure.

## Decision

- Allocate non-overlapping VPC CIDR `10.30.0.0/16` and four `/24` subnets across
  two Availability Zones: public `10.30.0.0/24` and `10.30.1.0/24`; private
  `10.30.10.0/24` and `10.30.11.0/24`.
- Classify a subnet by its effective routes, not its name. Public subnets use
  `0.0.0.0/0 -> IGW`; isolated private subnets keep only the VPC-local route;
  temporary private egress uses `0.0.0.0/0 -> NAT`.
- Let the VPC router apply the route table associated with the source subnet.
  Route selection is destination-based and most-specific: the `/16` local route
  wins for lesson-VPC destinations over the `/0` default route.
- Use stateful security groups as workload allow lists and stateless NACLs only
  as coarse subnet guardrails. Keep public ingress closed by default and permit
  private application traffic only from the public-tier security group.
- Enable VPC DNS support and hostnames. DNS returns an address; routing and
  security controls independently decide whether the resulting packet succeeds.
- Use one short-lived zonal NAT only for the learning experiment. Accept its
  deliberate single-AZ dependency and possible cross-AZ charge, time-box it,
  then delete it and separately release its Elastic IP.
- Evaluate endpoints per service. Prefer the no-hourly-charge S3/DynamoDB
  gateway endpoint when it removes applicable NAT traffic; compare interface
  endpoint per-AZ hourly/processing charges and operational complexity against
  NAT for other services.

## Evidence

- Public-to-private TCP/8080 succeeded over the VPC-local route without NAT or
  IGW; the destination security-group reference and listener were both required.
- Removing the private default route changed outbound NAT success to failure;
  restoring it recovered connectivity.
- Lower-numbered NACL deny rule 90 overrode allow rule 100 and caused a timeout;
  removing rule 90 restored the path.
- Zero public-SG ingress blocked browser access despite a public IPv4, IGW route,
  and listener. A temporary learner `/32` rule allowed it; removal blocked it.
- The private probe registered with Systems Manager only after NAT egress and
  still accepted no unsolicited internet connection.
- NAT, EIP, probes, storage, ENIs, security controls, IAM role/profile, subnets,
  route tables, NACL, IGW, and VPC were deleted and verified absent.

## Consequences

The model clearly separates name, DNS, route, address, and security decisions.
For production, each active tier needs resources in multiple AZs and private
egress should avoid a single zonal dependency. Same-AZ NAT per AZ improves
resilience but increases hourly cost; cross-AZ designs can add transfer cost.
Endpoints can reduce internet/NAT exposure but are service-specific and are not
automatically cheaper.
