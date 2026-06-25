# Contributing

Thanks for taking the time to improve DevPulse. This project is a TypeScript monorepo managed with pnpm workspaces.

## Requirements

- Node.js 20 or newer
- Corepack enabled
- Docker and Docker Compose for PostgreSQL and Redis

## Local setup

```bash
corepack enable
corepack pnpm install
cp .env.example .env
corepack pnpm docker:up
corepack pnpm --filter api migrate
corepack pnpm --filter api seed
corepack pnpm dev
```

The API runs on `http://localhost:3001` and the web app runs on `http://localhost:5173`.

## Quality checks

Run these before opening a pull request:

```bash
corepack pnpm format:check
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

## Pull requests

- Keep PRs focused on one change.
- Add or update tests when behavior changes.
- Update docs when setup, API behavior, configuration, or architecture changes.
- Use clear commit messages, for example `feat: add service alert history`.

## Code style

- TypeScript is strict across packages.
- API use cases return `Result<T, Failure>` instead of throwing for expected failures.
- Domain code must stay framework-independent.
- Shared API/web contracts live in `packages/shared`.
