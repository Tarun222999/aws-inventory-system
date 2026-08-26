# ADR 0007: Phase 5 private managed data foundation

## Status

Accepted on 2026-08-18 after the Phase 5 manual exercises, recovery evidence,
cost review, and cleanup verification.

## Context

The order platform needs durable relational state, private product-image
storage, and managed application secrets. Phase 1 already demonstrated a
PostgreSQL transaction that locks inventory rows in consistent product-ID order
to prevent overselling. Phase 4 retained a clean VPC/ECS/ECR/IAM foundation,
but no managed database, secret, or product-image bucket exists.

Phase 5 must teach data integrity, database connection scaling, query plans,
compatible migrations, backup/recovery, encryption, least-privilege secret
access, private object storage, and credential rotation without introducing
Phase 6 messaging or later edge/notification services.

## Decision

- Use RDS for PostgreSQL 16 in Mumbai rather than self-managed PostgreSQL or
  DynamoDB. Use a small Single-AZ `db.t4g.micro` with 20 GiB encrypted gp3 for
  the learning runtime.
- Place RDS in a DB subnet group spanning the two retained private subnets. Do
  not make it publicly accessible. Permit DB-group inbound TCP/5432 only from
  the ECS task security group and task-group outbound TCP/5432 only to the DB
  security group.
- Attach a custom PostgreSQL 16 parameter group whose effective
  `rds.force_ssl=1` setting is verified, and use client certificate
  verification. Use the AWS managed RDS encryption key for the lab to avoid a
  separately managed KMS-key lifecycle and charge.
- Keep application processes stateless. Retrieve the intended database secret
  at runtime using only the ECS task role, then create a bounded connection
  pool. Do not embed credentials in Git, images, task definitions, logs, or
  browser code.
- Budget database connections across the maximum application task count. Make
  `DATABASE_POOL_MAX` configurable and validated from 1–20, with a conservative
  default of five connections per API or worker process instead of the prior
  hard-coded maximum of ten. For the learning scale target, four API tasks and
  two workers therefore have a combined application ceiling of 30 rather than
  60, leaving capacity for deployment overlap, migrations, and diagnosis.
- Retain the existing pessimistic row-locking order transaction for the final-
  item concurrency demonstration. Evaluate representative query plans before
  adding or changing indexes.
- Use expand/contract migrations so old and new task revisions remain
  compatible during rolling deployment.
- Use automated RDS backups/PITR for recovery from logical mistakes; treat
  Multi-AZ as a separate availability mechanism rather than a backup. Define
  RTO/RPO before selecting retention and restore evidence.
- Use a private S3 bucket with Block Public Access, bucket-owner-enforced object
  ownership, default SSE-S3, scoped product-image prefixes, short-lived
  presigned operations, and explicit incomplete-upload verification for the
  bounded single-PUT lab. Add abort-incomplete-multipart lifecycle cleanup
  before a later phase enables multipart uploads.
- Avoid NAT, paid interface endpoints, ALB, and persistent Fargate runtime
  unless a later exercise proves each is necessary and separately approves its
  current price, lifetime, cap, cleanup, and verification plan.

## Options considered

1. RDS PostgreSQL Single-AZ in private subnets.
2. RDS PostgreSQL Multi-AZ for the learning runtime.
3. Self-managed PostgreSQL on EC2 or ECS.
4. DynamoDB for order and inventory state.
5. Publicly reachable RDS with source-IP restrictions.
6. Public S3 writes, browser IAM credentials, or private S3 presigned writes.
7. NAT Gateway or interface endpoints for all private application egress.

## Why

RDS preserves PostgreSQL transaction semantics while removing host/volume
administration from the lesson. Single-AZ makes the backup-versus-availability
trade-off visible at the lowest reasonable provisioned cost. Private placement
and SG-to-SG authorization express the application-to-database trust path
without depending on public IP addresses.

Presigned S3 operations delegate one bounded action without granting the
browser AWS credentials or public bucket write. Short-lived public-subnet
Fargate tasks can later reach private RDS through the VPC-local route while
using their temporary public IPv4 only for approved AWS API/image/log egress;
this avoids NAT and endpoint hourly charges for a short lab.

## Trade-offs

- Single-AZ can be unavailable during instance/AZ failure and requires restore
  or recreation for some failures. It is not a production HA recommendation.
- Stopping RDS removes instance-hour charges but not storage/backup charges, and
  AWS automatically restarts it after seven stopped days.
- The minimum 20 GiB gp3 storage costs about USD 2.62/month even when stopped.
- Runtime secret retrieval adds an AWS API dependency at startup. Pool/session
  behavior must be considered during credential rotation.
- AWS managed service keys simplify the lab but offer less key-policy control
  than customer-managed KMS keys.
- Presigned URLs are bearer credentials until expiration; key, method, expiry,
  and optional size/type conditions must be tightly bounded and never logged.
- Avoiding NAT/endpoints keeps the short lesson cheaper but is not the final
  production egress design.

## Cost impact

