# ADR 0006: Phase 4 Fargate placement and deployment safety

## Status

Accepted on 2026-08-05 after the Phase 4 manual build, failure exercise,
rollback, draining observation, cost review, runtime cleanup, and
retained-foundation re-verification. Lifecycle was amended on 2026-08-02
following the user-approved retained-foundation/disposable-runtime policy.

## Context

Phase 4 must teach immutable container artifacts, ECS roles/tasks/services,
ALB health routing, task replacement, scaling, graceful shutdown, deployment
circuit breakers, and rollback without creating Phase 5 data infrastructure.
The Phase 3 custom VPC was deleted and verified. The account has no current
ECR, ECS, ALB, NAT, endpoint, or custom-VPC resource. The original default VPC
must not be disturbed.

The API's business routes require PostgreSQL, but RDS and Secrets Manager are
Phase 5. Phase 4 therefore needs an honest stateless deployment surface for
health, version, failure, and draining behavior without claiming that orders or
inventory are production-ready in AWS.

## Decision

- Use ECS on Fargate rather than ECS on EC2 or EKS. Fargate isolates task
  runtime management and charges only requested task CPU/memory/runtime, which
  keeps the lesson focused on container and service behavior.
- Create a dedicated reusable learning VPC with two public and two private
  subnets across `ap-south-1a` and `ap-south-1b`. Do not modify the default
  VPC. Private route tables remain local-only until a later approved need.
- Use an internet-facing IPv4 ALB in both subnets and Fargate tasks with public
  IPv4 enabled solely for outbound ECR and CloudWatch access. Permit task
  ingress only from the ALB security group.
- Do not create a NAT Gateway or paid interface endpoints. The task public-IP
  charge is materially lower for this short lesson than NAT hourly/processing
  charges or the multiple endpoints needed for ECR and CloudWatch Logs.
- Use one empty application task role and a separate task execution role with
  only the managed permissions needed to pull ECR images and write logs. The
  distinction remains visible even though Phase 4 application code calls no
  AWS API.
- Use Fargate size `0.25 vCPU` and `0.5 GB`, desired count 1 by default and 2
  only briefly. Use rolling minimum/maximum healthy capacity of 100/200 and an
  ECS deployment circuit breaker with automatic rollback.
- Use immutable version tags for human meaning and explicit ECR digests in task
  definitions for byte-level identity. Never deploy `latest`.
- Use ALB `/health` for the controlled healthy/unhealthy deployment exercise,
  a bounded slow request for draining, and structured lifecycle logs for
  SIGTERM evidence. Database-dependent business routes remain out of scope.
- After every active session, delete all Fargate tasks and the temporary ECS
  service, ALB/listener/target group, public IPv4/temporary ENI dependencies,
  NAT/EIP/endpoints if any, the unhealthy image, and unneeded logs.
- Retain through Phase 8 only the tagged/ledgered VPC, four subnets, route
  tables/IGW, empty ECS cluster, required known-good task definition, narrowly
  scoped roles, justified reusable security groups, and one known-good
  versioned ECR image/repository. Re-verify them every session, review on
  2026-08-31, and normally delete them at the Phase 8/9 boundary before
  Terraform recreation unless an import exercise is explicitly approved.

## Options considered

1. ECS Fargate tasks in public subnets with task public IPv4 addresses.
2. ECS Fargate tasks in private subnets using one NAT Gateway.
3. ECS Fargate tasks in private subnets using ECR API, ECR Docker, CloudWatch
   Logs, and S3 endpoints.
4. ECS on EC2 or EKS.
5. Deploy the full API with a temporary managed database.

## Why

The chosen design has the smallest expected short-session cost while still
demonstrating every Phase 4 control. The ALB remains the only allowed inbound
path, despite each task's temporary public address. Avoiding NAT removes a USD
0.056/hour fixed gateway charge, its USD 0.005/hour public IPv4 charge, and
processing/cross-AZ dimensions. Multiple interface endpoints would add several
per-AZ hourly resources and obscure the deployment lesson.

A dedicated VPC keeps reusable learning infrastructure isolated from the
account's original default VPC. Fargate avoids EC2 capacity and host-management topics
already covered in Phase 2. A managed database would cross the explicit Phase 5
boundary and misrepresent the manual-first curriculum.

