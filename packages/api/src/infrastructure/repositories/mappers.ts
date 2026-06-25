import { Result, ok, err } from 'neverthrow';
import { Service, ServiceStatus, CheckStatus } from '../../domain/entities/service.js';
import { CheckResult } from '../../domain/entities/check-result.js';
import { Alert, AlertSeverity } from '../../domain/entities/alert.js';
import { Url } from '../../domain/value-objects/url.js';
import { Interval } from '../../domain/value-objects/interval.js';
import { Latency } from '../../domain/value-objects/latency.js';
import { Failure } from '../../domain/failures/failures.js';

export interface ServiceRow {
  id: string;
  name: string;
  url: string;
  check_interval_secs: number;
  group_name: string;
  tags: string[] | null;
  expected_status_code: number;
  timeout_ms: number;
  status: string;
  last_check_at: Date | null;
  last_check_status: string;
  silenced_until: Date | null;
  created_at: Date;
}

export interface CheckResultRow {
  id: string;
  service_id: string;
  status: string;
  status_code: number | null;
  latency_ms: number | null;
  error: string | null;
  checked_at: Date;
}

export interface AlertRow {
  id: string;
  service_id: string;
  service_name: string;
  severity: string;
  message: string;
  triggered_at: Date;
  acknowledged_at: Date | null;
  acknowledged_by: string | null;
}

/** Maps persistence rows to validated domain objects. */
export const ServiceMapper = {
  toDomain(row: ServiceRow): Result<Service, Failure> {
    const urlResult = Url.of(row.url);
    if (urlResult.isErr()) return err(urlResult.error);
    const intervalResult = Interval.of(row.check_interval_secs);
    if (intervalResult.isErr()) return err(intervalResult.error);

    return ok({
      id: row.id,
      name: row.name,
      url: urlResult.value,
      checkInterval: intervalResult.value,
      groupName: row.group_name,
      tags: row.tags ?? [],
      expectedStatusCode: row.expected_status_code,
      timeoutMs: row.timeout_ms,
      status: row.status as ServiceStatus,
      lastCheckAt: row.last_check_at,
      lastCheckStatus: row.last_check_status as CheckStatus,
      silencedUntil: row.silenced_until,
      createdAt: row.created_at,
    });
  },
};

export const CheckResultMapper = {
  toDomain(row: CheckResultRow): Result<CheckResult, Failure> {
    let latency: Latency | null = null;
    if (row.latency_ms !== null) {
      const l = Latency.of(row.latency_ms);
      if (l.isErr()) return err(l.error);
      latency = l.value;
    }
    return ok({
      id: row.id,
      serviceId: row.service_id,
      status: row.status as CheckStatus,
      statusCode: row.status_code,
      latency,
      error: row.error,
      checkedAt: row.checked_at,
    });
  },
};

export const AlertMapper = {
  toDomain(row: AlertRow): Alert {
    return {
      id: row.id,
      serviceId: row.service_id,
      serviceName: row.service_name,
      severity: row.severity as AlertSeverity,
      message: row.message,
      triggeredAt: row.triggered_at,
      acknowledgedAt: row.acknowledged_at,
      acknowledgedBy: row.acknowledged_by,
    };
  },
};

/** Collects a list of row→domain results, short-circuiting on the first error. */
export function mapAll<R, T>(rows: R[], fn: (row: R) => Result<T, Failure>): Result<T[], Failure> {
  const out: T[] = [];
  for (const row of rows) {
    const mapped = fn(row);
    if (mapped.isErr()) return err(mapped.error);
    out.push(mapped.value);
  }
  return ok(out);
}
