-- Apply after 0001. Private only. Never bind to public Next.js Worker.
ALTER TABLE job_requests ADD COLUMN lease_token TEXT;
ALTER TABLE job_requests ADD COLUMN started_at TEXT;
CREATE TABLE IF NOT EXISTS runner_nonces (
 nonce TEXT PRIMARY KEY NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_runner_nonces_created ON runner_nonces(created_at);
CREATE TABLE IF NOT EXISTS research_candidates (
 id TEXT PRIMARY KEY NOT NULL,
 job_id TEXT UNIQUE NOT NULL REFERENCES job_requests(id),
 city_id TEXT NOT NULL,
 local_date TEXT NOT NULL,
 content_hash TEXT NOT NULL CHECK (length(content_hash) = 64),
 r2_key TEXT NOT NULL,
 blocker_count INTEGER NOT NULL CHECK (blocker_count >= 1),
 status TEXT NOT NULL DEFAULT 'unapproved' CHECK (status = 'unapproved'),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_research_candidates_recent ON research_candidates(created_at DESC);
