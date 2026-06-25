import { CheckResult } from '../entities/check-result.js';
import { UptimePercentage } from '../value-objects/uptime-percentage.js';

export interface HistoryPoint {
  /** Start of the time bucket (ISO-8601). */
  timestamp: string;
  uptimePercentage: number;
  avgLatencyMs: number | null;
}

const HOUR_MS = 3600 * 1000;

/**
 * Pure domain service: derives uptime and a windowed history series from a set
 * of check results. Stateless and side-effect free, so it's trivially testable.
 */
export const UptimeCalculator = {
  /** Uptime over the last `windowHours`. Returns 100% when there are no checks. */
  calculate(results: readonly CheckResult[], windowHours: number): UptimePercentage {
    const cutoff = Date.now() - windowHours * HOUR_MS;
    const inWindow = results.filter((r) => r.checkedAt.getTime() >= cutoff);
    if (inWindow.length === 0) {
      return UptimePercentage.of(100)._unsafeUnwrap();
    }
    const up = inWindow.filter((r) => r.status === 'up').length;
    return UptimePercentage.of((up / inWindow.length) * 100)._unsafeUnwrap();
  },

  /**
   * Splits `windowHours` into `points` equal buckets and computes uptime and
   * average latency for each, oldest first — ready for a trend chart.
   */
  getWindowedHistory(
    results: readonly CheckResult[],
    points: number,
    windowHours: number,
  ): HistoryPoint[] {
    const now = Date.now();
    const windowMs = windowHours * HOUR_MS;
    const bucketMs = windowMs / points;
    const start = now - windowMs;

    const out: HistoryPoint[] = [];
    for (let i = 0; i < points; i += 1) {
      const bucketStart = start + i * bucketMs;
      const bucketEnd = bucketStart + bucketMs;
      const bucket = results.filter((r) => {
        const t = r.checkedAt.getTime();
        return t >= bucketStart && t < bucketEnd;
      });

      const up = bucket.filter((r) => r.status === 'up').length;
      const uptime = bucket.length === 0 ? 100 : (up / bucket.length) * 100;

      const latencies = bucket
        .map((r) => r.latency?.getValue())
        .filter((ms): ms is number => typeof ms === 'number');
      const avgLatencyMs =
        latencies.length > 0
          ? Math.round(latencies.reduce((sum, ms) => sum + ms, 0) / latencies.length)
          : null;

      out.push({
        timestamp: new Date(bucketStart).toISOString(),
        uptimePercentage: Math.round(uptime * 100) / 100,
        avgLatencyMs,
      });
    }
    return out;
  },
};
