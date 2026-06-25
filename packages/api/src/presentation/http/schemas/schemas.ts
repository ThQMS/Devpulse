import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  checkIntervalSeconds: z.number().int().min(10).max(86_400),
  groupName: z.string().min(1).max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  expectedStatusCode: z.number().int().min(100).max(599).optional(),
  timeoutMs: z.number().int().min(500).max(30_000).optional(),
});
export type CreateServiceBody = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = z
  .object({
    name: z.string().min(1).max(200),
    groupName: z.string().min(1).max(100),
    tags: z.array(z.string().max(50)).max(20),
    expectedStatusCode: z.number().int().min(100).max(599),
    timeoutMs: z.number().int().min(500).max(30_000),
  })
  .partial();
export type UpdateServiceBody = z.infer<typeof updateServiceSchema>;

export const silenceServiceSchema = z.object({
  durationMinutes: z
    .number()
    .positive()
    .max(60 * 24 * 7),
});
export type SilenceServiceBody = z.infer<typeof silenceServiceSchema>;

export const acknowledgeAlertSchema = z.object({
  acknowledgedBy: z.string().min(1).max(200).default('operator'),
});
export type AcknowledgeAlertBody = z.infer<typeof acknowledgeAlertSchema>;

export const historyQuerySchema = z.object({
  hours: z.coerce
    .number()
    .positive()
    .max(24 * 30)
    .optional(),
  points: z.coerce.number().int().positive().max(500).optional(),
  limit: z.coerce.number().int().positive().max(5000).optional(),
});
export type HistoryQueryParams = z.infer<typeof historyQuerySchema>;

export const pageQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});
export type PageQueryParams = z.infer<typeof pageQuerySchema>;

export const serviceFiltersSchema = z.object({
  groupName: z.string().min(1).max(100).optional(),
  status: z.enum(['active', 'paused', 'silenced']).optional(),
  tag: z.string().min(1).max(50).optional(),
});
export type ServiceFiltersQuery = z.infer<typeof serviceFiltersSchema>;

export const idParamSchema = z.object({ id: z.string().uuid() });
export const serviceIdParamSchema = z.object({ serviceId: z.string().uuid() });
