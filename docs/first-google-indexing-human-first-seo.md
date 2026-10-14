# PANCHAVANI — First Google Search Console indexing release plan

**Status, 14 Oct 2026:** 25 research cities, including 17 new locations. NONE
are scientifically approved or ready for indexable city Panchang pages. The
public Next.js site remains a visual/concept preview with global `noindex`.
Never claim Google indexing, CTR or rankings from an automated CI check.

## Quality policy: no scaled pages for their own sake

The objective is *useful, trustworthy, city-specific Panchang information*,
not high numeric "uniqueness percentages". Rewriting generic prose or
automatically substituting city names does **not** make content original.
Design and navigation may use reusable components; the **main page content**
should genuinely resolve a distinct question supported by city-specific data.

No sentence in the editorial research briefs is publishable copy. The
17 pending briefs live in:
`engine/editorial/expansion-17-research-briefs.v1.json`.
They define 17 **different city research questions** rather than mass
producing city pages with artificial filler. A reviewer must obtain and
review primary evidence, report real astronomical results, and then write
a reader-facing explanation.

### Exact page requirements before editorial approval

Each city hub /panchang/{city}/ should have:
1. Clearly identified city and chosen astronomical reference point, timezone,
   verified latitude/longitude/elevation and relevant horizon convention.
2. Authentic reviewed sunrise/sunset, Tithi, Nakshatra, Yoga, Karana, Vara,
   active-at-sunrise results **with correct local clock, date and transition
   intervals**; do not fill unverifiable limbs with plausible values.
3. Explained how dates/times were derived: JPL kernel version, Skyfield
   version, validated Lahiri implementation, calendar tradition, tzdb
   version, timestamps, data publication and review dates, provenance links.
4. A distinct **original editorial argument**, not synonyms for the same
   paragraph: e.g. Ujjain's historical calendar reference versus its modern
   mapped city center, Kerala's solar month conventions, or city-local
   sunrise implications compared with another verified station.
   Verify every religious/historical/local claim with an accountable source.
5. Real-world usefulness: accurate next-day Tithi changes, a clear
   sunrise-to-sunrise explanation, readable IST timestamps (not raw JSON,
   UTC ISO values, database fields or programmatic identifiers), and
   page-specific follow-up questions answered with sources. If such useful
   evidence is absent, leave the page **noindex** or don't create it.
6. Honest review provenance: named actual editor and tradition specialist
   where religious guidance is provided; no invented credentials or
   fabricated bylines; documented evidence and when it was checked.
7. Technical checks: readable HTML H1 and title/description, working
   internal `<a>` links, self-referencing canonical, 200 status, mobile
   layout, no soft 404 or hidden main text, no conflicting robot directives.
8. Source-backed local FAQ **only if it answers a real user question**.
   Do not generate 5 interchangeable FAQ questions for every city.
9. Human copyedit for natural English/Hindi; remove repetitive listicles,
   stilted stock phrases and unsourced superlatives. Automated AI-text
   detection is unreliable. Human expert review is the decisive gate.
10. No automated indexability from computational success. Require
    provenance-checked scientific and ritual approval AND page-specific
    editorial signoff in a versioned release manifest.

### Production prerequisites (do not weaken gates to meet an arbitrary deadline)

**Data:**
- Verify the 17 new city-center points against dated sources and measured
  elevation; the registry elevations remain preliminary *estimates*.
- Calibrate station/horizon/refraction against official PAC solar methods.
- Independently check and pin Lahiri Ayanamsa, Tithi/Nakshatra/Yoga/Karana
  transition conventions on a broad sample (2026 official PAC pilot isn't
  a comprehensive reference corpus).
- Pin Skyfield/JPL/tzdb inputs. Version tradition-specific
  Amanta/Purnimanta/Samvatsara/festival/vrat/parana differences. No wedding
  or Muhurat recommendations from raw Tithi/Nakshatra alone.
- End-to-end candidate → review → dual approval → signed release →
  rollback with immutable source checksums. Do not allow the existing
  private research/D1/R2 runner to publish directly.

**Editorial:**
- Convert only selected researched briefs into original expert-reviewed
  English and optionally Hindi pages; add real named authors, dates,
  checked local data and original distinct explanations.
