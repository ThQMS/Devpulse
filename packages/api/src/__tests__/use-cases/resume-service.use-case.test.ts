import { describe, expect, it, vi } from 'vitest';
import { ok } from 'neverthrow';
import { ResumeServiceUseCase } from '../../application/use-cases/resume-service.use-case.js';
import { createService, Service } from '../../domain/entities/service.js';
import { IServiceRepository } from '../../domain/repositories/service-repository.interface.js';
import { IEventBroadcaster, IServiceScheduler } from '../../application/ports.js';

function makeService(): Service {
  const service = createService({
    name: 'API',
    url: 'https://example.com',
    checkIntervalSeconds: 60,
  })._unsafeUnwrap();
  service.status = 'silenced';
  service.silencedUntil = new Date('2026-01-01T01:00:00.000Z');
  return service;
}

function makeMocks(service: Service | null = makeService()) {
  const services = {
    findAll: vi.fn(),
    findById: vi.fn().mockResolvedValue(ok(service)),
    existsByUrlInGroup: vi.fn(),
    save: vi.fn(),
    update: vi.fn().mockResolvedValue(ok(undefined)),
    delete: vi.fn(),
  } satisfies IServiceRepository;

  const scheduler = {
    scheduleService: vi.fn().mockResolvedValue(undefined),
    removeService: vi.fn().mockResolvedValue(undefined),
    scheduleResume: vi.fn().mockResolvedValue(undefined),
  } satisfies IServiceScheduler;

  const broadcaster = {
    broadcastCheckResult: vi.fn(),
    broadcastAlert: vi.fn(),
    broadcastServiceUpdated: vi.fn(),
  } satisfies IEventBroadcaster;

  return { services, scheduler, broadcaster };
}

describe('ResumeServiceUseCase', () => {
  it('marks service active, clears silence and schedules checks', async () => {
    const mocks = makeMocks();
    const result = await new ResumeServiceUseCase(
      mocks.services,
      mocks.scheduler,
      mocks.broadcaster,
    ).execute('service-id');

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().status).toBe('active');
    expect(result._unsafeUnwrap().silencedUntil).toBeNull();
    expect(mocks.services.update).toHaveBeenCalledWith(
      result._unsafeUnwrap().id,
      expect.objectContaining({ status: 'active', silencedUntil: null }),
    );
    expect(mocks.scheduler.scheduleService).toHaveBeenCalledWith(result._unsafeUnwrap());
    expect(mocks.broadcaster.broadcastServiceUpdated).toHaveBeenCalledWith(result._unsafeUnwrap());
  });

  it('returns not found when service does not exist', async () => {
    const mocks = makeMocks(null);
    const result = await new ResumeServiceUseCase(
      mocks.services,
      mocks.scheduler,
      mocks.broadcaster,
    ).execute('missing');

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()._tag).toBe('NotFound');
    expect(mocks.services.update).not.toHaveBeenCalled();
    expect(mocks.scheduler.scheduleService).not.toHaveBeenCalled();
  });
});
