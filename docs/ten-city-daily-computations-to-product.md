# PANCHAVANI — 10-city daily calculation pipeline: what is automatic and what is not

## Working calculation contract

The existing JPL DE440s/Skyfield astronomical engine now supports one explicitly scoped **10-city** cohort: Delhi, Mumbai, Kolkata, Chennai, Bengaluru, Hyderabad, Ahmedabad, Pune, Jaipur and Varanasi. Its scientific calculation routines are the **same functions and verified numerical invariants** as the earlier three-city pilot; the new mode does not invent alternative formulas or copy solar times between cities.

The scheduled GitHub Actions job `.github/workflows/rolling-six-limb-research.yml` runs at 04:41 UTC, chooses tomorrow and the following date **in Asia/Kolkata**, downloads NASA/JPL `de440s.bsp`, enforces the pinned kernel SHA-256, and calculates **20 city-days**:

- Local sunrise, sunset and following local sunrise for each research city point;
- Six dawn entries: Tithi, Karana, Nakshatra, Yoga, Vara and Paksha;
- Complete contiguous four-layer sunrise-to-sunrise transition intervals with precise event UTC and converted IST;
- Tithi/Karana exact-identity root matches, 11-minute versus 30-minute solver grid checks, sunrise-day chronology, and full **40** two-day phase continuity checks;
- Shared geocentric event UTC crossings are reconciled between all 10 cities; the chosen **local sunrise** is recomputed separately at each city reference point.

The job saves an immutable SHA-addressed `rolling-six-limb-UNAPPROVED.json`, an overall `rolling-six-city-preview-index-UNAPPROVED.json`, and **20 distinct research-only Markdown previews** in one GitHub Actions artifact. Job failures are genuine failed checks, not silently substituted cached numerical outputs.

Manual dispatch allows an explicit first date. The older static Wave 7 / Wave 8 3-city QA pipelines remain **unchanged in their default cohort** for historical reproducibility.

## Data model and scientific honesty

**All 20 calculated city/day packets remain UNAPPROVED research.** The city center points and elevations are still unreviewed; solar refraction and tzdb provenance and the sidereal Lahiri method need independent scientific signoff. DeepSeek does not receive the research packets as an allowlist. The Muhurat type pages explain how to assess Wedding, Vehicle Purchase, Griha Pravesh and Business, but **do not present computed auspicious dates** because those need independently approved region/tradition-specific rule packs.

The public `data/approved-panchang.json` continues to contain `records: []`. Exactly 10 existing educational city guide URLs remain indexable. All other scientific/ritual day pages remain blocked/noindex. The site should never assert that a build pass equals scientific validity.

## Actual remaining final-product gates

1. **Science method and city geodata signoff**: one finite adopted observing-point, JPL/Lahiri and horizon convention decision for all 10 cities, with representative independent external comparison. This is a qualified human scientific review, not another unbounded source SHA audit.
2. **Full regional rules** for wedding, vehicle, house entry, business and vrat/festival-date assignment. The current `engine/panchavani/regional_rules.py` deliberately implements only a research predicate and refuses any positive auspicious-date decision. Separate tradition fixtures and reviewers are required.
3. **Fact allowlist and editorial promotion**: for each approved city/day, immutable reviewed source IDs, all transition intervals and editorial factual statements must pass the existing signed release gates; DeepSeek only rewrites approved facts, not calculates or invents rules.
4. **Controlled public release**: load only signed reviewed city-day bundles, render accurate time windows and methodology, verify Googlebot HTML, canonical and targeted sitemap before broadening Google indexing.

Unlike prior conversations, **no extra general SHA audit** is needed: the owner-provided Oct 16 private report already established full D1/R2 JSON equivalence for the historic three-city cases. We concentrate on making 10-city research repeatable and turning it into real user value when its specific method/rule approvals are in hand.
