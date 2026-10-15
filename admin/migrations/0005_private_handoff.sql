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
