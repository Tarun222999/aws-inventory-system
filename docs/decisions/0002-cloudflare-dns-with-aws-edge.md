# ADR 0002 — Retain Cloudflare as Authoritative DNS

## Status

Accepted in principle during Phase 0; implementation details deferred to Phase 8.

## Context

The user already owns a domain managed through Cloudflare and wants to use it
for the learning application. Moving authoritative DNS to Route 53 would add an
unnecessary migration and would not improve the core learning objectives.

## Decision

- Retain Cloudflare as the authoritative DNS provider.
- Use AWS Certificate Manager for certificates required by CloudFront and/or
  the Application Load Balancer.
- Create certificate-validation and application-routing DNS records in
  Cloudflare when Phase 8 is reached.
- Decide the exact hostname and CloudFront/ALB routing design during Phase 8.
- Do not create or change domain, DNS, certificate, CloudFront, or load-balancer
  resources during Phase 0.

## Why

This reuses the domain the user already controls, avoids an unnecessary DNS
migration, and still allows the project to learn ACM validation, HTTPS, CDN
delivery, load balancing, and origin routing.

## Trade-offs

- DNS configuration is split from the AWS account and must be verified in both
  Cloudflare and AWS.
- Certificate validation depends on correct Cloudflare records.
- Cloudflare proxy mode and AWS caching/origin behavior can interact, so the
  final design must be chosen deliberately rather than enabled by default.

## Cost impact

No DNS or edge resources are created in Phase 0. Phase 8 will review Cloudflare
plan/domain renewal costs and AWS CloudFront, load balancer, data-transfer, and
public IPv4 costs before creating anything.

## Failure impact

Incorrect DNS, validation, proxy, TLS, or origin settings can prevent access
even when the AWS application is healthy. Phase 8 diagnosis must inspect both
Cloudflare and AWS evidence.

## Conditions that would make us reconsider

- A requirement to manage all infrastructure exclusively inside AWS
- A feature that specifically requires Route 53 authoritative DNS
- Operational complexity from the split control plane outweighs the benefit of
  retaining the existing provider
