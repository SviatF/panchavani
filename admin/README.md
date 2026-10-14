# PANCHAVANI Private Calculation Console — pre-deployment code

A **separate Cloudflare Worker**, never deployed as "/admin" in the public assets-only SSG website. The dashboard is private by design and **locked by default**.

## Security gates implemented

1. Uses Cloudflare's **Worker-level verified identity** via `ctx.access.getIdentity()`; requires no manual JWT issuer, audience or JWKS configuration.
2. Requires the authenticated email to be an exact member of `ALLOWED_ADMIN_EMAILS`; service tokens with no verified user email do not grant dashboard access.
3. Returns `403` without `ctx.access` or an allowed email, regardless of any forged HTTP headers. Protect the **entire Worker** (All traffic, including previews and alternate domains); config has `workers_dev:false`.
4. Sets `X-Robots-Tag: noindex, nofollow, noarchive`, `Cache-Control: private, no-store`, CSP, anti-framing and same-origin-only referrer disclosure on every response. No public sitemap references.
5. Browser POST requires Cloudflare-verified Access identity AND validated same-origin browser signals. Modern browsers may omit or send `Origin: null` on basic HTML form posts; only `Sec-Fetch-Site: same-origin` may substitute for absent/null Origin. Explicit mismatched Origin, cross-site or same-site submissions are blocked. All queries use prepared statements; request values validated server-side.
6. Audit log stores the actor for all queued jobs.
7. No publishing/approval endpoint exists. Research jobs cannot become public records through this interface.

## What the admin actually does in V1

It displays current private infrastructure state, protected D1 research job queue, and status / artifact SHA of completed internal candidates. Queueing alone does not compute anything. An external Skyfield/JPL research runner can consume **one job** only after a private D1 database, private R2 bucket, Cloudflare Access service credentials, HMAC secret and GitHub Actions secrets have all been configured. This connection has **not** been provisioned or deployed. Completed candidates remain **unapproved research** with required publication blockers; the interface has no approval or release endpoint.

## Cloudflare account owner setup (NOT already performed)

- In Zero Trust: create an Access self-hosted application for `admin.panchavani.com`; require strong MFA, identity restrict to authorized people. Enable Worker Access coverage so alternate routes cannot bypass authentication.
- Create D1 database `panchavani-private` and execute `admin/migrations/0001_private_jobs.sql` against it.
- Add to **panchavani-admin Worker**, not the public Worker, a D1 binding named `DB`. Bindings can be configured via dashboard or an uncommitted local Wrangler environment-specific config. NEVER commit real credentials or sensitive IDs.
- Configure only `ALLOWED_ADMIN_EMAILS` (comma-separated permitted email addresses) in Worker → Settings → Production → Runtime variables. Do not configure `TEAM_DOMAIN` or `POLICY_AUD`: verified user identity is obtained natively from `ctx.access`. The Worker fails closed if the Access policy is disabled, identity is unavailable, or no email is allowlisted.
- From `admin/`: `npm install`, `npm run check`, then after all account controls are configured `npm run deploy`.
- Attach `admin.panchavani.com` only to the **private** Worker after verifying Access is enforced. Do not put private endpoints in Next.js SSG or on `panchavani.com`.
- `workers_dev:false` hides the normal workers.dev URL; do not assume it alone secures any preview deployment or other custom routing.

References: https://developers.cloudflare.com/workers/configuration/cloudflare-access/ ; https://developers.cloudflare.com/workers/platform/environment-variables/ ; https://developers.cloudflare.com/d1/


## Exact private runner configuration — required before real use

