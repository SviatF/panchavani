"""Research-only IMD/PAC Rashtriya Panchang published solar-time comparisons.

This checks official printed sunrise/sunset clock values against our pinned
NASA/JPL DE440s & Skyfield solar model. The *published* station coordinates,
atmospheric refraction, horizon convention, and transcription have NOT yet
been independently verified for matching methodology. NEVER approve data.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import date, datetime, time
from pathlib import Path
from zoneinfo import ZoneInfo

from .astronomy import SkyfieldAdapter
from .cities import PILOT_CITIES
from .compute import digest
from .research_batch import JPL_DE440S_SHA

PAC_SOURCE_URL = "https://packolkata.imd.gov.in/panchang/en/tables"
IST = ZoneInfo("Asia/Kolkata")
METRO_IDS = frozenset(("chennai", "delhi", "kolkata", "mumbai"))
CLOCK = re.compile(r"^(?:[01]\d|2[0-3]):[0-5]\d$")
RESEARCH_DRIFT_ALERT_SECONDS = 300  # alert criterion, NOT an accuracy certification


def validate_pac_dataset(bundle: dict) -> None:
    if not isinstance(bundle, dict) or bundle.get("schemaVersion") != 1:
        raise ValueError("Unrecognized PAC research schema version")
    if (bundle.get("sourceUrl") != PAC_SOURCE_URL or
        bundle.get("timeZone") != "Asia/Kolkata" or
        bundle.get("sourceSection") != "Sunrise, Sunset, Moonrise & Moonset"):
        raise ValueError("PAC source/provenance or civil timezone mismatch")
    if bundle.get("transcribedFromOfficialWebTables") is not True:
        raise ValueError("PAC fixture must document provenance")
    if (bundle.get("transcriptionIndependentlyReviewed") is not False or
        bundle.get("astronomyMethodIndependentlyReproduced") is not False):
        raise ValueError("Cannot self-certify PAC transcription or independent method")
    if bundle.get("publishedTimePrecisionSeconds") != 60:
        raise ValueError("Only minute-rounded PAC solar tables are supported")
    if (bundle.get("horizonDefinition") != "NOT_CONFIRMED_MATCHED_TO_JPL" or
        bundle.get("stationCoordinates") != "NOT_CONFIRMED_MATCHED_TO_PANCHAVANI"):
        raise ValueError("Unreviewed horizon/station must retain explicit blockers")
    rows = bundle.get("rows")
    if not isinstance(rows, list) or len(rows) < 2:
        raise ValueError("At least two dated seasonal PAC source rows required")
    seen = set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("Invalid PAC solar table row")
        day = date.fromisoformat(row["gregorianDate"])
        if day.year != 2026 or day in seen:
            raise ValueError("Duplicate or unsupported PAC 2026 Gregorian date")
        seen.add(day)
        if not row.get("sourceCalendarMonth") or not row.get("sourceRowLocator"):
            raise ValueError("Missing original PAC row provenance")
        cities = row.get("cities")
        if not isinstance(cities, dict) or set(cities) != METRO_IDS:
            raise ValueError("Expected exactly the four PAC metropolitan stations")
        for cid, values in cities.items():
            if cid not in PILOT_CITIES:
                raise ValueError("City missing in PANCHAVANI location catalog")
            if not isinstance(values, dict) or set(values) != {"sunrise", "sunset"}:
                raise ValueError("Invalid PAC station solar event pair")
            if any(not isinstance(v, str) or not CLOCK.fullmatch(v) for v in values.values()):
                raise ValueError("PAC printed solar times must use HH:MM")
            if values["sunrise"] >= values["sunset"]:
                raise ValueError("PAC station sunrise must precede sunset")


def pac_local_instant(iso_date: str, printed_clock: str) -> datetime:
    if not CLOCK.fullmatch(printed_clock):
        raise ValueError("Malformed minute-rounded PAC clock")
    h, m = (int(p) for p in printed_clock.split(":"))
    return datetime.combine(date.fromisoformat(iso_date), time(h, m), tzinfo=IST)


def numerical_comparison(actual: datetime, published: datetime) -> dict:
    if actual.tzinfo is None or actual.utcoffset() is None:
        raise ValueError("Computed solar event lacks UTC offset")
    offset = round((actual - published).total_seconds(), 3)
    return {
        "computedLocal": actual.astimezone(IST).isoformat(timespec="seconds"),
        "publishedLocal": published.isoformat(timespec="minutes"),
        "deltaSeconds": offset,
        "absoluteDeltaSeconds": abs(offset),
        "publishedResolutionSeconds": 60,
        "withinResearchDriftAlertThreshold": abs(offset) <= RESEARCH_DRIFT_ALERT_SECONDS,
    }


def compare_pac_solar(bundle: dict, solar_day_calculator) -> dict:
    """Inject calculator to unit-test source interpretation without downloading SPK."""
    validate_pac_dataset(bundle)
    records = []
    max_difference = 0.0
    for row in bundle["rows"]:
        day = date.fromisoformat(row["gregorianDate"])
        for cid in sorted(METRO_IDS):
            city = PILOT_CITIES[cid]
            sunrise, sunset, next_sunrise = solar_day_calculator(city, day)
            if not (sunrise < sunset < next_sunrise):
                raise ValueError("JPL solver returned impossible solar chronology")
            comparison = {}
            for kind, actual in (("sunrise", sunrise), ("sunset", sunset)):
                expected = pac_local_instant(row["gregorianDate"], row["cities"][cid][kind])
                comparison[kind] = numerical_comparison(actual, expected)
                max_difference = max(max_difference, comparison[kind]["absoluteDeltaSeconds"])
            records.append({
                "city": cid, "date": row["gregorianDate"],
                "sourceRow": row["sourceRowLocator"],
                "comparison": comparison,
                "provisionalCityCoordinates": not city.coordinates_verified,
                "scientificallyApproved": False,
            })
    return {
        "schemaVersion": 1,
        "datasetId": bundle["datasetId"],
        "referencePublisher": bundle["publisher"],
        "referenceUrl": PAC_SOURCE_URL,
        "classification": "OFFICIAL_PUBLISHED_CLOCK_TIME_RESEARCH",
        "sourceTranscriptionReview": "PENDING",
        "stationAndHorizonConventionReview": "PENDING",
        "methodologicallyIndependentValidation": False,
        "scientificallyApproved": False,
        "ritualOrFestivalApproval": False,
        "indexingAuthorized": False,
        "publicationAuthorized": False,
        "cityDayCount": len(records),
        "observationCount": len(records) * 2,
        "maxAbsoluteClockDeltaSeconds": round(max_difference, 3),
        "withinExploratoryAlertThreshold": max_difference <= RESEARCH_DRIFT_ALERT_SECONDS,
        "blockers": [
            "official-PAC-station-coordinates-not-yet-matched",
            "official-PAC-solar-horizon-method-not-yet-matched",
            "published-minute-rounding-and-transcription-review-pending",
            "not-a-full-five-limb-independent-validation",
            "ritual-regional-muhurat-review-missing",
            "human-SEO-editorial-review-missing",
        ],
        "records": records,
    }


def run_pac_solar_qa(ephemeris: Path, fixture: Path, output: Path) -> dict:
    if output.exists():
        raise ValueError("Refusing to overwrite immutable PAC comparison report")
    if digest(ephemeris) != JPL_DE440S_SHA:
        raise ValueError("Unverified JPL ephemeris SHA-256; abort PAC comparison")
    source_bytes = fixture.read_bytes()
    bundle = json.loads(source_bytes)
    validate_pac_dataset(bundle)
    adapter = SkyfieldAdapter(ephemeris)
    report = compare_pac_solar(bundle, adapter.solar_day)
    report["fixtureSha256"] = hashlib.sha256(source_bytes).hexdigest()
    report["jplEphemerisSha256"] = JPL_DE440S_SHA
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    return report


def main():
    p = argparse.ArgumentParser(description="OFFICIAL PAC/JPL research comparison, NEVER approval")
    p.add_argument("--ephemeris", required=True, type=Path)
    p.add_argument("--fixture", required=True, type=Path)
    p.add_argument("--out", required=True, type=Path)
    args = p.parse_args()
    r = run_pac_solar_qa(args.ephemeris, args.fixture, args.out)
    print("PAC-JPL RESEARCH:", r["cityDayCount"], "city-days,",
          r["observationCount"], "official clock-time comparisons")
    for row in r["records"]:
        print(row["date"], row["city"],
              "sunrise delta(s)", row["comparison"]["sunrise"]["deltaSeconds"],
              "sunset delta(s)", row["comparison"]["sunset"]["deltaSeconds"])
    print("Highest clock-time difference(s):", r["maxAbsoluteClockDeltaSeconds"])
    print("Exploratory drift alert threshold passed:", r["withinExploratoryAlertThreshold"])
    print("Independent scientific validation:", r["methodologicallyIndependentValidation"])
    print("SEO/public release authorized:", r["indexingAuthorized"], r["publicationAuthorized"])


if __name__ == "__main__":
    main()
