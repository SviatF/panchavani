"""Monthly, ten-city research-only calendar and editorial seed pipeline.

Consumes *already calculated* immutable two-day JPL research batches. This
never creates indexable pages, AI calls, public assets, or an approved record.
The real calendar month must be complete; partial or conflicting inputs abort.
"""
from __future__ import annotations

import argparse
import calendar
import hashlib
import json
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from .first_six_limb_pilot import KINDS, TEN_CITY_IDS
from .rolling_day_previews import make_rolling_previews

IST = ZoneInfo("Asia/Kolkata")
ARTIFACT = "PANCHAVANI_MONTHLY_CITY_DAY_CONTENT_RESEARCH"
MONTHLY = "PANCHAVANI_MONTHLY_CITY_RESEARCH_OVERVIEW"
FAIL_CLOSED = {
    "scientificApproval": False,
    "ritualEligibilityApproved": False,
    "muhuratRecommendationsAuthorized": False,
    "modelInvocationAuthorized": False,
    "paidGenerationAuthorized": False,
    "publicationAuthorized": False,
    "indexingAuthorized": False,
    "approvedClaimsForDeepSeek": [],
}


def month_days(month: str) -> list[date]:
    if not isinstance(month, str) or len(month) != 7 or month[4] != "-":
        raise ValueError("Month must be exact YYYY-MM")
    try:
        year, number = int(month[:4]), int(month[5:])
        count = calendar.monthrange(year, number)[1]
    except (ValueError, IndexError):
        raise ValueError("Invalid month") from None
    if not 2020 <= year <= 2099:
        raise ValueError("Research date out of scoped range")
    return [date(year, number, d) for d in range(1, count + 1)]


def batch_starts(month: str) -> list[str]:
    """Two-day input cohorts; last cohort may extend into next month."""
    return [day.isoformat() for day in month_days(month)[::2]]


def _iso_local(timestamp: str) -> str:
    t = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    if t.utcoffset() is None:
        raise ValueError("Naive source timestamp")
    return t.astimezone(IST).isoformat(timespec="seconds")


def _sha_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _event_facts(record: dict) -> list[dict]:
    stop = datetime.fromisoformat(record["sun"]["sunsetUtc"].replace("Z", "+00:00"))
    facts = []
    for kind in KINDS:
        segments = record["transitions"][kind]
        for current, next_item in zip(segments, segments[1:]):
            event = datetime.fromisoformat(current["endUtc"].replace("Z", "+00:00"))
            facts.append({
                "kind": kind,
                "from": current["name"],
                "to": next_item["name"],
                "eventUtc": current["endUtc"],
                "eventIST": _iso_local(current["endUtc"]),
                "relativeToSunset": "before" if event < stop else "at-or-after",
            })
    return sorted(facts, key=lambda x: (x["eventUtc"], x["kind"]))


