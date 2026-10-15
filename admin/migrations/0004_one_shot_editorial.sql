-- Apply once after 0001, 0002, 0003. Private D1 ONLY; never public.
-- Atomic city/day/type/language reservation: a single billable attempt,
-- including across simultaneous requests, deploys and prompt upgrades.
-- Stale or failed slots require explicit audited human intervention later;
-- there is intentionally NO automated reset/retry mechanism.
CREATE TABLE IF NOT EXISTS editorial_one_shot (
  city_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  intent TEXT NOT NULL CHECK(intent IN ('daily-panchang','city-hub','festival','vrat','muhurat')),
  language TEXT NOT NULL CHECK(language IN ('en','hi')),
  job_id TEXT NOT NULL REFERENCES job_requests(id),
  source_hash TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('reserved','stored','failed')),
  r2_key TEXT,
  content_hash TEXT,
  error_code TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(city_id,local_date,intent,language)
);
CREATE INDEX IF NOT EXISTS idx_editorial_one_shot_status ON editorial_one_shot(status,created_at);