## Trade-offs

- Each running task consumes a billable public IPv4 and has a route to the
  internet. Security groups prevent public inbound traffic, but a production
  design should normally use private task placement and carefully controlled
  egress.
- Desired count 1 is economical but is not highly available. Desired count 2
  across two AZs demonstrates the minimum production-shaped availability
  pattern at a temporarily higher Fargate/public-IP cost.
- An internet-facing ALB has a fixed hourly charge plus at least two public
  IPv4 charges even when desired count is zero.
- The Phase 4 stateless surface proves runtime/deployment behavior, not order or
  inventory durability. Phase 5 adds the managed data layer.
- Rolling replacement can briefly run extra tasks up to maximum healthy
  capacity, increasing cost while protecting availability.
- Retention reduces repetitive manual setup, but it creates configuration-drift
  and security-review obligations. No-direct-cost resources must still be
  tagged, ledgered, and checked after every session.

## Cost impact

At low traffic, the planned baseline is about USD 0.059868/hour with one task
and USD 0.077835/hour with two tasks, before small logs and data transfer. The
operating estimate is under USD 0.50 and the conservative session cap is USD
0.75 before tax for no more than three ALB hours. After runtime cleanup, the
VPC controls, empty cluster/task definition, roles, and security groups have
USD 0 expected direct service cost. Exactly one known-good ECR image remains
billable at USD 0.10/GB-month; record its actual size and monthly cost after
push. CloudWatch logs, the unhealthy image, ALB, tasks, and public IPv4
dependencies are not retained. Overall cleanup is `PARTIAL` while the
foundation remains even when Phase 4 runtime cleanup is `VERIFIED`.

## Failure impact

- With desired count 1, task or AZ loss causes temporary unavailability until
  ECS places and registers a healthy replacement.
- With desired count 2 balanced across two AZs, one task/AZ can fail while the
  other continues, subject to remaining capacity and ALB health.
- A bad image can repeatedly fail ALB/container health. The circuit breaker
  limits churn and restores the last completed good deployment.
- A too-short deregistration delay or an application that ignores SIGTERM can
  interrupt in-flight requests. The bounded slow-request experiment and
  structured shutdown logs test this boundary.
- Loss of execution-role permissions prevents image pull or log delivery;
  application task-role permissions are intentionally unrelated.

## Validation outcome

- The healthy image was deployed by exact digest and identified through the
  ALB as `phase4-healthy-v1`. The retained compressed image size is 190,003,692
  bytes, estimated near USD 0.019/month prorated.
- At desired count 1, manually stopping the only task produced the predicted
  temporary ALB 503 until ECS made a replacement healthy. At desired count 2,
  a 180-request replacement probe returned 180 successes while ECS preserved
  one healthy task in each AZ before and after replacement.
- A 10-second request completed during target draining. CloudWatch then showed
  SIGTERM start/completion and exit code 0. This validates ALB/ECS draining and
  clean application termination without claiming the application handler had
  to wait for that request after SIGTERM.
- Unhealthy revision 3 started successfully but returned 503 to ALB health
  checks. Three `Target.ResponseCodeMismatch` failures tripped the circuit
  breaker; automatic rollback restored revision 2 to `COMPLETED`, and the ALB
  again returned the known-good version.
- Disposable runtime cleanup was verified before the three-hour deadline:
  zero active ECS services/tasks, ALBs/listeners/target groups, VPC ENIs/public
  IPv4 addresses, NATs/EIPs/endpoints, Phase 4 log groups, or unhealthy images.
  Revision 3 is inactive. The tagged reusable foundation and only healthy image
  remain, with the review/delete obligations stated above.

## Conditions that would make us reconsider

- A long-lived or production workload would use private tasks, at least two
  steady tasks, stronger egress controls, and a cost/resilience comparison of
  same-AZ NAT versus VPC endpoints.
- Real database-backed order traffic requires the Phase 5 RDS, secret, network,
  migration, and connection-pool decisions.
- Sustained utilization or latency evidence may justify larger task sizing,
  autoscaling, ARM images, Fargate Spot for interruption-tolerant work, or ECS
  on EC2.
- A deployment needing traffic shaping beyond rolling replacement may justify
  native ECS blue/green, linear, or canary strategies in a later delivery
  phase.
