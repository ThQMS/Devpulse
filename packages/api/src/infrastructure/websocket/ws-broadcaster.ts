import type { WebSocket } from '@fastify/websocket';
import { IEventBroadcaster } from '../../application/ports.js';
import { CheckResult } from '../../domain/entities/check-result.js';
import { Alert, alertToJSON } from '../../domain/entities/alert.js';
import { Service, serviceToJSON } from '../../domain/entities/service.js';

const PING_INTERVAL_MS = 30_000;
const WS_OPEN = 1; // WebSocket.OPEN

export interface CheckResultPayload {
  serviceId: string;
  status: string;
  statusCode: number | null;
  latencyMs: number | null;
  error: string | null;
  checkedAt: string;
}

/** Discriminated union of everything pushed to dashboard clients. */
export type WsMessage =
  | { type: 'CHECK_RESULT'; payload: CheckResultPayload }
  | { type: 'ALERT_CREATED'; payload: ReturnType<typeof alertToJSON> }
  | { type: 'SERVICE_UPDATED'; payload: ReturnType<typeof serviceToJSON> }
  | { type: 'PING'; payload: { timestamp: number } };

/**
 * Fan-out broadcaster over the set of connected WebSocket clients. Implements
 * the `IEventBroadcaster` port so the application/worker stay transport-agnostic.
 */
export class WsBroadcaster implements IEventBroadcaster {
  private readonly clients = new Set<WebSocket>();

  /** Registers a client, wires cleanup on close, and keeps it alive with pings. */
  addClient(ws: WebSocket): void {
    this.clients.add(ws);

    const ping = setInterval(() => {
      if (ws.readyState === WS_OPEN) {
        ws.send(
          JSON.stringify({ type: 'PING', payload: { timestamp: Date.now() } } satisfies WsMessage),
        );
      }
    }, PING_INTERVAL_MS);

    const cleanup = () => {
      clearInterval(ping);
      this.clients.delete(ws);
    };
    ws.on('close', cleanup);
    ws.on('error', cleanup);
  }

  getConnectedCount(): number {
    return this.clients.size;
  }

  broadcastCheckResult(result: CheckResult): void {
    this.send({
      type: 'CHECK_RESULT',
      payload: {
        serviceId: result.serviceId,
        status: result.status,
        statusCode: result.statusCode,
        latencyMs: result.latency?.getValue() ?? null,
        error: result.error,
        checkedAt: result.checkedAt.toISOString(),
      },
    });
  }

  broadcastAlert(alert: Alert): void {
    this.send({ type: 'ALERT_CREATED', payload: alertToJSON(alert) });
  }

  broadcastServiceUpdated(service: Service): void {
    this.send({ type: 'SERVICE_UPDATED', payload: serviceToJSON(service) });
  }

  private send(message: WsMessage): void {
    const data = JSON.stringify(message);
    for (const ws of this.clients) {
      if (ws.readyState === WS_OPEN) ws.send(data);
    }
  }
}
