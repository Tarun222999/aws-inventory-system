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
npm run db:migrate
npm run dev:api
npm run dev:worker
npm run dev:frontend
```

Run the API, worker, and frontend commands in separate terminals, then open
`http://127.0.0.1:5173`. The frontend development server proxies `/api` to the
local API at `http://127.0.0.1:3000`, so no CORS configuration is required.

`VITE_API_BASE_URL` is optional public configuration for a different API URL.
Browser-visible variables must never contain database credentials, access keys,
or server secrets.

## Verification

```text
npm test
npm run check
npm run build
```

## Workspace layout

```text
apps/api       HTTP process
apps/worker    background worker process
apps/frontend  React browser application
packages/config shared server environment validation
```
