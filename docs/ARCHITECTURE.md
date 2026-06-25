# Arquitetura do DevPulse

DevPulse monitora endpoints HTTP: faz checks periódicos, registra cada
resultado, gera alertas em queda/lentidão e transmite tudo para um dashboard ao
vivo via WebSocket.

## Estrutura: monorepo com pnpm workspaces

```
packages/api  → Node.js + Fastify + PostgreSQL + Redis + BullMQ
packages/web  → React + Zustand + React Query
```

## Camadas do backend (Clean Architecture)

A regra de dependência é estrita: **camadas internas nunca importam das externas.**

```
presentation  →  application  →  domain  ←  infrastructure
  (HTTP/WS)       (use cases)     (core)     (adapters)
```

- **Domain** — Entities, Value Objects, interfaces de repositório e Domain
  Services. Zero dependência de framework ou I/O; testável isoladamente.
  - Value Objects (`Url`, `Interval`, `Latency`, `UptimePercentage`) se validam
    via `of()` e só existem válidos por construção.
  - Entities (`Service`, `CheckResult`, `Alert`) são `interface`s + funções
    fábrica. `Service.status` é o ciclo de vida (`active`/`paused`/`silenced`),
    separado de `lastCheckStatus`, a saúde (`up`/`down`/`timeout`/`unknown`).
  - Domain Services (`UptimeCalculator`, `AlertEvaluator`) são puros e sem
    efeitos colaterais.
- **Application** — UseCases orquestram domain e as portas de saída
  (`IHttpProber`, `IEventBroadcaster`, `IServiceScheduler`). Nunca dependem de
  Axios, BullMQ ou WebSocket diretamente.
- **Infrastructure** — implementações concretas: PostgreSQL (`pg`), Redis +
  BullMQ, prober HTTP (Axios), WebSocket. O mapeamento linha ⇄ domínio fica
  centralizado em `mappers.ts`.
- **Presentation** — rotas Fastify finas: validação Zod, delegação para o
  UseCase e `result.match(...)` para responder dados ou mapear a `Failure` para
  status HTTP. API versionada em `/api/v1`; guarda global de `X-API-Key`.

## Fluxo completo de um health check

1. **CheckScheduler** agenda um job repetível no BullMQ a cada N segundos por
   serviço (e jobs one-shot de `resume` para silêncios temporizados).
2. **HealthCheckWorker** consome o job e delega ao `RunHealthCheckUseCase`, que
   faz o HTTP GET com timeout (via `IHttpProber`).
3. Salva o `CheckResult` no PostgreSQL.
4. Atualiza `lastCheckStatus`/`lastCheckAt` no `Service`.
5. **AlertEvaluator** decide se gera um `Alert` (3 falhas consecutivas →
   critical; 2 checks lentos → warning), e só persiste se não houver alerta
   aberto (`hasOpenAlert`).
6. **WsBroadcaster** transmite `CHECK_RESULT` (e `ALERT_CREATED`) para todos os
   clientes WebSocket conectados.

## Fluxo do frontend em tempo real

1. `useWebSocket` abre a conexão WS ao montar o `App` (reconexão com backoff
   exponencial; responde `PING` com `PONG`).
2. Mensagem `CHECK_RESULT` → `updateFromCheckResult()` no ServicesStore
   (Zustand), que também recalcula os contadores up/down/unknown.
3. `ServiceCard` lê do store via selector → re-renderiza o status sem nenhuma
   requisição HTTP.
4. React Query mantém os dados históricos (lista, detalhe, trend) com
   `staleTime` de 30s e refetch periódico como rede de segurança.

## Decisões técnicas

**BullMQ sobre cron nativo**

- Jobs persistem no Redis — sobrevivem a restart.
- Concorrência de 10 checks simultâneos sem threads.
- Visibilidade via Bull Board (pode adicionar na v2).

**Zustand para WS + React Query para server state**

- Zustand: atualizações instantâneas do WebSocket (0ms de delay).
- React Query: dados históricos com cache, deduplicação e refetch.
- A separação evita invalidar o cache histórico a cada check.

**`Result<T, E>` com neverthrow**

- Erros explícitos no tipo — sem surpresas em runtime.
- UseCases sempre retornam `Result`; a presentation mapeia para status HTTP
  (`Validation`→422, `NotFound`→404, `Conflict`→409, `Network`→502, …).

**Monorepo pnpm workspaces**

- Tipos compartilhados futuros em `packages/shared` (v2).
- Deploy independente: API no Railway, web na Vercel.

## Escalabilidade planejada

- **v1**: single worker, single API instance.
- **v2**: múltiplas instâncias de API com Redis pub/sub para WebSocket.
- **v3**: `packages/shared` para tipos TS entre api e web; Bull Board para
  visibilidade.

Detalhes em [SCALING.md](SCALING.md).
