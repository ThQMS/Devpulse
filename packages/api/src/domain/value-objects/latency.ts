import { Result, ok, err } from 'neverthrow';
import { Failure, validation } from '../failures/failures.js';

export type LatencyStatus = 'fast' | 'moderate' | 'slow';

const FAST_BELOW_MS = 200;
const MODERATE_BELOW_MS = 1000;

/** Response time of a single health check, in milliseconds. */
export class Latency {
  private constructor(private readonly ms: number) {}

  static of(ms: number): Result<Latency, Failure> {
    if (!Number.isFinite(ms) || ms < 0) {
      return err(validation('Latency must be a non-negative number of milliseconds', 'latency'));
    }
    return ok(new Latency(Math.round(ms)));
  }

  getValue(): number {
    return this.ms;
  }

  getStatus(): LatencyStatus {
    if (this.ms < FAST_BELOW_MS) return 'fast';
    if (this.ms < MODERATE_BELOW_MS) return 'moderate';
    return 'slow';
  }
}