def _daily_copy(record: dict, previous: dict | None) -> tuple[str, list[dict]]:
    city, day = record["cityName"], record["localDate"]
    values = record["panchangAtSunrise"]
    events = _event_facts(record)
    sunrise = _iso_local(record["sun"]["sunriseUtc"])
    sunset = _iso_local(record["sun"]["sunsetUtc"])
    changed = [
        kind for kind in ("tithi", "karana", "nakshatra", "yoga")
        if previous is not None and
        previous["panchangAtSunrise"][kind] != values[kind]
    ]
    comparison = (
        "Compared with the preceding city's recorded dawn, sunrise labels changed: "
        + (", ".join(changed) if changed else "none of the four lunar components")
        + "."
    ) if previous is not None else (
        "The preceding day's calculation is outside this month's evidence; "
        "no previous-day comparison is claimed."
    )
    if events:
        first = events[0]
        event_line = (
            f"The first modeled phase boundary after local sunrise is "
            f"{first['from']} → {first['to']} ({first['kind']}) at "
            f"{first['eventIST']} IST, {first['relativeToSunset']} the modeled sunset."
        )
    else:
        event_line = (
            "No four-limb phase boundary appears between the modeled sunrise "
            "and following sunrise in this research record."
        )
    lines = [
        f"# {city} Panchang research brief — {day}",
        "",
        "> UNAPPROVED SCIENTIFIC RESEARCH — NOT PUBLIC CALENDAR ADVICE.",
        "",
        "## Reader question",
        f"What changes between local sunrises in {city} on {day}?",
        "",
        "## Reproducible, city-specific observations",
        f"- Modeled sunrise: {sunrise} IST",
        f"- Modeled sunset: {sunset} IST",
        f"- Next modeled sunrise: {_iso_local(record['sun']['nextSunriseUtc'])} IST",
        *[f"- {kind.title()} at local sunrise: {values[kind]}" for kind in
          ("tithi", "karana", "nakshatra", "yoga", "vara", "paksha")],
        "",
        "## What this date's data actually tells the reader",
        event_line,
        comparison,
        f"The calculation contains {len(events)} lunar-component boundary "
        "events across this local sunrise-to-sunrise interval. Shared "
        "geocentric transitions are not artificially shifted by city; "
        "local sunrise and sunset depend on the observer point.",
        "",
        "## Unreviewed scientific limitations",
        "City geodata, optical horizon/refraction, independent Lahiri calibration "
        "and regional ritual criteria require separate verification.",
        "No festival, fast or Muhurat recommendation is inferred here.",
        "This is a private editorial evidence brief, not an indexable page.",
        "",
    ]
    return "\n".join(lines), events


