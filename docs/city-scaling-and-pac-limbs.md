# PANCHAVANI expansion architecture + official Panchang source QA (2026-10-14)

## Research city catalogue for 8 to 25, 100 and beyond

`engine/catalog/cities.v1.json` is the sole versioned source of astronomical
research city records. Current eight cities are the baseline `pilot` cohort.
`panchavani.cities.load_catalog()` validates India coordinates, elevation,
IANA timezone, safe unique slugs, state of source review, and a strict
no-auto-publish invariant. The catalogue content has a SHA-256 fingerprint.

Add new **real, sourceable city details** in JSON: id, name, coordinates,
height, timezone, coordinate provenance, `cohort: expansion` and
`researchEnabled: true`. Do NOT clone coordinates, use Delhi as fallback, or
set `coordinatesVerified/publishingApproved` to true in this research catalogue.
The core computation uses `RESEARCH_CITIES` dynamically, while
`PILOT_CITIES` remains the **unchanged eight-city scientific baseline**.

`python -m panchavani.city_shards --cohort all --shard-index 0 --shard-count 1`
returns a deterministic research-only city plan with expected city-day counts.
Shards are based on stable SHA-256 of the city slug, so adding another city
does not reshuffle existing cities in the same shard count. For a larger
research catalogue, run 0..N−1 shard indices; each shard is separate,
with explicit city IDs, catalog SHA, provenance and a unique artifact.
The nightly GitHub Action allows inputs to choose cohort and manual shard count; otherwise it chooses shard count automatically.
The default scheduled workflow **automatically sizes the shard matrix**:
up to 12 cities per shard, a 128-shard hard limit, and maximum six
parallel GitHub Actions calculation jobs. An explicit workflow-dispatch
shard count is accepted only if every shard remains within the cap.
The workflow downloads immutable per-shard results and checks
100% city coverage, exactly-once city assignment, candidate SHA-256 hashes,
correct shared catalogue provenance, and zero public/SEO releases.
GitHub retry policy and concurrency quotas still need operational monitoring.

For efficiency, the standard Tithi/Karana batch now verifies the JPL file
checksum and loads the ephemeris once per batch; the individual-city
compute CLI keeps its own hash verification. The sidereal batch already
reused the same single adapter. Research results never approve themselves.

Before scaling from 8 → 25 → 100 cities, require:
- independently sourceable geolocation & elevation for each city;
- pinned geodata/version and local event conventions;
- budget/concurrency limits and timed cost telemetry for shards;
- date-bound QA in each cohort; source-specific regional rule packs;
- a real human/editorial review flow, signed release manifests and rollback;
- only substantively useful, reviewed local pages entering sitemap/index.

## Official four-Panchang-limb reference

`engine/fixtures/pac-2026-09-22-central-limbs-UNREVIEWED.json` captures
an observed PAC/Rashtriya Panchang daily entry dated **22 Sep 2026**:
Shukla Ekadashi Tithi ending 21:44 IST, Uttarashadha Nakshatra ending
07:07, Atiganda Yoga ending 16:29, Vanij Karana ending 08:57, and
Vishti Karana ending 21:44. The station day is **central India** and
the entries are **NOT Delhi/Mumbai/Chennai/Kolkata local Panchang tables**.
The original web page is dynamic; there is no independently archived
dated snapshot yet, so every result must retain this blocker.

Official source:
https://packolkata.imd.gov.in/panchang/en
Documentation of the sunrise day and clocks exceeding 24h:
https://packolkata.imd.gov.in/panchang/en/explanation

`engine/panchavani/pac_limb_reference.py` implements an exact
30-hour sunrise-day time notation parser and numerically compares the
five PAC published clock values with JPL + provisional Lahiri research.
It checks equivalence of the Shukla Ekadashi boundary and its Vishti
half-Tithi boundary, and records method/rounding discrepancies without
calling any candidate scientifically approved. The `pac-limb-qa.yml`
workflow runs this fixed-day comparison after code changes and monthly,
saving a private unapproved artifact. A 30-minute alert is deliberately
**not** a scientific tolerance or a rank/SEO quality guarantee.

Further source work needs a fixed PAC 2026–27 PDF publication or
independently archived original day-entry snapshot and independent
confirmation of full daily clocks, methodology and reference frames.
Do not infer any ritual/muhurat recommendations from a single day's
geocentric transition times.

Current website remains `noindex` and no SEO pages are generated.
