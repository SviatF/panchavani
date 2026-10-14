# PANCHAVANI autonomous research + SEO release policy

## Delivered research automation

GitHub Actions workflow `.github/workflows/autonomous-research.yml` runs daily
at 02:17 UTC (GitHub schedules may be delayed), with manual dispatch available.
It downloads official NASA/JPL DE440s, verifies the pinned SHA-256, calculates
**2 local calendar days for 8 pilot cities**, validates deterministic invariants,
stores 16 **unapproved** result JSON files with their SHA-256 identifiers, and
uploads a private Actions artifact retained for seven days.

The job **does not publish to the public Next.js website** and does **not**
currently upload into private Cloudflare R2 or create jobs in D1. Connecting it
to D1/R2 requires a separately approved scoped service token and secret. The
existing `private-research-runner.yml` offers authenticated one-job processing
after those secrets are configured.

Astronomical data generation alone is not independent scientific validation.
Missing fully independently cross-checked Lahiri ayanamsa, Nakshatra/Yoga,
validated city locations and region/sect-specific festival + Muhurat rules are
intentional hard blockers. Even successful 16/16 nightly research does not mean
16 SEO pages are safe to publish.

## Non-negotiable SEO and data quality boundaries

1. Public website stays `noindex` while homepage values are illustrative.
   CI validates that **every** emitted static HTML page contains `noindex`.
2. Do not automatically generate city/date URL permutations from draft results,
   and never rewrite a city's name to fabricate local originality.
3. A future release needs provenance (JPL/algorithm/tzdb/city-coordinate
   revisions), convention-matched independent checks, expert ritual review,
   and an audit trail. Wedding, vehicle purchase, and Griha Pravesh
   recommendations are **not** emitted by the research engine.
4. Every public city page must provide actual useful city-specific evidence:
   sunrise, sunset, local daylight windows and observed transitions, clear
   Panchang methodology, real regional/sect differences where supported,
   human-reviewed explanatory content, and honest limitations.
   Shared geocentric transition instants must not be altered for "uniqueness".
5. Pages that lack sufficient unique utility are excluded from sitemap or
   consolidated, not automatically indexable. Use the existing
   `release_gate.release_blockers()` alongside editorial review before the
   future publication pipeline is implemented.
6. Google does not offer a guaranteed ranking or blanket assurance against
   automatic ranking changes. Publishing high-quality pages is necessary but
   not a guarantee of indexing.

Official Google guidance:
https://developers.google.com/search/docs/essentials/spam-policies
https://developers.google.com/search/docs/fundamentals/creating-helpful-content

## Next scientific priorities (still unimplemented)

- Use a pinned, independently validated Lahiri sidereal reference and compare
  Moon/Sun sidereal longitudes and every 13°20′ Nakshatra/Yoga boundary.
- Coordinate/elevation provenance for every pilot city.
- Two independently verified reference sources for a broad randomized corpus
  of event instants, with methodology-aware discrepancy classification.
- Vrat/Festival/Parana rule packs for specific calendar traditions and cities.
- Audit/review/public-release mechanism that never treats a candidate as
  editorially approved, plus SEO content quality reviews at URL granularity.
