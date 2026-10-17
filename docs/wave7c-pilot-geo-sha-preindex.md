# Wave 7C — three-city observing-site and private SHA triage (NO RELEASE)

## Purpose

Move PANCHAVANI closer to its first three-city SEO pilot by **measuring** the uncertainty introduced by an assumed observing point, and make all three historical SHA cases inspectable together in the private Cloudflare Access admin.

This Wave **does not approve** any physical observing station, sidereal/Lahiri method, festival or daily Panchang page.

## 1. Source-attributed city points

PANCHAVANI's 25-city research catalog contains preliminary latitude/longitude and elevation estimates. For the initial three cities, the research comparator now also retains **independent GeoNames populated-place** reference points:

| City | PANCHAVANI research point | GeoNames point | GeoNames source | GeoNames SRTM3 DEM |
|---|---|---|---|---|
| Delhi | 28.6139, 77.2090, estimated 216 m | 28.65195, 77.23149 | [1273294](https://www.geonames.org/1273294/delhi.html) | ~227 m |
| Mumbai | 19.0760, 72.8777, estimated 14 m | 19.07283, 72.88261 | [1275339](https://www.geonames.org/1275339/mumbai.html) | ~8 m |
| Chennai | 13.0827, 80.2707, estimated 6 m | 13.08784, 80.27847 | [1264527](https://www.geonames.org/1264527/chennai.html) | ~14 m |

**Neither position is a verified PAC observing station.** The GeoNames DEM height is a digital elevation raster estimate at the GeoNames gazetteer point, not a surveyed telescope or ritual Panchang reference location. Sources are not snapshot-pinned or independently transcribed yet.

The exact values above are retained in the new **UNREVIEWED fixture**, not substituted into \`engine/catalog/cities.v1.json\` or into existing D1 data. Never choose whichever city position appears to match an official clock better without identifying the official observing station and calculation convention.

## 2. Model comparison

The new science job computes **12 city-days**: each of the three pilot cities at both candidate points on 21 April, 16 October, 17 October and 23 October 2026, using JPL DE440s with pinned SHA-256.

For the two dates with published PAC clocks (21 April and 23 October), it compares 3 cities × 2 dates × sunrise/sunset = **12 externally printed solar clock observations** for each candidate point, using the official Rashtriya Panchanga [sunrise/sunset tables](https://packolkata.imd.gov.in/panchang/en/tables).

- Every result records both computed IST clocks, differences between the two assumed city positions, official PAC differences (where available), source IDs, JPL/catalog/fixture fingerprints and explicit approval blockers.
- The Skyfield mathematical level-horizon assumption is **−50 arcminutes** for both sites; station horizon, local terrain, refraction, pressure, elevation and actual PAC coordinates have not been method-matched.
- The PAC entries themselves are still marked **UNREVIEWED transcription**. Their one-minute publication resolution cannot establish sub-minute true physical error.

Run: \`.github/workflows/wave7c-pilot-geo-science.yml\`. The retained artifact is \`panchavani-wave7c-gazetteer-solar-pac-UNAPPROVED\`.

## 3. Live private historical SHA triage

The previous Wave 7 provided a single-city route:

\`/research/conflicts?city=delhi&date=2026-10-16&format=json\`

Now an authorized user can request one **three-city audit**:

\`https://admin.panchavani.com/research/conflicts/pilot?date=2026-10-16&format=json\`

The route checks all three city sources, using existing SHA-verified D1 + R2 access and manifest forensics. It reports changed scientific fields, different source hashes, unexplained byte-only differences, missing original versions, and how many city cases need manual disposition. It fails with **503 and no partial "all-clear"** if any required private case is corrupted/unavailable.

- Cloudflare Access \`ctx.access.getIdentity()\` + configured email allowlist is required.
- \`GET\` only; source R2/D1 are never overwritten, deleted or marked approved.
- \`Cache-Control: private, no-store\`, \`X-Robots-Tag: noindex\`; no external private source exposure.
- The action does not select an authoritative version or issue a scientific signoff.

**Important:** This is GitHub source code. It will not return actual live D1 results until the separately secured Admin Worker is deployed and the private bindings are healthy. No production D1/R2 account credentials were accessed from this GitHub-only step.

## 4. Decision log before first SEO indexing

The evidence collected in Waves 5–7C narrows the remaining work, but is NOT a substitute for actual expert review.

1. **Station selection:** document exact public definition of "Panchang for Delhi/Mumbai/Chennai", choose an explicit reference coordinate/elevation/horizon with authoritative location data and uncertainty policy. Archive independent source URLs/snapshots and a named human review.
2. **Matched solar methodology:** identify official PAC reference stations or independently sourced city observations; reconcile assumed Sun limb, horizon, refraction, elevation, timezone tzdb version. Require independently chosen numerical tolerances.
3. **Lahiri/ephemeris:** reconcile Wave 7B's independent Swiss-vs-JPL differences across 1956–2050, event roots and boundary scenarios; explicitly select signed standard.
4. **SHA conflicts:** execute the three-city private audit on **real production D1/R2**, compare all originally imported byte hashes and register a reviewed disposition. No candidate is approved while relevant source conflicts remain open.
5. **Fact Packets:** only after the above and approved regional scope, sign six complete city-day science packets, with provenanced astronomy and method/rule references. DeepSeek can draft words from explicit approved fact IDs, not compute/fabricate astronomy.
6. **SEO:** require 3 high-value city hubs + 6 substantive, city-unique date pages to pass the Wave 6 originality and 4-limb timeline gates; release per URL, not global \`noindex\`. Audit Cloudflare output and then manually submit only the approved sitemap to GSC.

### Current scientific/release statuses

\`researchOnly=true\`; \`stationApproved=false\`; \`independentAstroMethodApproved=false\`; \`privateShaConflictsResolved=false\` until real review; \`indexingAuthorized=false\`. Neither successful GitHub QA nor a numerical PAC match upgrades these states.
