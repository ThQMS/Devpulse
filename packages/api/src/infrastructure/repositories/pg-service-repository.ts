import { Result, ok, err } from 'neverthrow';
import {
  IServiceRepository,
  ServiceFilters,
  ServiceUpdate,
} from '../../domain/repositories/service-repository.interface.js';
import { Service } from '../../domain/entities/service.js';
import { Failure, dbFail } from '../../domain/failures/failures.js';
import { Database } from '../database/connection.js';
import { ServiceMapper, ServiceRow, mapAll } from './mappers.js';

/** Maps `ServiceUpdate` keys to their column names for dynamic UPDATEs. */
const UPDATE_COLUMNS: Record<keyof ServiceUpdate, string> = {
  name: 'name',
  groupName: 'group_name',
  tags: 'tags',
  expectedStatusCode: 'expected_status_code',
  timeoutMs: 'timeout_ms',
  status: 'status',
  lastCheckAt: 'last_check_at',
  lastCheckStatus: 'last_check_status',
  silencedUntil: 'silenced_until',
};

export class PgServiceRepository implements IServiceRepository {
  constructor(private readonly db: Database = Database.get()) {}

  async findAll(filters?: ServiceFilters): Promise<Result<Service[], Failure>> {
    try {
      const conditions: string[] = [];
      const params: unknown[] = [];
      if (filters?.groupName) {
        params.push(filters.groupName);
        conditions.push(`group_name = $${params.length}`);
      }
      if (filters?.status) {
        params.push(filters.status);
        conditions.push(`status = $${params.length}`);
      }
      if (filters?.tag) {
        params.push(filters.tag);
        conditions.push(`$${params.length} = ANY(tags)`);
      }
      const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
      const res = await this.db.query<ServiceRow>(
        `SELECT * FROM services${where} ORDER BY created_at DESC`,
        params,
      );
      return mapAll(res.rows, ServiceMapper.toDomain);
    } catch (e) {
      return err(toDbFailure('findAll services', e));
    }
  }

  async findById(id: string): Promise<Result<Service | null, Failure>> {
    try {
      const res = await this.db.query<ServiceRow>('SELECT * FROM services WHERE id = $1', [id]);
      return res.rows[0] ? ServiceMapper.toDomain(res.rows[0]) : ok(null);
    } catch (e) {
      return err(toDbFailure('findById service', e));
    }
  }

  async existsByUrlInGroup(groupName: string, url: string): Promise<Result<boolean, Failure>> {
    try {
      const res = await this.db.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM services WHERE group_name = $1 AND url = $2
         ) AS exists`,
        [groupName, url],
      );
      return ok(res.rows[0]?.exists ?? false);
    } catch (e) {
      return err(toDbFailure('check url in group', e));
    }
  }

  async save(service: Service): Promise<Result<void, Failure>> {
    try {
      await this.db.query(
        `INSERT INTO services
           (id, name, url, check_interval_secs, group_name, tags, expected_status_code,
            timeout_ms, status, last_check_at, last_check_status, silenced_until, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          service.id,
          service.name,
          service.url.getValue(),
          service.checkInterval.getValue(),
          service.groupName,
          service.tags,
          service.expectedStatusCode,
          service.timeoutMs,
          service.status,
          service.lastCheckAt,
          service.lastCheckStatus,
          service.silencedUntil,
          service.createdAt,
        ],
      );
      return ok(undefined);
    } catch (e) {
      return err(toDbFailure('save service', e));
    }
  }

  async update(id: string, updates: ServiceUpdate): Promise<Result<void, Failure>> {
    const keys = Object.keys(updates) as (keyof ServiceUpdate)[];
    if (keys.length === 0) return ok(undefined);

    try {
      const params: unknown[] = [id];
      const assignments = keys.map((key) => {
        params.push(updates[key]);
        return `${UPDATE_COLUMNS[key]} = $${params.length}`;
      });
      await this.db.query(`UPDATE services SET ${assignments.join(', ')} WHERE id = $1`, params);
      return ok(undefined);
    } catch (e) {
      return err(toDbFailure('update service', e));
    }
  }

  async delete(id: string): Promise<Result<void, Failure>> {
    try {
      await this.db.query('DELETE FROM services WHERE id = $1', [id]);
      return ok(undefined);
    } catch (e) {
      return err(toDbFailure('delete service', e));
    }
  }
}

function toDbFailure(op: string, e: unknown): Failure {
  return dbFail(`Failed to ${op}: ${e instanceof Error ? e.message : String(e)}`);
}
