# AWS Learning Project Instructions

These instructions apply to every Codex task working in this repository.

## Mandatory cost-safety protocol

Before taking any action that can create, start, modify, or deploy an AWS
resource, read `docs/COST-SAFETY-CHECKLIST.md` completely and follow it.

Treat cost safety as part of the task, not as an optional follow-up:

1. Identify the AWS account and Region in scope. The default learning Region is
   Mumbai (`ap-south-1`) unless the user explicitly chooses another Region.
2. Before creating a paid or potentially billable resource, tell the user:
   - how it is billed;
   - whether it incurs cost while idle;
   - how it will be stopped or deleted;
   - how cleanup will be verified.
3. Keep the resource ledger in `docs/COST-SAFETY-CHECKLIST.md` current during
   hands-on work.
4. Do not consider an AWS lesson or deployment task complete until the mandatory
   end-of-session cleanup has been performed and its result recorded as
   `VERIFIED`, `PARTIAL`, or `NOT VERIFIED`.
5. Never assume that closing the console, signing out, stopping local code, or
   running a cleanup command has stopped AWS billing. Verify resource state in
   AWS.
6. If the user wants to stop, pause, leave, or abandon a session, or expresses
   frustration or interruption—switch immediately to the emergency stop
   procedure in `docs/COST-SAFETY-CHECKLIST.md` before ending the task.
7. Do not delete persistent data, snapshots, buckets, databases, volumes, or
   secrets without confirming that deletion is intended and safe. Stop active
   compute first when urgent cleanup is needed.
8. Explicitly list any resource intentionally retained, its expected residual
   cost, and its review/delete date.

Budget alerts are warnings and may be delayed. They are not spending caps and
do not replace resource cleanup.

## Retained foundation versus disposable runtime

Use a middle-ground lifecycle for Phases 4 through 8. Do not delete and rebuild
the entire architecture after every phase when a reusable resource has no
direct hourly charge or only a small, understood storage charge.

- Retain only documented, tagged foundation resources needed by a subsequent
  phase, such as the learning VPC/subnets/routes/Internet Gateway, an empty ECS
  cluster, task definitions, scoped IAM roles/security groups, and one
  known-good ECR image.
- Stop or delete meaningful hourly runtime after each session, including
  Fargate tasks, load balancers, NAT Gateways, Elastic/public IPv4 addresses,
  temporary ENIs/endpoints, and unneeded log ingestion.
- A stopped RDS instance may be retained between closely spaced sessions only
  when its storage/backup cost and automatic seven-day restart deadline are
  recorded. Start it only for active work and stop it again afterward.
- Low-usage state such as S3 objects, queues, or secrets may be retained only
  when a later phase needs it and its residual cost, reason, and review/delete
  date are recorded.
- Re-verify every retained resource at session close. "No direct hourly
  charge" does not mean "ignore during cleanup."
- Review the manually created foundation at the Phase 8/9 boundary. Delete it
  before Terraform recreation unless an explicit import exercise is chosen.

## Development curriculum

Read `docs/DEVELOPMENT-PLAN.md` before beginning or continuing a project phase. Use
its phase order, exit criteria, service coverage, and cleanup gates unless the
user explicitly agrees to revise the plan.

Read the relevant phase in `docs/ENGINEERING-CONCEPTS.md` before teaching or
reviewing that phase. Use its questions and demonstrations for the phase review;
do not treat resource creation alone as proof that the concept was learned.

This project uses a manual-first learning approach: understand and exercise AWS
resources manually, retain only the justified reusable foundation, remove and
verify expensive runtime after every session, then reproduce the understood
architecture with Terraform in the later Infrastructure-as-Code phase.
