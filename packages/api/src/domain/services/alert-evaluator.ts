import { Service, isSilenced } from '../entities/service.js';
import { CheckResult } from '../entities/check-result.js';
import { Alert, createAlert } from '../entities/alert.js';

const CONSECUTIVE_FAILURES_FOR_CRITICAL = 3;
const CONSECUTIVE_SLOW_FOR_WARNING = 2;
const SLOW_LATENCY_MS = 2000;

/**
 * Pure domain service deciding whether a service's recent checks warrant a new
 * alert. It does not persist anything — callers act on the returned Alert.
 *
 * `recentResults` may be in any order; the most recent N are considered.
 */
export const AlertEvaluator = {
  shouldAlert(service: Service, recentResults: readonly CheckResult[]): Alert | null {
    if (isSilenced(service)) return null;
    if (recentResults.length < 2) return null;

    const newestFirst = [...recentResults].sort(
      (a, b) => b.checkedAt.getTime() - a.checkedAt.getTime(),
    );

    // critical: the last 3 checks were all failures
    const lastThree = newestFirst.slice(0, CONSECUTIVE_FAILURES_FOR_CRITICAL);
    if (
      lastThree.length === CONSECUTIVE_FAILURES_FOR_CRITICAL &&
      lastThree.every((r) => r.status === 'down' || r.status === 'timeout')
    ) {
      return createAlert({
        serviceId: service.id,
        serviceName: service.name,
        severity: 'critical',
        message: `${service.name} is down — ${CONSECUTIVE_FAILURES_FOR_CRITICAL} consecutive failed checks`,
      });
    }

    // warning: the last 2 checks were slow
    const lastTwo = newestFirst.slice(0, CONSECUTIVE_SLOW_FOR_WARNING);
    if (
      lastTwo.length === CONSECUTIVE_SLOW_FOR_WARNING &&
      lastTwo.every((r) => (r.latency?.getValue() ?? 0) > SLOW_LATENCY_MS)
    ) {
      return createAlert({
        serviceId: service.id,
        serviceName: service.name,
        severity: 'warning',
        message: `${service.name} is slow — latency above ${SLOW_LATENCY_MS}ms on the last ${CONSECUTIVE_SLOW_FOR_WARNING} checks`,
      });
    }

    return null;
  },
};
