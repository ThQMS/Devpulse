import { Result, ok, err } from 'neverthrow';
import { Failure, validation } from '../failures/failures.js';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * A validated HTTP(S) endpoint to be monitored. Construction is the only way to
 * obtain an instance, guaranteeing every `Url` in the domain is well formed.
 */
export class Url {
  private constructor(private readonly value: string) {}

  static of(raw: string): Result<Url, Failure> {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      return err(validation('URL must not be empty', 'url'));
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return err(validation('URL is malformed', 'url'));
    }

    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return err(validation('URL must use http or https', 'url'));
    }

    return ok(new Url(parsed.toString()));
  }

  getValue(): string {
    return this.value;
  }

  /** Hostname without protocol, e.g. `api.example.com`. */
  getDomain(): string {
    return new URL(this.value).hostname;
  }

  equals(other: Url): boolean {
    return this.value === other.value;
  }
}
