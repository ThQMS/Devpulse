import { Result, ok, err } from 'neverthrow';
import { IServiceRepository } from '../../domain/repositories/service-repository.interface.js';
import { ICheckResultRepository } from '../../domain/repositories/check-result-repository.interface.js';
import { IAlertRepository } from '../../domain/repositories/alert-repository.interface.js';
import { CheckResult, createCheckResult } from '../../domain/entities/check-result.js';
import { Alert } from '../../domain/entities/alert.js';
import { applyCheck, CheckStatus } from '../../domain/entities/service.js';
import { AlertEvaluator } from '../../domain/services/alert-evaluator.js';
import { Failure, notFound } from '../../domain/failures/failures.js';
import { IHttpProber, IEventBroadcaster, ProbeOutcome } from '../ports.js';

export interface RunHealthCheckResult {
  result: CheckResult;
  raisedAlert: Alert | null;
}

// How many recent results the alert evaluator inspects per run.
const RECENT_WINDOW = 5;

/**
 * Orchestrates a single health check for a service: probe → persist result →
 * patch the service's last-check fields → evaluate alert policy → broadcast.
 */
export class RunHealthCheckUseCase {
  constructor(
    private readonly services: IServiceRepository,
    private readonly checks: ICheckResultRepository,
    private readonly alerts: IAlertRepository,
    private readonly prober: IHttpProber,
    private readonly broadcaster: IEventBroadcaster,
  ) {}

  async execute(serviceId: string): Promise<Result<RunHealthCheckResult, Failure>> {
    const serviceResult = await this.services.findById(serviceId);
    if (serviceResult.isErr()) return err(serviceResult.error);
    const service = serviceResult.value;
    if (service === null) {
      return err(notFound('Service not found'));
    }

    const probe = await this.prober.probe({
      url: service.url.getValue(),
      expectedStatusCode: service.expectedStatusCode,
      timeoutMs: service.timeoutMs,
    });

    const checkedAt = new Date();
    const outcome: ProbeOutcome = probe.match(
      (p) => p,
      (failure) => ({
        ok: false,
        timedOut: false,
        statusCode: null,
        latency: null,
        error: failure.message,
      }),
    );

    const status: CheckStatus = outcome.ok ? 'up' : outcome.timedOut ? 'timeout' : 'down';
    const checkResult = createCheckResult({
      serviceId: service.id,
      status,
      statusCode: outcome.statusCode,
      latency: outcome.latency,
      error: outcome.ok ? null : (outcome.error ?? 'Check failed'),
      checkedAt,
    });

    const savedCheck = await this.checks.save(checkResult);
    if (savedCheck.isErr()) return err(savedCheck.error);

    // patch the service's last-check snapshot (and clear an elapsed silence)
    applyCheck(service, status, checkedAt);
    const updatedService = await this.services.update(service.id, {
      status: service.status,
      lastCheckAt: service.lastCheckAt,
      lastCheckStatus: service.lastCheckStatus,
      silencedUntil: service.silencedUntil,
    });
    if (updatedService.isErr()) return err(updatedService.error);

    // evaluate alert policy against recent history (incl. this result)
    const recent = await this.checks.findByServiceId(service.id, RECENT_WINDOW);
    if (recent.isErr()) return err(recent.error);

    let raisedAlert: Alert | null = null;
    const candidate = AlertEvaluator.shouldAlert(service, recent.value);
    if (candidate !== null) {
      // Don't stack alerts: only raise if there's no open one already.
      const open = await this.alerts.hasOpenAlert(service.id);
      if (open.isErr()) return err(open.error);
      if (!open.value) {
        const saved = await this.alerts.save(candidate);
        if (saved.isErr()) return err(saved.error);
        raisedAlert = candidate;
        this.broadcaster.broadcastAlert(candidate);
      }
    }

    this.broadcaster.broadcastCheckResult(checkResult);
    this.broadcaster.broadcastServiceUpdated(service);

    return ok({ result: checkResult, raisedAlert });
  }
}
