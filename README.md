# AWS Order and Inventory Platform

A production-shaped learning application built incrementally with React,
TypeScript, Node.js, PostgreSQL, and Docker.

Phase 1 is local-only. See `docs/PHASE-1-NOTES.md` for the current scope,
architecture, and evidence checklist.

## Local prerequisites

- Node.js 22
- npm 10+
- Docker with Docker Compose

## Workspace commands

```text
npm install
copy .env.example .env
docker compose up -d postgres
npm run dev:api
npm run dev:worker
```

Run the API and worker commands in separate terminals. Application tables and
database access are introduced in the next increment; Step 1 verifies process
startup and configuration only.

## Workspace layout

```text
apps/api       HTTP process
apps/worker    background worker process
packages/config shared environment validation
```
