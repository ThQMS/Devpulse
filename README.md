# DevPulse

[![CI](https://github.com/ThQMS/Devpulse/actions/workflows/ci.yml/badge.svg)](https://github.com/ThQMS/Devpulse/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20.12%2B-339933.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)](https://www.typescriptlang.org/)

Real-time uptime monitoring dashboard for HTTP services and APIs.

DevPulse checks endpoints on a schedule, stores check history, raises alerts for repeated failures or slow responses, and streams live status updates to a React dashboard over WebSocket.

## Features

- HTTP service monitoring with configurable interval, timeout and expected status code
- Live dashboard updates through WebSocket events
- Uptime and latency charts backed by PostgreSQL history
- Alerting for consecutive failures and high latency
- Service silence/resume workflow for maintenance windows
- Retention cleanup with hourly rollups for older check data
- Shared API/web TypeScript contracts in `packages/shared`

## Architecture

```mermaid
graph LR
  Browser[React dashboard]
  Api[Fastify API]
  App[Application use cases]
  Domain[Domain entities and services]
  Worker[BullMQ worker]
  Scheduler[Scheduler]
  Queue[Redis and BullMQ]
  Repos[Repository ports]
  Postgres[PostgreSQL]
  Prober[HTTP prober]
  Broadcaster[WebSocket broadcaster]

  Browser --> Api
  Api --> Browser
  Api --> App
  Scheduler --> Queue
  Queue --> Worker
  Worker --> App
  App --> Domain
  App --> Repos
  Repos --> Postgres
  App --> Prober
  App --> Broadcaster
  Broadcaster --> Browser
```

```mermaid
graph TD
  Job[Scheduled check job]
  Probe[Probe service URL]
  Save[Save check result]
  Update[Update service status]
  Evaluate[Evaluate alert policy]
  Alert[Persist alert]
  BroadcastCheck[Broadcast check event]
  BroadcastAlert[Broadcast alert event]
  Dashboard[Dashboard store update]

  Job --> Probe
  Probe --> Save
  Save --> Update
  Update --> Evaluate
  Evaluate --> Alert
  Evaluate --> BroadcastCheck
  Alert --> BroadcastAlert
  BroadcastCheck --> Dashboard
  BroadcastAlert --> Dashboard
```

Backend dependency direction:

```mermaid
graph LR
  Presentation[Presentation layer]
  Application[Application layer]
  Domain[Domain layer]
  Infrastructure[Infrastructure layer]

  Presentation --> Application
  Application --> Domain
  Infrastructure --> Application
  Infrastructure --> Domain
```

## Monorepo

```text
packages/api      Fastify API, WebSocket gateway and BullMQ worker
packages/web      React dashboard
packages/shared   Shared TypeScript DTOs and WebSocket event contracts
docs/             Architecture and scaling notes
```

## Getting Started

Requirements:

- Node.js 20 or newer
- Corepack
- Docker and Docker Compose

Install dependencies and start infrastructure:

```bash
corepack enable
corepack pnpm install
cp .env.example .env
corepack pnpm docker:up
```

Run migrations and seed example services:

```bash
corepack pnpm --filter api migrate
corepack pnpm --filter api seed
```

Start the app:

```bash
corepack pnpm dev
```

Local URLs:

- Web: `http://localhost:5173`
- API: `http://localhost:3001`
- Health: `http://localhost:3001/health`

In development, the Vite `/api` and `/ws` proxy injects `API_KEY` server-side. Browser code does not store the API key.

## Usage

Create a service directly through the API:

```bash
curl -X POST http://localhost:3001/api/v1/services \
  -H "content-type: application/json" \
  -H "x-api-key: troque-em-producao" \
  -d '{
    "name": "Example API",
    "url": "https://example.com",
    "checkIntervalSeconds": 60,
    "groupName": "production",
    "tags": ["public", "http"]
  }'
```

List services:

```bash
curl http://localhost:3001/api/v1/services \
  -H "x-api-key: troque-em-producao"
```

Run one check immediately:

```bash
curl -X POST http://localhost:3001/api/v1/services/<service-id>/check-now \
  -H "x-api-key: troque-em-producao"
```

Paginate check history:

```bash
curl "http://localhost:3001/api/v1/services/<service-id>/checks?limit=25&offset=0" \
  -H "x-api-key: troque-em-producao"
```

## Configuration

Copy `.env.example` to `.env` and adjust:

```text
DATABASE_URL=postgresql://devpulse:devpulse@localhost:5432/devpulse
REDIS_URL=redis://localhost:6379
API_KEY=troque-em-producao
FRONTEND_URL=http://localhost:5173
PORT=3001
LOG_LEVEL=info
RETENTION_DAYS=30
```

For production, set a strong `API_KEY` and terminate browser traffic through a reverse proxy or BFF that injects the API key server-side.

## Tests and Quality

```bash
corepack pnpm format:check
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

The CI pipeline runs the same quality gate on every pull request:

1. Format check
2. Lint
3. Tests
4. Build

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Scaling](docs/SCALING.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Changelog](CHANGELOG.md)

## Contributing

Pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

## License

DevPulse is released under the [MIT License](LICENSE).
