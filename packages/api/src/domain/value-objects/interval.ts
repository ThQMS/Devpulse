import { Result, ok, err } from 'neverthrow';
import { Failure, validation } from '../failures/failures.js';

const MIN_SECONDS = 10;
const MAX_SECONDS = 86_400; // 24h

/** Polling interval for a health check, expressed in seconds. */
export class Interval {
  private constructor(private readonly seconds: number) {}

  static of(seconds: number): Result<Interval, Failure> {
    if (!Number.isInteger(seconds)) {
      return err(validation('Interval must be an integer number of seconds', 'checkInterval'));
    }
    if (seconds < MIN_SECONDS || seconds > MAX_SECONDS) {
      return err(
        validation(
          `Interval must be between ${MIN_SECONDS} and ${MAX_SECONDS} seconds`,
          'checkInterval',
        ),
      );
    }
    return ok(new Interval(seconds));
  }

  getValue(): number {
    return this.seconds;
  }

  toMs(): number {
    return this.seconds * 1000;
  }

  equals(other: Interval): boolean {
    return this.seconds === other.seconds;
  }
}
