import { v4 as uuid } from 'uuid';
import { Latency } from '../value-objects/latency.js';
import { CheckStatus } from './service.js';

export interface CheckResult {
  readonly id: string;
  readonly serviceId: string;
  readonly status: CheckStatus;
  readonly statusCode: number | null;
  readonly latency: Latency | null;
  readonly error: string | null;
  readonly checkedAt: Date;
}

export interface CreateCheckResultParams {
  serviceId: string;
  status: CheckStatus;
  statusCode?: number | null;
  latency?: Latency | null;
  error?: string | null;
  checkedAt?: Date;
}

export function createCheckResult(params: CreateCheckResultParams): CheckResult {
  return {
    id: uuid(),
    serviceId: params.serviceId,
    status: params.status,
    statusCode: params.statusCode ?? null,
    latency: params.latency ?? null,
    error: params.error ?? null,
    checkedAt: params.checkedAt ?? new Date(),
  };
}

export function checkResultToJSON(result: CheckResult) {
  return {
    id: result.id,
    serviceId: result.serviceId,
    status: result.status,
    statusCode: result.statusCode,
    latencyMs: result.latency?.getValue() ?? null,
    error: result.error,
    checkedAt: result.checkedAt.toISOString(),
  };
}
