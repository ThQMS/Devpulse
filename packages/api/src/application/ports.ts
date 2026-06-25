import { Result } from 'neverthrow';
import { Latency } from '../domain/value-objects/latency.js';
import { CheckResult } from '../domain/entities/check-result.js';
import { Alert } from '../domain/entities/alert.js';
import { Service } from '../domain/entities/service.js';
import { Failure } from '../domain/failures/failures.js';

export interface ProbeOutcome {
  ok: boolean;
  timedOut: boolean;
  statusCode: number | null;
  latency: Latency | null;
  error?: string;
}

/** Outbound port: performs the actual network probe of a service URL. */
export interface IHttpProber {
  probe(input: {
    url: string;
    expectedStatusCode: number;
    timeoutMs?: number;
  }): Promise<Result<ProbeOutcome, Failure>>;
}

/** Outbound port: pushes real-time domain events to connected clients. */
export interface IEventBroadcaster {
  broadcastCheckResult(result: CheckResult): void;
  broadcastAlert(alert: Alert): void;
  broadcastServiceUpdated(service: Service): void;
}

/**
 * Outbound port for the background scheduler. Use cases drive scheduling through
 * this so the application layer never imports BullMQ directly.
 */
export interface IServiceScheduler {
  scheduleService(service: Service): Promise<void>;
  removeService(serviceId: string): Promise<void>;
  /** Schedules a one-shot job to resume a silenced service after `delayMs`. */
  scheduleResume(serviceId: string, delayMs: number): Promise<void>;
}
