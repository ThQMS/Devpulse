import { Result } from 'neverthrow';
import { ICheckResultRepository } from '../../domain/repositories/check-result-repository.interface.js';
import { Failure } from '../../domain/failures/failures.js';

const HOURS = 24 * 60 * 60 * 1000;

/** Retention: deletes check results older than `retentionDays`. */
export class PurgeOldChecksUseCase {
  constructor(private readonly checks: ICheckResultRepository) {}

  async execute(retentionDays: number): Promise<Result<number, Failure>> {
    const cutoff = new Date(Date.now() - retentionDays * HOURS);
    const rolledUp = await this.checks.rollupHourlyBefore(cutoff);
    if (rolledUp.isErr()) return rolledUp;
    return this.checks.deleteOlderThan(cutoff);
  }
}
