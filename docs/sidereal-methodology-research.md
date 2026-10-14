# PANCHAVANI — provisional sidereal research method (Wave 2)

**RESEARCH / UNAPPROVED / NO SEO PUBLICATION**

## Recorded astronomy conventions

- NASA/JPL DE440s verified by SHA-256, Skyfield geocentric apparent solar/lunar ecliptic longitudes in the true ecliptic/equinox of date.
- Nakshatra = lunar sidereal longitude / (360°/27).
- Nitya Yoga = (lunar sidereal longitude + solar sidereal longitude) / (360°/27), modulo 360°.
- Experimental fixed-inertial fiducial anchored at 23°15′00.658″, TT 1956-03-21 00:00, projected onto the true ecliptic of date. Inspired by the post-1985 IAE Lahiri epoch; this is NOT certification of a standard Lahiri algorithm.
- Do NOT introduce Swiss Ephemeris into the public or private worker without choosing and fulfilling its AGPL or commercial licensing obligations. Swiss is NOT a bundled dependency.

Scientific background: https://www.astro.com/swisseph/swisseph.htm and https://rhodesmill.org/skyfield/api-framelib.html

## One Delhi pilot: 13 October 2026

NASA/JPL research calculation: Vishakha ends 01:43:07 IST on 14 Oct; Priti Yoga ends 20:23:50 IST on 13 Oct.
Public minute-rounded research comparators: Sanatan Bhumi (https://www.sanatanbhumi.org/en/panchang/2026-10-13/) and Ashtadha (https://ashtadha.com/panchang/date/2026-10-13), both reporting 01:43 and 20:24.
Approximate discrepancies from the reported minute-rounded values: +7 and -10 seconds. These differences do NOT imply second-level astronomical accuracy. Both sites might share a common upstream source. A 90-second regression ceiling in the fixed-day pilot detects future drift, not independent methodological agreement.

## Automated coverage

- GitHub Actions sidereal-research.yml: fixed-day research comparator and artifact with explicit blockers.
- GitHub Actions autonomous-research.yml: 8 cities x 2 dates for research Tithi/Karana/daylight, plus 8 x 2 provisional Nakshatra/Yoga cases. Validates that shared geocentric angular crossings remain identical in UTC across cities.
- Results are UNAPPROVED, private GitHub Actions artifacts with 7-day retention. They are not written to the public Next.js data source or Cloudflare R2/D1, and cannot trigger a release.

## Before publication

1. Match the ayanamsa and reference frames to a fully specified independently reproduced standard Lahiri implementation, covering hundreds of stratified city/date cases and edge conditions.
2. Confirm city latitude/longitude, elevation/refraction/horizon conventions and IANA timezone provenance independently.
3. Match separate sources for Tithi, Nakshatra, Yoga, Karana and sunrise/sunset under the same methodology; reject unexplained discrepancies rather than adjust values to copy competitors.
4. Apply expert-reviewed regional festival, vrat, parana and Muhurat rules. The five astronomical limbs alone cannot establish a wedding or vehicle-purchase recommendation.
5. Add a versioned, audited promotion pipeline with a city-specific editorial usefulness review before generating indexable Next.js pages.
6. Until the above gates pass, public PANCHAVANI maintains noindex on every exported HTML page. Search ranking is never guaranteed.
