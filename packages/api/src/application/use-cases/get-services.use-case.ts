import { Result, ok, err } from 'neverthrow';
import {
  IServiceRepository,
  ServiceFilters,
} from '../../domain/repositories/service-repository.interface.js';
import { ICheckResultRepository } from '../../domain/repositories/check-result-repository.interface.js';
import { Service } from '../../domain/entities/service.js';
import { Failure } from '../../domain/failures/failures.js';

const STATS_WINDOW_HOURS = 24;

export interface ServiceWithStats {
  service: Service;
  uptimePercentage24h: number;
  avgLatencyMs24h: number | null;
}

export class GetServicesUseCase {
  constructor(
    private readonly services: IServiceRepository,
    private readonly checks: ICheckResultRepository,
  ) {}

  async execute(filters?: ServiceFilters): Promise<Result<ServiceWithStats[], Failure>> {
    const servicesResult = await this.services.findAll(filters);
    if (servicesResult.isErr()) return err(servicesResult.error);
    const services = servicesResult.value;

    // Single grouped query for everyone's stats — never N+1.
    const statsResult = await this.checks.getStatsForServices(
      services.map((s) => s.id),
      STATS_WINDOW_HOURS,
    );
    if (statsResult.isErr()) return err(statsResult.error);
    const statsById = statsResult.value;

    return ok(
      services.map((service) => {
        const stats = statsById.get(service.id);
        return {
          service,
          uptimePercentage24h: stats?.uptimePercentage ?? 100,
          avgLatencyMs24h: stats?.avgLatencyMs ?? null,
        };
      }),
    );
  }
}
