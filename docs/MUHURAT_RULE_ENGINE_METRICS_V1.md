# PANCHAVANI · Wedding + Vehicle Purchase Rule Engine — measurable v1

## What is implemented

**Source-based Panchang Shuddhi RESEARCH screener**, version `source-screening-2026-10-v1`. It reads complete JPL-derived Tithi/Karana/Nakshatra/Yoga grids from the ten-city daily workflow, not DeepSeek text. It runs after the 20 exact city-day intersection grids and produces a versioned, JSON SHA-linked audit with explanation for every prefiltered window.

The methods are adapted as an expressly declared **Drik Panchang documentary reference convention**, rather than a claim that all Hindu communities or authorities agree. Publisher dates/paragraphs are not copied or scraped into public outputs; independent versioned calculation and diagnostic explanations are produced.

| Screening stage | Wedding reference | Vehicle reference |
|---|---|---|
| Nakshatra | 11 published Nakshatras (IDs 4,5,10,12,13,15,17,19,21,26,27) | conservative 5 listed *movable* Nakshatras (IDs 7,15,22,23,24) |
| Nakshatra Pada | Magha + Mula first, Revati fourth explicitly withheld without computed Pada | no Pada-specific claim |
| Nitya Yoga | nine designated Yogas withheld as conservative **whole intervals**; some source methodology excludes only Visha Ghati, which requires a separate model | not independently selected here |
| Karana | Vishti, Shakuni, Chatushpada, Nagava excluded | pending Tithi/Shuddhi rule-pack |
| Tithi + weekday | source explains these are not part of its main marriage Panchang Shuddhi (optional reference noted only) | weekdays Tuesday and Saturday excluded in this documented vehicle reference; Tithi Shuddhi remains UNCOMPUTED |
| Rahu Kaal | not represented as universally marriage-excluded here | calculate actual *city* sunrise–sunset / 8 and subtract weekday indexed interval; Sunday=8, Mon=2, Tue=7, Wed=5, Thu=6, Fri=4, Sat=3 |
| late night | no arbitrary cutoff | **Panchavani conservative** cut at 21:00 IST of original local solar date. Source describes dropping windows *starting* after 21:00; our stricter trim MUST NOT be described as the source's exact implementation |
| minimum returned preliminary window | 300 seconds AFTER merging contiguous good phase intervals; keep exact subsecond UTC boundaries | 300 seconds AFTER Rahu and 21:00 clipping |
| Lagna, Asta, solar month, Chaturmas, rule/personal validation | explicitly **NOT VERIFIED**; no Shubh Muhurat allowed | Lagna + other observance/tradition checks **NOT VERIFIED**; no Shubh Muhurat allowed |

## Strict scientific and engineering metrics

The daily report contains:

- Exactly **10** city IDs and **20** local sunrise-to-next-sunrise dates;
- Actual count of input atomic phase slices and **4 × N** verified labels;
- **0** accepted time gaps/overlaps, **≤1 ms** per time-slice duration error, **≤1 ms** cross-day sunrise discontinuity;
- Absolute day durations **20–28 hours** and sunrise < sunset < following sunrise, timestamps verified against IST display to <1s;
- Exact SHA-256 of original raw JPL grid file + exact SHA-256 of the rulebook used;
- Two source-versioned profiles, per-reason *nonexclusive* veto counts, first-stage match intervals (not auspicious), lengths and UTC/IST, Rahu subtraction operation count, explicit pending checks;
- Every profile reports **0 independently authorized auspicious dates**, no approved model facts, **no indexing** and **no automatically paid DeepSeek prompts**.

The first-stage match count is not a probability of correctness, a ranking, a "shubh" certification or a favorable date recommendation. If phase geometry is inconsistent or a field is missing the entire run fails.

## Documented sources

1. Wedding convention and Karana / solar months / Shukra-Guru Asta:
   https://www.drikpanchang.com/shubh-dates/info/choosing-auspicious-marriage-date.html?lang=en
2. The 11 Nakshatras and specific Pada exceptions:
   https://www.drikpanchang.com/panchang/nakshatra/auspicious-marriage-nakshatra.html
3. The nine marriage Yoga, including **Visha Ghati nuance**:
   https://www.drikpanchang.com/panchang/yoga/prohibited-marriage-yoga.html
4. Vehicle purchase source method, city-based Rahu/Kaal, minimum 5 min and 21:00 policy:
   https://www.drikpanchang.com/shubh-dates/vehicle-buying-auspicious-dates-with-muhurat.html?geoname-id=1261481&time-format=24hour&year=2026
5. Independent Python reference implementation of daylight eighths:
   https://github.com/rahulyhg/drik-panchanga-skaligotla/blob/master/panchanga.py

Reference links are evidence of a **specific publisher's methodology**, not peer-reviewed astronomical accuracy or permission to republish its content.

## Next to make real Shubh Muhurat

1. Fix and sign one Lahiri/solar-observer conventions for the ten cities, including timezone and horizon assumptions.
2. Implement Guru/Shukra Asta and solar-month/Chaturmas evidence with exact rule variants; Nakshatra Pada, Yoga's Visha Ghati ranges.
3. Complete source-exact Vehicle Tithi Shuddhi, Lagna and other region/tradition rules; verify against explicit city/date outputs, no superficial automated "expert" approval.
4. Add real independent scientific and ritual reviewers to a **signed** approval pipeline; allow DeepSeek **only** those approved numeric claims.
5. Deliver reviewed Wedding/Vehicle windows on public site and in an approved sitemap, not the unreviewed research matches.

**Deployment:** This source-targeted work belongs to the already connected scheduled GitHub Actions researcher and private R2; it intentionally does not put more routes on public Next.js or change the existing ten indexed educational guides.