The database is USD 0.021 per running hour plus USD 0.131/GB-month for
20 GiB gp3. Additional RDS backup storage is USD 0.095/GB-month. Secrets Manager
is USD 0.40/secret-month plus API calls. S3 Standard is USD 0.025/GB-month for
the first 50 TB plus request/transfer dimensions. Temporary Fargate/public-IP,
logs, ALB, NAT, or endpoint costs are excluded until separately proposed.

Today's DB subnet group, DB security group, and DB parameter group have USD 0
expected direct idle cost. All retained resources still require ledger entries,
tags, review dates, and end-of-session re-verification.

## Failure impact

- Database/AZ loss interrupts the Single-AZ application until RDS recovers or a
  restore/replacement is available.
- A destructive application query is faithfully persisted and would also be
  replicated by Multi-AZ; recovery requires a backup/PITR or compensating data
  repair.
- Excess per-task pool sizes can exhaust PostgreSQL connections during ECS
  scale-out and make otherwise healthy tasks fail readiness or requests.
- Incorrect lock ordering can deadlock; missing/ineffective concurrency control
  can oversell inventory.
- A denied secret call prevents safe application startup; broad secret access
  increases blast radius.
- An expired/mismatched presigned request fails without requiring public bucket
  access. A leaked unexpired URL can perform only the signed action within its
  remaining lifetime.

## Conditions that would make us reconsider

- Production availability requirements justify Multi-AZ and at least two
  application tasks across AZs.
- Connection pressure or failover requirements justify RDS Proxy after its
  separate cost and operational trade-offs are measured.
- Workload evidence justifies a larger instance, storage throughput, IOPS,
  read replicas, or different database architecture.
- Compliance or key-ownership requirements justify customer-managed KMS keys.
- Long-lived private compute and measured traffic justify same-AZ NAT, gateway
  endpoints, interface endpoints, or another controlled-egress architecture.

## Validation required before acceptance

- Concurrent final-item purchases preserve non-negative inventory and commit
  exactly one order.
- Connection counts are observed as application task count changes or is safely
  simulated.
- A representative `EXPLAIN` supports an index decision.
- An expand/contract migration is defended for old/new task compatibility.
- The selected RTO/RPO maps to demonstrated restore evidence.
- Only the intended workload role retrieves the intended secret; rotation and
  recovery are exercised without exposing values.
- A presigned upload succeeds while bucket public writes remain blocked.
- Disposable runtime cleanup and retained-resource review are verified and
  recorded separately from overall account cleanup.

## Acceptance evidence

- Concurrent HTTP purchases for the last unit produced exactly one 201 and one
  409 response; final inventory was zero. The transaction uses deterministic
  `SELECT FOR UPDATE` locking, a post-lock stock check, and a non-negative
  database constraint.
- Safe connection simulations observed one, two, and four sessions as the
  represented application instance count increased. A pool maximum of five
  bounds four API plus two worker tasks at 30 application connections, leaving
  headroom for deployments, migrations, administration, and recovery.
- A representative parameterized SKU lookup used the existing unique index, so
  no speculative additional index was added.
- The expand/backfill/dual-read-and-write/contract migration lab kept old and
  new application versions compatible until the deliberate contract step; the
  old reader then failed as expected, proving contraction must follow task
  replacement and rollback-window closure.
- The learning recovery objective is RTO 60 minutes and RPO 5 minutes. A private
  PITR target became available in about 13.5 minutes, passed TLS/schema/workload
  verification, and was deleted without retaining another database or snapshot.
  Multi-AZ remains an availability choice, not recovery from destructive SQL.
- The ECS workload role retrieved only the intended managed secret. TLS 1.3 and
  forced non-TLS denial were demonstrated. Managed rotation invalidated the old
  credential for new sessions, and a fresh `AWSCURRENT` retrieval reconnected
  without exposing secret material.
- A private S3 proof denied unsigned PUT/GET, accepted a checksum/type/
  `If-None-Match`-bound signed upload, rejected overwrite replay, and served a
  signed download. The real local UI completed upload, confirmation, download,
  and rendering without public bucket access.
- A dedicated migration task acquired a PostgreSQL advisory lock, applied only
  pending migrations over verified TLS, checked the migration journal, and
  exited before application deployment.
- The real API reached healthy target state behind a temporary ALB and returned
  200 from database-backed `/ready`. Controlled wrong-security-group and
  loopback-bind failures were diagnosed and cleaned before the successful
  revision.
- Final audit found zero ECS services/tasks, ALBs/listeners/target groups,
  public ENIs/IPv4s, NAT Gateways, Elastic IPs, VPC endpoints, temporary CORS,
  incomplete multipart uploads, or Phase 5 log groups. RDS is stopped and
  private. Exactly one clean ECR image and one private product image remain for
  Phase 8 with costs and review dates recorded.

The decision is accepted for the learning architecture, not as an assertion
that Single-AZ, public-subnet task egress, manual target registration, or
SSE-S3 alone is the final production design. Those trade-offs are revisited in
Phase 8 and recreated declaratively in Phase 9.
