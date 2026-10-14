# PANCHAVANI — Official IMD Positional Astronomy Centre solar-time comparator

Source: https://packolkata.imd.gov.in/panchang/en/tables

Publisher: India Meteorological Department, Positional Astronomy Centre,
*Rashtriya Panchang*, Saka 1948 (2026–2027 A.D.). The website prints
sunrise/sunset for four metropolitan stations: Chennai, Delhi, Kolkata,
Mumbai. This is a primary *published-clock-time* reference, not a digitally
signed independently certified calibration of our astronomical implementation.

## First reproducible public-reference fixture

`engine/fixtures/pac-rashtriya-2026-four-metros-solar-UNREVIEWED.json`
records the published clock times for:
- **2026-04-21**, Vaisakha Gregorian Apr 21 row;
- **2026-10-23**, Kartika Gregorian Oct 23 row.

Each row has sunrise/sunset for **Delhi, Mumbai, Kolkata and Chennai**
in IST (`Asia/Kolkata`): 8 city-days × 2 solar instants = **16** comparisons.
Times are only printed to the minute. The station coordinates, exact
horizon/refraction method, and transcription accuracy are not yet independently
reviewed and these factors can shift solar times by minutes.

## Implemented comparison pipeline

`engine/panchavani/pac_solar_reference.py` accepts a
SHA-256-checked NASA/JPL DE440s ephemeris and the exact official-source
fixture, computes real solar events with Skyfield, converts them to IST,
and writes per-event computed time, published time and **signed discrepancy
in seconds**.

The research alert threshold is ±300 s, NOT a publication accuracy threshold.
The script records method and transcription uncertainty and unconditionally
sets scientific approval, editorial approval and indexing authorization to
false. A large difference fails CI and requires investigation, not manual
tuning of calculated values to match an unknown convention.

`.github/workflows/pac-reference-qa.yml` runs on relevant code changes,
on monthly schedule, or via manual dispatch. It archives the
`UNAPPROVED` report for 30 days. It never changes the public website,
Cloudflare D1/R2, SEO index state or release permissions.

## Remaining validation before safe release

1. Independently confirm table transcription against the publisher PDF or
   original page/print and obtain adopted station lat/lon/height.
2. Match PAC's solar sunrise/sunset horizon/refraction convention against
   the current Skyfield definition rather than interpreting unexplained
   offsets as errors.
3. Obtain official dated Tithi/Nakshatra/Yoga/Karana values at matched
   reference times; do NOT apply the **central station**'s Panchang
   blindly to all four city-specific solar charts.
4. Independently verify the Lahiri sidereal framework, regional
   observance rulepacks and any Muhurat recommendations.
5. Only after the release and human editorial review may city pages
   receive unique indexable SEO metadata and sitemap inclusion.

No high Google ranking or perfect astronomical accuracy is guaranteed by
passing this fixed two-date pilot.
