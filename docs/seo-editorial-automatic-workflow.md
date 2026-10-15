# PANCHAVANI · Automated SEO editorial workflow (research-safe)

## What changed: stop manually rewriting city SEO snippets
The source of uniqueness is the *real search intent and available source facts*,
not prompting DeepSeek to invent city geography. A single, paid DeepSeek
completion drafts concise educational prose, while `seo-automation.mjs`
deterministically composes the title, meta description, grounded locality,
canonical path and one helpful FAQ. The original response is preserved as
`rawModelDraft`; the final normalized `draft` and automated repairs are
saved in the *same* private R2 one-shot artifact (no second completion).
City-specific plans come from the active catalogue plus versioned research
briefs; official IST background is referenced to CSIR-NPL. Provisional
coordinates, lunar values and region-specific ritual claims are not treated as
scientifically verified facts.

## Automatic city batch
Existing `panchavani-admin` Cloudflare Worker already has hourly cron configured.
Set **AUTO_EDITORIAL_ENABLED=true** (only when ready to incur limited API costs)
and optionally set `AUTO_EDITORIAL_CITY_IDS` to comma-separated active city
slugs. Defaults to Delhi, Mumbai, Chennai; at most ten active city slugs.
The cron picks the earliest *available stored candidate* with no prior
`city-hub` one-shot in that city/language. It invokes the same authenticated
server-side generation code, with max 3 reservations/24h and one request per
cron run. No city candidate means no call, and any stored/failed/reserved
city-hub prevents reuse in a later date. A cross-date atomic D1 `INSERT ...
SELECT WHERE NOT EXISTS` blocks simultaneous claims on another date.

Do not also enable `AUTO_RESEARCH_ENABLED` solely for this: the current
GitHub Runner -> Cloudflare edge 403 issue remains unresolved. The scheduler
can process only research candidates previously imported into private D1/R2.
More cities need their JPL candidates delivered through a working authenticated
pipeline, but **no longer need one form submission per page**.

## SEO constraints
Evergreen city guides are written once per city/language rather than one
DeepSeek completion for every day. For the real daily Panchang, numerically
approved day facts must be combined programmatically from reviewed city/day
science. We intentionally do **not** generate filler daily AI pages from
unapproved research. A consistent publisher and a reviewed per-URL sitemap
release remain required. Raw model output is NEVER automatic publication.
This is a cost-effective automation and a grounded content structure, not a
guarantee of rankings, search indexing, independent source accuracy, or page
uniqueness beyond its supplied evidence. Only pages adding substantial
original information should be published.

## Existing paid drafts
Delhi V3, Chennai V2 and Mumbai V4 are immutable. Old slots are not reset
and old data is never relabeled as created by this engine. The first auto
city-hub run after opt-in will skip Mumbai if its slot already exists and
will use no new calls for previously generated content.

## Reference
- IST official time source: https://www.nplindia.org/clockcode/html/
- Google AI content policy: https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
