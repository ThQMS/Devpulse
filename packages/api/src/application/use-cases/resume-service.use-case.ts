import { Result, ok, err } from 'neverthrow';
import { IServiceRepository } from '../../domain/repositories/service-repository.interface.js';
import { Service } from '../../domain/entities/service.js';
import { Failure, notFound } from '../../domain/failures/failures.js';
import { IServiceScheduler, IEventBroadcaster } from '../ports.js';

/**
 * Resumes a silenced (or paused) service: clears the silence, flips it back to
 * active and re-arms its recurring checks. Invoked both by the auto-resume job
 * and by the `/resume` endpoint.
 */
export class ResumeServiceUseCase {
  constructor(
    private readonly services: IServiceRepository,
    private readonly scheduler: IServiceScheduler,
    private readonly broadcaster: IEventBroadcaster,
  ) {}

  async execute(serviceId: string): Promise<Result<Service, Failure>> {
    const found = await this.services.findById(serviceId);
    if (found.isErr()) return err(found.error);
    if (found.value === null) {
      return err(notFound('Service not found'));
    }

    const service = found.value;
    service.status = 'active';
    service.silencedUntil = null;

    const updated = await this.services.update(service.id, {
      status: service.status,
      silencedUntil: null,
    });
    if (updated.isErr()) return err(updated.error);

    await this.scheduler.scheduleService(service);
    this.broadcaster.broadcastServiceUpdated(service);
    return ok(service);
  }
}
