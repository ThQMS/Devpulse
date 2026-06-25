import { describe, it, expect } from 'vitest';
import { Interval } from '../../domain/value-objects/interval.js';

describe('Interval', () => {
  it('aceita 60 segundos', () => {
    expect(Interval.of(60).isOk()).toBe(true);
  });

  it('rejeita abaixo de 10 segundos', () => {
    expect(Interval.of(5).isErr()).toBe(true);
  });

  it('rejeita acima de 86400 segundos', () => {
    expect(Interval.of(86_401).isErr()).toBe(true);
  });

  it('converte para ms corretamente', () => {
    expect(Interval.of(60)._unsafeUnwrap().toMs()).toBe(60_000);
  });
});
