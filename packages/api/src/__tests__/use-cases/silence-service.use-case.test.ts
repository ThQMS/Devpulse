import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok } from 'neverthrow';
import { SilenceServiceUseCase } from '../../application/use-cases/silence-service.use-case.js';
import { createService, Service } from '../../domain/entities/service.js';
import { IServiceRepository } from '../../domain/repositories/service-repository.interface.js';
import { IEventBroadcaster, IServiceScheduler } from '../../application/ports.js';

function makeService(): Service {
  return createService({
    name: 'API',
    url: 'https://example.com',
    checkIntervalSeconds: 60,
  })._unsafeUnwrap();
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

describe('SilenceServiceUseCase', () => {
  let nowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    nowSpy = vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-01-01T00:00:00.000Z').getTime());
  });

  it('silences service, removes recurring check and schedules resume', async () => {
    const mocks = makeMocks();
    const result = await new SilenceServiceUseCase(
      mocks.services,
      mocks.scheduler,
      mocks.broadcaster,
    ).execute('service-id', 15);

    expect(result.isOk()).toBe(true);
    expect(mocks.services.update).toHaveBeenCalledWith(
      result._unsafeUnwrap().id,
      expect.objectContaining({ status: 'silenced' }),
    );
    expect(mocks.scheduler.removeService).toHaveBeenCalledWith(result._unsafeUnwrap().id);
    expect(mocks.scheduler.scheduleResume).toHaveBeenCalledWith(
      result._unsafeUnwrap().id,
      15 * 60 * 1000,
    );
    expect(mocks.broadcaster.broadcastServiceUpdated).toHaveBeenCalledOnce();
  });

  it('rejects invalid duration without touching dependencies', async () => {
    const mocks = makeMocks();
    const result = await new SilenceServiceUseCase(
      mocks.services,
      mocks.scheduler,
      mocks.broadcaster,
    ).execute('service-id', 0);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()._tag).toBe('Validation');
    expect(mocks.services.findById).not.toHaveBeenCalled();
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });
});