1. Create a **separate** Worker named `panchavani-admin`; configure a **Worker-level Cloudflare Access policy protecting production and previews**, not only the custom hostname. Include only explicitly approved admin emails with MFA and a dedicated Access **service-token policy** for the runner. Bind `admin.panchavani.com` only after access is tested. `workers_dev:false` is additional defense, not authorization.
2. Create a private Cloudflare D1 database named `panchavani-private`; bind it as `DB` in the admin Worker only. Supply the actual `database_id` in the admin Worker configuration/Dashboard. Apply migrations **in order**, `0001_private_jobs.sql` followed by `0002_private_runner.sql`. `0002` adds leases, replay nonces and private research candidate metadata.
3. Create a **PRIVATE** R2 bucket (suggested name `panchavani-research-private`, no public/custom bucket URL). Bind as `CANDIDATES` to the admin Worker; **never** bind it to the public SSG Worker. Use bucket access audit/retention policies consistent with private research data.
4. Set only `ALLOWED_ADMIN_EMAILS=<comma-separated admin emails>` for human access. Cloudflare's native `ctx.access.getIdentity()` supplies the verified email; **no `TEAM_DOMAIN` or `POLICY_AUD` needed**. Set a strong random 32+ character secret `RUNNER_HMAC_SECRET` via encrypted Cloudflare secret settings (not repository source or Wrangler vars). Access must protect the Worker at its perimeter and permit a separately scoped runner service token for the research API.
5. In GitHub Actions repository **Secrets**, add `PANCHAVANI_RUNNER_HMAC_SECRET` (same random HMAC secret), `PANCHAVANI_ACCESS_CLIENT_ID`, and `PANCHAVANI_ACCESS_CLIENT_SECRET` (Cloudflare Access service token credentials). These are NOT the human JWT. Never paste or commit values into GitHub files.
6. Deploy from `admin/` after provisioning with `npm install && npm run check && npm run deploy`. Check HTTPS and ensure unauthorized browser sessions are blocked at the Cloudflare edge and the Worker. Test `/api/status` while authenticated.
7. In GitHub Actions, manually run **Private PANCHAVANI research queue runner** once; this tests claiming one queued D1 job, downloading the pinned JPL `de440s.bsp`, checksum validation, computing a candidate, signed upload to private R2 and candidate SHA in D1. Do **not** enable recurrence until this workflow and audit logs have been reviewed. The GitHub runner requires a working `https://admin.panchavani.com`; it fails closed if secrets are missing.

Runner request signing: `HMAC-SHA256(secret, timestamp_ms + "\\n" + nonce + "\\n" + method + "\\n" + path + "\\n" + sha256(raw_json_body))`, one unique nonce per request, five-minute timestamp tolerance. Separately require Access service token at the perimeter. HMAC does not replace Access.

The candidate store accepts ONLY `status=calculated`, `blockerCount >= 1`, `ayanamsa=NOT_VALIDATED`, unverified city catalog and `approvedBy=releaseId=null`. No endpoints change these into published data. No applicant/family-specific ritual recommendation is generated. Job error states require explicit review before retry.

The admin Worker currently depends on **externally provisioned bindings**; `wrangler deploy --dry-run` can validate code but cannot prove access configuration, D1/R2 bindings, DNS, secret validity or live runtime correctness.

## Next iteration

A manual GitHub Actions research runner and signed candidate ingestion endpoint are now **implemented in code**, but not deployed or connected to your Cloudflare resources. Next: verified coordinates and Lahiri methodology, human ritual review interface, publication manifests, and fail-closed release gate. The public website continues to use preview-only values and `noindex`.

## Form POST regression (2026-10-14)

A previous `Referrer-Policy: no-referrer` combined with a mandatory nonempty `Origin` incorrectly rejected legitimate browser form POSTs with `Access denied`. The policy is now `same-origin`; `isTrustedBrowserPost` accepts absent/null Origin **only** with the browser-controlled `Sec-Fetch-Site: same-origin` header. E2E-style simulated POST tests verify D1 writes and cross-origin blocking. The admin and public Worker remain isolated; Cloudflare Access authentication is still mandatory on every route. No math results are published as part of form submissions.


## DeepSeek editorial drafts in Cloudflare Admin (14 October 2026)

An existing DEEPSEEK_API_KEY configured as a **Production Secret**
under panchavani-admin is the correct credential for this integration.
It is **not** a GitHub Actions secret; only the Cloudflare Worker
reads it server-side. Never put it into Next.js, a public frontend,
a URL, chat or source-controlled Wrangler variables.

### What the code now provides

- A private /ai page linked from the calculation dashboard. It is
  accessible only after Cloudflare Access identity verification and the
  existing ALLOWED_ADMIN_EMAILS allowlist.
- Lists **completed, stored** research candidates, not queued jobs.
  Requires D1 binding DB, private R2 binding CANDIDATES, a running
  authenticated runner and a DEEPSEEK_API_KEY Production Secret.
