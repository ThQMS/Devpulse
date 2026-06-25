CREATE TABLE services (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(200) NOT NULL,
  url                  VARCHAR(2000) NOT NULL,
  check_interval_secs  INTEGER NOT NULL DEFAULT 60,
  group_name           VARCHAR(100) NOT NULL DEFAULT 'default',
  tags                 TEXT[] NOT NULL DEFAULT '{}',
  expected_status_code INTEGER NOT NULL DEFAULT 200,
  timeout_ms           INTEGER NOT NULL DEFAULT 5000,
  status               VARCHAR(20) NOT NULL DEFAULT 'active',
  last_check_at        TIMESTAMPTZ,
  last_check_status    VARCHAR(20) NOT NULL DEFAULT 'unknown',
  silenced_until       TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_interval CHECK (check_interval_secs BETWEEN 10 AND 86400),
  CONSTRAINT chk_timeout  CHECK (timeout_ms BETWEEN 500 AND 30000)
);
CREATE INDEX idx_services_status ON services(status);
CREATE INDEX idx_services_group  ON services(group_name);
