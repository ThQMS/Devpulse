import { Result } from 'neverthrow';
import { Alert } from '../entities/alert.js';
import { Failure } from '../failures/failures.js';

export interface IAlertRepository {
  save(alert: Alert): Promise<Result<void, Failure>>;
  findAll(limit?: number): Promise<Result<Alert[], Failure>>;
  /** Unacknowledged alerts (acknowledged_at IS NULL), newest first. */
  findOpen(): Promise<Result<Alert[], Failure>>;
  findByServiceId(serviceId: string): Promise<Result<Alert[], Failure>>;
  findById(id: string): Promise<Result<Alert | null, Failure>>;
  /** Acknowledges an alert and returns the updated row. */
  acknowledge(id: string, by: string): Promise<Result<Alert, Failure>>;
  /** Whether the service already has an unacknowledged alert. */
  hasOpenAlert(serviceId: string): Promise<Result<boolean, Failure>>;
}
