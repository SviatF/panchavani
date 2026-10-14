-- 0003: Idempotent autonomous research scheduling and private AI draft attempts.
-- No publication rights. Apply AFTER migrations 0001 and 0002.
CREATE TABLE IF NOT EXISTS autonomous_research_slots (
  city_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  job_id TEXT UNIQUE NOT NULL REFERENCES job_requests(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (city_id,local_date)
);
CREATE INDEX IF NOT EXISTS idx_autonomous_research_created ON autonomous_research_slots(created_at DESC);
CREATE TABLE IF NOT EXISTS autonomous_ai_slots (
  job_id TEXT NOT NULL REFERENCES job_requests(id),
  intent TEXT NOT NULL CHECK (intent='daily-panchang'),
  language TEXT NOT NULL CHECK (language='en'),
  prompt_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing','stored','failed')),
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(job_id,intent,language,prompt_version)
);
CREATE INDEX IF NOT EXISTS idx_autonomous_ai_created ON autonomous_ai_slots(created_at DESC);
