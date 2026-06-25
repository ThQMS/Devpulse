import { Result } from 'neverthrow';
import { Service, ServiceStatus, CheckStatus } from '../entities/service.js';
import { Failure } from '../failures/failures.js';

export interface ServiceFilters {
  groupName?: string;
  status?: ServiceStatus;
  tag?: string;
}

/** Partial set of mutable fields that may be patched on a service. */
export type ServiceUpdate = Partial<{
  name: string;
  groupName: string;
  tags: string[];
  expectedStatusCode: number;
  timeoutMs: number;
  status: ServiceStatus;
  lastCheckAt: Date | null;
  lastCheckStatus: CheckStatus;
  silencedUntil: Date | null;
}>;

export interface IServiceRepository {
  findAll(filters?: ServiceFilters): Promise<Result<Service[], Failure>>;
  findById(id: string): Promise<Result<Service | null, Failure>>;
  /** Whether a service with this URL already exists in the given group. */
  existsByUrlInGroup(groupName: string, url: string): Promise<Result<boolean, Failure>>;
  save(service: Service): Promise<Result<void, Failure>>;
  update(id: string, updates: ServiceUpdate): Promise<Result<void, Failure>>;
  delete(id: string): Promise<Result<void, Failure>>;
}
