import { describe, it, expect } from 'vitest';
import { createService, Service, CheckStatus } from '../../domain/entities/service.js';
import { createCheckResult, CheckResult } from '../../domain/entities/check-result.js';
import { Latency } from '../../domain/value-objects/latency.js';
import { AlertEvaluator } from '../../domain/services/alert-evaluator.js';

function makeService(silenced = false): Service {
  const service = createService({
    name: 'API',
    url: 'https://example.com',
    checkIntervalSeconds: 60,
  })._unsafeUnwrap();
  if (silenced) {
    service.status = 'silenced';
    service.silencedUntil = new Date(Date.now() + 60_000);
  }
  return service;
}

let clock = Date.now();
function check(status: CheckStatus, latencyMs?: number): CheckResult {
  clock += 1000;
  return createCheckResult({
    serviceId: 's1',
    status,
    latency: latencyMs !== undefined ? Latency.of(latencyMs)._unsafeUnwrap() : null,
    checkedAt: new Date(clock),
  });
}

describe('AlertEvaluator.shouldAlert', () => {
  it('retorna null para serviço silenciado', () => {
    const s = makeService(true);
    expect(AlertEvaluator.shouldAlert(s, [check('down'), check('down'), check('down')])).toBeNull();
  });

  it('retorna null com menos de 2 resultados', () => {
    expect(AlertEvaluator.shouldAlert(makeService(), [check('down')])).toBeNull();
  });

  it('gera alerta critical após 3 downs consecutivos', () => {
    const alert = AlertEvaluator.shouldAlert(makeService(), [
      check('down'),
      check('timeout'),
      check('down'),
    ]);
    expect(alert?.severity).toBe('critical');
  });

  it('gera alerta warning após 2 checks lentos', () => {
    const alert = AlertEvaluator.shouldAlert(makeService(), [check('up', 2500), check('up', 3000)]);
    expect(alert?.severity).toBe('warning');
  });

  it('retorna null se check mais recente voltou a ser up', () => {
    // newest-first the most recent is 'up', so the 3-failure rule doesn't fire
    const alert = AlertEvaluator.shouldAlert(makeService(), [
      check('down'),
      check('down'),
      check('up', 120),
    ]);
    expect(alert).toBeNull();
  });
});
