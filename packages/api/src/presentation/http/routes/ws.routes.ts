import { FastifyInstance, FastifyRequest } from 'fastify';
import { AppContainer } from '../../../container.js';
import { config } from '../../../config.js';

const WS_POLICY_VIOLATION = 1008;

/**
 * Registers the `/ws` endpoint. Browsers can't send headers on the WS
 * handshake, so the API key is validated from the `?key=` query param and the
 * socket is closed if it's missing or wrong.
 */
export function registerWebSocketRoute(app: FastifyInstance, c: AppContainer): void {
  app.get('/ws', { websocket: true }, (socket, req: FastifyRequest) => {
    const key = (req.query as { key?: string } | undefined)?.key;
    if (key !== config.API_KEY) {
      socket.close(WS_POLICY_VIOLATION, 'Unauthorized');
      return;
    }
    c.broadcaster.addClient(socket);
  });
}