- /ai/draft POST accepts only same-origin authenticated browser forms,
  a candidate job UUID, one of five editorial intents and English/Hindi.
- Reads the actual candidate from private R2, verifies its SHA-256 equals
  private D1 metadata and rechecks city/date/schema/unapproved status.
  If no candidate exists, returns a clear error and DOES NOT spend tokens.
- Calls https://api.deepseek.com/chat/completions with deepseek-flash,
  disabled thinking and JSON mode. The API key travels only
  server-to-server and is never included in HTML, logs or R2.
- Returns a readable private draft preview and stores a SHA-linked
  AI_DRAFT_UNAPPROVED record under unapproved/ai-editorial/<jobId>/<uuid>.json
  in private R2. Logs draft creation under the authenticated editor in D1.
- A basic per-editor **3 draft/24h** count limits accidental costs.
  This is *not an atomic distributed quota* and must not replace
  edge rate limiting or provider spend controls in production.
- Any generated recommendation remains **unapproved**, even if it
  passes keyword/format heuristics. The source values and ritual
  conventions are still unverified. No auto-publication/approval route,
  website mutations, sitemap entries, SEO index or calendar advice.
- Content checks are heuristic and CANNOT reliably prove originality
  or detect every made-up fact. Human domain/editorial review remains
  required.

### Deploy, then verify live (NOT performed merely by a GitHub push)

1. Wait for Private calculation and admin QA to pass on the intended
   commit. wrangler deploy --dry-run cannot publish changes.
2. Deploy the **new** admin/ Worker code from main using an
   authorized Cloudflare deployment workflow or
   cd admin && npm install && npm run deploy
   with authenticated Wrangler.
3. Cloudflare > Workers & Pages > panchavani-admin > Deployments:
   verify the updated Worker version is actually **Active**.
   Confirm under Settings > Runtime variables and secrets that the
   Production DEEPSEEK_API_KEY remains present.
4. Sign in through Cloudflare Access at https://admin.panchavani.com/
   and open AI Editorial Drafts or /ai. Its status should show
   configured. If DB/CANDIDATES or completed job data are missing,
   the generation button stays disabled.
5. Queue one city/day in the calculation dashboard, run the authorized
   private research runner to store a valid R2 candidate, then generate
   ONE English research draft using /ai.
6. Confirm the private preview shows UNAPPROVED AI RESEARCH, and
   the website remains noindex. Do not publish the copy as calendar
   advice; the source inputs remain research-grade.

**Deployment is NOT performed by code commit or QA.** The present
GitHub QA tests mock the provider response and cannot prove that the
encrypted Cloudflare key is valid, has credit or is accepted by DeepSeek.
No live paid API call was made during QA.

Official API: https://api-docs.deepseek.com/api/create-chat-completion/


## Opt-in unattended research + AI drafts (2026-10-14)

The manual /ai page is NOT the autonomous producer. It shows an empty
Completed research city/date selector until the private signed runner
sends calculated candidates into the Worker D1 + R2 store.

### What is implemented (CODE ONLY until deployed and enabled)

A Cloudflare Cron scheduled handler runs at minute 05 of every UTC hour.
It is **disabled by default**. There is NO public /cron API endpoint:
only Cloudflare-internal scheduled events can invoke it.

On explicit activation:
- Determine **tomorrow's date in Asia/Kolkata**.
- Queue a bounded pilot cohort of **Delhi, Mumbai and Chennai** into
  private D1 once per city/date; cap unfinished automatic queue at 6.
- A separate signed GitHub Python/Skyfield runner is scheduled at
  **02:30 and 05:30 UTC**, behind an explicit GitHub Actions variable.
  Each successful run consumes at most 3 queued jobs and checks the
  JPL DE440s hash before submitting research candidates into private R2.
- On each Cloudflare Cron invocation, inspect D1 for the oldest
  completed candidate without a matching private AI attempt.
  Reserve a unique city/day/prompt-version slot in D1 so scheduled
  retries cannot repeatedly purchase model output for the same job.
- Generate **one English daily Panchang RESEARCH draft per tick**, up to
  3 total autonomous attempts in a rolling 24h window, under the private
  internal actor. A failed request is marked failed and is NOT blindly
  retried at cost.
