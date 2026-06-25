import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { config } from '../../config.js';
import { AppContainer } from '../../container.js';
import { errorHandler } from './middleware/error-handler.js';
import { apiKeyAuth } from './middleware/auth.middleware.js';
import { registerServiceRoutes } from './routes/services.routes.js';
import { registerAlertRoutes } from './routes/alerts.routes.js';
import { registerStatsRoutes } from './routes/stats.routes.js';
import { registerHealthRoutes } from './routes/health.routes.js';
import { registerWebSocketRoute } from './routes/ws.routes.js';

const API_PREFIX = '/api/v1';

/** Builds and configures the Fastify application (without starting to listen). */
export async function buildApp(container: AppContainer): Promise<FastifyInstance> {
  // Fastify's built-in logger is pino; pass options so it keeps the default
  // logger typing (passing a custom instance changes the generic and breaks
  // route-registrar types downstream).
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
    bodyLimit: 256 * 1024, // 256 KB — payloads here are tiny JSON
    requestTimeout: 30_000,
  });

  // Security headers. No HTML is served, so CSP adds little and only risks
  // surprises — keep the other protections, drop CSP.
  await app.register(helmet, { contentSecurityPolicy: false });
  // Basic abuse protection; health checks are exempt so probes never throttle.
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    allowList: (req) => req.url.startsWith('/health'),
  });
  await app.register(cors, { origin: [config.FRONTEND_URL], credentials: true });
  await app.register(websocket);

  app.setErrorHandler(errorHandler);
  // Global API-key guard (skips /health and /ws internally).
  app.addHook('onRequest', apiKeyAuth);

  // Public endpoints
  registerHealthRoutes(app, container);
  await app.register(async (instance) => {
    registerWebSocketRoute(instance, container);
  });

  // Versioned API
  await app.register(
    async (api) => {
      registerServiceRoutes(api, container);
      registerAlertRoutes(api, container);
      registerStatsRoutes(api, container);
    },
    { prefix: API_PREFIX },
  );

  return app;
}
