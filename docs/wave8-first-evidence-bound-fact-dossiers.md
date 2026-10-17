# Wave 8 — first six evidence-bound city/day dossiers

**Status: research-only. No scientific approval, paid DeepSeek prompts, release or indexing.**

Previous Waves 5–7C generated real numerical evidence, but none is a human-signed astronomically and geographically approved public calendar. Wave 8 closes the *research-to-editorial preview* gap, NOT the *research-to-publication* gate.

## Real inputs (same isolated GitHub job)

- Wave 7 JPL DE440s: six full city/day six-limb records with four event timelines and numerical QA.
- Wave 7B Swiss analytic MOSEPH: isolated independent-program diagnostic, 15 date-stratified samples including exact six sunrise instants and independently solved event boundaries. Its AGPL Python library is a test-only CI dependency, not shipped to Cloudflare.
- Wave 7C geo/PAC: compare two provisional point conventions for Delhi, Mumbai and Chennai across four dates, with published but unreviewed PAC solar clocks for Apr 21 and Oct 23.
- Actual byte SHA-256 for each input, shared kernel hash + city catalog, matched city-specific coordinates and sunrise chronology. Fail closed on contradictory data.

## Outputs

A single research JSON and six local-only Markdown previews for Delhi, Mumbai, Chennai x 16–17 Oct 2026. Each record includes eight source-bound fact IDs:

1. Sunrise, sunset and following sunrise, IST calendar date explicitly preserved.
2. Six sunrise Panchang labels.
3. Original city catalog versus GeoNames coordinates/elevation, distance, original source URL, *not surveyed observatory*.
4. City-location solar-model sensitivity (seconds), NOT physical uncertainty.
5–8. Complete sunrise-to-following-sunrise Tithi, Karana, Nakshatra, Yoga timelines, with changes tagged whether during local daylight or after local sunset.

The contents are **review dossiers, not approved factual statements for DeepSeek**, and the generated previews are NOT public HTML and do not become Next.js routes.

The astronomical phase-crossing instant shared between cities must stay the same. City-specific value comes from independently modeled sunrise/sunset, contextual sunrise-day attribution, and future verified local editorial evidence — never city-name replacement or fictional astronomy.

## Private historical conflicts

An optional manually supplied three-city SHA export from the Access-only admin route:
https://admin.panchavani.com/research/conflicts/pilot?date=2026-10-16&format=json

The exporter is GitHub source code only until the protected Cloudflare Admin Worker is actually deployed; the current tool integration cannot access its private production D1/R2.

The offline CLI accepts the JSON as an **unreviewed attachment**, retains its exact SHA and still denies scientific/release status. Only a separate named expert can determine the authoritative stored source for the three 16-Oct city cases. Passing the offline schema is NOT live authenticated forensic approval.

## Exit requirements before the first Google indexing

1. Independent matched-method astronomical signoff and agreed Lahiri convention, across multiple boundary dates.
2. Verified adopted observing point, elevation, horizon/refraction convention and exact tzdb for each city.
3. Actual authenticated production D1/R2 SHA report, source-by-source human disposition, no silent overwrite.
4. Independently documented regional Panchang rule pack and all approved event facts.
5. Human-reviewable local editorial explanations and originality checks for each city/date.
6. Separate signed approved-publication manifest, whitelisted indexable URLs, production Cloudflare SEO smoke test and GSC submission.

## Operations

Reproducible workflow: .github/workflows/wave8-first-fact-dossiers.yml

CI artifact: panchavani-wave8-first-six-city-day-fact-dossiers-UNAPPROVED

CLI: PYTHONPATH=engine python -m panchavani.first_fact_dossiers --science <science.json> --geo <geo.json> --swiss <swiss.json> --out <facts.json> --previews <empty-directory>

Research denial states include scientificReviewSigned=false, modelInvocationAuthorized=false, publicReleaseAuthorized=false, indexingAuthorized=false, approvedClaimsForDeepSeek=[].

**The approved-panchang.json public bundle and global noindex remain unchanged.**
