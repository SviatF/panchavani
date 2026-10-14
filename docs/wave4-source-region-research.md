# PANCHAVANI Wave 4 — External astronomy evidence and regional rule governance

Scope: 2026-10-14, research-only. No webpage or Muhurat publication in this wave.

## Machine-checkable research comparison

The JPL astronomy pilot now records a second, **explicitly unverified**,
source-data comparison via `panchavani.external_compare`. Its input uses
full ISO-8601 local timestamps with timezone offsets, explicit observation
precision, source identifiers, and optional independently documented
upstream method evidence. It checks city/date/timezone agreement,
phase labels, the distinction between genuine transitions and intervals
clipped by next sunrise, and timed discrepancies.

Delhi, 2026-10-13 (differences engine minus published clock values):

| Event | AstroSage | Drik Panchang |
|---|---:|---:|
| Sunrise | +16.81 s | +37.81 s |
| Sunset | -16.60 s | -6.60 s |
| End Shukla Tritiya | -38.367 s | +73.633 s |

Both sources carry **unknown upstream provenance and undocumented
computation methodology** in our machine-readable fixture. Thus this
is a *clock-time consistency check*, not independent scientific validation.
The temporary 120-second plus stated rounding-tolerance threshold is a
research discrepancy alert, not a claim of absolute accuracy.

Run via `.github/workflows/astronomy-pilot.yml`, which asserts six
compared events, their exploratory tolerance, explicit missing provenance
blockers and `publicationAuthorized=false`.

## Official source priority for authoritative fixture curation

- India Meteorological Department / Positional Astronomy Centre (PAC),
  *Rashtriya Panchang*, 2026–27: 
  https://packolkata.imd.gov.in/panchang/en/preface
- PAC numeric and city-specific civil-day tables:
  https://packolkata.imd.gov.in/panchang/en/tables
- PAC official explanation of Tithi, Nakshatra, Yoga, Karana:
  https://packolkata.imd.gov.in/panchang/en/explanation
- PAC published regional calendar distinctions:
  https://packolkata.imd.gov.in/panchang/en/regional-calendars

The government publication is an important primary source, but
**its actual date-specific values are not yet imported and checked**
against JPL in the current code. Before adding a normalized PAC fixture,
record the Gregorian date and any day exceeding 24:00, station, relevant
sunrise/refraction convention, reference frame, local time standard,
original dated source citation and review status. Never assume different
calendar traditions share identical observance dates.

## Regional festival, Vrat and Muhurat decision handling

`engine/panchavani/regional_rules.py` evaluates only an unapproved
Tithi-at-local-sunrise predicate. It requires a concrete city scope,
region, tradition, draft version and astronomy candidate, with a
separate consistency check of Tithi transitions vs sunrise.
`engine/panchavani/regional_rule_probe.py` is exercised on an actual
Delhi JPL research candidate by the pilot CI.

Important: the checked Shukla Tritiya value in the draft fixture is
**just a reproducible arithmetic test**, NOT an assertion of a festival
or fasting date. Even if the predicate matches, the evaluator always
returns `WITHHELD_PENDING_EXPERT_AND_METHOD_REVIEW`, with neither a
ritual recommendation nor sitemap/SEO permission.

Next steps still required before go-live:
1. PAC and another method-independent, **provenance-reviewed** reference
   dataset across the 8 cities and representative dates.
2. Versioned/geocoded city positions and documented solar event convention.
3. Specific Amanta/Purnimanta and regional festival/Vrat/Parana exception
   rules with independent tradition expert review and abnormal-day tests.
4. Signed release manifest and explicit human approval separate from
   calculators, followed by page-level original-content/SEO approval.
5. Only then convert approved data to Next.js static routes, with
   constrained sitemaps, rollback and `noindex` lifted per eligible page.

Google's scaled-content spam policy means large numbers of near-duplicate
city pages created for rankings alone are not a substitute for original
utility: https://developers.google.com/search/docs/essentials/spam-policies
