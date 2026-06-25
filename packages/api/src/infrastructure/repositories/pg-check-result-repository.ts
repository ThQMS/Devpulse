import { Result, ok, err } from 'neverthrow';
import {
  CheckResultPage,
  ICheckResultRepository,
  ServiceStats,
} from '../../domain/repositories/check-result-repository.interface.js';
import { CheckResult, checkResultToJSON } from '../../domain/entities/check-result.js';
import { Failure, dbFail } from '../../domain/failures/failures.js';
import { Database } from '../database/connection.js';
import { CheckResultMapper, CheckResultRow, mapAll } from './mappers.js';

interface StatsRow {
  total: string;
  up: string;
  avg_latency: string | null;
}

export class PgCheckResultRepository implements ICheckResultRepository {
  constructor(private readonly db: Database = Database.get()) {}

  async save(result: CheckResult): Promise<Result<void, Failure>> {
    try {
      const j = checkResultToJSON(result);
      await this.db.query(
        `INSERT INTO check_results
           (id, service_id, status, status_code, latency_ms, error, checked_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [j.id, j.serviceId, j.status, j.statusCode, j.latencyMs, j.error, j.checkedAt],
      );
      return ok(undefined);
    } catch (e) {
      return err(toDbFailure('save check result', e));
    }
  }

  async findByServiceId(
    serviceId: string,
    limit: number,
    windowHours?: number,
  ): Promise<Result<CheckResult[], Failure>> {
    try {
      const params: unknown[] = [serviceId];
      let sql = 'SELECT * FROM check_results WHERE service_id = $1';
      if (windowHours !== undefined) {
        params.push(windowHours);
        sql += ` AND checked_at >= NOW() - ($${params.length} * INTERVAL '1 hour')`;
      }
      params.push(limit);
      sql += ` ORDER BY checked_at DESC LIMIT $${params.length}`;
      const res = await this.db.query<CheckResultRow>(sql, params);
      return mapAll(res.rows, CheckResultMapper.toDomain);
    } catch (e) {
      return err(toDbFailure('find check results', e));
    }
  }

  async findPageByServiceId(
    serviceId: string,
    limit: number,
    offset: number,
  ): Promise<Result<CheckResultPage, Failure>> {
    try {
      const [itemsRes, countRes] = await Promise.all([
        this.db.query<CheckResultRow>(
          `SELECT *
             FROM check_results
            WHERE service_id = $1
            ORDER BY checked_at DESC
            LIMIT $2 OFFSET $3`,
          [serviceId, limit, offset],
        ),
        this.db.query<{ total: string }>(
          'SELECT COUNT(*)::text AS total FROM check_results WHERE service_id = $1',
          [serviceId],
        ),
      ]);

      const mapped = mapAll(itemsRes.rows, CheckResultMapper.toDomain);
      if (mapped.isErr()) return err(mapped.error);
      return ok({
        items: mapped.value,
        total: Number(countRes.rows[0]?.total ?? 0),
        limit,
        offset,
      });
    } catch (e) {
      return err(toDbFailure('find paginated check results', e));
    }
  }

  async getStats(serviceId: string, windowHours: number): Promise<Result<ServiceStats, Failure>> {
    try {
      // Single aggregate query — cheaper and more accurate than pulling rows
      // and reducing in JS.
      const res = await this.db.query<StatsRow>(
        `SELECT
           COUNT(*)::text                                              AS total,
           SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END)::text        AS up,
           AVG(latency_ms)                                            AS avg_latency
         FROM check_results
         WHERE service_id = $1
           AND checked_at >= NOW() - ($2 * INTERVAL '1 hour')`,
        [serviceId, windowHours],
      );

      const row = res.rows[0];
      const totalChecks = Number(row?.total ?? 0);
      const upChecks = Number(row?.up ?? 0);
      const avgLatencyMs =
        row?.avg_latency !== null && row?.avg_latency !== undefined
          ? Math.round(Number(row.avg_latency))
          : null;
      const uptimePercentage =
        totalChecks > 0 ? Math.round((upChecks / totalChecks) * 10000) / 100 : 100;

      return ok({ totalChecks, upChecks, avgLatencyMs, uptimePercentage });
    } catch (e) {
      return err(toDbFailure('get check stats', e));
    }
  }

  async getStatsForServices(
    serviceIds: string[],
    windowHours: number,
  ): Promise<Result<Map<string, ServiceStats>, Failure>> {
    const out = new Map<string, ServiceStats>();
    if (serviceIds.length === 0) return ok(out);

    try {
      // One grouped query for every service — avoids an N+1 of getStats().
      const res = await this.db.query<StatsRow & { service_id: string }>(
        `SELECT
           service_id,
           COUNT(*)::text                                       AS total,
           SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END)::text AS up,
           AVG(latency_ms)                                     AS avg_latency
         FROM check_results
         WHERE service_id = ANY($1)
           AND checked_at >= NOW() - ($2 * INTERVAL '1 hour')
         GROUP BY service_id`,
        [serviceIds, windowHours],
      );

      for (const row of res.rows) {
        const totalChecks = Number(row.total ?? 0);
        const upChecks = Number(row.up ?? 0);
        out.set(row.service_id, {
          totalChecks,
          upChecks,
          avgLatencyMs: row.avg_latency !== null ? Math.round(Number(row.avg_latency)) : null,
          uptimePercentage:
            totalChecks > 0 ? Math.round((upChecks / totalChecks) * 10000) / 100 : 100,
        });
      }
      return ok(out);
    } catch (e) {
      return err(toDbFailure('get stats for services', e));
    }
  }

  async deleteOlderThan(cutoff: Date): Promise<Result<number, Failure>> {
    try {
      const res = await this.db.query('DELETE FROM check_results WHERE checked_at < $1', [cutoff]);
      return ok(res.rowCount ?? 0);
    } catch (e) {
      return err(toDbFailure('delete old check results', e));
    }
  }

  async rollupHourlyBefore(cutoff: Date): Promise<Result<number, Failure>> {
    try {
      const res = await this.db.query(
        `INSERT INTO check_result_hourly_rollups
           (service_id, bucket, total_checks, up_checks, avg_latency_ms, updated_at)
         SELECT
           service_id,
           date_trunc('hour', checked_at) AS bucket,
           COUNT(*)::int AS total_checks,
           SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END)::int AS up_checks,
           ROUND(AVG(latency_ms))::int AS avg_latency_ms,
           NOW() AS updated_at
         FROM check_results
         WHERE checked_at < $1
         GROUP BY service_id, date_trunc('hour', checked_at)
         ON CONFLICT (service_id, bucket)
         DO UPDATE SET
           total_checks = EXCLUDED.total_checks,
           up_checks = EXCLUDED.up_checks,
           avg_latency_ms = EXCLUDED.avg_latency_ms,
           updated_at = NOW()`,
        [cutoff],
      );
      return ok(res.rowCount ?? 0);
    } catch (e) {
      return err(toDbFailure('roll up old check results', e));
    }
  }
}

function toDbFailure(op: string, e: unknown): Failure {
  return dbFail(`Failed to ${op}: ${e instanceof Error ? e.message : String(e)}`);
}
