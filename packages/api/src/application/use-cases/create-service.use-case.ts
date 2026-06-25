import { Result, ok, err } from 'neverthrow';
import { IServiceRepository } from '../../domain/repositories/service-repository.interface.js';
import { Service, createService } from '../../domain/entities/service.js';
import { Failure, conflict } from '../../domain/failures/failures.js';
import { IServiceScheduler, IEventBroadcaster } from '../ports.js';

export interface CreateServiceCommand {
  name: string;
  url: string;
  checkIntervalSeconds: number;
  groupName?: string;
  tags?: string[];
  expectedStatusCode?: number;
  timeoutMs?: number;
}

export class CreateServiceUseCase {
  constructor(
    private readonly services: IServiceRepository,
    private readonly scheduler: IServiceScheduler,
    private readonly broadcaster: IEventBroadcaster,
  ) {}

  async execute(cmd: CreateServiceCommand): Promise<Result<Service, Failure>> {
    // 1. Domain validation (URL, interval, name) + normalisation.
    const serviceResult = createService(cmd);
    if (serviceResult.isErr()) return err(serviceResult.error);
    const service = serviceResult.value;

    // 2. Reject a duplicate URL within the same group.
    const exists = await this.services.existsByUrlInGroup(
      service.groupName,
      service.url.getValue(),
    );
    if (exists.isErr()) return err(exists.error);
    if (exists.value) {
      return err(conflict('A service with this URL already exists in this group'));
    }

    // 3. Persist.
    const saved = await this.services.save(service);
    if (saved.isErr()) return err(saved.error);

    // 4. Schedule recurring checks. 5. Announce. 6. Return.
    await this.scheduler.scheduleService(service);
    this.broadcaster.broadcastServiceUpdated(service);
    return ok(service);
  }
}
