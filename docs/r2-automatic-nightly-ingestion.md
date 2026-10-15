# PANCHAVANI — private nightly JPL delivery through an isolated R2 inbox

## Dataflow
GitHub Actions computes the existing 25-city x 2-day research and verifies every shard. After successful coverage checks, the opt-in step uploads original candidate JSON files to a NEW private R2 bucket, panchavani-automation-inbox, then uploads a completion manifest LAST. The private Admin Worker scheduled handler checks names, hashes, NASA/JPL DE440s, city/day identity, research status and source conventions, then imports up to 20 candidates per hourly run into existing private CANDIDATES R2 and D1. The table automated_research_import_slots provides a fail-closed one-per-city/day reservation.

This path never contacts admin.panchavani.com from GitHub. It does not weaken Cloudflare Access, create any public ingest endpoint or invoke DeepSeek. No public page or SEO approval occurs.

## One-time activation (not yet performed)
1. Create a private R2 bucket named panchavani-automation-inbox (not the public or original private candidate bucket). Set suitable private retention, at least two weeks during rollout.
2. Create an R2 API token restricted to THIS inbox bucket, with Object Read & Write for HEAD/PUT. Never use your account-global token. Store it in GitHub Actions secrets PANCHAVANI_R2_ACCOUNT_ID, PANCHAVANI_R2_ACCESS_KEY_ID, PANCHAVANI_R2_SECRET_ACCESS_KEY.
3. Apply the new migration admin/migrations/0006_automated_research_import.sql ONCE to the existing private D1 panchavani-private. Back up existing D1 first.
4. Deploy the private panchavani-admin Worker using admin/wrangler.jsonc, now with INGEST_INBOX binding to the new bucket. Keep existing Cloudflare Access and ALLOWED_ADMIN_EMAILS intact. Do not add an R2 inbox binding to the public site.
5. Set GitHub Actions variable PANCHAVANI_R2_INGEST_ENABLED=true only when the R2 credentials exist. Set Admin Worker variable AUTO_RESEARCH_IMPORT_ENABLED=true only after migration and the Worker binding deploy are confirmed.
6. Check /api/status automation.nightlyIngestion and review imported data in Access-only /research/daily. The 50 city-days arrive over approximately three hourly Cron runs, if no conflicts occur.
7. Keep AUTO_EDITORIAL_ENABLED, public publishing and public indexing disabled until separately requested and verified.

## Safety boundaries
- JPL checksum and per-object SHA are checked before ingestion. Separate bucket credentials reduce blast radius. The completion manifest is uploaded after all objects.
- Existing divergent research records are not overwritten. Failed or reserved partial imports stay locked for operator review, not silently retried.
- Current Nakshatra, Yoga, geographic stations and regional ritual rule packs are not independently approved. New 0006 only imports RESEARCH candidates.
- No claims are made that the bucket, secrets, Worker deploy or D1 migration were created here. They require one-time setup and an actual production smoke test.
