CREATE TABLE alerts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id       UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  service_name     VARCHAR(200) NOT NULL,
  severity         VARCHAR(20) NOT NULL,
  message          TEXT NOT NULL,
  triggered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at  TIMESTAMPTZ,
  acknowledged_by  VARCHAR(200),
  CONSTRAINT chk_severity CHECK (severity IN ('warning','critical'))
);
CREATE INDEX idx_alerts_service_id   ON alerts(service_id);
CREATE INDEX idx_alerts_triggered_at ON alerts(triggered_at DESC);
