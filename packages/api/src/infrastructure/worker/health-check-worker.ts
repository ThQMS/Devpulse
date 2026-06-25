import { Worker, Job } from 'bullmq';
import IORedis, { Redis } from 'ioredis';
import { config } from '../../config.js';
import { logger } from '../logger.js';
import { RunHealthCheckUseCase } from '../../application/use-cases/run-health-check.use-case.js';
import { ResumeServiceUseCase } from '../../application/use-cases/resume-service.use-case.js';
import { PurgeOldChecksUseCase } from '../../application/use-cases/purge-old-checks.use-case.js';
import { HEALTH_CHECK_QUEUE, HealthCheckJobData, JOB_RESUME, JOB_CLEANUP } from './scheduler.js';

/**
 * BullMQ worker for background jobs. It is deliberately thin: it pulls a job off
 * the queue and delegates to a use case, so orchestration lives in exactly one
 * place. Handles `check` (recurring), `resume` (one-shot) and `cleanup`
 * (retention). Concurrency is bounded so a burst of due checks doesn't exhaust
 * outbound sockets or DB connections.
 */
export class HealthCheckWorker {
  private readonly connection: Redis = new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  private worker: Worker<HealthCheckJobData> | null = null;

  constructor(
    private readonly runHealthCheck: RunHealthCheckUseCase,
    private readonly resumeService: ResumeServiceUseCase,
    private readonly purgeOldChecks: PurgeOldChecksUseCase,
    private readonly concurrency = 10,
  ) {}

  start(): void {
    this.worker = new Worker<HealthCheckJobData>(HEALTH_CHECK_QUEUE, (job) => this.dispatch(job), {
      connection: this.connection,
      concurrency: this.concurrency,
    });

    this.worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err: err.message }, 'worker job failed');
    });

    logger.info({ concurrency: this.concurrency }, 'health-check worker started');
  }

  private async dispatch(job: Job<HealthCheckJobData>): Promise<unknown> {
    if (job.name === JOB_CLEANUP) {
      const result = await this.purgeOldChecks.execute(config.RETENTION_DAYS);
      if (result.isErr()) throw new Error(result.error.message);
      logger.info({ removed: result.value }, 'retention cleanup complete');
      return { removed: result.value };
    }

    if (job.name === JOB_RESUME) {
      const result = await this.resumeService.execute(job.data.serviceId);
      if (result.isErr()) throw new Error(result.error.message);
      return { resumed: job.data.serviceId };
    }

    const result = await this.runHealthCheck.execute(job.data.serviceId);
    if (result.isErr()) {
      // Throw so BullMQ records the failure; the next scheduled run retries.
      throw new Error(result.error.message);
    }
    return result.value.result.checkedAt.toISOString();
  }

  async stop(): Promise<void> {
    await this.worker?.close();
    await this.connection.quit();
  }
}
