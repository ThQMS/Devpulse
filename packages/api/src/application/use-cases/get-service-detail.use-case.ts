import { Result, ok, err } from 'neverthrow';
import { IServiceRepository } from '../../domain/repositories/service-repository.interface.js';
import { ICheckResultRepository } from '../../domain/repositories/check-result-repository.interface.js';
import { Service } from '../../domain/entities/service.js';
import { CheckResult } from '../../domain/entities/check-result.js';
import { Failure, notFound } from '../../domain/failures/failures.js';

const DAY_HOURS = 24;
const WEEK_HOURS = 24 * 7;
const RECENT_LIMIT = 20;

export interface ServiceDetail {
  service: Service;
  uptimePercentage24h: number;
  uptimePercentage7d: number;
  avgLatencyMs24h: number | null;
  totalChecks24h: number;
  lastError: string | null;
  recentChecks: CheckResult[];
}

export class GetServiceDetailUseCase {
  constructor(
    private readonly services: IServiceRepository,
    private readonly checks: ICheckResultRepository,
  ) {}

  async execute(id: string): Promise<Result<ServiceDetail, Failure>> {
    const found = await this.services.findById(id);
    if (found.isErr()) return err(found.error);
    if (found.value === null) return err(notFound('Service not found'));

    const stats24 = await this.checks.getStats(id, DAY_HOURS);
    if (stats24.isErr()) return err(stats24.error);

    const stats7 = await this.checks.getStats(id, WEEK_HOURS);
    if (stats7.isErr()) return err(stats7.error);

    const recent = await this.checks.findByServiceId(id, RECENT_LIMIT);
    if (recent.isErr()) return err(recent.error);

    const lastError = recent.value.find((c) => c.error !== null)?.error ?? null;

    return ok({
      service: found.value,
      uptimePercentage24h: stats24.value.uptimePercentage,
      uptimePercentage7d: stats7.value.uptimePercentage,
      avgLatencyMs24h: stats24.value.avgLatencyMs,
      totalChecks24h: stats24.value.totalChecks,
      lastError,
      recentChecks: recent.value,
    });
  }
}
