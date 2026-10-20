# PANCHAVANI — independent timing benchmark protocol (research only)

## Purpose

Compare **independently captured** city-specific reference timestamps with the exact UTC boundaries of the ten-city JPL-derived science grid. Report signed seconds, absolute seconds, mean/median/p95/max absolute error, and date/city coverage. Do not treat a self-comparison, unit test, rounding match, or low error as scientific validation.

## Input

Provide a private JSON manifest with `artifactType: "PANCHAVANI_INDEPENDENT_REFERENCE_TIMINGS"`, `schemaVersion: 1`, `status: "EXTERNAL_UNREVIEWED"`, `scientificApproval: false`, `publicationAuthorized: false`, `indexingAuthorized: false`, and nonempty `samples`.

Each sample requires a matching `cityId` and `localDate`, `kind` (sunrise, sunset, following-sunrise, tithi, karana, nakshatra, yoga), offset-aware `referenceUtc`, `precisionSeconds`, and independent `source` metadata (provider, HTTPS URL, method, retrievedAt). Limb events also require `expectedNumber` and `eventKey` (start/end). Do not misrepresent a general daily Panchang label as a transition boundary.

## Command

```bash
PYTHONPATH=engine python -m panchavani.reference_accuracy \
  --grid engine/artifacts/ten-city-muhurat-time-grid-UNAPPROVED.json \
  --references /private/verified-by-human-reference-timestamps.json \
  --out /private/muhurat-reference-errors-UNAPPROVED.json
```

Output is intentionally absent unless independently collected references are supplied. No external fetch is claimed. The CLI refuses overwrite. This is **not** wired to publication, DeepSeek, client Worker or Admin Worker.

## Methodological rules

- Check that publisher's observer coordinates, time zone, elevation, refraction, ephemeris version, ayanamsha (Lahiri variant), solar limb convention and date semantics are comparable. A low residual from incomparable conventions is not approval.
- Sources that display minute precision require explicitly declaring `precisionSeconds`. A minute-rounded published timestamp carries uncertainty; do not infer second-level astronomy from it.
- For each limb transition, ensure the selected phase identity matches a boundary, not simply the nearest same-day interval. The benchmark rejects missing boundaries.
- Benchmark separately across all 10 cities, seasons, and the 4 limbs. A sample confined to one city or a single day is insufficient.
- Drik Panchang's Muhurat rules are not universal regional consensus. Its Wedding example distinguishes solar-month, nakshatra, karana, yoga and Asta exclusions; residual timestamp accuracy cannot certify religious rules.
- **All generated conclusions are UNAPPROVED_COMPARISON**, with zero publishing/indexing/recommendation rights.

Reference methodology: https://www.drikpanchang.com/shubh-dates/info/choosing-auspicious-marriage-date.html?lang=en
