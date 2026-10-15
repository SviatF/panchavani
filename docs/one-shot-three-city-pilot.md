# PANCHAVANI — three-city one-shot DeepSeek + future SEO release plan

## What is included in the code (not evidence of live AI completion)

- Pilot cities: **Delhi, Mumbai, Chennai**. NO automatic expansion to 10/25 cities.
- One DeepSeek attempt per (city ID, India-local date, intent, language), regardless of
  concurrent requests, prompt version, model changes or website visits.
- Admin GET /ai remains behind native Cloudflare Access verified user identity.
  POST /ai/draft still validates same-origin browser signals and a stored, SHA-verified
  UNAPPROVED JPL research candidate in private D1/R2.
- Apply private D1 `admin/migrations/0004_one_shot_editorial.sql` once after 0001–0003.
  A missing table fails **before** a billable provider request.
- In the first POST, D1 atomically inserts status=reserved; only its winner may
  call DeepSeek. Successful output is SHA-linked to R2 and marked stored.
  Subsequent POSTs read exactly the same stored result at **zero model calls**.
- Timeout, response validation error, R2 failure or an interrupted request
  LOCKS the slot. No automatic paid retry (a provider timeout may still bill).
  Human recovery needs a future audited manual workflow; never delete slots
  automatically just to regenerate.
- A change in astronomical source hash returns a stale-source hold, NOT a
  second generation. Corrections demand manual scientific/editorial review.
- Output guidance: around **120–200 words TOTAL**, including metadata and FAQ;
  compact input and max 850 output tokens. This is a target, not guaranteed by
  the model. Uses DeepSeek server-side only. The API key is never exposed.
- Current cap remains 3 newly created drafts per editor per 24 hours. This
  is NOT a hard global billing threshold under multiple different editors,
  so enable only controlled pilot traffic and account-level DeepSeek limits.
- Draft data is tagged AI_DRAFT_UNAPPROVED with mandatory scientific, local
  ritual and human editorial blockers. No AI text asserts verified
  recommendations unless a future evidence-backed rule pack authorizes them.

## Critical missing live prerequisite

The deployed GitHub research queue runner has returned HTTP 403 on
`/internal/runner/claim`; the JPL nightly workflow runs separately but its
GitHub Actions artifacts are NOT written to private Cloudflare D1/R2.
Thus, this PR cannot by itself provide three authentic DeepSeek samples:
there is not yet a proven private candidate-ingestion path. We do NOT
fabricate city-specific claims, clone a DeepSeek secret to GitHub, bypass
Cloudflare Access, or pretend an API call occurred.

To inspect three **real** model outputs, after a legitimate candidate-ingestion
route passes authentication, queue and complete one candidate each for Delhi,
Mumbai and Chennai; then POST /ai/draft for daily-panchang/en once each.
Repeat a request to verify the cached copy without another model call.
Inspect private D1 editorial_one_shot (three stored rows), R2 SHA-256,
and DeepSeek usage/billing. Do not enable cron before that review.
Cloudflare active Admin Worker must be deployed explicitly; GitHub QA
does not deploy it. Apply migration BEFORE deploying this Worker version.

## Existing research vs site publishing

The GitHub nightly JPL/Skyfield calculation covers 25 cities and two days,
but those are RESEARCH_ONLY. DeepSeek drafts are not fact approval.
The Next.js static website currently has global `noindex`, illustrative
homepage values and zero scientifically/editorially approved city-day URLs.

- `app/sitemap.ts` outputs an **approved-only empty sitemap** while the
  approval register is empty. `app/robots.ts` advertises the sitemap.
  Crawlers can see `noindex` on HTML; we do not globally block with robots.
- Proposed release architecture, NOT live pages:
  /panchang/{city}/, /panchang/{city}/{yyyy-mm-dd}/,
  /calendar/{city}/{yyyy}/{mm}/, /festivals/{festival}/{year}/,
  /vrat/{observance}/{city}/{year}/, /muhurat/{type}/,
  /regional/{state}/ and evergreen /learn/{topic}/.
- Index a small set of evidence-complete city hub pages first; date pages
  only after location, timezone, Lahiri/Ayanamsa, transition, regional
  and editorial reviews. All future sitemaps must share the SAME signed
  release manifest as rendered HTML metadata and canonicals.
- Keep current 25-city nightly research independent from Cloudflare admin
  and DeepSeek spending. Data arrival alone never makes URLs indexable.
- Expanding the pilot to 10 cities is a separate gated rollout after
  three genuine private samples are inspected and approved.

## Operational rollback

Leave `AUTO_RESEARCH_ENABLED=false`,
`AUTO_EDITORIAL_ENABLED=false`, and
`PANCHAVANI_RESEARCH_AUTORUN=false` until the Access 403 and ingestion
are fixed, D1 migration verified, and three trial drafts inspected.
Never expose unapproved text to public SEO routes.
