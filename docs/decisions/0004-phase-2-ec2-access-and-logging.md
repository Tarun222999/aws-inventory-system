# ADR 0004 — Phase 2 EC2 access and logging

## Decision

For the temporary Phase 2 EC2 lesson, use one Amazon Linux 2023 `t3.micro` in
the existing Mumbai default VPC, connect through AWS Systems Manager Session
Manager, expose no SSH port or key, grant the instance role only Systems Manager
and lesson-log-write access, and forward the API's Docker log file through the
CloudWatch Agent to a one-day log group.

## Context

Phase 2 needs a manual first deployment that demonstrates EC2 lifecycle, EBS,
public/private addressing, security groups, workload roles, IAM denial, and
structured-log diagnosis. Phase 3—not Phase 2—owns custom VPC design. The
learning account has no EC2 Free Tier allowance and cost-sensitive resources
must be short-lived and explicitly verified at cleanup.

## Options considered

- SSH with a key pair and inbound TCP/22.
- Session Manager through a public subnet and automatically assigned public
  IPv4.
- Session Manager through interface VPC endpoints in a private subnet.
- Broad `CloudWatchAgentServerPolicy` versus a custom log-group-scoped policy.
- Full Docker Compose stack versus only PostgreSQL, migration, and API
  containers on the single host.

## Chosen option

- Session Manager using the Amazon Linux SSM Agent and an EC2 instance role.
- No key pair and no inbound SSH rule.
- Existing default VPC/public subnet with one automatic, non-Elastic public
  IPv4 for temporary outbound access.
- Security group begins and ends with zero inbound rules; TCP/3000 from the
  learner's current `/32` is added only for the controlled network exercise.
- Custom inline CloudWatch Logs policy permits only describe/create/write
  operations for `/aws/order-platform/phase2/api` streams.
- CloudWatch Agent tails only the API Docker log and writes to an
  instance-specific stream; log retention is one day and final cleanup deletes
  the group.
- Run only PostgreSQL, the one-time migration, and API containers needed for
  the lesson.

## Why

This removes SSH credential management and inbound port 22, centralizes access
authorization in IAM/Identity Center, exposes the least network surface needed
for each exercise, and makes the IAM failure/repair observable. It also keeps
Phase 2 small and avoids prematurely creating Phase 3 networking resources.

## Trade-offs

- Session Manager depends on SSM Agent health, an instance role, and outbound
  connectivity.
- The automatic public IPv4 costs USD 0.005/hour while assigned and changes
  after stop/start.
- Default all-IPv4 egress is broader than a long-lived production design.
- Docker JSON wraps the application's structured JSON, complicating filter
  syntax.
- A single `t3.micro` and host-local PostgreSQL are not highly available or a
  production database design.

## Cost impact

Approximate active infrastructure cost is USD 0.0172/hour: USD 0.0112/hour
compute, USD 0.005/hour public IPv4, and about USD 0.001/hour for 8 GiB gp3,
plus small log ingestion/storage/query and data-transfer usage. While stopped,
only gp3 has meaningful residual cost. IAM and the security group have no
direct service charge. No Elastic IP, NAT Gateway, load balancer, VPC endpoint,
or snapshot is created.

## Failure impact

- Loss of SSM/egress prevents administrative sessions.
- Removing TCP/3000 ingress causes an external timeout.
- Stopping the API with ingress allowed causes connection refused.
- Losing PostgreSQL leaves API liveness healthy but readiness returns 503.
- Missing log permission produces IAM `AccessDenied`; losing the agent or log
  path prevents forwarding while local Docker logs may remain on EBS.

## Conditions that would make us reconsider

- A long-lived or production workload would use purpose-built multi-AZ VPC
  placement, private application/database subnets, managed database services,
  load balancing/TLS, stronger outbound controls, and an orchestrated logging
  integration.
- Interface endpoints could replace public SSM egress when their security and
  hourly cost are justified.
- A break-glass SSH design would require a documented exceptional need,
  tightly restricted source, short-lived credentials, monitoring, and removal
  after use.
