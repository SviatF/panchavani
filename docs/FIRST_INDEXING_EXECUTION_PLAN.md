# PANCHAVANI — one roadmap to first indexable calendar pages

Status: **PRE-INDEX / NO PUBLIC SCIENCE RELEASE** (16 October 2026).
This file supersedes treating each GitHub astronomy QA wave as a separate launch milestone.

## Product objective

A person selecting a **city + local date** must get a truthful, clear Hindu Panchang:
- six active-at-sunrise astronomical limbs (Tithi, Karana, Nakshatra, Yoga, Vara, Paksha);
- independently reconciled **local sunrise/sunset**, the following sunrise and event timelines expressed in IST with correct next-day attribution;
- calendar-rule and uncertainty explanations rather than invented auspicious Muhurat or festivals;
- original city-specific answers grounded in independently verified local facts, never a city-name swap.

### City-specific vs shared astronomy

- Sunrise and sunset depend on reference coordinates, elevation, horizon and local date; calculated at the *selected city point*.
- Geocentric phase crossings (Tithi/Karana, Nakshatra/Yoga under a shared model) are physical instants; they should NOT be numerically altered to manufacture unique pages.
- Different local sunrise may mean a different active Tithi at sunrise even when the global instant of a lunar boundary is shared.
- Regional traditions are separate reviewed rule packs (Amanta/Purnimanta, festival assignment, vrat/parana, Muhurat). No inference from a naked astronomical transition.
- Distinct editorial value comes from real local calculations, actual dawn relationships and **individually sourced** local reading questions, not generic geography padding or keyword spinning.

## Actual status

