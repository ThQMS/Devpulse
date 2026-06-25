import { PgServiceRepository } from './infrastructure/repositories/pg-service-repository.js';
import { PgCheckResultRepository } from './infrastructure/repositories/pg-check-result-repository.js';
import { PgAlertRepository } from './infrastructure/repositories/pg-alert-repository.js';
import { HttpProber } from './infrastructure/prober/http-prober.js';
import { WsBroadcaster } from './infrastructure/websocket/ws-broadcaster.js';
import { Scheduler } from './infrastructure/worker/scheduler.js';

import { CreateServiceUseCase } from './application/use-cases/create-service.use-case.js';
import { UpdateServiceUseCase } from './application/use-cases/update-service.use-case.js';
import { DeleteServiceUseCase } from './application/use-cases/delete-service.use-case.js';
import { GetServicesUseCase } from './application/use-cases/get-services.use-case.js';
import { GetServiceDetailUseCase } from './application/use-cases/get-service-detail.use-case.js';
import { RunHealthCheckUseCase } from './application/use-cases/run-health-check.use-case.js';
import { GetServiceHistoryUseCase } from './application/use-cases/get-service-history.use-case.js';
import { AcknowledgeAlertUseCase } from './application/use-cases/acknowledge-alert.use-case.js';
import { SilenceServiceUseCase } from './application/use-cases/silence-service.use-case.js';
import { ResumeServiceUseCase } from './application/use-cases/resume-service.use-case.js';
import { PurgeOldChecksUseCase } from './application/use-cases/purge-old-checks.use-case.js';

/**
 * Composition root. Wires concrete adapters to use cases once and exposes them
 * to the presentation layer and the worker. Keeping this in one place means the
 * inner layers never reference infrastructure directly.
 */
export class Container {
  readonly serviceRepo = new PgServiceRepository();
  readonly checkRepo = new PgCheckResultRepository();
  readonly alertRepo = new PgAlertRepository();
  readonly prober = new HttpProber();
  readonly broadcaster = new WsBroadcaster();
  readonly scheduler = new Scheduler();

  readonly createService = new CreateServiceUseCase(
    this.serviceRepo,
    this.scheduler,
    this.broadcaster,
  );
  readonly updateService = new UpdateServiceUseCase(this.serviceRepo, this.broadcaster);
  readonly deleteService = new DeleteServiceUseCase(this.serviceRepo, this.scheduler);
  readonly getServices = new GetServicesUseCase(this.serviceRepo, this.checkRepo);
  readonly getServiceDetail = new GetServiceDetailUseCase(this.serviceRepo, this.checkRepo);
  readonly getServiceHistory = new GetServiceHistoryUseCase(this.serviceRepo, this.checkRepo);
  readonly acknowledgeAlert = new AcknowledgeAlertUseCase(this.alertRepo, this.broadcaster);
  readonly silenceService = new SilenceServiceUseCase(
    this.serviceRepo,
    this.scheduler,
    this.broadcaster,
  );
  readonly resumeService = new ResumeServiceUseCase(
    this.serviceRepo,
    this.scheduler,
    this.broadcaster,
  );
  readonly purgeOldChecks = new PurgeOldChecksUseCase(this.checkRepo);
  readonly runHealthCheck = new RunHealthCheckUseCase(
    this.serviceRepo,
    this.checkRepo,
    this.alertRepo,
    this.prober,
    this.broadcaster,
  );

  /** Number of running worker processes; set by `main` once started. */
  workerCount = 0;
}

export type AppContainer = Container;
