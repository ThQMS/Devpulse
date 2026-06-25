import { Result, ok, err } from 'neverthrow';
import { Failure, validation } from '../failures/failures.js';

export type UptimeStatus = 'healthy' | 'degraded' | 'down';

const HEALTHY_AT_OR_ABOVE = 99;
const DEGRADED_AT_OR_ABOVE = 90;

/** A percentage in the closed range [0, 100] representing service uptime. */
export class UptimePercentage {
  private constructor(private readonly value: number) {}

  static of(value: number): Result<UptimePercentage, Failure> {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      return err(validation('Uptime percentage must be between 0 and 100', 'uptime'));
    }
    return ok(new UptimePercentage(Math.round(value * 100) / 100));
  }

  getValue(): number {
    return this.value;
  }

  getStatus(): UptimeStatus {
    if (this.value >= HEALTHY_AT_OR_ABOVE) return 'healthy';
    if (this.value >= DEGRADED_AT_OR_ABOVE) return 'degraded';
    return 'down';
  }

  format(): string {
    return `${this.value.toFixed(2)}%`;
  }
}
