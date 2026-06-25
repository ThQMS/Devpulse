import { FastifyInstance } from 'fastify';
import { AppContainer } from '../../../container.js';
import { sendFailure } from '../middleware/error-handler.js';
import { historyQuerySchema, serviceIdParamSchema } from '../schemas/schemas.js';

export function registerStatsRoutes(app: FastifyInstance, c: AppContainer): void {
  // Dashboard overview: totals + open alert count
  app.get('/stats/overview', async (_req, reply) => {
    const servicesResult = await c.serviceRepo.findAll();
    if (servicesResult.isErr()) return sendFailure(reply, servicesResult.error);

    const openResult = await c.alertRepo.findOpen();
    if (openResult.isErr()) return sendFailure(reply, openResult.error);

    const services = servicesResult.value;
    let up = 0;
    let down = 0;
    let silenced = 0;
    for (const s of services) {
      if (s.status === 'silenced') silenced += 1;
      if (s.lastCheckStatus === 'up') up += 1;
      if (s.lastCheckStatus === 'down' || s.lastCheckStatus === 'timeout') down += 1;
    }

    return reply.send({
      data: {
        total: services.length,
        up,
        down,
        silenced,
        openAlerts: openResult.value.length,
      },
    });
  });

  // Per-service trend: uptime % + avg latency per time bucket
  app.get('/stats/:serviceId/history', async (req, reply) => {
    const { serviceId } = serviceIdParamSchema.parse(req.params);
    const query = historyQuerySchema.parse(req.query);
    const result = await c.getServiceHistory.execute({
      serviceId,
      windowHours: query.hours,
      points: query.points,
      limit: query.limit,
    });
    return result.match(
      (points) => reply.send({ data: points }),
      (failure) => sendFailure(reply, failure),
    );
  });
}
