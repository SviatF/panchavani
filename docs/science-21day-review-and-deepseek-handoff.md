# PANCHAVANI: 21 source-record science verification pilot (2026-10-26)

## Production scope

Three cities (Delhi, Mumbai, Chennai) across seven local India dates, initially 2026-10-20 through 2026-10-26.

### A. Live private source queue (existing D1 + R2)

- Access-authenticated URL: `/science/pilot-week?start=2026-10-20`
- Restricted JSON export: `/science/pilot-week.json?start=2026-10-20`
- For each of 21 unique city/dates: look up the original private D1 candidate, **recheck the exact SHA-256 against R2 bytes**, evaluate candidate internal consistency, show whether there is a real record or a missing/conflicting case.
- Research-only: the previously imported D1/R2 research candidate has Tithi/Karana and sunrise, but Nakshatra/Yoga are explicitly method-unvalidated. It must not silently masquerade as full six-limb approved astronomy.
- Independent science review and approval facts remain at zero until actual outside evidence is evaluated and accepted. This route is noindex/no-store, read-only and makes zero DeepSeek calls.

### B. Recomputed JPL six-limb 21-day candidate (NOT identical historical D1/R2 bytes)

GitHub Action `PANCHAVANI 21-city-day JPL and independent Swiss evidence (NO APPROVAL)` runs **automatically each Monday at 04:20 UTC**, using the previous seven fully completed India-local dates. A manual run accepts a specific first date, and push/PR runs exercise the fixed 2026-10-20 regression pilot:

1. Downloads pinned NASA/JPL DE440s SPK (exact SHA).
2. Recomputes all 21 full six-limb city/day records (Tithi, Karana, Nakshatra, Yoga, Vara, Paksha) with provisional PANCHAVANI sidereal conventions.
3. Verifies every solar sunrise and four-limb transition sequence, 72 cross-day boundary checks, and cross-city UTC invariants.
4. Installs Swiss **AGPL comparator in ephemeral CI only**, not either production Worker; compares 21 actual local dawns and 16 stratified physical phase boundaries (four per component).
5. Archives two immutable, checksum-able **UNAPPROVED** JSON artifacts, 30-day retention, with human-review blockers and explicit denial of signed science, paid model and public SEO release.

These are two distinct sources with distinct SHA identities. Do **not** label a fresh recomputation as confirmation of original D1/R2 R2 byte authenticity or a scientifically equivalent Lahiri setup.

## Reviewer action required to move from research to factual content

A qualified independent reviewer needs to inspect original independent source measurements/methodology against these diagnostic artifacts, agree the adopted observing point (lat/long/elevation, horizon/refraction) for each city, reconcile solar times and geocentric limb transitions with explicit tolerances and consistent definitions, resolve historical source SHA conflicts, and document which research values may safely be accepted.

The signed pack must follow the existing strict `verifySciencePack` contract. This is **not** a workflow to mint signatures automatically. Independent reviewer identity, source URLs, per-claim evidence and HMAC secret must come from an authorized science-review process; test fixtures must never become production approvals.

Only then may the private Multi-Intent editor use those approved locked facts for *one* controlled DeepSeek drafting attempt per city/date/topic within the shared daily budget. Human/editorial review remains mandatory and publication still needs a separate signed public manifest and release policy. Festivals, Vrat and Muhurat additionally require independent expert-reviewed tradition rule packs.

## Acceptance of this stage

- ✅ Real D1/R2 record availability becomes visible for 21 city/dates.
- ✅ Seven-day JPL research and Swiss independent-program numeric *differences* are artifacted with SHA digests.
- ✅ No new public URL, indexed page, scientific HMAC, billable model call or auto-publication occurs.
- ⛔ Scientific approval / city geodata / ritual date rules / paid content generation are **not** considered completed by these computational checks.
