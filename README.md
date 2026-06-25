# DevPulse

[![CI](https://github.com/ThQMS/Devpulse/actions/workflows/ci.yml/badge.svg)](https://github.com/ThQMS/Devpulse/actions/workflows/ci.yml)
[![Licenca: MIT](https://img.shields.io/badge/Licenca-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20.12%2B-339933.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)](https://www.typescriptlang.org/)

Dashboard de monitoramento em tempo real para servicos HTTP e APIs.

O DevPulse executa checks periodicos em endpoints, armazena historico, gera alertas para falhas repetidas ou respostas lentas e envia atualizacoes ao dashboard React por WebSocket.

## Funcionalidades

- Monitoramento HTTP com intervalo, timeout e status esperado configuraveis
- Atualizacoes em tempo real via WebSocket
- Graficos de uptime e latencia com historico em PostgreSQL
- Alertas para falhas consecutivas e alta latencia
- Fluxo de silenciar/retomar servicos durante janelas de manutencao
- Retencao de dados com rollups horarios para checks antigos
- Contratos TypeScript compartilhados entre API e web em `packages/shared`

## Arquitetura

```mermaid
graph LR
  Browser[Dashboard React]
  Api[API Fastify]
  App[Casos de uso]
  Domain[Dominio]
  Worker[Worker BullMQ]
  Scheduler[Agendador]
  Queue[Redis e BullMQ]
  Repos[Portas de repositorio]
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

Fluxo de um health check:

```mermaid
graph TD
  Job[Job agendado]
  Probe[Testa URL do servico]
  Save[Salva resultado]
  Update[Atualiza status do servico]
  Evaluate[Avalia politica de alerta]
  Alert[Persiste alerta]
  BroadcastCheck[Envia evento de check]
  BroadcastAlert[Envia evento de alerta]
  Dashboard[Atualiza store do dashboard]

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

Direcao das dependencias no backend:

```mermaid
graph LR
  Presentation[Camada de apresentacao]
  Application[Camada de aplicacao]
  Domain[Camada de dominio]
  Infrastructure[Camada de infraestrutura]

  Presentation --> Application
  Application --> Domain
  Infrastructure --> Application
  Infrastructure --> Domain
```

## Monorepo

```text
packages/api      API Fastify, WebSocket gateway e worker BullMQ
packages/web      Dashboard React
packages/shared   DTOs e eventos TypeScript compartilhados
docs/             Notas de arquitetura e escalabilidade
```

## Comecando

Requisitos:

- Node.js 20 ou superior
- Corepack
- Docker e Docker Compose

Instale as dependencias e suba a infraestrutura:

```bash
corepack enable
corepack pnpm install
cp .env.example .env
corepack pnpm docker:up
```

Rode as migracoes e crie servicos de exemplo:

```bash
corepack pnpm --filter api migrate
corepack pnpm --filter api seed
```

Inicie a aplicacao:

```bash
corepack pnpm dev
```

URLs locais:

- Web: `http://localhost:5173`
- API: `http://localhost:3001`
- Health: `http://localhost:3001/health`

Em desenvolvimento, o proxy do Vite em `/api` e `/ws` injeta `API_KEY` no lado do servidor. O codigo do navegador nao armazena a chave da API.

## Uso

Criar um servico pela API:

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

Listar servicos:

```bash
curl http://localhost:3001/api/v1/services \
  -H "x-api-key: troque-em-producao"
```

Executar um check imediato:

```bash
curl -X POST http://localhost:3001/api/v1/services/<service-id>/check-now \
  -H "x-api-key: troque-em-producao"
```

Paginar historico de checks:

```bash
curl "http://localhost:3001/api/v1/services/<service-id>/checks?limit=25&offset=0" \
  -H "x-api-key: troque-em-producao"
```

## Configuracao

Copie `.env.example` para `.env` e ajuste:

```text
DATABASE_URL=postgresql://devpulse:devpulse@localhost:5432/devpulse
REDIS_URL=redis://localhost:6379
API_KEY=troque-em-producao
FRONTEND_URL=http://localhost:5173
PORT=3001
LOG_LEVEL=info
RETENTION_DAYS=30
```

Em producao, use uma `API_KEY` forte e entregue o trafego do navegador por um reverse proxy ou BFF que injete a chave no lado do servidor.

## Testes e qualidade

```bash
corepack pnpm format:check
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

O pipeline de CI roda o mesmo quality gate em todo pull request:

1. Checagem de formatacao
2. Lint
3. Testes
4. Build

## Documentacao

- [Arquitetura](docs/ARCHITECTURE.md)
- [Escalabilidade](docs/SCALING.md)
- [Contribuindo](CONTRIBUTING.md)
- [Seguranca](SECURITY.md)
- [Changelog](CHANGELOG.md)

## Contribuindo

Pull requests sao bem-vindos. Leia [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir um PR.

## Licenca

DevPulse e distribuido sob a [licenca MIT](LICENSE).
