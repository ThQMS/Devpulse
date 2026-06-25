import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ok } from 'neverthrow';
import { CreateServiceUseCase } from '../../application/use-cases/create-service.use-case.js';
import { IServiceRepository } from '../../domain/repositories/service-repository.interface.js';
import { IServiceScheduler, IEventBroadcaster } from '../../application/ports.js';

function makeMocks() {
  const services = {
    findAll: vi.fn(),
    findById: vi.fn(),
    existsByUrlInGroup: vi.fn().mockResolvedValue(ok(false)),
    save: vi.fn().mockResolvedValue(ok(undefined)),
    update: vi.fn(),
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

const validCommand = {
  name: 'API',
  url: 'https://example.com',
  checkIntervalSeconds: 60,
  groupName: 'web',
};

describe('CreateServiceUseCase', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
  });

  function useCase() {
    return new CreateServiceUseCase(mocks.services, mocks.scheduler, mocks.broadcaster);
  }

  it('cria serviço com parâmetros válidos', async () => {
    const result = await useCase().execute(validCommand);
    expect(result.isOk()).toBe(true);
    expect(mocks.services.save).toHaveBeenCalledOnce();
    expect(result._unsafeUnwrap().name).toBe('API');
  });

  it('retorna Conflict para URL duplicada no mesmo grupo', async () => {
    mocks.services.existsByUrlInGroup.mockResolvedValueOnce(ok(true));
    const result = await useCase().execute(validCommand);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()._tag).toBe('Conflict');
    expect(mocks.services.save).not.toHaveBeenCalled();
  });

  it('retorna Validation para URL inválida', async () => {
    const result = await useCase().execute({ ...validCommand, url: 'not-a-url' });
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()._tag).toBe('Validation');
  });

  it('agenda check no scheduler após criação', async () => {
    const result = await useCase().execute(validCommand);
    expect(result.isOk()).toBe(true);
    expect(mocks.scheduler.scheduleService).toHaveBeenCalledOnce();
    expect(mocks.broadcaster.broadcastServiceUpdated).toHaveBeenCalledOnce();
  });
});