def build_monthly_content(month: str, batches: list[tuple[str, dict, str]]) -> tuple[dict, dict[str, str]]:
    days = month_days(month)
    expected = batch_starts(month)
    if not isinstance(batches, list) or sorted(x[0] for x in batches) != sorted(expected):
        raise ValueError("Missing, duplicate or out-of-month two-day source cohorts")
    observed = {}
    sources = []
    for start, batch, source_sha in sorted(batches):
        if not (isinstance(source_sha, str) and len(source_sha) == 64
                and all(ch in "0123456789abcdef" for ch in source_sha)):
            raise ValueError("Source batch SHA-256 required")
        research = make_rolling_previews(batch)
        if research["dateFrom"] != start:
            raise ValueError("Batch start does not match independent date metadata")
        sources.append({"startDate": start, "batchSha256": source_sha})
        for record in batch["records"]:
            date_key = record["localDate"]
            if not date_key.startswith(month + "-"):
                continue  # trailing day belongs to next month, not this release
            key = (record["cityId"], date_key)
            if key in observed:
                raise ValueError("Duplicate city/day in monthly evidence")
            observed[key] = record
    required = {(city, d.isoformat()) for city in TEN_CITY_IDS for d in days}
    if set(observed) != required:
        raise ValueError("Incomplete calendar month or missing city research")
    briefs: dict[str, str] = {}
    rows = []
    by_city = {}
    for city in TEN_CITY_IDS:
        previous = None
        sunrise_times = []
        city_rows = []
        for day in days:
            record = observed[(city, day.isoformat())]
            markdown, facts = _daily_copy(record, previous)
            filename = f"days/{city}-{day.isoformat()}-UNAPPROVED.md"
            if filename in briefs:
                raise ValueError("Duplicate research filename")
            briefs[filename] = markdown
            sunrise_times.append(_iso_local(record["sun"]["sunriseUtc"]))
            row = {
                "cityId": city, "localDate": day.isoformat(),
                "dayBriefPath": filename, "dayBriefSha256": _sha_text(markdown),
                "modeledSunriseIST": sunrise_times[-1],
                "modeledSunsetIST": _iso_local(record["sun"]["sunsetUtc"]),
                "sunrisePanchang": {
                    key: record["panchangAtSunrise"][key]
                    for key in ("tithi", "karana", "nakshatra", "yoga", "vara", "paksha")
                },
                "transitionCount": len(facts),
                "transitions": facts,
                "scienceMethodVerified": False,
                "publicReaderValueReviewPassed": False,
                **FAIL_CLOSED,
            }
            rows.append(row)
            city_rows.append(row)
            previous = record
        if len(city_rows) != len(days):
            raise ValueError("Incomplete city monthly calendar")
        first, last = sunrise_times[0], sunrise_times[-1]
        monthly_md = "\n".join([
            f"# {city.title()} — {month} calendar research overview",
            "",
            "> UNAPPROVED — private science/editorial working material only.",
            "",
            f"This research cohort contains {len(days)} complete local solar days.",
            f"The modeled first-day sunrise is {first} IST; the final day's sunrise is {last} IST.",
            f"Across the recorded month there are "
            f"{sum(x['transitionCount'] for x in city_rows)} phase-boundary instances.",
            "These are observations, not festival dates, fasting assignments "
            "or auspicious Muhurat windows.",
            "",
            "## Questions to be checked before any reader-facing release",
            "- Were observer coordinates and optical horizon matched to a reliable reference?",
            "- Was the exact Lahiri convention independently validated?",
            "- Are the daily and monthly explanations genuinely useful rather than repeated templates?",
            "- Has an editor checked the locality, context, and supporting sources?",
            "",
            "No AI text, SEO sitemap entry or public release is authorized.",
            "",
        ])
        month_path = f"months/{city}-{month}-UNAPPROVED.md"
        briefs[month_path] = monthly_md
        by_city[city] = {
            "cityDays": len(city_rows),
            "transitionEvents": sum(x["transitionCount"] for x in city_rows),
            "monthlyBriefPath": month_path,
            "monthlyBriefSha256": _sha_text(monthly_md),
            "publicMonthlyPageAuthorized": False,
        }
    if len({row["dayBriefSha256"] for row in rows}) != len(rows):
        raise ValueError("Duplicate daily editorial research briefs")
    return ({
        "artifactType": ARTIFACT, "schemaVersion": 1,
        "status": "UNAPPROVED_MONTHLY_CONTENT_RESEARCH", "month": month,
        "cityCount": len(TEN_CITY_IDS), "daysInMonth": len(days),
        "cityDays": len(rows), "sourceBatches": sources,
        "dailyResearchBriefs": len(rows), "monthlyResearchBriefs": len(by_city),
        "monthlyByCity": by_city, "records": rows,
        "aiDraftsCreated": 0, "publicPagesCreated": 0,
        "eligibleIndexableUrls": 0,
        "humanScienceReviewsRequired": True,
        "humanEditorialReviewsRequired": True,
        **FAIL_CLOSED,
    }, briefs)


def main():
    p = argparse.ArgumentParser(description="Research-only next-month city/day editorial inputs")
    p.add_argument("--month", required=True)
    p.add_argument("--batches-dir", required=True, type=Path)
    p.add_argument("--out", required=True, type=Path)
    p.add_argument("--briefs-dir", required=True, type=Path)
    args = p.parse_args()
    starts = batch_starts(args.month)
    inputs = []
    for start in starts:
        path = args.batches_dir / f"batch-{start}.json"
        data = path.read_bytes()
        inputs.append((start, json.loads(data), hashlib.sha256(data).hexdigest()))
    report, briefs = build_monthly_content(args.month, inputs)
    if args.out.exists() or args.briefs_dir.exists():
        raise ValueError("Refuse overwriting immutable monthly research")
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.briefs_dir.mkdir(parents=True, exist_ok=False)
    for name, value in sorted(briefs.items()):
        target = args.briefs_dir / name
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("x", encoding="utf-8") as handle:
            handle.write(value)
    with args.out.open("x", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2, ensure_ascii=False)
        handle.write("\n")
    print(f"MONTHLY CONTENT RESEARCH: {report['cityDays']} city-days, "
          f"{report['dailyResearchBriefs']} daily and {report['monthlyResearchBriefs']} monthly briefs")
    print("PUBLIC INDEXING ALLOWED:", report["indexingAuthorized"])


if __name__ == "__main__":
    main()
