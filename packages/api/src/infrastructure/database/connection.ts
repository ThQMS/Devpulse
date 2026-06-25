import { Pool, PoolClient, QueryResultRow } from 'pg';
import { config } from '../../config.js';
import { logger } from '../logger.js';

/**
 * Thin singleton wrapper around a pg connection pool. The rest of the
 * infrastructure layer depends on this `Database` rather than `pg` directly,
 * so connection management lives in exactly one place.
 */
export class Database {
  private static instance: Database | null = null;
  readonly pool: Pool;

  private constructor() {
    this.pool = new Pool({
      connectionString: config.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    // An error on an idle client would otherwise crash the process.
    this.pool.on('error', (err) => {
      logger.error({ err: err.message }, 'idle postgres client error');
    });
  }

  static get(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) {
    return this.pool.query<T>(text, params as never[]);
  }

  async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    Database.instance = null;
  }
}
