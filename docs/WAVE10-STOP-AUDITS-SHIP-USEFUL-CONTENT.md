# Wave 10 — Stop SHA audits, ship valuable PANCHAVANI content

## Source equivalence: technical investigation closed

Production Access audit supplied by the owner for 2026-10-16 across Delhi, Mumbai and Chennai establishes ALL parsed JSON fields identical between the SHA-verified D1 record and each R2 research source variant: allChangedPathCount=0, wholeJsonStructureEqual=true, jsonSerializationOnly=true, and no scientific/metadata changes. The two incoming source manifests carry identical source SHA for each respective city.

The three original byte-SHA differences are serialization-only; there is no value-level conflict to investigate further for these specific historical records. Preserve original versions without overwrites. Keep the existing human source-provenance and independent scientific approval status distinct: provenance signoff is still absent. Do not claim the astronomical method is scientifically validated merely because bytewise-distinct inputs parse to identical values.

## Evergreen city content — automated first cohort

Cloudflare Admin Worker opts in to AUTO_EDITORIAL_ENABLED=true, AUTO_EDITORIAL_CITY_IDS=delhi,mumbai,chennai. Its existing hourly Cron can prepare source-grounded ENGLISH evergreen city-hub copy for only those three cities, if the existing private DEEPSEEK_API_KEY, D1, R2 and qualifying research candidates are actually configured. Cron does not depend on an enabled GitHub live Runner when nightly candidate ingestion already exists.

Existing billing and safety invariants:
- At most ONE paid city-hub attempt per city/language across ALL candidate dates; do not regenerate already stored or failed one-shot slots.
- Maximum 3 automated paid attempts per 24h; only one new city per hourly Cron.
- Non-city-hub, festival, vrat, muhurat and unapproved daily factual content remain ineligible for new paid prompts.
- Never ask the model to invent numerical astronomy, ritual observances or local facts absent from its grounded brief.
- Private R2 AI_DRAFT_UNAPPROVED, reviewBlockers, original text and provider token counts are preserved.
- No public pages or sitemap created, sitewide noindex untouched.

Private Access-only review:
- /ai shows independent evergreen DeepSeek and research Runner status.
- /ai/quality-report now lists all 3 city guides, highlights missing one-shots and all quality problems, and screens cross-city copy overlap. It incurs zero provider calls.

## Measurable launch milestones (not more generic audits)

**Milestone 1: three genuinely useful evergreen city guides.** Human editor validates 3 complete, different city-specific questions with reader answers; source-grounded facts (including India Standard Time provenance), actionable comparisons, local relevance, distinct semantics and no unsupported astronomical numbers or tradition-specific practices. Revise flawed copy offline, not by automatic repeat paid generation. Existing city-hub HTML and routes are already built but remain noindex.

**Milestone 2: controlled first evergreen index release.** Create an independently approved per-URL city-guide whitelist and test the removal of inherited noindex only for selected high-quality city hubs. Tie the sitemap, canonical, X-Robots-Tag, HTML title and H1 to that exact whitelist. Never release unreviewed calendar dates or city guides merely because a model produced a draft. Deploy and live-smoke-test Googlebot-visible HTML; submit the approved sitemap to free Google Search Console.

**Milestone 3: six valuable city/day calendar pages.** Scientific domain reviewer signs one coherent method for pilot coordinates/altitudes/horizon, Lahiri reference frame, ephemeris, tzdb and tolerances. Reuse existing JPL, Swiss, PAC and continuous sunrise-to-sunrise 4-limb QA, but don't repeat unrelated historical audits. Generate first two CURRENT OR UPCOMING India-local dates for each city from the pinned engine, not stale Oct 16–17 demonstration dates. Build source-signed fact packets, prepare DeepSeek language edits only from APPROVED fact-ID allowlist, provide two grounded local evidence facts per city/day, verify useful Q&A and originality, and human-review each page. Only then whitelist each individually for Google indexing.

## Actual status and stop condition

Technical source JSON equivalence 3/3: determined. Scientific domain approval for astronomy and local observers: still unsigned. Production DeepSeek configured/charged: check live /ai; GitHub merging a flag does not prove a secret exists or that private drafts were created. Reviewed content: not yet approved. Public indexing: zero approved URLs. Don't count this as another scientific acceptance, and don't promise Google traffic until GSC measures it.

**Next thing to inspect after deploying this Wave:** /ai/quality-report and the three actual saved city drafts. The first delivery target is real reader value, not a new SHA comparison.