| Gate | Current evidence | Launch state |
|---|---|---|
| JPL DE440s and Skyfield research | SHA-pinned calculation + internal numerical tests | Research passes, not independent certification |
| External Tithi/Nakshatra/Yoga/Karana checks | 16 Oct official PAC central station 5/5 observations numerically close | One date, transcribed/unreviewed, different station; **not approval** |
| 25 city catalog | Preliminary city centers and elevation | **BLOCKED** until each pilot reference point validated |
| Lahiri method | Experimental epoch anchor | **BLOCKED** until independently calibrated across edge-case corpus |
| Timezone/refraction/conventions | Unpinned tzdb, provisional horizon and site coordinates | **BLOCKED** |
| 16 Oct Delhi/Mumbai/Chennai SHA source conflicts | Private \`/research/conflicts\` comparison implemented | **BLOCKED** pending production deploy and actual source review |
| Public calendar | No independently approved records | **0 approved day URLs** |
| SEO content | City educational guides + private DeepSeek research drafts | **0 day articles human-approved** |
| Indexing | Global noindex; empty SEO whitelist and sitemap | **0 permitted URLs** |
| Production accessibility | Cloudflare not live-smoke-tested here | **UNVERIFIED** |
| GSC | No confirmed panchavani.com property access from available reporting connection | **UNVERIFIED** |

## Executable phases (each has measurable exit conditions)

### Gate A — Finish a trustworthy 3-city science pilot
Scope: Delhi, Mumbai, Chennai. No 25-city production scale yet.

1. Record authoritative reviewed city point latitude/longitude/elevation, source URI, timezone/tzdb version, horizon convention. Define whether source compares against civil city center or official observatory; do not conflate.
2. Independently compare JPL/Skyfield against an independently implemented reference using **matched methods**, or document why methods differ. Include full Tithi/Karana and Nakshatra/Yoga event boundaries and day attribution, seasonal/edge cases and month turnover. Pin reproducible ephemeris and exact Lahiri calibration.
3. Investigate every recorded same city/date SHA conflict without overwriting historical objects; record all field differences and disposition. Independently reconcile each selected candidate.
4. Predefine event tolerances by reference method and printed precision; do not pick a window *after seeing deltas*. Separate numeric root-finder precision from physical-model accuracy.
5. Scientific reviewer explicitly signs the first selected city/day records. Keep unsupported rituals absent.

**Exit:** zero unresolved critical science discrepancies for the selected pilot, independently traced city location and methodology, complete six-limb timelines, attached reviewer evidence; zero unresolved source hash for selected records. Other cities may remain research-only.

### Gate B — Produce evidence-based city-and-day value, not city-name templates
1. Use reviewed \`recordId/source SHA\` + local sunrise, following sunrise and complete 4-limb interval timelines. Generate deterministic **fact packets**, not model-invented numbers.
2. Include localized differences only when supported: e.g. local sunrise vs a shared Tithi crossing, whether a boundary falls during local daylight, and the exact following local date.
3. Require a city/day answerable reader question, two **sourced city-specific local facts**, source links, evidence IDs, methodology version and a verified context section. Do not attribute generic IST facts to Delhi alone.
4. DeepSeek edits explanation language only after approved fact-ID allowlist. One-shot/cache, no retry loops; require quoted fact IDs or refuse ungrounded claims. Human editor reviews English copy (and Hindi separately if later launched).
5. Compare across cities **after removing city names**. Duplicate paragraphs/FAQs, shared boilerplate as main content, fictional observances and unattributed local claims fail.

**Exit:** at least 3 completed pilot **city hubs**, and 2 separately reviewed city/day explanations per pilot city (6 city/day pages), where pages provide real answer value and all machine-detected editorial blockers are resolved. This is a practical starting target, NOT permission to artificially create 6 filler pages.

### Gate C — Pre-index release mechanism and live smoke test
1. Attach per-URL signed data/editorial approval manifest with reviewer identity, references, source hash, canonicals and last substantial update. Store original QA reports/rollback release SHA.
2. Permit index/follow *only* for the individually approved target URLs; keep all other URLs noindex or 404. Ensure inherited sitewide robots directives do not contradict approved leaf metadata.
3. Generate sitemap from the exact same SEO whitelist. Never from a raw calendar compute, DeepSeek draft, or generated date permutation.
4. Validate deployed Cloudflare HTML (not just CI): HTTPS 200, hostname redirect, canonical, unique title/H1/meta, mobile, no soft 404, sitemap whitelist, robots and Googlebot HTML.
5. Keep festival, vrat, Muhurat, wedding and unreviewed region pages noindex.

**Exit:** every sitemap URL is independently approved, accessible and indexable; every other emitted HTML remains noindex. Rollback is repeatable.

### Gate D — First Google Search Console indexing
1. Confirm panchavani.com ownership in Search Console and verified Domain/URL property.
2. Submit ONLY approved sitemap and inspect 2–3 representative live URLs.
3. Track indexing decisions, selected canonicals, impressions/queries, helpfulness issues and genuine organic visitors. No promise of ranking or indexing deadline.
4. Grow from **3 city hubs + 6 city-days** to 25-city coverage only after science and editorial evidence is supplied per city/day.

## Code added in Wave 6

- \`scripts/approved-day-value-gate.mjs\`: checks date identity, next local sunrise, phase timeline continuity and label-at-sunrise across all four layers, Tithi/Karana crossing agreement, two properly sourced local facts, a useful Q&A, scientific/editorial reviewer fields, normalized-text similarity and same-day cross-city sunrise identity.
- \`scripts/generate-reviewed-pages.mjs\`: enforces these conditions before generating physical routes even if a digest is present. A SHA digest never equals astronomical approval.
- \`lib/public-panchang.ts\`: requires the new richer approved format, still reads zero reviewed records.
- \`components/reviewed-day-page.tsx\`: shows reviewed event timeline (including next-day date), local daylight context, source citations and a specific reader answer, instead of only 6 field labels.
- \`npm run audit:preindex\`: produces an honest fail-closed readiness summary without deploying/indexing; \`node scripts/audit-first-indexing-readiness.mjs --require-ready\` exits with error until the first evidence-backed release can be considered for human approval.
- All synthetic records in unit tests are explicitly **NOT** actual reviewed astronomy; no test fixture is published, paid DeepSeek called or production Cloudflare modified.

## Mandatory follow-ups after Wave 6 (not yet performed by this PR)

The independently approved real records, release signing workflow, GSC submission and real Cloudflare deploy are **not** created by passing this code/test gate. A new standalone per-URL SEO publish whitelist, reviewed-only sitemap metadata and deployment validation need implementing once Gate A / Gate B pilot evidence is usable. Do not weaken global noindex until then.

## Google's standards

- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- https://developers.google.com/search/docs/essentials/spam-policies

Google does not require that generative AI be absent; it requires substantive, accurate content created primarily for people. Programmatically generating many interchangeable location URLs without independent value risks scaled content abuse.
