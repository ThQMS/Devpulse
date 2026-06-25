import { Result, ok, err } from 'neverthrow';
import { IServiceRepository } from '../../domain/repositories/service-repository.interface.js';
import { Service } from '../../domain/entities/service.js';
import { Failure, notFound, validation } from '../../domain/failures/failures.js';
import { IServiceScheduler, IEventBroadcaster } from '../ports.js';

export class SilenceServiceUseCase {
  constructor(
    private readonly services: IServiceRepository,
    private readonly scheduler: IServiceScheduler,
    private readonly broadcaster: IEventBroadcaster,
  ) {}

  async execute(serviceId: string, durationMinutes: number): Promise<Result<Service, Failure>> {
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return err(validation('durationMinutes must be a positive number', 'durationMinutes'));
    }

    const found = await this.services.findById(serviceId);
    if (found.isErr()) return err(found.error);
    if (found.value === null) {
      return err(notFound('Service not found'));
    }

    const service = found.value;
    const durationMs = durationMinutes * 60 * 1000;
    service.status = 'silenced';
    service.silencedUntil = new Date(Date.now() + durationMs);

    const updated = await this.services.update(service.id, {
      status: service.status,
      silencedUntil: service.silencedUntil,
    });
    if (updated.isErr()) return err(updated.error);

    // Stop checking during the silence window, and schedule the auto-resume.
    await this.scheduler.removeService(service.id);
    await this.scheduler.scheduleResume(service.id, durationMs);

    this.broadcaster.broadcastServiceUpdated(service);
    return ok(service);
  }
}
