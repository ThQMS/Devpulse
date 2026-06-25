-- Speeds up hasOpenAlert(serviceId): open alerts looked up per service.
CREATE INDEX idx_alerts_open_by_service
  ON alerts (service_id)
  WHERE acknowledged_at IS NULL;
