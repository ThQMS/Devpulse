import { Result, ok, err } from 'neverthrow';
import { v4 as uuid } from 'uuid';
import { Url } from '../value-objects/url.js';
import { Interval } from '../value-objects/interval.js';
import { Failure, validation } from '../failures/failures.js';

/** Lifecycle of monitoring for a service (not its health). */
export type ServiceStatus = 'active' | 'paused' | 'silenced';

/** Outcome of the most recent probe. */
export type CheckStatus = 'up' | 'down' | 'timeout' | 'unknown';

export interface Service {
  readonly id: string;
  readonly name: string;
  readonly url: Url;
  readonly checkInterval: Interval;
  readonly groupName: string;
  readonly tags: string[];
  readonly expectedStatusCode: number;
  readonly timeoutMs: number;
  status: ServiceStatus;
  lastCheckAt: Date | null;
  lastCheckStatus: CheckStatus;
  silencedUntil: Date | null;
  readonly createdAt: Date;
}

export interface CreateServiceParams {
  name: string;
  url: string;
  checkIntervalSeconds: number;
  groupName?: string;
  tags?: string[];
  expectedStatusCode?: number;
  timeoutMs?: number;
}

const NAME_MAX = 120;

export function createService(params: CreateServiceParams): Result<Service, Failure> {
  const name = params.name.trim();
  if (name.length === 0) {
    return err(validation('Service name must not be empty', 'name'));
  }
  if (name.length > NAME_MAX) {
    return err(validation(`Service name must be at most ${NAME_MAX} characters`, 'name'));
  }

  const urlResult = Url.of(params.url);
  if (urlResult.isErr()) return err(urlResult.error);

  const intervalResult = Interval.of(params.checkIntervalSeconds);
  if (intervalResult.isErr()) return err(intervalResult.error);

  return ok({
    id: uuid(),
    name,
    url: urlResult.value,
    checkInterval: intervalResult.value,
    groupName: params.groupName?.trim() || 'default',
    tags: params.tags ?? [],
    expectedStatusCode: params.expectedStatusCode ?? 200,
    timeoutMs: params.timeoutMs ?? 10_000,
    status: 'active',
    lastCheckAt: null,
    lastCheckStatus: 'unknown',
    silencedUntil: null,
    createdAt: new Date(),
  });
}

/** Whether alerting is currently suppressed for this service. */
export function isSilenced(service: Service, now: Date = new Date()): boolean {
  if (service.status === 'silenced') return true;
  return service.silencedUntil !== null && service.silencedUntil.getTime() > now.getTime();
}

/** Records the result of a probe onto the service (mutates in place). */
export function applyCheck(service: Service, status: CheckStatus, checkedAt: Date): void {
  service.lastCheckStatus = status;
  service.lastCheckAt = checkedAt;
  // A silence window that has elapsed returns the service to active.
  if (service.status === 'silenced' && !isSilenced(service, checkedAt)) {
    service.status = 'active';
    service.silencedUntil = null;
  }
}

export function serviceToJSON(service: Service) {
  return {
    id: service.id,
    name: service.name,
    url: service.url.getValue(),
    checkIntervalSecs: service.checkInterval.getValue(),
    groupName: service.groupName,
    tags: service.tags,
    expectedStatusCode: service.expectedStatusCode,
    timeoutMs: service.timeoutMs,
    status: service.status,
    lastCheckAt: service.lastCheckAt?.toISOString() ?? null,
    lastCheckStatus: service.lastCheckStatus,
    silencedUntil: service.silencedUntil?.toISOString() ?? null,
    createdAt: service.createdAt.toISOString(),
  };
}
