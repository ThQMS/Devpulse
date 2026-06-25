CREATE TABLE check_result_hourly_rollups (
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  bucket TIMESTAMPTZ NOT NULL,
  total_checks INTEGER NOT NULL,
  up_checks INTEGER NOT NULL,
  avg_latency_ms INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (service_id, bucket)
);

CREATE INDEX idx_check_rollups_bucket
  ON check_result_hourly_rollups (bucket DESC);
