import { describe, it, expect } from 'vitest';
import { UptimeCalculator } from '../../domain/services/uptime-calculator.js';
import { createCheckResult } from '../../domain/entities/check-result.js';
import { CheckStatus } from '../../domain/entities/service.js';

function check(status: CheckStatus, hoursAgo: number) {
  return createCheckResult({
    serviceId: 's1',
    status,
    checkedAt: new Date(Date.now() - hoursAgo * 3600 * 1000),
  });
}

describe('UptimeCalculator.calculate', () => {
  it('retorna 100% quando sem resultados', () => {
    expect(UptimeCalculator.calculate([], 24).getValue()).toBe(100);
  });

  it('calcula corretamente com mix de up e down', () => {
    const results = [check('up', 1), check('up', 2), check('up', 3), check('down', 4)];
    expect(UptimeCalculator.calculate(results, 24).getValue()).toBe(75);
  });

  it('filtra resultados fora da janela de tempo', () => {
    // recent up + an old down that falls outside a 1h window → 100%
    const results = [check('up', 0), check('down', 5)];
    expect(UptimeCalculator.calculate(results, 1).getValue()).toBe(100);
  });

  it('retorna 0% quando todos são down', () => {
    const results = [check('down', 1), check('timeout', 2)];
    expect(UptimeCalculator.calculate(results, 24).getValue()).toBe(0);
  });
});
