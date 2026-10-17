# Wave 7 — First complete six-limb science evidence, NO public approval

**Scope:** Delhi, Mumbai and Chennai, local calendar dates 16 and 17 October 2026.

## Exactly what we implemented

- Real NASA/JPL DE440s calculation, exact ephemeris SHA-256 checked first.
- Six *astronomical/lunar calendar fields active at local sunrise*: Tithi, Karana, Nakshatra, Yoga, Vara and Paksha.
- Four **complete sunrise-to-following-sunrise interval timelines**: Tithi (12°), Karana (6°), Nakshatra and Yoga (360°/27) with exact UTC boundary instants. Visible true IST dates may spill into the next Gregorian calendar day.
- Validated numerical angular roots: <=2.0 arcsec residual after solving (a numerical QA threshold, NOT absolute physical-model error), 30-minute vs 11-minute bracketing difference <=1 second, segment continuity, 27/30/60 ordinal progression, shared geocentric event instant between cities, Tithi/Karana common boundaries <=1 second, same-local-city dawn-to-dawn identity, distinct local sunrise.
- A separate, date-pinned official 16 October PAC *central station* clock comparator run on the same pinned JPL kernel. Its clock is minute-rounded, source transcription still not independently reviewed, and **its central station is not one of the three cities**.
- A new authenticated private forensic JSON route to inspect stored D1 candidate versus actual R2 source variants, with exact SHA checks and field differences, no automatic winner or overwrite.

## What this does NOT prove

- **Numerical root accuracy is not independent scientific accuracy.** The two sample grids both use the same JPL input and the same provisional Lahiri epoch model.
- The current fixed inertial epoch anchor is not proven equivalent to the official Indian Astronomical Ephemeris (IAE)/Lahiri calculation. Swiss Ephemeris itself notes model precession/nutation and IAE version dependence. Independent astronomical program/method is still needed for reproducible cross-epoch reference.
- The catalog's city coordinates and elevations are still approximate and require location-specific review; observing-station horizons, solar refraction and tzdb versions are not fully calibrated. Do not treat a nearby GeoNames gazetteer center as a verified observing site.
- The old SHA conflict cases for 2026-10-16 in private D1/R2 **remain OPEN** until an authorized scientific user can inspect and disposition the real production data. A freshly generated candidate hash from canonical JSON is NOT the original first-wins stored bytes' SHA; different serialization alone may affect SHA.
- No ritual calendar traditions / festival dates / Muhurat are approved by these raw astronomy results.
- Source and editorial reviewer signatures are absent. No pages are approved, no sitemap entries generated, no global noindex changes, and no AI is allowed to treat preliminary facts as truth.

## How to inspect research outputs

CI action: \`Wave 7 full six-limb JPL science evidence (NO INDEXING)\`.

Download the action artifact named \`panchavani-wave7-complete-six-limb-science-UNAPPROVED\`. It includes:
1. \`wave7-six-limb-three-city-UNAPPROVED.json\`: six original/recomputed JPL research candidates with full **provisional** phase timelines and numerical evidence.
2. \`wave7-pac-central-UNREVIEWED.json\`: source-attributed official PAC values and actual deltas.

Run locally only with the correctly downloaded, checksum-verified DE440s kernel. No network fallbacks and no overwrite of existing output.

### Live private D1/R2 conflict procedure

Once the updated private Admin Worker is actually deployed behind verified Cloudflare Access, an authorized user may visit:

- \`https://admin.panchavani.com/research/conflicts?city=delhi&date=2026-10-16&format=json\`
- \`https://admin.panchavani.com/research/conflicts?city=mumbai&date=2026-10-16&format=json\`
- \`https://admin.panchavani.com/research/conflicts?city=chennai&date=2026-10-16&format=json\`

Each report discloses actual D1 SHA, checked source R2 SHA, exact differing fields and possible unexplained byte-only conflicts. It is Access-only, read-only, no-store, noindex. A reviewer records a real disposition outside this read-only endpoint. An unresolved difference **must not** be deleted, silently patched, relabeled as approved, or automatically merged.

Code existing in the GitHub repo does **not** imply this endpoint has been deployed to Cloudflare production. If it is not available, verify the admin Worker deployment/version; do not assume no conflicts because the endpoint is absent.

## Gates until first indexable page

1. Independent calibration of Lahiri and matched-method PAC astronomy across more than one season and boundary.
2. Officially sourced pilot city observer points, elevations, horizon/refraction rules, exact timezone database version.
3. Actual private conflict JSON evidence and signed resolution for all selected city-date candidates.
4. Approved data fact packet signed for that exact source SHA, fully reviewed regional rules if making ritual claims.
5. Original city-specific content written from **approved** astronomy, with corroborated local sources and human editor signoff.
6. Per-URL SEO indexability whitelist and production Googlebot/Cloudflare smoke tests; never globally un-noindex unfinished pages.

Government PAC: https://packolkata.imd.gov.in/panchang/
Swiss Ephemeris methodological discussion: https://www.astro.com/swisseph/swisseph.htm
NASA/JPL DE440s: https://ssd.jpl.nasa.gov/doc/de440_de441.html

**Disposition today: RESEARCH IN PROGRESS. Scientific approval = NO. Indexing = NO.**
