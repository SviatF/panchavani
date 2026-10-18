# PANCHAVANI — Oct 16 production SHA diagnosis (full JSON audit)

## Ground truth received from the live Access-protected Admin Worker

The authenticated production report for 16 October 2026 successfully read all **3** D1 city research candidates. Each has a different raw-byte SHA from its R2 source copy, while 2 independent R2 source manifests refer to the **same candidate SHA** per city. All original SELECTED field checks showed zero changes, but that comparison was **not** exhaustive.

| City | Stored D1 source SHA256 | SHA256 of both matching incoming R2 source records |
|---|---|---|
| Delhi | `d20f67559a18aaf990279d3843343f94c8fe78ed75574a4c6c53421e3df3cdfe` | `b6dd6cdee74e6c8a7fdcb27b082b5e9412f4cbb375e2c9c31df5878866c7e438` |
| Mumbai | `6e2a7551b5460dd7eb9b6321eb5dc8e1022baa99cc22fbcc3711f814035a6e46` | `4b728365db05cb19ccdd92388d5b262cb4dad60f630a4af5d3c7f2ba8db0dbf3` |
| Chennai | `01da2d1939ce2a614e7a0849ed50cb1b4d86aa213f113ee4f8275d6e94192072` | `478988120394e731314d7b6c49e64174c68addf30ab4b59a431a917e62365c0b` |

Two R2 ingest runs: `38813000891` and `38865238486`; four manifests validated. At this stage we **cannot** say that the differences are merely whitespace, input ordering, or audit metadata without comparing **all** parsed fields.

## The limitation that was fixed

Earlier `compareResearchVersions()` only compared a fixed allowlist of 17 fields plus Tithi/Karana timeline. Critically, it did **not** look at all Nakshatra/Yoga, nested validation and methodology extras, arbitrary extra content, extra/missing keys or deep element changes.

Wave 9 forensic fix now implements `compareCompleteRecordStructure()`: recursive JSON value comparison covering every root field and nested field, distinguishing absent keys, nulls, value changes, array length and element order. Object key order is intentionally semantically irrelevant. It exposes only changed paths, category and kind, not unconstrained private candidate values. First 60 examples are included; actual count and group counts cover the entire JSON.

The Access-only route `/research/conflicts/pilot` now classifies each unique difference as:

- `JSON_SERIALIZATION_ONLY_DIFFERENCE`: parsed JSON values completely equal, but verified R2/D1 SHA differs. A formatting/key ordering/number lexical representation difference exists. **Still needs source provenance signoff.**
- `OTHER_JSON_RECORD_FIELDS_DIFFER`: values differ outside the historical allowlist — the output shows exact changed paths, with astronomy/provenance vs validation/metadata categories. **Never treat changed Nakshatra/Yoga or unknown nested data as harmless.**
- `RESEARCH_FIELDS_DIFFER`: one or more previously tracked science/time fields differ; full paths are also shown.
- `IDENTICAL_SHA` / `DUPLICATE_INCOMING_SHA`: unchanged previously documented states.

The three-city aggregate remains **unresolved** until an authorized reviewer checks source provenance and decides whether differences are semantic, represent true methodology drift, or are only serialization. No D1 candidate write or R2 source replacement occurs.

## Immediate follow-up

After merging this change, GitHub Actions automatically deploys the private Worker using the configured Cloudflare GitHub secrets. Open `https://admin.panchavani.com/research/conflicts/pilot`, then inspect `unresolved[*].fullJsonDifferenceCounts` and each `cases[*].variants[0].completeJsonComparison`.

If all three now classify as `JSON_SERIALIZATION_ONLY_DIFFERENCE`, next step is documenting source identity and independent review; do **not** automatically declare scientifically approved calendar data. If any return `OTHER_JSON_RECORD_FIELDS_DIFFER`, inspect changed paths before selecting or correcting a canonical source.

The public page whitelist and global `noindex` remain unchanged.
