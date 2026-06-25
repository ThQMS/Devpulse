import { Result, ok, err } from 'neverthrow';
import { IAlertRepository } from '../../domain/repositories/alert-repository.interface.js';
import { Alert } from '../../domain/entities/alert.js';
import { Failure } from '../../domain/failures/failures.js';
import { IEventBroadcaster } from '../ports.js';

export class AcknowledgeAlertUseCase {
  constructor(
    private readonly alerts: IAlertRepository,
    private readonly broadcaster: IEventBroadcaster,
  ) {}

  async execute(alertId: string, acknowledgedBy: string): Promise<Result<Alert, Failure>> {
    // The repository performs the conditional update and returns NotFound /
    // Conflict (already acknowledged) atomically.
    const acked = await this.alerts.acknowledge(alertId, acknowledgedBy);
    if (acked.isErr()) return err(acked.error);

    this.broadcaster.broadcastAlert(acked.value);
    return ok(acked.value);
  }
}
