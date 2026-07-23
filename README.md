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

## Complete Docker stack

Build and start PostgreSQL, the one-shot migration, API, worker, and frontend:

```text
docker compose up -d --build
```

Then open `http://127.0.0.1:5173`. The API remains available locally at
`http://127.0.0.1:3000`; container-to-container database and API traffic uses
the private Compose network.

On the Docker Desktop/Windows version used for this project, BuildKit may fail
while streaming the repository with `changes out of order`. This is a local
builder defect that occurs before a Dockerfile is evaluated. The verified
fallback is:

```powershell
$env:DOCKER_BUILDKIT="0"
$env:COMPOSE_DOCKER_CLI_BUILD="0"
docker compose build
docker compose up -d --no-build
```

Stop the local stack without deleting PostgreSQL data with:

```text
docker compose down
```

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
