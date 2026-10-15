# PANCHAVANI — public city/day bridge (three-city gate)

**Scope:** Delhi, Mumbai, Chennai. Built with Next.js `output: export`. Static pages are updated on build/deploy, **not** on visit, and incur zero model calls.

## Implemented

- `/panchang/`: browsable city directory with independent, informational city guides.
- `/panchang/delhi/`, `/panchang/mumbai/`, `/panchang/chennai/`: static city hubs. These contain **no fabricated current-day timings** and remain `noindex`.
- Date-specific review data is rendered only on the matching city hub **once approved**. Standalone date URLs are intentionally deferred because static export cannot build an empty dynamic route and no valid approved city-day release exists yet.
- Build-time data: `data/approved-panchang.json`, intentionally empty.
- `lib/public-panchang.ts`: checks the three pilot cities, UTC time validity, Tithi/Nakshatra/Yoga/Karana/Vara/Paksha completeness, two distinct evidence entries, human and scientific review fields and editorial source. An exact SHA-256 pinned outside the repository via `PANCHAVANI_APPROVED_RELEASE_SHA256` is required to use any nonempty release bundle.
- All built pages and the existing sitemap remain `noindex` / empty. There is no publication permission in this bridge; a separately reviewed release process must be implemented before any indexability changes.
- City selection in the public header and primary hero CTA now navigate to the corresponding city guide.

## Important status: NOT YET LIVE ASTRONOMY

The nightly JPL/Skyfield pipeline is a **research-only** producer. It currently sets `status=calculated`, `approvedBy=null`, `releaseId=null`, `blockerCount=4`, `ayanamsa=NOT_VALIDATED`, missing Nakshatra/Yoga, and unverified city locations. **None of these is eligible for public use**. The production `admin.panchavani.com/internal/runner/claim` previously returned 403 at Cloudflare Access/edge, so candidates also are not flowing into private D1/R2. Three actual DeepSeek samples have therefore not been generated.

Do **not** set a release SHA-256 simply to bypass verification. SHA pinning detects accidental changes to a *reviewed bundle*; it does NOT mathematically prove the factual quality, scientific independence, ritual correctness, or authority of the reviewers.

Before the FIRST calendar-day fact may be displayed publicly:
1. Obtain verified city station coordinates/elevation/horizon, fixed calendar conventions/ayanamsa/tzdb, complete six Panchang fields and independently reconciled transitions.
2. Produce audit evidence, independent reference comparisons, versioned sources, expert review and city-specific human editorial approval.
3. Run the existing Python `release_gate.release_blockers` plus `seo_review.audit_city_pages` on the full source record and cross-city corpus. Both must return zero outstanding blockers.
4. Human-author a reviewed release bundle `data/approved-panchang.json` matching the static schema. Record an independently reviewed SHA digest for `JSON.stringify(bundle)` via the build-time setting. Validate build and regression checks before deployment.
5. Review site canonical and specific metadata. Leave `noindex` until a **separate per-page SEO release** has been approved and sitemap/robots reflect precisely those pages.

There is currently **no automated conversion from raw research artifacts to approved pages**. That must remain absent until independent checks and editorial signoff are implemented and evidenced.

## DeepSeek cost controls

The separate private Admin Worker now has one-shot D1/R2 draft caching for the three pilot cities and no automatic retries after an uncertain paid attempt. This public site does not call the DeepSeek API at runtime and does not expose AI research drafts. Data review and Cloudflare deployment are still required.

## Date URLs after the first live review

The final `/panchang/{city}/{YYYY-MM-DD}/` route generator and its canonical/sitemap entries must be introduced only when at least one independently approved city-day record exists. The static export is intentionally not filled with dummy fallback dates.
