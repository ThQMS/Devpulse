import { describe, expect, it, vi } from 'vitest';
import { ok } from 'neverthrow';
import { RunHealthCheckUseCase } from '../../application/use-cases/run-health-check.use-case.js';
import { createCheckResult } from '../../domain/entities/check-result.js';
import { createService, Service } from '../../domain/entities/service.js';
import { Latency } from '../../domain/value-objects/latency.js';
import { IHttpProber, IEventBroadcaster } from '../../application/ports.js';
import { IServiceRepository } from '../../domain/repositories/service-repository.interface.js';
import { ICheckResultRepository } from '../../domain/repositories/check-result-repository.interface.js';
import { IAlertRepository } from '../../domain/repositories/alert-repository.interface.js';

function makeService(): Service {
  return createService({
    name: 'API',
    url: 'https://example.com',
    checkIntervalSeconds: 60,
  })._unsafeUnwrap();
}

function makeMocks(service: Service = makeService()) {
  const checks = {
    save: vi.fn().mockResolvedValue(ok(undefined)),
    findByServiceId: vi.fn().mockResolvedValue(ok([])),
    findPageByServiceId: vi.fn(),
    getStats: vi.fn(),
    getStatsForServices: vi.fn(),
    rollupHourlyBefore: vi.fn(),
    deleteOlderThan: vi.fn(),
  } satisfies ICheckResultRepository;

  const services = {
    findAll: vi.fn(),
    findById: vi.fn().mockResolvedValue(ok(service)),
    existsByUrlInGroup: vi.fn(),
    save: vi.fn(),
    update: vi.fn().mockResolvedValue(ok(undefined)),
    delete: vi.fn(),
  } satisfies IServiceRepository;

  const alerts = {
    save: vi.fn().mockResolvedValue(ok(undefined)),
    findAll: vi.fn(),
    findOpen: vi.fn(),
    findByServiceId: vi.fn(),
    findById: vi.fn(),
    acknowledge: vi.fn(),
    hasOpenAlert: vi.fn().mockResolvedValue(ok(false)),
  } satisfies IAlertRepository;

  const prober = {
    probe: vi.fn().mockResolvedValue(
      ok({
        ok: true,
        timedOut: false,
        statusCode: 200,
        latency: Latency.of(123)._unsafeUnwrap(),
      }),
    ),
  } satisfies IHttpProber;

  const broadcaster = {
    broadcastCheckResult: vi.fn(),
    broadcastAlert: vi.fn(),
    broadcastServiceUpdated: vi.fn(),
  } satisfies IEventBroadcaster;

  return { services, checks, alerts, prober, broadcaster };
}

describe('RunHealthCheckUseCase', () => {
  it('persists successful probe and broadcasts check and service update', async () => {
    const mocks = makeMocks();
    const result = await new RunHealthCheckUseCase(
      mocks.services,
      mocks.checks,
      mocks.alerts,
      mocks.prober,
      mocks.broadcaster,
    ).execute('service-id');

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().result.status).toBe('up');
    expect(mocks.checks.save).toHaveBeenCalledOnce();
    expect(mocks.services.update).toHaveBeenCalledWith(
      result._unsafeUnwrap().result.serviceId,
      expect.objectContaining({ lastCheckStatus: 'up' }),
    );
    expect(mocks.broadcaster.broadcastCheckResult).toHaveBeenCalledOnce();
    expect(mocks.broadcaster.broadcastServiceUpdated).toHaveBeenCalledOnce();
    expect(mocks.broadcaster.broadcastAlert).not.toHaveBeenCalled();
  });

  it('raises one alert for three consecutive failures', async () => {
    const service = makeService();
    const mocks = makeMocks(service);
    const previous = [1, 2].map((minutesAgo) =>
      createCheckResult({
        serviceId: service.id,
        status: 'down',
        checkedAt: new Date(Date.now() - minutesAgo * 60_000),
      }),
    );
    mocks.prober.probe.mockResolvedValueOnce(
      ok({
        ok: false,
        timedOut: false,
        statusCode: 500,
        latency: Latency.of(50)._unsafeUnwrap(),
        error: 'HTTP 500',
      }),
    );
    mocks.checks.findByServiceId.mockImplementation(async () => {
      const saved = mocks.checks.save.mock.calls[0]?.[0];
      return ok(saved ? [saved, ...previous] : previous);
    });

    const result = await new RunHealthCheckUseCase(
      mocks.services,
      mocks.checks,
      mocks.alerts,
      mocks.prober,
      mocks.broadcaster,
    ).execute(service.id);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().raisedAlert?.severity).toBe('critical');
    expect(mocks.alerts.hasOpenAlert).toHaveBeenCalledWith(service.id);
    expect(mocks.alerts.save).toHaveBeenCalledOnce();
    expect(mocks.broadcaster.broadcastAlert).toHaveBeenCalledOnce();
  });

  it('does not duplicate alert when an open alert already exists', async () => {
    const service = makeService();
    const mocks = makeMocks(service);
    mocks.alerts.hasOpenAlert.mockResolvedValueOnce(ok(true));
    mocks.prober.probe.mockResolvedValueOnce(
      ok({
        ok: false,
        timedOut: true,
        statusCode: null,
        latency: null,
        error: 'Timeout',
      }),
    );
    mocks.checks.findByServiceId.mockResolvedValueOnce(
      ok([
        createCheckResult({ serviceId: service.id, status: 'timeout' }),
        createCheckResult({ serviceId: service.id, status: 'down' }),
        createCheckResult({ serviceId: service.id, status: 'down' }),
      ]),
    );

    const result = await new RunHealthCheckUseCase(
      mocks.services,
      mocks.checks,
      mocks.alerts,
      mocks.prober,
      mocks.broadcaster,
    ).execute(service.id);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().raisedAlert).toBeNull();
    expect(mocks.alerts.save).not.toHaveBeenCalled();
    expect(mocks.broadcaster.broadcastAlert).not.toHaveBeenCalled();
  });
});
