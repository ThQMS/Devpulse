import { describe, it, expect } from 'vitest';
import { Url } from '../../domain/value-objects/url.js';

describe('Url', () => {
  it('aceita URL HTTP válida', () => {
    expect(Url.of('http://example.com').isOk()).toBe(true);
  });

  it('aceita URL HTTPS válida', () => {
    expect(Url.of('https://api.example.com/health').isOk()).toBe(true);
  });

  it('rejeita URL sem protocolo', () => {
    expect(Url.of('example.com').isErr()).toBe(true);
  });

  it('rejeita string vazia', () => {
    expect(Url.of('   ').isErr()).toBe(true);
  });

  it('extrai domínio corretamente', () => {
    expect(Url.of('https://api.example.com/health')._unsafeUnwrap().getDomain()).toBe(
      'api.example.com',
    );
  });
});
