-- PRIVATE ONLY; do not bind to the public panchavani assets-only Worker.
CREATE TABLE IF NOT EXISTS job_requests (
  id TEXT PRIMARY KEY NOT NULL,
  city_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','candidate','blocked','failed')),
  requested_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  candidate_hash TEXT,
  error_code TEXT
);
CREATE INDEX IF NOT EXISTS idx_job_requests_recent ON job_requests(created_at DESC);
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_log_recent ON audit_log(created_at DESC);
