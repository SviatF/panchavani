# PANCHAVANI 25-city geodata provenance audit (stage 2A)

## The scope of this step

The city catalogue currently contains 25 preliminary India city-centre
coordinates with unreviewed elevation estimates. A city label and plausible
latitude/longitude is NOT proof of an actual official observing station.
This work adds **cross-source candidate matching**, NOT verified publication
of sunrise, local horoscopes or auspicious Muhurat.

Source: https://download.geonames.org/export/dump/IN.zip
Documentation: https://www.geonames.org/export/
License: GeoNames data is CC BY; provide attribution when using data.
The official main dump is tab-separated (19 standard fields),
including geoname ID, feature class, place coordinates, name variants,
country, population, elevation and modification date.

`engine/panchavani/geodata_audit.py`:
- accepts the published India GeoNames dump via an explicit file path,
  computes a SHA-256 of the fetched ZIP and records the catalogue hash;
- considers ONLY P-class India populated places, not administrative A
  polygons, another country, or postal-code location centroids;
- checks direct name and known alternate place names, geographic
  separation in kilometres and ambiguous candidate counts;
- never modifies coordinates or fills heights from nearest other city;
- does not certify the source's correctness or resolve conflicting place
  identities automatically;
- emits an explicit review report for all 25 cities. Source IDs/positions
  are traceable to GeoNames, but are NOT considered observatory proof.

`.github/workflows/geodata-reference-qa.yml` can run on push or manually.
It downloads an external dump into the GitHub runner; artifacts contain the
source-file digest and every candidate's GeoNames ID/date. This snapshot is
not automatically published or synchronized with Cloudflare D1/R2.

## Before independent geodata approval

- Match each city to a surveyed or authoritative municipal reference point
  and record exact lat/lon, coordinate datum, elevation in metres, method,
  provenance URL, stable source ID, reviewer identity and review timestamp.
- If a city-centre point is used as the published calculation convention,
  **say explicitly** that it is an adopted point, not every visitor's home.
- Check terrain/elevation/horizon/refraction with the chosen solar altitude
  convention; differences between PAC station values and PANCHAVANI may be
  legitimate but must be explained rather than hidden.
- Keep research geometry and verified release geometry version-separated.
  An unapproved research catalogue cannot set publication true.
- Extend sun and full-Panchang comparison corpus to representative
  local city days. Sign approved bundles independently and enforce
  editorial usefulness review before indexable routes are made.

**Never rely on geographic matching alone to enable Google indexing.**

## GeoNames DEM vs provisional catalogue height

For each matched populated-place point, the audit now also records the
GeoNames `dem` column, a **digital elevation model estimate** (SRTM3
or GTOPO30), and the difference from PANCHAVANI's provisional height.
The value is calculated at the matched gazetteer point, not necessarily
at PANCHAVANI's adopted point. The tool flags differences above 100m
and missing DEM values for further human review. An unflagged difference
does NOT certify correct survey height or actual visible sunrise time.

GeoNames field descriptions:
https://download.geonames.org/export/dump/readme.txt

No DEM or gazetteer field automatically modifies the city catalogue.
Station heights, coordinates, skyline and sunrise method stay unapproved.
