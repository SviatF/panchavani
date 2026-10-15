# PANCHAVANI — three-city JPL research handoff (Access-preserving fallback)

Scope: **Delhi, Mumbai, Chennai** on one India-local civil day. Uses PINNED
NASA/JPL DE440s through Skyfield. Produces THREE authentic mathematical
research candidates, not independently approved Panchang data.

## Why this exists

The manual GitHub Runner obtained non-JSON HTTP 403 from the Cloudflare
Access/edge on `POST /internal/runner/claim`, while authenticated browser
admin access works. Rather than disable Access or add broad machine identity
permissions, this provides a one-off secure **human-admin file handoff**.
It does not grant GitHub any new authority to call the private Worker.

## One-time deployment prerequisites

1. After this PR is merged, update production **panchavani-admin** Worker to
   the matching `admin/src/index.mjs` code. GitHub QA alone is not deployment.
2. In Cloudflare D1 **panchavani-private** (NOT the public Worker),
   confirm 0001–0003 already exist. Then copy and run the single consolidated
   `admin/ops/enable-three-city-pilot.sql` script in the D1 SQL Console.
   It applies 0004+0005 in dependency order using `IF NOT EXISTS` and prints
   four readiness columns; ALL must equal 1. No existing application rows
   are altered. Do not share DB IDs, tokens or secret values. If a column
   remains 0, stop and inspect the migration error instead of attempting import.
3. Leave Cloudflare Access policies intact. Keep
   `AUTO_RESEARCH_ENABLED=false` and `AUTO_EDITORIAL_ENABLED=false`.
   This import makes no DeepSeek calls.

## One-off research handoff

1. GitHub Actions → **PANCHAVANI three-city JPL private handoff
   (manual, UNAPPROVED)** → **Run workflow → main**. Optional YYYY-MM-DD
   for India local day; blank means tomorrow in Asia/Kolkata.
2. Wait until green. Download the single workflow artifact
   `panchavani-three-city-JPL-handoff-UNAPPROVED`, unzip locally,
   and keep the resulting **JSON** unchanged.
3. Sign in to `https://admin.panchavani.com` through existing Cloudflare
   Access. Under **ONE-TIME SCIENCE IMPORT · THREE CITIES**, choose this
   exact JSON and click **Import three research candidates**.
4. First open `https://admin.panchavani.com/api/status` and check
   `pilot.schemaReady=true`, `pilot.importReady=true`, and
   `pilot.privateDraftReady=true`. If `pilot` is absent, the deployed Worker
   is still an older version; update **panchavani-admin** without changing
   Cloudflare Access. Expected upload response: `RESEARCH ONLY: 3 candidates privately stored...`
   Reimporting the same file returns `0 candidates ... 3 unchanged`.
   Different data for the same city+day is **locked** rather than overwritten.
5. Open **Private AI Editorial Drafts**; expect three completed
   `candidate` jobs with city/date. For each city request
   `daily-panchang`, language English, once. Each completed text
   is saved in R2 and locked by the `editorial_one_shot` D1 table.
   NOTE: DeepSeek is a paid provider; the implementation caps new drafts
   per editor and each city/day/type/language to one attempted request,
   including errors. Human approval is still required.

## Strongly enforced limitations

- Admin import requires **Cloudflare native verified user identity**,
  email allowlist, and same-origin browser POST; it is NOT an anonymous upload.
- The original bundle is checked against pinned JPL kernel SHA-256, every
  candidate SHA-256, consistent date, exactly three fixed cities, matching
  catalog geo-coordinates, valid transition continuity, and unapproved
  scientific status. The Worker rejects tampering *before* D1/R2 mutation.
- D1 `job_requests` and `research_candidates` use status
  `candidate` / `unapproved`; each entry also has a private R2 object
  `unapproved/{jobId}/{sha256}.json` and audit trail.
- A malformed or partial import is not retried automatically. Investigate
  any locked slot before attempting a new date.
- This is **not independent scientific validation**: geography is provisional,
  Nakshatra and Yoga still require methodological/ephemeris review; cultural
  and ritual dates remain unapproved. No model output may cite this research
  as a verified fact or recommend activities without independent evidence.
- Public site continues `noindex`, the approved release bundle stays empty,
  and `sitemap.xml` contains no research/AI pages.
- The GitHub Actions ZIP is retained only 7 days, and the bundle may be
  available to GitHub viewers with repository artifacts access. Keep it
  research-only; never include credentials or sensitive personal details.

## Recovery and full automation

The permanent path remains a properly secured machine-to-machine gateway:
diagnose Access service-token policy versus edge rejection separately.
This pilot confirms REAL candidate transfer without depending on that path.
Once the first three model drafts are reviewed, decide whether to integrate
a scoped Cloudflare Worker pulling approved GitHub artifacts, or repair the
Service Auth gateway. Do not remove the HMAC or Cloudflare Access controls.

## Validation

- `engine/tests/test_three_city_handoff.py`: strict city/date order, SHA,
  immutable unapproved statuses and clone prevention.
- `admin/tests/research-handoff.test.mjs`: tampered/forged source rejection,
  same-origin checks, idempotent 3-record D1/R2 import with zero AI calls.
- Research-engine CI: new D1 migration uniqueness + status constraints.