- Each draft uses existing server-side DeepSeek integration, source
  candidate integrity checks and AI_DRAFT_UNAPPROVED R2 storage.
  **Zero publication / sitemap / GSC authorization**. This pilot is
  not the complete 25-city editorial content pipeline.

This is a *bounded, unattended draft workflow*, NOT a functioning
fully verified Panchang release pipeline. Human review and independent
source validation remain mandatory before ANY generated text is
used on a public indexable page.

### One-time operator activation (NEVER put secrets in GitHub code)

1. In Cloudflare D1 Console for panchavani-private, apply migrations
   admin/migrations/0001_private_jobs.sql and
   0002_private_runner.sql **only if not already applied**, then
   **new** 0003_autonomous_research.sql exactly once.
   0003 creates duplicate-protected autonomous research and AI slots.
2. Confirm R2 panchavani-research-private is PRIVATE and Worker has
   D1 binding DB and R2 binding CANDIDATES.
3. Keep existing Cloudflare Worker Production Secret DEEPSEEK_API_KEY.
   Add a second distinct **Production Secret** named
   RUNNER_HMAC_SECRET, 32+ random characters. DO NOT reuse
   DeepSeek API key as the runner HMAC secret.
4. Create a dedicated Cloudflare Access **Service Token** and permit it
   through an appropriately scoped policy for private /internal/runner/*
   requests while retaining Cloudflare Access protection over the
   entire Worker and its human email allowlist. Do not expose a
   worker.dev or public bypass.
5. Add GitHub repository **Actions Secrets**:
   PANCHAVANI_RUNNER_HMAC_SECRET (same HMAC value as Worker);
   PANCHAVANI_ACCESS_CLIENT_ID;
   PANCHAVANI_ACCESS_CLIENT_SECRET.
   These are secrets, NEVER Variables or public JS.
6. Deploy NEW admin/ Worker **after QA and migrations**.
   admin/wrangler.jsonc specifies hourly Cron Trigger at minute 05 UTC,
   and keep_vars:true. Check Production Deployments and Cron Triggers
   in Cloudflare, not only GitHub CI.
7. Test one manual queue job + GitHub private runner dispatch, confirm
   it reaches D1 status candidate and private R2. Then perform
   **one** private /ai generation and check it stays unapproved.
8. ONLY after the end-to-end run succeeds set Cloudflare **Production
   Variables** AUTO_RESEARCH_ENABLED=true and
   AUTO_EDITORIAL_ENABLED=true. Set GitHub repository **Actions Variable**
   PANCHAVANI_RESEARCH_AUTORUN=true. This activates the cron producer,
   cron DeepSeek consumer, and twice-daily Runner automatically.

IMPORTANT: GitHub secret/key setup and Cloudflare deployed binding state
cannot be inferred from screenshots displaying only the DeepSeek secret.
Never claim that unattended research is running until both scheduled
systems and real candidates/drafts are observed in D1/R2.

### Operations / safe rollback

- Cloudflare /ai displays the manual draft workshop and an
  **automation status** section including queue/draft counters.
- Set Cloudflare AUTO_EDITORIAL_ENABLED=false to immediately stop
  new paid DeepSeek calls, without affecting existing private drafts.
- Set AUTO_RESEARCH_ENABLED=false to stop new city-date task creation.
- Set GitHub PANCHAVANI_RESEARCH_AUTORUN=false to stop scheduled JPL
  research runner job execution. A manual workflow dispatch remains
  available for controlled troubleshooting.
- The cron *event* itself may still run hourly when disabled, but
  it performs **no D1/API work** when both Cloudflare flags are off.
- R2 draft content is never public; audit the D1 autonomous tables and
  audit_log. Keep provider billing alert / spend cap configured.
- The current AI quality checks are basic heuristics, not evidence of
  sufficient SEO uniqueness, mathematical or cultural correctness.
- To expand to 25 cities, first validate independent geodata, calendar
  source conventions and actual reader value, then raise workload caps
  with monitoring and reviewed cost controls. Do not blindly expand 3
  pilot cities to thousands of indexable city/day pages.

Cloudflare reference:
https://developers.cloudflare.com/workers/configuration/cron-triggers/
