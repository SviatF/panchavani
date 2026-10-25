-- Private source-locked editorial engine. Apply after 0006.
-- This database is never bound to the public Workers static site.
CREATE TABLE IF NOT EXISTS editorial_multi_intent_once (
 id TEXT PRIMARY KEY NOT NULL CHECK(length(id)=64),
 city_id TEXT NOT NULL,
 intent TEXT NOT NULL CHECK(intent IN ('daily-panchang','calendar-month','festival','vrat','muhurat')),
 topic TEXT NOT NULL,
 local_date TEXT,
 month TEXT NOT NULL,
 language TEXT NOT NULL CHECK(language IN ('en','hi')),
 source_hash TEXT NOT NULL CHECK(length(source_hash)=64),
 actor TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('reserved','stored','failed')),
 r2_key TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_editorial_multi_recent ON editorial_multi_intent_once(created_at DESC);
CREATE TABLE IF NOT EXISTS independently_reviewed_rule_sources (
 city_id TEXT NOT NULL,
 intent TEXT NOT NULL CHECK(intent IN ('festival','vrat','muhurat')),
 topic TEXT NOT NULL,
 science_hashes_sha TEXT NOT NULL CHECK(length(science_hashes_sha)=64),
 source_sha TEXT NOT NULL CHECK(length(source_sha)=64),
 r2_key TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('approved_for_draft','disabled')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(city_id,intent,topic,science_hashes_sha)
);
