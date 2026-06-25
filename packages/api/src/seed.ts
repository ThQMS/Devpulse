import { runMigrations } from './infrastructure/database/migrate.js';
import { Database } from './infrastructure/database/connection.js';
import { PgServiceRepository } from './infrastructure/repositories/pg-service-repository.js';
import { createService, CreateServiceParams } from './domain/entities/service.js';
import { logger } from './infrastructure/logger.js';

const EXAMPLES: CreateServiceParams[] = [
  { name: 'Example.com', url: 'https://example.com', checkIntervalSeconds: 60, groupName: 'web' },
  { name: 'GitHub', url: 'https://github.com', checkIntervalSeconds: 60, groupName: 'web' },
  {
    name: 'HTTPBin Status',
    url: 'https://httpbin.org/status/200',
    checkIntervalSeconds: 30,
    groupName: 'apis',
  },
  {
    name: 'JSONPlaceholder',
    url: 'https://jsonplaceholder.typicode.com/todos/1',
    checkIntervalSeconds: 120,
    groupName: 'apis',
    tags: ['demo'],
  },
  {
    name: 'Cloudflare DNS',
    url: 'https://1.1.1.1',
    checkIntervalSeconds: 45,
    groupName: 'infra',
    expectedStatusCode: 200,
  },
];

/** Inserts a handful of example services. Idempotent: skips URLs already present. */
async function seed(): Promise<void> {
  await runMigrations();
  const repo = new PgServiceRepository();

  let created = 0;
  for (const example of EXAMPLES) {
    const result = createService(example);
    if (result.isErr()) {
      logger.warn({ example: example.name, failure: result.error }, 'skipping invalid example');
      continue;
    }
    const service = result.value;

    const exists = await repo.existsByUrlInGroup(service.groupName, service.url.getValue());
    if (exists.isErr()) throw new Error(exists.error.message);
    if (exists.value) {
      logger.info({ name: service.name }, 'already seeded, skipping');
      continue;
    }

    const saved = await repo.save(service);
    if (saved.isErr()) throw new Error(saved.error.message);
    created += 1;
    logger.info({ name: service.name }, 'seeded service');
  }

  logger.info({ created }, 'seed complete');
}

seed()
  .then(() => Database.get().close())
  .then(() => process.exit(0))
  .catch((e) => {
    logger.error({ err: e }, 'seed failed');
    process.exit(1);
  });
