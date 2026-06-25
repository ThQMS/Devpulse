import { Queue } from 'bullmq';
import IORedis, { Redis } from 'ioredis';
import { config } from '../../config.js';
import { logger } from '../logger.js';
import { Service } from '../../domain/entities/service.js';
import { IServiceScheduler } from '../../application/ports.js';

export const HEALTH_CHECK_QUEUE = 'health-checks';

/** Job kinds on the queue. Both carry only the service id; the worker re-reads
 * the current service so config changes take effect without rescheduling. */
export const JOB_CHECK = 'check';
export const JOB_RESUME = 'resume';
export const JOB_CLEANUP = 'cleanup';

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface HealthCheckJobData {
  serviceId: string;
}

/**
 * Owns the BullMQ queue and the set of repeatable health-check jobs — one per
 * scheduled service, repeating at the service's interval. Scheduling is driven
 * by explicit calls from use cases (the `IServiceScheduler` port) plus a startup
 * sync (`initFromDatabase`), rather than a polling reconcile loop.
 */
export class Scheduler implements IServiceScheduler {
  private readonly connection: Redis = new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  readonly queue = new Queue<HealthCheckJobData>(HEALTH_CHECK_QUEUE, {
    connection: this.connection,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 200,
      // Retry transient infra failures (DB/Redis) — a real "down" probe is a
      // successful job, so this never masks downtime.
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
  });

  /** serviceId → repeatable job id. */
  private readonly activeJobs = new Map<string, string>();

  async scheduleService(service: Service): Promise<void> {
    await this.queue.add(
      JOB_CHECK,
      { serviceId: service.id },
      { jobId: service.id, repeat: { every: service.checkInterval.toMs(), immediately: true } },
    );
    this.activeJobs.set(service.id, service.id);
    logger.info(
      { serviceId: service.id, everyMs: service.checkInterval.toMs() },
      'scheduled health check',
    );
  }

  async removeService(serviceId: string): Promise<void> {
    const repeatables = await this.queue.getRepeatableJobs();
    for (const job of repeatables) {
      if (job.id === serviceId) {
        await this.queue.removeRepeatableByKey(job.key);
      }
    }
    this.activeJobs.delete(serviceId);
    logger.info({ serviceId }, 'removed scheduled health check');
  }

  async scheduleResume(serviceId: string, delayMs: number): Promise<void> {
    await this.queue.add(
      JOB_RESUME,
      { serviceId },
      { jobId: `resume:${serviceId}`, delay: delayMs, removeOnComplete: true },
    );
    logger.info({ serviceId, delayMs }, 'scheduled service resume');
  }

  /** Registers the daily retention job (idempotent). */
  async scheduleCleanup(everyMs = CLEANUP_INTERVAL_MS): Promise<void> {
    await this.queue.add(
      JOB_CLEANUP,
      { serviceId: '' },
      { jobId: 'cleanup', repeat: { every: everyMs } },
    );
    logger.info({ everyMs }, 'scheduled retention cleanup');
  }

  /**
   * Reconciles the queue with the database at startup: clears every existing
   * repeatable job (avoiding duplicates across restarts) then re-schedules
   * checks for every service that should be running. A service silenced into
   * the future gets a resume job instead of a check schedule.
   */
  async initFromDatabase(services: Service[]): Promise<void> {
    const repeatables = await this.queue.getRepeatableJobs();
    for (const job of repeatables) {
      await this.queue.removeRepeatableByKey(job.key);
    }
    this.activeJobs.clear();

    const now = Date.now();
    for (const service of services) {
      if (service.status === 'paused') continue;

      const silencedAhead =
        service.status === 'silenced' &&
        service.silencedUntil !== null &&
        service.silencedUntil.getTime() > now;

      if (silencedAhead) {
        await this.scheduleResume(service.id, service.silencedUntil!.getTime() - now);
      } else {
        await this.scheduleService(service);
      }
    }
    logger.info({ scheduled: this.activeJobs.size }, 'scheduler initialised from database');
  }

  /** Liveness probe for Redis, used by the health endpoint. */
  async ping(): Promise<boolean> {
    try {
      return (await this.connection.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async stop(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
