# PANCHAVANI Science Certification V1 — reviewer handoff and release control

**Scope:** Delhi, Mumbai, Chennai · 20–26 October 2026 · 21 unique city-days.

This is a research-derived certification **worksheet** and NOT a certification signed by an independent scientist. A completed CI job is neither a legal, scientific nor editorial approval.

## Independent numerical finding

| Source or method | Vanij Karana #21 ending (India clock) | Interpretation |
|---|---|---|
| Original PAC Asvina web publication (source transcription UNREVIEWED) | 2026-10-22 **02:27 IST** (printed h. 26-27 on Oct 21) | Official printed value; not source-archived or independently signed |
| PANCHAVANI JPL DE440s provisional solar/lunar method | ~2026-10-22 **02:36:27 IST** | Previously reproduced research number |
| Independent Swiss Ephemeris Moshier analytic (Lahiri) | ~2026-10-22 **02:36:28 IST** | Independent numerical program/ephemeris comparison, NOT independent expert approval |

Swiss–JPL agreement within ~1 second narrows likely investigation. It does NOT authorize replacing the PAC record with JPL: PAC could use another convention, have a publisher typo, or the manually captured source may be incorrect. Original PAC entry: https://packolkata.imd.gov.in/panchang/bn/asvina . Source/method difference > printed minute-resolution remains a red flag.

The original 16 Swiss event samples unintentionally counted multiple copies of physical geocentric crossings from different cities. Science Certification V1 de-duplicates these by (limb, ordinal, UTC minute), demands exactly four **distinct** sampled crossings for each of Tithi, Karana, Nakshatra and Yoga (16 unique events total), and separately solves the targeted Vanij #21 physical crossing. This removes a misleading source of apparent confirmation.

## Outputs generated on every weekly private research run

The GitHub Action `PANCHAVANI 21-city-day JPL and independent Swiss evidence (NO APPROVAL)` now attaches:
- JPL DE440s six-limb recomputation (21 city days).
- Independent Swiss Moshier sample (21 sunrise points + 16 unique crossing samples + targeted Vanij finding if period includes 2026-10-21).
- Actual same-date official PAC transcription comparisons (7 days / 35 endings for October 20–26).
- Private PAC/JPL/SWISS truth matrix; 21 individual immutable **UNAPPROVED** science factpack candidates with SHA manifest.
- `pilot-21citydays-CERTIFICATION-V1-UNAPPROVED.json`, 21 source-checked reviewer worksheets with source SHA, PAC clock discrepancy and exact signoff blockers.

The CI uses `factpackIssues` from the **real private production scientific source validator** against each of the 21 actual generated science candidate templates and must reject all of them. This test makes **zero DeepSeek calls**. There is no approval secret stored in or used by the science CI.

## Independent scientific certification tasks

1. **Publisher-source attestation:** independently read/archive 7 exact dated PAC rows, compare the five phase end timestamps on each; retain immutable archive source URI, retrieval date and evidence hash. Official website web availability can fluctuate; a search-engine snippet is not a reviewed original source.
2. **Vanij anomaly disposition:** independently confirm printed h. 26-27 for Oct 21; compare the same Karana #21 physical crossing in Swiss/JPL, check zero point, UTC/TT/UT1 and leap-second handling, lunar phase indexing, publisher editorial error possibility. Record cause, evidence and adopted correct value, without silently rewriting past sources.
3. **Method validation:** qualify JPL DE440s ephemeris/coordinate frame and provisional Lahiri epoch, refine numeric tolerance by kind and distance to boundaries. Clock differences <=60s relative to minute-rounded PAC are evidence, not absolute guarantees.
4. **City-specific astronomy:** source accepted site lat/long/elevation, horizon and atmospheric model for Delhi/Mumbai/Chennai; compare local sunrise and sunset with independently sourced same-city measurements. PAC geocentric phase times are not distinct per-city solar times.
5. **Historical D1/R2 reconciliation:** read the **original** production source SHA for each of 21 date/city rows through Access-protected Admin; separate it from newly recomputed JPL research SHA and explicitly resolve any inconsistency.
6. **Qualified reviewer signoff:** an independent named scientist records source IDs, at least two genuinely independent comparisons, method version, approved-at time, blockers=0 and real city facts with source links. Only the separately authorized private import verifies the reviewer HMAC. No assistant or CI process may impersonate a human approval.
7. **Editorial rollout:** after real science import, run a single source-locked DeepSeek private draft (strict rolling 3 paid attempts/day cap), verify citations, originality, no invented calendar values, local usefulness; arrange separate human editorial and SEO reviews before selective public release.

## Current release authority

- Auto-approved science days: **zero authorized by this workflow.**
- Automatic science HMAC signer: **none**.
- Paid DeepSeek work: **none triggered by Science Certification V1.**
- Public sitemap/indexability: **not changed**.
- All generated review files are marked `UNAPPROVED`.

The already-developed Multi-Intent Worker may run once genuine independent signed science is imported. Do not bypass the existing `verifySciencePack` or public SEO manifest gate.

## Exact success criteria for complete scientific/SEO launch

- A named qualified independent scientist accepts the evidence and documented method/measurement uncertainties.
- Every source day used in a draft is independently signed and HMAC-valid, and missing independent city facts are supplied.
- A generated private AI draft passes model/authorial QA, source and hallucination checks and **separate** human editorial review.
- A selected URL has its own approved SEO manifest/signature and passes rendered HTML, sitemap, canonical and robots verification.
- Festival/Vrat/Muhurat are **not** automatically cleared by astronomy: they require a separate qualified review of regional ritual rules.
