# PANCHAVANI — Wave 5C: dated official PAC reconciliation and three-city sidereal matrix

**Status: research only. No scientific approval, DeepSeek truth promotion, or public indexing.**

## Why

Wave 5B compared a single public Delhi 2026-10-16 clock source to JPL research, but could not establish independent ephemeris calibration, sidereal Lahiri agreement, or resolve the immutable historical SHA conflicts.

Wave 5C introduces a separate **official Indian Positional Astronomy Centre** (PAC, India Meteorological Department) dated central-station evidence fixture and 3-city/2-day sidereal consistency checks.

Official PAC is NOT a city-specific Delhi, Mumbai or Chennai astronomical station. Its adopted central station is distinct; copying its solar local times to a city would be erroneous. The PAC limb transition instants can serve as research comparators only after method and source conventions are examined.

## Changes

1. New \`engine/fixtures/pac-2026-10-16-central-limbs-UNREVIEWED.json\` contains dated official 16 October 2026 Tithi Shashthi, Nakshatra Jyestha, Yoga Sobhana, Karana Kaulava and Taitila **ending clocks** in PAC's Indian sunrise-day HH-MM format. \`29-55\` means **17 October 2026 05:55 IST**, not 16 October.
2. \`engine/panchavani/pac_limb_reference.py\` now checks Tithi #n and the ending Karana #2n dynamically. Prior implementation accidentally fixed #22 (valid only for 22 September Ekadashi); for 16 October Shashthi the closing Karana is #12. Clock identities are validated before comparing to the astronomical calculator.
3. \`engine/panchavani/sidereal_calibration_matrix.py\` computes provisional Lahiri-anchor Nakshatra and Yoga for Delhi, Mumbai, Chennai, **16–17 October 2026**, using one checksum-pinned DE440s kernel. It verifies contiguous 27-part intervals, local sunrise date attribution, day-to-day continuity, and identical UTC geocentric crossings when an event is present in multiple city windows. All city coordinates remain unreviewed.
4. \`.github/workflows/wave5c-science-qa.yml\` records actual official PAC minus JPL deltas and the 6 city-day invariants in a short-lived GitHub artifact. It intentionally does **not** label numerical proximity scientific certification and does not modify the private D1/R2 records, original manifest sources, the site's approved release file or Cloudflare deployments.
5. Pure regression tests cover both September and October PAC Karana ordinals, PAC 24-hour notation, foreign dates, shared UTC event mismatches, false review status, dawn gaps, 27-number progression and source provenance.

## Source provenance and limitations

- Dated government page (16 October 2026): https://packolkata.imd.gov.in/page.php?q=65
- PAC Panchang: https://packolkata.imd.gov.in/panchang/en
- PAC clock conventions: https://packolkata.imd.gov.in/panchang/en/explanation
- NASA/JPL DE440/DE441: https://ssd.jpl.nasa.gov/doc/de440_de441.html
- Swiss Ephemeris Lahiri IAE-1985 discussion (method description only, **not** integrated as a library due to licensing): https://www.astro.com/swisseph/swisseph.htm

Independent snapshot confirmation of the transcribed 16 October government web text remains **pending**. \`webSnapshotArchived=false\` and \`transcribedIndependentlyReviewed=false\` are intentional; they are never silently changed on a numerical pass. The fixed-epoch Lahiri model is also **NOT** an independently validated standard implementation. PAC reference station, ephemeris conventions, sidereal frames, elevation and sunrise horizon remain method-review gates.

## Still to do before release

- Capture immutable, independently reviewed authoritative PAC/IAE reference material for multiple dates (including edge cases); then establish a real independent method-matched baseline with tolerances chosen before comparison.
- Investigate historical 16 October Delhi/Mumbai/Chennai D1 hashes using the Access-only \`/research/conflicts\` UI. The new reference jobs **do not** pick a winner or reset old D1/R2 candidates.
- Audit city coordinates, elevation, horizon model, timezone versions, region-specific festivals and rituals; require named scientific/editorial approvals.
- Keep DeepSeek generation of factual advice, public day routes and SEO indexing blocked until the above work is individually reviewed and promoted through an explicit signed release process.
