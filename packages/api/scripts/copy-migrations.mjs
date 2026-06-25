// Copies the SQL migration files into dist so the compiled migration runner
// (which resolves them relative to its own location) finds them at runtime.
import { cpSync, existsSync } from 'node:fs';

const src = 'src/infrastructure/database/migrations';
const dest = 'dist/infrastructure/database/migrations';

if (!existsSync(src)) {
  console.error(`[copy-migrations] source not found: ${src}`);
  process.exit(1);
}

cpSync(src, dest, { recursive: true });
console.log(`[copy-migrations] copied migrations → ${dest}`);
