# PANCHAVANI: content naturalness and SEO audit — 2026-10-15

Scope: actual public Delhi/Mumbai/Chennai city guides, 25 generated SEO briefs, and three user-provided private model samples (Chennai V2, Delhi V3, Mumbai V4). We did not access the complete private production R2 corpus, and do not claim to have done so. Scores below are qualitative editorial judgments, not Google metrics.

| Dimension | Initial /10 | Finding |
| --- | --- | --- |
| Natural English | 7 | Correct grammar; too many bureaucratic phrases |
| Reader clarity | 7 | Correct broad explanation of calendar methodology |
| Immediate reader value | 4 | Most pages lack current Panchang values |
| City originality | 5 | Excessive interchangeable sunrise descriptions |
| Daily Panchang query intent | 2 | No approved public daily records |
| Technical SEO structure | 7 | Canonicals and city paths exist; noindex and incomplete content block visibility |

The original pages told visitors about scientific/editorial verification instead of answering what a local Panchang means. Chennai V2 was filled with internal-review language, Delhi V3 was overlong and generic, and Mumbai V4 incorrectly described sunrise over the Arabian Sea and treated sunrise as though it were an alternative time zone to IST.

## Changes made
- Rewrote the three actual public city guides in direct conversational English. Text explains what a reader checks about sunrise, Tithi, transitions, and local conventions. No fabricated numbers or traditional observances.
- Moved public copy to data/city-guides.json for repeatable auditing.
- Gave each page a separate 144–154-character SEO meta description, rather than using the full intro.
- Replaced generic headings with reader-facing: Start with local sunrise, Why times can differ, How to check a calendar date.
- Added scripts/audit-city-content.mjs to CI. It checks actual shipped text for useful reader action, length, repetitive AI/approval boilerplate, basic copy distinctiveness, metadata and known bad sunrise assertions. It also reports shortcomings in generated SEO briefs across 25 research cities.
- Previously purchased R2 model drafts stay unchanged and are not regenerated.

## Remaining real risks
- Three guides cannot satisfy the full search intent of “Delhi Panchang today”. The approved daily records are still empty, and no indexing is enabled.
- Research questions for 17 additional cities are NOT sufficient verified evidence for user-valued local pages. The auto-composer flags unsupported specificity; release remains blocked. Some generated 17-city contexts still read like questions rather than finished editorial prose.
- A heuristic or AI detector cannot prove human-sounding writing, cultural appropriateness or factual accuracy. Sample real city/date outputs after scientific validation.
- Do not produce thousands of shallow geo-swapped paragraphs to increase URL count. Distinct reviewed local astronomical numbers and interpreted timings must deliver the useful differences.

Google references:
https://developers.google.com/search/docs/fundamentals/creating-helpful-content
https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
https://developers.google.com/search/docs/essentials/spam-policies

Next milestone: end-to-end transfer of original JPL calculations to private D1/R2, followed by an independently verified multi-city sample audit and helpful day-specific explanations. Neither private candidates nor the content audit tool automatically approve science or publication.
