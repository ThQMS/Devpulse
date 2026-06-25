import { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../../../config.js';

// Paths reachable without an API key. `/ws` is exempt because browsers can't set
// custom headers on the WebSocket handshake.
const PUBLIC_PREFIXES = ['/health', '/ws'];

function isPublic(url: string): boolean {
  const path = url.split('?')[0];
  return PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Global guard: every route except the public ones requires a valid
 * `X-API-Key` header matching `API_KEY`. Registered as an `onRequest` hook.
 */
export async function apiKeyAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (isPublic(request.url)) return;

  const header = request.headers['x-api-key'];
  const provided = Array.isArray(header) ? header[0] : header;

  if (provided !== config.API_KEY) {
    await reply
      .status(401)
      .send({ error: { tag: 'Unauthorized', message: 'Invalid or missing X-API-Key header' } });
  }
}
