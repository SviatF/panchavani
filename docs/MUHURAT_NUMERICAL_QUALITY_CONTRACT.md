# PANCHAVANI — Muhurat numerical accuracy contract

The independent reference profiles for Wedding and Vehicle Purchase already exist in `engine/fixtures/muhurat-reference-rulebook-DRAFT.json` with versioned documented criteria, source URLs, known method exceptions and outstanding applicability checks.

## What the engine calculates automatically

The ten-city JPL/Skyfield sunrise-to-next-sunrise grid is split at every Tithi/Karana/Nakshatra/Yoga crossing. The source rule engine screens Wedding and Vehicle conditions, applies Rahu Kaal based on the *actual sunrise-sunset interval* (8 segments), conservative 21:00 city-clock clipping for vehicle analysis, and a five-minute minimum duration. Research output explicitly records reason-coded rejections and the portions still requiring independent reference or ritual-rule checks.

New `muhurat_quality.py` checks all 20 city-days and 4×limb values for continuous time and validates every candidate: UTC duration vs reported time within 1 ms, absence of overlaps, total surviving seconds, reject-count integrity, and that each window retains unresolved checks and never claims an auspicious recommendation.

## Quantitative release metrics

- Source coverage: **20/20 city-days** with exactly 10 cities, 2 adjacent Indian dates.
- Four-limb identity: **4 labels per phase segment**, validated against name-number mappings.
- Local sunrise chain error: **<= 1 ms** for consecutive days at one city.
- Time partition gaps/overlap: **0**; duration residual **<=1 ms**.
- Retained preview intervals: **>=300 seconds**; no double-counting.
- Each rule reports **raw candidate windows, hours, percent of 20 nominal local days, and rejection causes**.
- Method sufficiency: **false** until city reference point, sidereal Lahiri reference, ritual region policy and event-specific Lagna/Asta/missing obligations are met and reviewed.

Passing the numerical gate proves **internal computational consistency only**, not agreement with an authoritative source across all dates, nor independent certification of a Muhurat.

## Immediate real constraints

* Wedding: Nakshatra Pada exception windows, forbidden Yoga Visha-Ghati boundaries, solar months, Chaturmas/Adhika/Kshaya Masa, Guru/Shukra Asta and relevant tradition/person-specific conditions are not fully implemented or validated.
* Vehicle Purchase: full permitted/prohibited Tithi Shuddhi and place-specific Chara/Dwiswabhava Lagna are absent. The existing 21:00 conservative trim is **not identical** to the source convention of discarding windows starting after 21:00; do not silently equate them.
* DeepSeek writes explanatory prose only when provided reviewed facts; this QA output is private research and supplies zero approved claims.
* Public date pages and Muhurat recommendations remain blocked until all applicable requirements are implemented and verified. The 10 existing educational evergreen city pages and sitemap remain unchanged.

Reference methodology sources:
- https://www.drikpanchang.com/shubh-dates/info/choosing-auspicious-marriage-date.html?lang=en
- https://www.drikpanchang.com/shubh-dates/vehicle-buying-auspicious-dates-with-muhurat.html?geoname-id=1261481&time-format=24hour&year=2026

A current CI report with zero overlap and full data coverage is evidence that the *software calculation* is correct as implemented, not that a full traditional recommendation is ready.
