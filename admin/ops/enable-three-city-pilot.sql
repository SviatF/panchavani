-- PANCHAVANI private D1: one-step, idempotent three-city pilot setup.
-- Paste only into Cloudflare D1 > panchavani-private > Console.
-- These are exact 0004 + 0005 original migrations, in dependency order.
-- No DELETE / DROP / UPDATE / INSERT of existing application data.
-- Use ONLY after 0001/0002/0003. Run once; re-running is safe.

-- BEGIN migration 0004
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
-- END migration 0004

-- BEGIN migration 0005
-- Private D1 only; apply AFTER 0001–0004. No publication permissions.
-- Atomic city/day import reservation. Interrupted imports stay locked.
CREATE TABLE IF NOT EXISTS private_research_handoff_slots (
 city_id TEXT NOT NULL,
 local_date TEXT NOT NULL,
 job_id TEXT UNIQUE NOT NULL REFERENCES job_requests(id),
 candidate_sha256 TEXT NOT NULL CHECK(length(candidate_sha256)=64),
 status TEXT NOT NULL CHECK(status IN ('reserved','stored','failed')),
 imported_by TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(city_id,local_date)
);
CREATE INDEX IF NOT EXISTS idx_private_handoff_state
 ON private_research_handoff_slots(status,created_at);
-- END migration 0005

-- Human-readable migration result: every column must be 1.
SELECT
  (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='job_requests') AS jobs_ready,
  (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='research_candidates') AS candidates_ready,
  (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='editorial_one_shot') AS one_shot_ready,
  (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='private_research_handoff_slots') AS handoff_ready;
