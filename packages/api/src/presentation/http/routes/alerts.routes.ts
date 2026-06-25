import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppContainer } from '../../../container.js';
import { sendFailure } from '../middleware/error-handler.js';
import { alertToJSON } from '../../../domain/entities/alert.js';
import { acknowledgeAlertSchema, idParamSchema } from '../schemas/schemas.js';

const listQuerySchema = z.object({
  status: z.enum(['open', 'all']).default('open'),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export function registerAlertRoutes(app: FastifyInstance, c: AppContainer): void {
  // List alerts — `?status=open` (default) or `?status=all` for history
  app.get('/alerts', async (req, reply) => {
    const { status, limit } = listQuerySchema.parse(req.query);
    const result =
      status === 'all' ? await c.alertRepo.findAll(limit) : await c.alertRepo.findOpen();
    return result.match(
      (alerts) => reply.send({ data: alerts.map(alertToJSON) }),
      (failure) => sendFailure(reply, failure),
    );
  });

  // Acknowledge an alert
  app.post('/alerts/:id/acknowledge', async (req, reply) => {
    const { id } = idParamSchema.parse(req.params);
    const body = acknowledgeAlertSchema.parse(req.body ?? {});
    const result = await c.acknowledgeAlert.execute(id, body.acknowledgedBy);
    return result.match(
      (alert) => reply.send({ data: alertToJSON(alert) }),
      (failure) => sendFailure(reply, failure),
    );
  });
}
