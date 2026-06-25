import { Result, ok, err } from 'neverthrow';
import { IServiceRepository } from '../../domain/repositories/service-repository.interface.js';
import { Failure, notFound } from '../../domain/failures/failures.js';
import { IServiceScheduler } from '../ports.js';

export class DeleteServiceUseCase {
  constructor(
    private readonly services: IServiceRepository,
    private readonly scheduler: IServiceScheduler,
  ) {}

  async execute(id: string): Promise<Result<void, Failure>> {
    const found = await this.services.findById(id);
    if (found.isErr()) return err(found.error);
    if (found.value === null) {
      return err(notFound('Service not found'));
    }

    const deleted = await this.services.delete(id);
    if (deleted.isErr()) return err(deleted.error);

    await this.scheduler.removeService(id);
    return ok(undefined);
  }
}
