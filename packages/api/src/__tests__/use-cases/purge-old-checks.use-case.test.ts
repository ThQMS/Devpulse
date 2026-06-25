import { describe, expect, it, vi } from 'vitest';
import { ok } from 'neverthrow';
import { PurgeOldChecksUseCase } from '../../application/use-cases/purge-old-checks.use-case.js';
import { ICheckResultRepository } from '../../domain/repositories/check-result-repository.interface.js';

function makeChecksRepo() {
  return {
    save: vi.fn(),
    findByServiceId: vi.fn(),
    findPageByServiceId: vi.fn(),
    getStats: vi.fn(),
    getStatsForServices: vi.fn(),
    rollupHourlyBefore: vi.fn().mockResolvedValue(ok(3)),
    deleteOlderThan: vi.fn().mockResolvedValue(ok(42)),
  } satisfies ICheckResultRepository;
}

describe('PurgeOldChecksUseCase', () => {
  it('rolls up old checks before deleting raw rows', async () => {
    const checks = makeChecksRepo();
    const result = await new PurgeOldChecksUseCase(checks).execute(30);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(42);
    expect(checks.rollupHourlyBefore).toHaveBeenCalledOnce();
    expect(checks.deleteOlderThan).toHaveBeenCalledOnce();
    expect(checks.rollupHourlyBefore.mock.invocationCallOrder[0]).toBeLessThan(
      checks.deleteOlderThan.mock.invocationCallOrder[0],
    );
  });
});
