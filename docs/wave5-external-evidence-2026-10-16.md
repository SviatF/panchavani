# PANCHAVANI Wave 5B — external numerical evidence (NOT scientific certification)

This wave adds measured comparisons with **unaltered, SHA-pinned JPL research candidates**. The new comparison is a research instrument, not a release gate or evidence of astronomy independence.

## Implemented

- \`engine/panchavani/external_evidence.py\` requires the exact candidate JSON byte SHA-256, city, date and IANA timezone. It rejects altered source bytes, unapproved-source contract violations, duplicate observations, incorrect offsets, missing interval labels, and ambiguous phase transitions.
- Observation types: sunrise, sunset, next sunrise, end of a **named** Tithi or Karana. All values are converted to timezone-aware timestamps. Midnight-crossing transitions retain their correct **next calendar date**.
- The report retains source URL, publisher, printed time, candidate time, numerical delta in seconds, precision and explicit exploratory research ceiling. An agreement never establishes scientific authority.
- A *single* public Drik Panchang Delhi reference fixture for 16 October 2026 was transcribed with minute precision. The source's exact coordinates, horizon/refraction model, Lahiri conventions and upstream independence are **not known**. It cannot pass an independence or methodology review.
- New GitHub Actions workflow generates a fresh **research-only** Delhi candidate using checksum-pinned JPL DE440s and archives the report of numerical deltas as a short-lived Actions artifact. It does **not** fetch, rewrite, replace or approve the old D1/R2 Delhi record, and never invokes DeepSeek.
- Every report hard-sets \`scientificApproval=false\`, \`approvedClaimsForDeepSeek=[]\`, \`publicationAuthorized=false\` and \`indexingAuthorized=false\`.

## Repeat manually with a local candidate

\`\`\`bash
# The candidate must be an existing ORIGINAL JPL research JSON file.
sha=$(sha256sum path/to/UNAPPROVED-candidate.json | cut -d ' ' -f1)
PYTHONPATH=engine python -m panchavani.external_evidence \
  --candidate path/to/UNAPPROVED-candidate.json \
  --expected-sha256 "$sha" \
  --fixture engine/fixtures/delhi-2026-10-16.drik-UNREVIEWED.json \
  --out path/to/a-new-research-comparison-UNAPPROVED.json
\`\`\`

The tool uses no network, database or AI. Output is created exclusively and will refuse to overwrite a previously saved result. The workflow regenerates a matching JPL date for a **numerical pilot**; it does not prove which of the three historical D1 SHA conflicts has the correct underlying record.

## Honest limitations before scientific release

1. Inspect the 3 stored 16 October conflicts using \`/research/conflicts\` AFTER the current Admin Worker is deployed. Preserve both source SHAs and identify exact coordinate, calendar and computation differences.
2. Independently reproduce sunrise and lunar crossing instants using *methodology-matched* external ephemeris and reference implementation, not solely a web calendar. Confirm date, location, altitude, refraction, time-zone database and numeric root finding before choosing a threshold.
3. Independently calibrate the exact Lahiri fiducial and coordinate frames for 27 Nakshatra and Yoga intervals across hundreds of edge and regional cases, with licensing reviewed for any added library.
4. Obtain a genuinely independent second source and explicit source-method notes. Two websites can share upstream code: publisher count does not prove independence.
5. Audit regional festival/vrat and Muhurat rule packs separately, then named human expert review; only *then* create an explicitly approved immutable public release.
6. Keep DeepSeek, sitemap, indexing and auto-publishing OFF for all unresolved city-days. Do not force-reset D1 or rewrite stored research objects.

### Sources
- Drik Panchang city-day research reading: https://www.drikpanchang.com/panchang/month-panchang.html?geoname-id=997719
- JPL ephemeris method information: https://ssd.jpl.nasa.gov/doc/de440_de441.html
- Skyfield JPL usage and coverage: https://rhodesmill.org/skyfield/planets.html

**Baseline for this wave:** Delhi 2026-10-16 only. Mumbai and Chennai are deliberately still evidence-pending; no comparator timings or verification results are invented.
