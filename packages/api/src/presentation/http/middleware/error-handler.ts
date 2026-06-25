import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { Failure, failureToStatusCode } from '../../../domain/failures/failures.js';
import { logger } from '../../../infrastructure/logger.js';

/** Serialises a domain Failure into the standard error envelope + status. */
export function sendFailure(reply: FastifyReply, failure: Failure): FastifyReply {
  const field = failure._tag === 'Validation' ? failure.field : undefined;
  return reply.status(failureToStatusCode(failure)).send({
    error: { tag: failure._tag, message: failure.message, field },
  });
}

/** Global Fastify error handler for thrown/unexpected errors. */
export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof ZodError) {
    reply.status(400).send({
      error: {
        kind: 'ValidationError',
        message: 'Request validation failed',
        details: error.flatten(),
      },
    });
    return;
  }

  if (error.validation) {
    reply.status(400).send({
      error: { kind: 'ValidationError', message: error.message, details: error.validation },
    });
    return;
  }

  logger.error({ err: error, url: request.url }, 'unhandled request error');
  reply.status(error.statusCode ?? 500).send({
    error: { kind: 'InternalError', message: 'An unexpected error occurred' },
  });
}