- Compare pages semantically and manually. Shingle similarity catches
  obvious location swaps but cannot reliably judge originality or
  "AI appearance". The current quality gate intentionally blocks
  all research-brief URLs and adds zero pages to Google.
- Shared world-event instants **must stay mathematically identical**
  between cities. Don't manipulate astronomy to "make it unique".
- Launch fewer genuinely useful hubs, *not* 25 cities × 365 daily empty pages.

## Step-by-step first Google indexable pilot

Phase 1 — trusted, useful static pages only:
- Complete authoritative non-calendar pages: methodology/ephemeris,
  source quality & uncertainty, about/editorial policy, contact and
  real homepage service description. These should describe actual,
  existing operations, not advertise unavailable functions.
- As city data earns approval, start with **two to four genuinely finished
  city hubs**, chosen based on independent reference coverage; not
  automatically all 25. A possible initial research shortlist is
  Delhi, Mumbai, Chennai, Varanasi; selection depends on verified evidence.
- Do **not** open current synthetic/draft regional, Muhurat, festival or
  city-date URLs to indexing.

Phase 2 — implement an actual page-level publication whitelist:
- Build only manifest-approved pages with server-rendered/static HTML;
  all other route outputs keep `noindex` (or 404).
- Explicitly set `index, follow` *only on approved pages*, removing any
  **inherited** global `noindex` and contradictory X-Robots-Tag.
- Correct production `metadataBase`/canonical URLs after domain is LIVE.
  One canonical URL per distinct useful page. No accidental workers.dev,
  www/non-www or query-param canonical split.
- Generate `robots.txt` and `sitemap.xml` from the **same signed
  approval whitelist**, excluding unapproved/noindex and 404 URLs.
- Link the approved pages through helpful internal navigation; verify
  HTTP 200, render in Googlebot-compatible HTML, responsive UX, clean
  typography, and accurate structured data only where appropriate.
- CI must assert **every** sitemap page is indexable and present,
  and **every non-approved route** remains noindex. No global flag flip.
- Increment rollout with an explicit rollback and monitoring plan.

Phase 3 — Google Search Console:
- Serve the intended live hostname, e.g. https://panchavani.com, over
  HTTPS with working DNS, canonical host redirects, and accessible HTML.
- Add a **Domain property** in Google Search Console and verify ownership
  through a DNS TXT record (or an appropriate URL-prefix verification).
  Domain setup requires the domain owner's actual access.
- Verify selected pages are not blocked by robots.txt or `noindex`.
  Under URL Inspection check live HTTP, detected canonical and render.
- Submit the **approved-only** sitemap in Search Console; inspect and
  request indexing for two or three highest-value live URLs.
- Review Page Indexing, Search results/Performance, crawl errors and
  chosen canonicals. Google chooses whether and when to index pages;
  neither sitemap submission nor inspection guarantees indexing.
- After evidence of indexation, add city hubs and eventually city-date
  pages only when each one has independently useful data.

**Do not request indexing of today's globally noindexed prototype.**
Current `app/layout.tsx` explicitly sets `robots: {index:false,follow:false}`
and CI asserts the `noindex` token on every built HTML route.

Useful official Google documentation:
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- https://developers.google.com/search/docs/essentials/spam-policies
- https://developers.google.com/search/docs/crawling-indexing/block-indexing
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://support.google.com/webmasters/answer/9008080
- https://support.google.com/webmasters/answer/9012289

## Current readiness summary

- 25 city *research* records, 17 new expansion city records. Site pages: 0
  new public city URLs. Local elevations/source coordinates unreviewed.
- Daily science workflow dynamically shards 25 sites, maximum 12 per
  shard and max 6 jobs parallel; completeness and checksums required.
- Basic editorial duplicate/placeholder checks and 17 distinct research
  directions exist. **0 authored and independently approved city pages.**
- PAC reference runs are evidence of preliminary numerical agreement, not
  methodological/ritual certification.
- Next milestone: documented 25-city geodata and independent source
  verification + 2-4 audited city editorial pages + per-URL release system.
- Google Search Console first-indexability is BLOCKED until approved
  pages are deployed and `noindex` lifted ONLY for them.
