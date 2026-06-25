import { Result, ok, err } from 'neverthrow';
import {
  IServiceRepository,
  ServiceUpdate,
} from '../../domain/repositories/service-repository.interface.js';
import { Service } from '../../domain/entities/service.js';
import { Failure, notFound, validation } from '../../domain/failures/failures.js';
import { IEventBroadcaster } from '../ports.js';

/** Fields a client is allowed to patch via PUT /services/:id. */
export interface UpdateServiceCommand {
  name?: string;
  groupName?: string;
  tags?: string[];
  expectedStatusCode?: number;
  timeoutMs?: number;
}

export class UpdateServiceUseCase {
  constructor(
    private readonly services: IServiceRepository,
    private readonly broadcaster: IEventBroadcaster,
  ) {}

  async execute(id: string, cmd: UpdateServiceCommand): Promise<Result<Service, Failure>> {
    const found = await this.services.findById(id);
    if (found.isErr()) return err(found.error);
    if (found.value === null) {
      return err(notFound('Service not found'));
    }

    if (cmd.name !== undefined && cmd.name.trim().length === 0) {
      return err(validation('Service name must not be empty', 'name'));
    }

    const updates: ServiceUpdate = {
      ...(cmd.name !== undefined ? { name: cmd.name.trim() } : {}),
      ...(cmd.groupName !== undefined ? { groupName: cmd.groupName.trim() || 'default' } : {}),
      ...(cmd.tags !== undefined ? { tags: cmd.tags } : {}),
      ...(cmd.expectedStatusCode !== undefined
        ? { expectedStatusCode: cmd.expectedStatusCode }
        : {}),
      ...(cmd.timeoutMs !== undefined ? { timeoutMs: cmd.timeoutMs } : {}),
    };

    const updated = await this.services.update(id, updates);
    if (updated.isErr()) return err(updated.error);

    // Return the fresh row so the response reflects exactly what was stored.
    const refreshed = await this.services.findById(id);
    if (refreshed.isErr()) return err(refreshed.error);
    if (refreshed.value === null) return err(notFound('Service not found'));

    this.broadcaster.broadcastServiceUpdated(refreshed.value);
    return ok(refreshed.value);
  }
}
