import { Result } from 'neverthrow';
import { CheckResult } from '../entities/check-result.js';
import { Failure } from '../failures/failures.js';

export interface ServiceStats {
  totalChecks: number;
  upChecks: number;
  avgLatencyMs: number | null;
  uptimePercentage: number;
}

export interface CheckResultPage {
  items: CheckResult[];
  total: number;
  limit: number;
  offset: number;
}

export interface ICheckResultRepository {
  save(result: CheckResult): Promise<Result<void, Failure>>;
  /** Recent results for a service, newest first; optionally limited to a window. */
  findByServiceId(
    serviceId: string,
    limit: number,
    windowHours?: number,
  ): Promise<Result<CheckResult[], Failure>>;
  /** Paginated results for a service, newest first. */
  findPageByServiceId(
    serviceId: string,
    limit: number,
    offset: number,
  ): Promise<Result<CheckResultPage, Failure>>;
  /** Aggregates over a time window, computed in a single SQL query. */
  getStats(serviceId: string, windowHours: number): Promise<Result<ServiceStats, Failure>>;
  /**
   * Aggregates for many services at once (single grouped query, no N+1).
   * Services with no checks in the window are absent from the map.
   */
  getStatsForServices(
    serviceIds: string[],
    windowHours: number,
  ): Promise<Result<Map<string, ServiceStats>, Failure>>;
  /** Aggregates raw checks older than `cutoff` into hourly service rollups. */
  rollupHourlyBefore(cutoff: Date): Promise<Result<number, Failure>>;
  /** Deletes checks older than `cutoff`; resolves with the number removed. */
  deleteOlderThan(cutoff: Date): Promise<Result<number, Failure>>;
}
