CREATE TABLE check_results (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  status      VARCHAR(20) NOT NULL,
  status_code INTEGER,
  latency_ms  INTEGER,
  error       TEXT,
  checked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_check_results_service_id ON check_results(service_id);
CREATE INDEX idx_check_results_checked_at ON check_results(checked_at DESC);
