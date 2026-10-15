-- Idempotent, private-only nightly Github -> R2 -> D1 ingestion ledger.
-- Apply after 0005. Research stays unapproved; never creates public routes.
CREATE TABLE IF NOT EXISTS automated_research_import_slots (
 city_id TEXT NOT NULL,
 local_date TEXT NOT NULL,
 run_id TEXT NOT NULL,
 content_hash TEXT NOT NULL CHECK(length(content_hash)=64),
 job_id TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('reserved','stored','failed')),
 error_code TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(city_id, local_date)
);
CREATE INDEX IF NOT EXISTS idx_auto_import_created ON automated_research_import_slots(created_at DESC);
