import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Database } from './connection.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

/**
 * Minimal forward-only migration runner. Applies every *.sql file in
 * `migrations/` in lexical order, tracking applied files in `_migrations`.
 */
export async function runMigrations(): Promise<void> {
  const db = Database.get();

  await db.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

  const applied = await db.query<{ name: string }>('SELECT name FROM _migrations');
  const appliedNames = new Set(applied.rows.map((r) => r.name));

  for (const file of files) {
    if (appliedNames.has(file)) continue;
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    await db.withTransaction(async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
    });
    console.log(`[migrate] applied ${file}`);
  }
}

// Allow `pnpm migrate` to run this file directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => Database.get().close())
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('[migrate] failed', e);
      process.exit(1);
    });
}
