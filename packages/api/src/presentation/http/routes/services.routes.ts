import { FastifyInstance } from 'fastify';
import { AppContainer } from '../../../container.js';
import { sendFailure } from '../middleware/error-handler.js';
import { alertToJSON } from '../../../domain/entities/alert.js';
import { serviceToJSON } from '../../../domain/entities/service.js';
import { checkResultToJSON } from '../../../domain/entities/check-result.js';
import { ServiceWithStats } from '../../../application/use-cases/get-services.use-case.js';
import {
  createServiceSchema,
  updateServiceSchema,
  silenceServiceSchema,
  serviceFiltersSchema,
  idParamSchema,
  pageQuerySchema,
} from '../schemas/schemas.js';

function withStatsToJSON(item: ServiceWithStats) {
  return {
    ...serviceToJSON(item.service),
    uptimePercentage24h: item.uptimePercentage24h,
    avgLatencyMs24h: item.avgLatencyMs24h,
  };
}

export function registerServiceRoutes(app: FastifyInstance, c: AppContainer): void {
  // List services (each with 24h uptime + avg latency), optional filters
  app.get('/services', async (req, reply) => {
    const filters = serviceFiltersSchema.parse(req.query);
    const result = await c.getServices.execute(filters);
    return result.match(
      (items) => reply.send({ data: items.map(withStatsToJSON) }),
      (failure) => sendFailure(reply, failure),
    );
  });

  // Single service with full detail (24h/7d stats, recent checks, last error)
  app.get('/services/:id', async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const result = await c.getServiceDetail.execute(id);
    return result.match(
      (d) =>
        reply.send({
          data: {
            ...serviceToJSON(d.service),
            uptimePercentage24h: d.uptimePercentage24h,
            uptimePercentage7d: d.uptimePercentage7d,
            avgLatencyMs24h: d.avgLatencyMs24h,
            totalChecks24h: d.totalChecks24h,
            lastError: d.lastError,
            recentChecks: d.recentChecks.map(checkResultToJSON),
          },
        }),
      (failure) => sendFailure(reply, failure),
    );
  });

  // Paginated check history for a service
  app.get('/services/:id/checks', async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const { limit, offset } = pageQuerySchema.parse(req.query);
    const result = await c.checkRepo.findPageByServiceId(id, limit, offset);
    return result.match(
      (page) =>
        reply.send({
          data: {
            ...page,
            items: page.items.map(checkResultToJSON),
          },
        }),
      (failure) => sendFailure(reply, failure),
    );
  });

  // Alert history for a service
  app.get('/services/:id/alerts', async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const result = await c.alertRepo.findByServiceId(id);
    return result.match(
      (alerts) => reply.send({ data: alerts.map(alertToJSON) }),
      (failure) => sendFailure(reply, failure),
    );
  });

  // Create
  app.post('/services', async (req, reply) => {
    const body = createServiceSchema.parse(req.body);
    const result = await c.createService.execute(body);
    return result.match(
      (service) => reply.status(201).send({ data: serviceToJSON(service) }),
      (failure) => sendFailure(reply, failure),
    );
  });

  // Update allowed fields
  app.put('/services/:id', async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const body = updateServiceSchema.parse(req.body);
    const result = await c.updateService.execute(id, body);
    return result.match(
      (service) => reply.send({ data: serviceToJSON(service) }),
      (failure) => sendFailure(reply, failure),
    );
  });

  // Delete
  app.delete('/services/:id', async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const result = await c.deleteService.execute(id);
    return result.match(
      () => reply.status(204).send(),
      (failure) => sendFailure(reply, failure),
    );
  });

  // On-demand check ("Check now")
  app.post('/services/:id/check-now', async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const result = await c.runHealthCheck.execute(id);
    return result.match(
      (outcome) => reply.send({ data: checkResultToJSON(outcome.result) }),
      (failure) => sendFailure(reply, failure),
    );
  });

  // Silence for a duration
  app.post('/services/:id/silence', async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const body = silenceServiceSchema.parse(req.body);
    const result = await c.silenceService.execute(id, body.durationMinutes);
    return result.match(
      (service) => reply.send({ data: serviceToJSON(service) }),
      (failure) => sendFailure(reply, failure),
    );
  });

  // Resume a silenced service
  app.post('/services/:id/resume', async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const result = await c.resumeService.execute(id);
    return result.match(
      (service) => reply.send({ data: serviceToJSON(service) }),
      (failure) => sendFailure(reply, failure),
    );
  });
}
