# Escalabilidade do DevPulse

A arquitetura em camadas, com portas de saída (`IServiceScheduler`,
`IEventBroadcaster`, repositórios), permite escalar cada preocupação de forma
independente. As versões abaixo descrevem a evolução planejada.

---

## v1 — single worker, single API instance (atual)

Tudo roda em um processo: servidor HTTP/WebSocket + scheduler + worker BullMQ.

```
                 ┌────────────────────────┐
   browser ⇄ WS  │  API (Fastify)         │
   browser ⇄ HTTP│  + Scheduler           │ ⇄ Redis (BullMQ)
                 │  + HealthCheckWorker    │ ⇄ PostgreSQL
                 └────────────────────────┘
```

**Características**

- `HealthCheckWorker` com `concurrency: 10` — até 10 checks HTTP simultâneos.
- `WsBroadcaster` mantém o `Set` de clientes conectados _neste_ processo.
- Jobs repetíveis no Redis sobrevivem a restart; `initFromDatabase` reconcilia
  no boot.

**Limites**

- Um único processo é ponto único de falha.
- O fan-out de WebSocket só alcança clientes conectados à mesma instância.
- A vazão de checks é limitada pela concorrência de um worker.

**Suficiente para**: dezenas a poucas centenas de serviços.

---

## v2 — API horizontal + worker dedicado + Redis pub/sub

Separar responsabilidades e replicar a camada HTTP.

```
   browser ⇄  ┌── API #1 ──┐
   browser ⇄  ┌── API #2 ──┐  ⇄ Redis (pub/sub + BullMQ) ⇄ PostgreSQL (+ réplica)
              └── API #N ──┘
                  ▲ subscribe / re-broadcast
              ┌── Worker #1 ──┐
              └── Worker #M ──┘  (1 scheduler eleito por lock no Redis)
```

**Separação de processos**

- **API (N réplicas)** atrás de um load balancer — só servem HTTP + WebSocket.
- **Workers (M réplicas)** — só rodam `HealthCheckWorker`. O BullMQ distribui os
  jobs entre todos os workers conectados à mesma fila, então a vazão escala
  linearmente.
- **Scheduler único** — o registro de jobs repetíveis precisa ser singular. Roda
  uma instância só (ou protegida por um lock no Redis) para não duplicar jobs.

**Fan-out de WebSocket entre réplicas**

- `WsBroadcaster` só conhece os clientes do próprio processo. Com várias APIs, um
  check produzido por um worker precisa chegar a todos os clientes.
- Solução: um canal **Redis pub/sub** (ou `QueueEvents` do BullMQ). O worker
  publica os eventos; cada API assina e re-transmite aos seus sockets locais.
- A porta `IEventBroadcaster` torna isso um adapter plugável — **nenhuma mudança
  nos use cases**.

**Banco**

- `check_results` é a tabela de maior escrita/crescimento. O índice
  `(service_id, checked_at DESC)` serve as consultas de histórico.
- Adicionar um **job de retenção** (apagar checks crus com mais de 30 dias) e
  pré-agregar rollups horários/diários para gráficos de longo prazo.
- Apontar consultas de histórico/stats para uma **réplica de leitura**.

**Conexões**

- Pool `pg` limitado por processo (`max: 10`) — dimensionar contra
  `max_connections` × réplicas, ou usar PgBouncer.
- Conexões Redis com `maxRetriesPerRequest: null` (exigência do BullMQ).

**Visibilidade**

- **Bull Board** para inspecionar fila, jobs ativos, falhas e repetíveis.

---

## v3 — tipos compartilhados, particionamento e observabilidade

**`packages/shared`**

- Extrair os tipos TS compartilhados entre `api` e `web` (DTOs de `Service`,
  `CheckResult`, `Alert`, mensagens WebSocket) para um pacote do workspace.
- Elimina a duplicação atual entre `domain/entities` (serialização) e
  `web/src/types`, garantindo contrato único api ⇄ web.

**Banco em escala alta**

- Particionar `check_results` por tempo (ex.: mensal) ou migrar para uma
  time-series store (TimescaleDB / hypertables do Postgres). A interface de
  repositório isola o resto da aplicação dessa troca.

**Cobertura geográfica**

- Rodar pools de workers em múltiplas regiões consumindo a mesma fila, marcando
  cada resultado com a região de origem (latência regional real).
- Adicionar _jitter_ ao agendamento para os checks não dispararem todos no topo
  do intervalo.

**Observabilidade**

- Logs estruturados via `pino` (já presente).
- `/health` reporta liveness + dependências (DB, Redis, workers, wsClients) —
  pronto para probes de container/orquestrador.
- Próximo passo: expor profundidade de fila, latência de probe e vazão do worker
  como métricas (Prometheus) e alertar sobre o próprio monitor.

---

## Resumo

| Eixo              | v1               | v2                         | v3                            |
| ----------------- | ---------------- | -------------------------- | ----------------------------- |
| API               | 1 instância      | N atrás de LB              | N + tipos compartilhados      |
| Worker            | embutido na API  | M dedicados                | M multi-região                |
| WebSocket fan-out | local            | Redis pub/sub              | Redis pub/sub                 |
| Histórico         | tabela única     | retenção + réplica leitura | particionamento / time-series |
| Visibilidade      | logs + `/health` | + Bull Board               | + métricas Prometheus         |
