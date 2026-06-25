import { z } from 'zod';

const DEFAULT_API_KEY = 'troque-em-producao';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().url().or(z.string().startsWith('postgresql://')),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    API_KEY: z.string().min(1).default(DEFAULT_API_KEY),
    FRONTEND_URL: z.string().default('http://localhost:5173'),
    PORT: z.coerce.number().int().positive().default(3001),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    RETENTION_DAYS: z.coerce.number().int().positive().max(3650).default(30),
  })
  .superRefine((cfg, ctx) => {
    // Never boot production with the placeholder secret.
    if (cfg.NODE_ENV === 'production' && cfg.API_KEY === DEFAULT_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['API_KEY'],
        message: 'API_KEY must be set to a strong secret in production',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
