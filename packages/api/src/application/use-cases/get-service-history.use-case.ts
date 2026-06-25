import { Result, ok, err } from 'neverthrow';
import { IServiceRepository } from '../../domain/repositories/service-repository.interface.js';
import { ICheckResultRepository } from '../../domain/repositories/check-result-repository.interface.js';
import { UptimeCalculator, HistoryPoint } from '../../domain/services/uptime-calculator.js';
import { Failure, notFound } from '../../domain/failures/failures.js';

export interface GetServiceHistoryQuery {
  serviceId: string;
  windowHours?: number;
  points?: number;
  limit?: number;
}

export class GetServiceHistoryUseCase {
  constructor(
    private readonly services: IServiceRepository,
    private readonly checks: ICheckResultRepository,
  ) {}

  /** Returns a bucketed trend (uptime + avg latency per bucket), oldest first. */
  async execute(query: GetServiceHistoryQuery): Promise<Result<HistoryPoint[], Failure>> {
    const found = await this.services.findById(query.serviceId);
    if (found.isErr()) return err(found.error);
    if (found.value === null) {
      return err(notFound('Service not found'));
    }

    const windowHours = query.windowHours ?? 24;
    const points = query.points ?? 48;

    const results = await this.checks.findByServiceId(
      query.serviceId,
      query.limit ?? 5000,
      windowHours,
    );
    if (results.isErr()) return err(results.error);

    return ok(UptimeCalculator.getWindowedHistory(results.value, points, windowHours));
  }
}
