import { Result, ok, err } from 'neverthrow';
import { IAlertRepository } from '../../domain/repositories/alert-repository.interface.js';
import { Alert, alertToJSON } from '../../domain/entities/alert.js';
import { Failure, dbFail, notFound, conflict } from '../../domain/failures/failures.js';
import { Database } from '../database/connection.js';
import { AlertMapper, AlertRow, mapAll } from './mappers.js';

export class PgAlertRepository implements IAlertRepository {
  constructor(private readonly db: Database = Database.get()) {}

  async save(alert: Alert): Promise<Result<void, Failure>> {
    try {
      const j = alertToJSON(alert);
      await this.db.query(
        `INSERT INTO alerts
           (id, service_id, service_name, severity, message, triggered_at,
            acknowledged_at, acknowledged_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          j.id,
          j.serviceId,
          j.serviceName,
          j.severity,
          j.message,
          j.triggeredAt,
          j.acknowledgedAt,
          j.acknowledgedBy,
        ],
      );
      return ok(undefined);
    } catch (e) {
      return err(toDbFailure('save alert', e));
    }
  }

  async findAll(limit = 100): Promise<Result<Alert[], Failure>> {
    try {
      const res = await this.db.query<AlertRow>(
        'SELECT * FROM alerts ORDER BY triggered_at DESC LIMIT $1',
        [limit],
      );
      return mapAll(res.rows, (row) => ok(AlertMapper.toDomain(row)));
    } catch (e) {
      return err(toDbFailure('findAll alerts', e));
    }
  }

  async findOpen(): Promise<Result<Alert[], Failure>> {
    try {
      const res = await this.db.query<AlertRow>(
        'SELECT * FROM alerts WHERE acknowledged_at IS NULL ORDER BY triggered_at DESC',
      );
      return mapAll(res.rows, (row) => ok(AlertMapper.toDomain(row)));
    } catch (e) {
      return err(toDbFailure('find open alerts', e));
    }
  }

  async findByServiceId(serviceId: string): Promise<Result<Alert[], Failure>> {
    try {
      const res = await this.db.query<AlertRow>(
        'SELECT * FROM alerts WHERE service_id = $1 ORDER BY triggered_at DESC',
        [serviceId],
      );
      return mapAll(res.rows, (row) => ok(AlertMapper.toDomain(row)));
    } catch (e) {
      return err(toDbFailure('find alerts by service', e));
    }
  }

  async findById(id: string): Promise<Result<Alert | null, Failure>> {
    try {
      const res = await this.db.query<AlertRow>('SELECT * FROM alerts WHERE id = $1', [id]);
      return ok(res.rows[0] ? AlertMapper.toDomain(res.rows[0]) : null);
    } catch (e) {
      return err(toDbFailure('findById alert', e));
    }
  }

  async acknowledge(id: string, by: string): Promise<Result<Alert, Failure>> {
    try {
      const res = await this.db.query<AlertRow>(
        `UPDATE alerts
            SET acknowledged_at = NOW(), acknowledged_by = $2
          WHERE id = $1 AND acknowledged_at IS NULL
        RETURNING *`,
        [id, by],
      );
      if (res.rows[0]) {
        return ok(AlertMapper.toDomain(res.rows[0]));
      }
      // No row updated: either it doesn't exist or it's already acknowledged.
      const existing = await this.db.query<AlertRow>('SELECT id FROM alerts WHERE id = $1', [id]);
      return err(
        existing.rows[0] ? conflict('Alert already acknowledged') : notFound('Alert not found'),
      );
    } catch (e) {
      return err(toDbFailure('acknowledge alert', e));
    }
  }

  async hasOpenAlert(serviceId: string): Promise<Result<boolean, Failure>> {
    try {
      const res = await this.db.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM alerts WHERE service_id = $1 AND acknowledged_at IS NULL
         ) AS exists`,
        [serviceId],
      );
      return ok(res.rows[0]?.exists ?? false);
    } catch (e) {
      return err(toDbFailure('check open alert', e));
    }
  }
}

function toDbFailure(op: string, e: unknown): Failure {
  return dbFail(`Failed to ${op}: ${e instanceof Error ? e.message : String(e)}`);
}
