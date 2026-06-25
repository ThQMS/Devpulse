import { config } from './config.js';
import { logger } from './infrastructure/logger.js';
import { Database } from './infrastructure/database/connection.js';
import { runMigrations } from './infrastructure/database/migrate.js';
import { Container } from './container.js';
import { buildApp } from './presentation/http/app.js';
import { HealthCheckWorker } from './infrastructure/worker/health-check-worker.js';

async function main(): Promise<void> {
  logger.info('starting DevPulse API');

  await runMigrations();

  const container = new Container();

  // HTTP + WebSocket server (plugins + /api/v1 routes + /ws)
  const app = await buildApp(container);

  // Background processing: worker consumes jobs, scheduler enqueues them
  const worker = new HealthCheckWorker(
    container.runHealthCheck,
    container.resumeService,
    container.purgeOldChecks,
  );
  worker.start();
  container.workerCount = 1;

  // Load services from the DB and arm the schedule before accepting traffic
  const allServices = await container.serviceRepo.findAll();
  if (allServices.isOk()) {
    await container.scheduler.initFromDatabase(allServices.value);
  } else {
    logger.error({ failure: allServices.error }, 'failed to load services for scheduling');
  }
  // initFromDatabase clears repeatables, so (re)register the retention job after.
  await container.scheduler.scheduleCleanup();

  await app.listen({ port: config.PORT, host: '0.0.0.0' });
  logger.info({ port: config.PORT }, 'HTTP server listening');

  let shuttingDown = false;
  const shutdown = async (signal: string, code = 0) => {
    if (shuttingDown) return; // ignore repeated signals
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');
    try {
      await app.close();
      await container.scheduler.stop();
      await worker.stop();
      await Database.get().close();
    } catch (e) {
      logger.error({ err: e }, 'error during shutdown');
    } finally {
      process.exit(code);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'unhandled promise rejection');
    void shutdown('unhandledRejection', 1);
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err: err.message }, 'uncaught exception');
    void shutdown('uncaughtException', 1);
  });
}

main().catch((e) => {
  logger.error({ err: e }, 'fatal error on startup');
  process.exit(1);
});
