# Calculation and uniqueness quality gates v1

**This policy is a future implementation contract, not proof of current accuracy.** Public prototype data remains illustrative, and the current production HTML remains `noindex`.

## Calculation correctness

### Astronomy
- Pin Skyfield/JPL ephemeris and complete timing/ayanamsa/sunrise conventions; license-verify all dependencies.
- UTC-to-local conversion from IANA timezone; test historical and future transitions; city coordinates/elevation validated against authoritative gazetteers.
- Verify boundary-finding numerics by round-trip residuals and an independent comparator using the *same* conventions. Do not tune formulas to copy one commercial calendar.
- Compare sunrise/sunset with reference material only after agreeing the event definition (upper limb, refraction, horizon and topocentric model); otherwise track as a methodology difference, not an accuracy verdict.
- Verify tithi, nakshatra, yoga, karana boundary events, exact instant, and daily sunrise attribution; every segment start < end, no gaps or overlaps within one layer, and each expected transition captured.
- Regression fixtures: same-day/double transitions, transitions near sunrise/midnight, month boundaries, adhika/kshaya masa, leap years, high latitude exceptions, DST and multiple time zones.

### Rituals
- Each rule pack carries a named region/tradition/sect, source rationale, author/reviewer, version, exceptions, and example fixtures.
- Festival and vrat observances use local sunrise/pradosh/nishita/parana etc. wherever rule-specific; human expert checks disputed/exceptional and launch-blocking cases.
- Muhurat candidates are not universal life guarantees. All exclusions must be explicit and testable. Missing rule, uncertainty, conflict or custom priest/family requirements => abstain, don't fabricate.

## Release hard gates

1. No schema errors, no missing city/date/timezone/coordinates, no impossible intervals, no untracked changed inputs.
2. 100% of blocker fixtures pass; **this does not mean scientifically guaranteed 100% accuracy.**
3. Numerics meet *pre-agreed, convention-matched* tolerances; target minute-level display (candidate thresholds: 1 minute for event transitions and 1-2 minutes for sunrise; calibrate via independent baseline before adoption).
4. Any deviation outside tolerance is investigated, documented and resolved or excluded from release; no silent override or manual timestamp patch.
5. Festival/vrat rule sets receive appropriate domain review. Wedding, Griha Pravesh, vehicle and start-business candidates require especially strict reviewer approval.
6. Approved record must be traceable to input versions, comparator fixtures and named reviewer(s).
7. Publishes are allowlisted by city, tradition, dates and feature. Unsupported combinations show unavailable, not an invented fallback.
8. All public pages and assets match the same immutable release manifest; deployment can be rolled back.

## Page uniqueness (per indexed URL)

- Unique city-day value: actual local sunrise/sunset, day interval, transition timing, ritual/festival applicability, and a time axis derived from the approved city dataset. Shared geocentric transitions must stay the same when scientifically appropriate.
- Distinct *editorial utility*, not just synonym swaps: local observance notes verified for that city/tradition, differences from a neighboring city only when true, explanations of the actual determining rules, accessible data tables and FAQ drawn from real questions.
- Do not produce pages at scale for query capture. Thin location/date permutations stay noindex or are not generated. Quality reviewed independently of successful SSG builds.
- No fabricated authority, citations, festival relationships, user reviews, availability or Muhurat "best day" claims.
- Noindex preview/admin/test routes; public sitemap contains only reviewed and indexable URLs. Canonicals must accurately reflect content equivalence, not indiscriminately point every city to Delhi.

## Admin UX required before launch

Dashboard; City Catalog; Computation Runs; Source/Method Registry; Diff & Verification; Festival/Vrat Rule Review; Muhurat Candidate Review; Content Review; Publication Queue; Releases & Rollback; Audit Log. Each view displays evidence, uncertainty and status. Approvals need explicit permissions and recorded who/when/why.

## Pilot rollout

1. Eight QA cities: Delhi, Mumbai, Kolkata, Chennai, Bengaluru, Ahmedabad, Pune, Varanasi. These are baseline test cases, not immediately indexable pages.
2. Publish exact local sunrise and base Panchang only after quantitative QA.
3. Add festival/vrat regional rule packs only after verified examples; wedding/car etc. last.
4. Approve the first small public set individually. Increase to 25 cities only after zero blocking defects, evidence for each rule set, and useful indexable content.
