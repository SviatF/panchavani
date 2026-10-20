"""Deterministic, fail-closed research rule evaluation for PANCHAVANI.

Computes *candidate* intervals, never publishes auspicious recommendations.
A pack is deliberately a versioned draft until sources, scientific method and
regional ritual logic have undergone independent review.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

from .muhurat_windows import ARTIFACT, instant, ist
from .first_six_limb_pilot import TEN_CITY_IDS

IST = ZoneInfo("Asia/Kolkata")
RAHU_PART = (2, 7, 5, 6, 4, 3, 8)  # Python Monday=0 ... Sunday=6
YAMAGANDA_PART = (4, 3, 2, 1, 7, 6, 5)
GULIKA_PART = (6, 5, 4, 3, 2, 1, 7)
SUPPORTED = {"wedding", "vehicle-purchase"}
LIMBS = {"tithi", "karana", "nakshatra", "yoga"}
PERIODS = {"rahu", "yamaganda", "gulika"}
MAX_WINDOWS = 1000


def _require(condition: bool, why: str) -> None:
    if not condition:
        raise ValueError(why)


def _dt(v: str) -> datetime:
    return instant(v)


def _iso(v: datetime) -> str:
    return v.isoformat(timespec="microseconds").replace("+00:00", "Z")


def _day_part(sunrise: datetime, sunset: datetime, part: int) -> tuple[datetime, datetime]:
    duration = sunset - sunrise
    _require(timedelta(hours=6) < duration < timedelta(hours=18), "Implausible daylight")
    return sunrise + duration * ((part - 1) / 8), sunrise + duration * (part / 8)


def _subtract(
    intervals: list[tuple[datetime, datetime]],
    excluded: tuple[datetime, datetime]
) -> list[tuple[datetime, datetime]]:
    start, end = excluded
    pieces = []
    for a, b in intervals:
        if b <= start or a >= end:
            pieces.append((a, b))
        else:
            if a < start:
                pieces.append((a, start))
            if end < b:
                pieces.append((end, b))
    return pieces


def evaluate_candidates(grid: dict[str, Any], pack: dict[str, Any]) -> dict[str, Any]:
    """Produce traceable, *unapproved* windows from exact UTC intersections.

    Rules can exclude limbs, weekdays, and daylight eighths. Missing source
    evidence remains an explicit blocker, even when interval criteria match.
    """
    _require(isinstance(grid, dict) and grid.get("artifactType") == ARTIFACT
             and grid.get("status") == "UNAPPROVED_RESEARCH"
             and grid.get("scientificApproval") is False
             and grid.get("muhuratRecommendationsAuthorized") is False
             and grid.get("publicationAuthorized") is False
             and grid.get("indexingAuthorized") is False
             and grid.get("approvedClaimsForDeepSeek") == [], "Untrusted science grid")
    _require(isinstance(pack, dict) and pack.get("status") == "DRAFT"
             and pack.get("kind") in SUPPORTED
             and pack.get("independentReview", {}).get("status") == "PENDING",
             "Only draft ritual packs may be evaluated")
    for key in ("id", "version", "tradition", "region"):
        _require(isinstance(pack.get(key), str) and bool(pack[key].strip()),
                 "Missing versioned source context: " + key)
    _require(isinstance(pack.get("sourceRefs"), list), "Missing source references")
    _require(isinstance(pack.get("cityIds"), list) and bool(pack["cityIds"])
             and len(set(pack["cityIds"])) == len(pack["cityIds"])
             and set(pack["cityIds"]) <= set(TEN_CITY_IDS), "Invalid city scope")
    checks = pack.get("criteria")
    _require(isinstance(checks, dict)
             and set(checks) == {"allowedLimbs", "excludedLimbs", "allowedWeekdays",
                                 "excludedDayPeriods", "daylightOnly", "minimumSeconds"},
             "Incomplete rule selector")
    for name in ("allowedLimbs", "excludedLimbs"):
        mapping = checks[name]
        _require(isinstance(mapping, dict) and set(mapping) <= LIMBS,
                 "Unsupported astronomy criterion")
        for labels in mapping.values():
            _require(isinstance(labels, list) and bool(labels)
                     and all(isinstance(x, str) and bool(x.strip()) for x in labels)
                     and len(set(labels)) == len(labels), "Invalid astronomy labels")
    weekdays = checks["allowedWeekdays"]
    _require(isinstance(weekdays, list) and bool(weekdays)
             and all(type(n) is int and 0 <= n <= 6 for n in weekdays)
             and len(set(weekdays)) == len(weekdays), "Weekday values must be Monday=0 ... Sunday=6")
    periods = checks["excludedDayPeriods"]
    _require(isinstance(periods, list) and len(set(periods)) == len(periods)
             and set(periods) <= PERIODS, "Unsupported day period")
    _require(type(checks["daylightOnly"]) is bool, "Daylight mode required")
    minimum = checks["minimumSeconds"]
    _require(type(minimum) is int and 60 <= minimum <= 21600, "Minimum duration outside range")
    _require(isinstance(grid.get("windows"), list)
             and len(grid["windows"]) == grid.get("cityDays") == 20
             and grid.get("cityCount") == 10, "Incomplete grid")
    candidates = []
    seen = set()
    for day in grid["windows"]:
        city, local_date = day["cityId"], day["localDate"]
        _require(city in TEN_CITY_IDS and (city, local_date) not in seen,
                 "Duplicate or invalid city/day")
        seen.add((city, local_date))
        sunrise = _dt(day["modeledSunriseUtc"])
        sunset = _dt(day["modeledSunsetUtc"])
        following = _dt(day["modeledFollowingSunriseUtc"])
        _require(sunrise < sunset < following
                 and sunrise.astimezone(IST).date().isoformat() == local_date,
                 "Untrusted solar day")
        weekday = sunrise.astimezone(IST).weekday()
        blocked = {}
        for label, weekday_parts in (
            ("rahu", RAHU_PART), ("yamaganda", YAMAGANDA_PART), ("gulika", GULIKA_PART)
        ):
            blocked[label] = _day_part(sunrise, sunset, weekday_parts[weekday])
        _require(len(day["windows"]) == day["windowCount"]
                 and 0 < day["windowCount"] <= MAX_WINDOWS, "Invalid slice count")
        expected = sunrise
        for window in day["windows"]:
            start, end = _dt(window["startUtc"]), _dt(window["endUtc"])
            _require(start == expected and end > start and end <= following,
                     "Gapped/overlapping four-limb timeline")
            expected = end
            _require(window.get("auspiciousRecommendation") is False
                     and window.get("ritualEligibilityDetermined") is False,
                     "Preauthorized input window forbidden")
            _require(abs((end-start).total_seconds() - window["durationSeconds"]) < .001,
                     "Time duration mismatch")
            fields = window.get("elements")
            _require(isinstance(fields, dict) and set(fields) == LIMBS
                     and all(isinstance(fields[k].get("name"), str)
                             and fields[k]["name"] for k in LIMBS),
                     "Incomplete four-limb labels")
            if city not in pack["cityIds"] or weekday not in weekdays:
                continue
            if any(fields[k]["name"] not in values
                   for k, values in checks["allowedLimbs"].items()):
                continue
            if any(fields[k]["name"] in values
                   for k, values in checks["excludedLimbs"].items()):
                continue
            fragments = [(start, end)]
            if checks["daylightOnly"]:
                fragments = [(max(start, sunrise), min(end, sunset))]
                fragments = [(a, b) for a, b in fragments if a < b]
            for period in periods:
                fragments = _subtract(fragments, blocked[period])
            for a, b in fragments:
                seconds = (b-a).total_seconds()
                if seconds < minimum:
                    continue
                candidates.append({
                    "cityId": city, "localDate": local_date, "kind": pack["kind"],
                    "startUtc": _iso(a), "endUtc": _iso(b),
                    "startIST": ist(a), "endIST": ist(b),
                    "durationSeconds": seconds,
                    "weekdayMondayZero": weekday,
                    "matchedLimbs": {k: fields[k]["name"] for k in sorted(LIMBS)},
                    "excludedDayPeriods": periods,
                    "researchCandidate": True,
                    "ritualEligibilityDetermined": False,
                    "muhuratRecommended": False
                })
        _require(expected == following, "Four-limb timeline does not end at next sunrise")
    _require(len(seen) == 20, "Missing city/day")
    rule_digest = hashlib.sha256(json.dumps(pack, sort_keys=True, ensure_ascii=False,
                                            separators=(",", ":")).encode()).hexdigest()
    return {
        "artifactType": "PANCHAVANI_MUHURAT_RULE_ENGINE_CANDIDATES",
        "schemaVersion": 1, "status": "DRAFT_RESEARCH_ONLY",
        "kind": pack["kind"], "ruleId": pack["id"],
        "ruleVersion": pack["version"], "rulePackSha256": rule_digest,
        "tradition": pack["tradition"], "region": pack["region"],
        "candidateCount": len(candidates), "candidates": candidates,
        "unverifiedRequirements": [
            "independent ephemeris and sunrise/observer verification",
            "reviewed local tradition and authoritative rule table",
            "solar/lunar month, Chaturmas and applicable prohibitions",
            "Guru/Shukra Asta and applicable planetary restrictions",
            "Lagna and any required personal chart conditions",
            "independent expert review of resulting windows"
        ],
        "scientificApproval": False, "ritualRuleApproved": False,
        "muhuratRecommendationsAuthorized": False,
        "approvedClaimsForDeepSeek": [],
        "publicationAuthorized": False, "indexingAuthorized": False
    }
