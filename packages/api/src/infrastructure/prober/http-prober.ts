import axios from 'axios';
import { ok } from 'neverthrow';
import { performance } from 'node:perf_hooks';
import { IHttpProber, ProbeOutcome } from '../../application/ports.js';
import { Latency } from '../../domain/value-objects/latency.js';

const DEFAULT_TIMEOUT_MS = 10_000;
// Health checks only care about reachability/latency, not the body. Cap the
// download so a giant response can't exhaust the worker's memory.
const MAX_RESPONSE_BYTES = 5_000_000;

/** Concrete prober that issues a GET request and measures wall-clock latency. */
export class HttpProber implements IHttpProber {
  async probe(input: { url: string; expectedStatusCode: number; timeoutMs?: number }) {
    const start = performance.now();
    try {
      const response = await axios.get(input.url, {
        timeout: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        // we evaluate the status ourselves, so never throw on HTTP status
        validateStatus: () => true,
        maxRedirects: 3,
        maxContentLength: MAX_RESPONSE_BYTES,
        maxBodyLength: MAX_RESPONSE_BYTES,
        headers: { 'User-Agent': 'DevPulse/1.0 health-check' },
      });
      const latency = measure(start);
      const okStatus = response.status === input.expectedStatusCode;
      const outcome: ProbeOutcome = {
        ok: okStatus,
        timedOut: false,
        statusCode: response.status,
        latency,
        error: okStatus
          ? undefined
          : `Expected status ${input.expectedStatusCode}, got ${response.status}`,
      };
      return ok(outcome);
    } catch (e) {
      const latency = measure(start);
      const timedOut =
        axios.isAxiosError(e) && (e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT');
      const message = axios.isAxiosError(e)
        ? (e.code ?? e.message)
        : e instanceof Error
          ? e.message
          : 'Unknown probe error';
      const outcome: ProbeOutcome = {
        ok: false,
        timedOut,
        statusCode: null,
        latency,
        error: message,
      };
      return ok(outcome);
    }
  }
}

function measure(start: number): Latency {
  // Latency.of only rejects negative/non-finite values; elapsed time is always
  // valid, so the fallback is purely defensive.
  return Latency.of(performance.now() - start).unwrapOr(Latency.of(0)._unsafeUnwrap());
}
