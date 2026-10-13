# PANCHAVANI — Private Calculation & Publication Architecture v1

Status: architecture approved for implementation planning; NO live calculations or admin service deployed by this document.
Owner: PANCHAVANI. Scope: city-specific Hindu Panchang, festivals, vrata/parana, and ritual muhurat.

## Non-negotiable separation

- **Public website**: current Next.js 15 SSG / Cloudflare Workers Static Assets on panchavani.com. Reads *only* versioned, approved public release artifacts. It must never calculate or fetch privileged draft or staging records from a visitor request.
- **Private admin**: a separate application / Worker on admin.panchavani.com, protected by Cloudflare Zero Trust Access **at the dedicated Worker level** to prevent bypass through alternate workers.dev/preview hostnames. Enforce role-based application authorization (administrator, astronomical QA, ritual editor, publisher). Respond with `X-Robots-Tag: noindex, nofollow, noarchive` and Cache-Control: private, no-store. Exclude from sitemap, public nav and static export. A robots.txt exclusion alone is NOT access control.
- **Compute jobs**: isolated, reproducible Python process (Skyfield/JPL is a candidate, subject to baseline validation and documented calculation conventions). Jobs are queued/triggered from admin and complete asynchronously; no CPU-heavy computation in a browser, SSG build, or HTTP request. Calculators are not assumed accurate merely because an astronomy library is accurate.
- **Data stores**: D1 for city configuration, job state, approval decisions and audit log; immutable versioned raw and evaluated JSON archives in R2 (or equivalent). The public release dataset has its own path/bucket/access boundaries, separate from drafts; no public read of privileged stores.
- **Promotion/publishing**: only a publisher-initiated, audited promotion after all hard validation gates pass can create a signed/hash-addressed public release manifest and trigger a new Next.js static export. Publish atomically; never serve half-updated times or mixed rule versions.

## Private workflow

`CITY CATALOG -> CALCULATE -> MACHINE TEST -> INDEPENDENT COMPARE -> RITUAL REVIEW (conditional) -> APPROVE -> GENERATE PUBLIC RELEASE -> BUILD -> QA PREVIEW -> PUBLISH`

- A failure, review disagreement, missing evidence, changed ephemeris, changed ruleset, stale location configuration, or ambiguous festival rule is a **hard block** on promotion.
- Do not invent or silently substitute auspicious dates when calculation fails. Show "Not yet verified for this city/tradition" and preserve the prior approved record with its explicit validity/date, or unpublish that particular result.
- Version every result with `city_id`, coordinates, elevation and horizon model, IANA timezone/tzdb revision, UTC instants, ephemeris identity/hash, ayanamsa convention, rule-set ID/hash, calculation engine version, source references, reviewer identity, and release ID.
- Preserve distinct timestamps: astronomical instant (UTC), local civil timestamp, Panchang sunrise-day attribution, plus the tradition for a festival. Don't infer one from another.
- Record calculator inputs, diagnostics, differences, and changes; immutable audit records and rollbacks must remain available.

## Computation model

1. Compute reusable geocentric solar/lunar positions and tithi, nakshatra, yoga and karana boundary instants with an explicitly pinned methodology.
2. Calculate *per city* sunrise/sunset, moonrise/moonset and location-dependent intervals using recorded latitude/longitude, elevation, location timezone and published sunrise/horizon/refraction conventions.
3. Attribute tithi/nakshatra etc. to local sunrise, retaining EVERY transition in the applicable local day. Two cities may legitimately share an astronomical transition or festival date. Never generate artificial differences for uniqueness.
4. Apply explicit calendar tradition / sect / region rule packs to lunar months, festivals, vrata, parana, marriage/griha-pravesh/vehicle/business muhurat. Distinguish conventional preliminary candidate windows from individualized rites; block unsupported variants.
5. Resolve daylight changes and boundary edge cases with IANA timezone history, not fixed UTC+05:30 assumptions for all future geographies.

## Canonical internal objects

- `city_catalog`: city_id, slug, country/state, IANA timezone, lat/lon, elevation, coordinates provenance, tradition defaults and allowed traditions, QA status.
- `astronomical_event`: event_type, UTC instant, calculation version, ephemeris and ayanamsa settings, precision and validation metadata.
- `city_day`: city_id/local_date, sunrise_utc, sunset_utc, next_sunrise_utc, events, daytime windows, panchang at sunrise, proof and verdict.
- `ritual_rule_pack`: tradition, authority/methodology citations, rule version, exceptions, reviewer and effectivity.
- `festival_observance`: festival_id, tradition, city/date, winning rule, alternatives/disputed status, start/end/parana in UTC, review evidence.
- `muhurat_candidate`: purpose, city/date, prerequisites, exclusion tests, rule ID, exact window, reviewer status; never label unreviewed intervals as recommendations.
- `release_manifest`: release_id, timestamp, accepted dataset hashes, city coverage, dates and traditions covered, QA summary, reviewer, previous release link, deploy SHA.

See `schemas/panchavani-city-day.schema.json` for a machine-readable data contract, and `docs/quality-gates.md` for release criteria.

## Security requirements

- Configure Cloudflare Access for the **entire separate admin Worker**, including alternate production/preview URLs; restrict allowed identities with MFA and least-privilege roles. A protected custom hostname alone may leave a workers.dev path exposed.
- Independently authorize **every** read/write/admin API operation; do not trust front-end buttons as permission controls.
- Use short-lived service credentials for computation uploads; secrets via Cloudflare/GitHub secret management, never commits, bundles, or logs. Restrict CORS/origin, CSRF for cookie sessions, rate-limit writes, add audit alerts.
- Never statically generate administrative pages into the public `out/`. The main website stays an assets-only Worker; do **not** add a public `app/admin/page.tsx` pretending `noindex` is authentication.
- Cloudflare Access setup, D1/R2 provisioning, authorized users, and DNS binding require a Cloudflare account admin. No such resources have been provisioned by this documentation.

## SEO/publishing principles

- Default to `noindex` on unfinished/calculation-preview public pages until all independent checks and editorial checks pass.
- Do not promise all city/date permutations are indexed. Index only durable pages with distinct utility, correct city-specific calculations, useful explanation, and meaningful navigation. Keep thin near-duplicates out of sitemap/index, consolidate or canonicalize as appropriate.
- Separate indexable evergreen teaching pages from time-sensitive pages and year/date archives. Refresh HTML and sitemap from **approved** release artifacts; no client-only replacement of stale static SEO content.
- GSC declines do not by themselves prove an algorithmic or manual penalty due to incorrect Muhurat. Diagnose Search Console Manual Actions, indexing reports, rankings, crawl, and quality separately.

## Launch rule

No real wedding/vehicle/business/griha-pravesh recommendations go live until the relevant ritual rule-pack has documented human review, exhaustive blocker tests, and city-specific approval. The original visual concept remains intact; preview values stay labeled illustrative and `noindex` until substituted with approved data.

Official background: https://developers.cloudflare.com/workers/configuration/cloudflare-access/
https://developers.cloudflare.com/workers/static-assets/
https://developers.google.com/search/docs/crawling-indexing/block-indexing
https://developers.google.com/search/docs/essentials/spam-policies
