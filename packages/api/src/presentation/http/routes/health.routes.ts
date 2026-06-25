import { FastifyInstance } from 'fastify';
import { AppContainer } from '../../../container.js';
import { Database } from '../../../infrastructure/database/connection.js';

export function registerHealthRoutes(app: FastifyInstance, c: AppContainer): void {
  // Liveness + dependency health. Public (no API key required).
  app.get('/health', async (_req, reply) => {
    const db = await pingDb();
    const redis = await c.scheduler.ping();
    const status = db && redis ? 'ok' : 'degraded';

    return reply.status(status === 'ok' ? 200 : 503).send({
      status,
      db,
      redis,
      workers: c.workerCount,
      wsClients: c.broadcaster.getConnectedCount(),
    });
  });
}

async function pingDb(): Promise<boolean> {
  try {
    await Database.get().query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
