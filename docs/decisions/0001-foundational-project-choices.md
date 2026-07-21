# ADR 0001 — Foundational Project Choices

## Status

Accepted during Phase 0.

## Context

The learning project needs a stable application stack and AWS Region so the
curriculum can focus on AWS engineering decisions instead of repeatedly
changing implementation technology.

## Decision

- Use React with TypeScript for the frontend.
- Use Node.js with TypeScript for the API and background worker.
- Use PostgreSQL for relational application data.
- Package application components with Docker.
- Use Mumbai (`ap-south-1`) as the primary AWS Region.
- Introduce Terraform in the later Infrastructure-as-Code phase, after the
  architecture has first been learned manually.

## Why

The shared TypeScript stack keeps application complexity modest. PostgreSQL
supports the transactional inventory and order exercises. Docker provides a
direct path from local development to ECR and ECS. Mumbai is the user's chosen
primary Region. Introducing Terraform later preserves the manual-first learning
method while ultimately providing repeatable infrastructure and cleanup.

## Trade-offs

- A single primary Region does not demonstrate multi-region architecture.
- Manual-first work requires stricter cleanup until Terraform owns resources.
- The chosen stack is optimized for learning continuity rather than comparing
  multiple application languages or database engines.

## Cost impact

The language and packaging choices add no AWS cost by themselves. Regional
pricing and the resources chosen in each phase determine the bill. The mandatory
cost-safety checklist and manual cleanup gates remain in force.

## Failure impact

The primary-Region choice establishes the initial regional failure boundary.
Availability Zone resilience is explored within Mumbai; multi-region recovery
is outside the core project unless deliberately added later.

## Conditions that would make us reconsider

- A project requirement that cannot reasonably be met by the chosen stack
- A documented service-availability or compliance requirement for another
  Region
- A later decision to compare an alternative technology as an optional lab
