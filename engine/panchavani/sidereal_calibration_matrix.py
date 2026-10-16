"""Stratified three-city JPL sidereal integrity matrix; strictly UNAPPROVED.

This is an internal geocentric consistency test, NOT independent Lahiri
calibration. It never connects to D1/R2, DeepSeek, or the public website.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from .astronomy import SkyfieldAdapter
from .cities import RESEARCH_CITIES, CATALOG_SHA256
from .compute import digest
from .research_batch import JPL_DE440S_SHA
from .sidereal import LahiriEpochAnchorResearch
from .sidereal_batch import compute_for_city_day, ensure_cross_city_consistency

PILOT_IDS = ("delhi", "mumbai", "chennai")
AUDIT_VERSION = "provisional-sidereal-three-city-matrix-v1"


def verify_matrix_records(records: list[dict]) -> dict:
    """Fail on sunrise/day attribution, gaps, bad ordinals, or cross-date drift."""
    if not records:
        raise ValueError("No city/date records")
    seen: set[tuple[str, str]] = set()
    by_city: dict[str, list[dict]] = {}
    event_count = 0
    for r in records:
        city, day = r["cityId"], r["date"]
        identity = (city, day)
        if identity in seen:
            raise ValueError("Duplicate city/date candidate")
        seen.add(identity)
        if (city not in PILOT_IDS or r["status"] != "UNAPPROVED"
                or r["publicReleaseAllowed"] is not False
                or r["independentScientificValidation"] != "NOT_COMPLETED"
                or r["cityCoordinatesVerified"] is not False
                or not r["blockers"]):
            raise ValueError("Research-only city contract violated")
        tz = ZoneInfo(r["timezone"])
        sunrise = datetime.fromisoformat(r["sunriseUtc"])
        next_sunrise = datetime.fromisoformat(r["nextSunriseUtc"])
        if (sunrise.utcoffset() is None or next_sunrise.utcoffset() is None
                or not sunrise < next_sunrise
                or sunrise.astimezone(tz).date().isoformat() != day
                or next_sunrise.astimezone(tz).date() != date.fromisoformat(day)+timedelta(days=1)):
            raise ValueError("City-local solar-day attribution failure")
        for layer, displayed in (("nakshatra", "nakshatraAtSunrise"),
                                 ("yoga", "yogaAtSunrise")):
            segs = r[layer]
            if not isinstance(segs, list) or not segs or segs[0]["name"] != r[displayed]:
                raise ValueError("Missing/mislabelled sidereal sunrise segment")
            if datetime.fromisoformat(segs[0]["startUtc"]) != sunrise:
                raise ValueError("Sidereal interval missing sunrise")
            if datetime.fromisoformat(segs[-1]["endUtc"]) != next_sunrise:
                raise ValueError("Sidereal interval missing following sunrise")
            previous_end = None
            previous_number = None
            for segment in segs:
                a = datetime.fromisoformat(segment["startUtc"])
                b = datetime.fromisoformat(segment["endUtc"])
                n = segment["number"]
                if (a.utcoffset() is None or b.utcoffset() is None or not a < b
                        or type(n) is not int or not 1 <= n <= 27):
                    raise ValueError("Invalid sidereal segment boundary")
                if previous_end is not None and (a != previous_end
                    or n != previous_number % 27 + 1):
                    raise ValueError("Gap, overlap, or wrong 27-limb progression")
                previous_end, previous_number = b, n
            event_count += len(segs)-1
        by_city.setdefault(city, []).append(r)
    for city, city_records in by_city.items():
        ordered = sorted(city_records, key=lambda x:x["date"])
        for first, second in zip(ordered, ordered[1:]):
            if (date.fromisoformat(second["date"]) -
                    date.fromisoformat(first["date"])).days != 1:
                raise ValueError("City sidereal matrix has noncontiguous dates")
            for layer in ("nakshatra", "yoga"):
                if (first[layer][-1]["endUtc"] != second[layer][0]["startUtc"]
                        or first[layer][-1]["number"] != second[layer][0]["number"]
                        or first[layer][-1]["name"] != second[layer][0]["name"]):
                    raise ValueError("Sidereal field changes discontinuously across local dawn")
    ensure_cross_city_consistency(records)
    return {"checkedCityDays":len(records),
            "checkedSolarDayBoundaries":sum(len(a)-1 for a in by_city.values()),
            "checkedAstronomicalCrossings":event_count,
            "geocentricUtcConsistent":True,"crossDawnContinuityPassed":True}


def build_matrix(ephemeris: Path, output: Path, start: date, days: int = 2) -> dict:
    if days != 2:
        raise ValueError("Wave 5C pilot fixes exactly two consecutive local days")
    if output.exists():
        raise ValueError("Refusing to overwrite previously archived research")
    if digest(ephemeris) != JPL_DE440S_SHA:
        raise ValueError("Pinned JPL DE440s SHA mismatch")
    adapter = SkyfieldAdapter(ephemeris)
    model = LahiriEpochAnchorResearch(adapter)
    records = []
    for offset in range(days):
        day = start + timedelta(days=offset)
        for city in PILOT_IDS:
            records.append(compute_for_city_day(
                adapter, model, RESEARCH_CITIES[city], day))
    checks = verify_matrix_records(records)
    report = {
        "version":AUDIT_VERSION, "status":"UNAPPROVED_RESEARCH",
        "computedUtc":datetime.now(timezone.utc).isoformat(),
        "jplKernelSha256":JPL_DE440S_SHA, "cityCatalogSha256":CATALOG_SHA256,
        "method":model.METHOD_ID, "timeConvention":"IANA Asia/Kolkata local sunrise",
        "pilotCities":list(PILOT_IDS), "dateFrom":start.isoformat(),
        "dateThrough":(start+timedelta(days=days-1)).isoformat(),
        "checks":checks,
        "records":records,  # unapproved with UTC event provenance
        "scientificApproval":False, "methodologyIndependentlyCalibrated":False,
        "cityCoordinatesIndependentlyVerified":False,
        "approvedClaimsForDeepSeek":[],
        "publicationAuthorized":False,"indexingAuthorized":False,
        "blockers":[
            "current fixed-epoch Lahiri realization is not independently calibrated",
            "official PAC adopted central station is not Delhi/Mumbai/Chennai",
            "city coordinates, sunrise horizon and elevation await review",
            "external source independence and method equivalence unproven",
            "regional ritual rules and human editorial review missing"]
    }
    output.parent.mkdir(parents=True,exist_ok=True)
    with output.open("x",encoding="utf-8") as file:
        json.dump(report,file,ensure_ascii=False,indent=2)
        file.write("\n")
    return report


def main() -> None:
    p=argparse.ArgumentParser(description="PANCHAVANI Wave 5C three-city sidereal research only")
    p.add_argument("--ephemeris",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    p.add_argument("--start",type=date.fromisoformat,default=date(2026,10,16))
    args=p.parse_args()
    report=build_matrix(args.ephemeris,args.out,args.start)
    print("UNAPPROVED JPL sidereal city-days:",report["checks"]["checkedCityDays"])
    print("Cross-city geocentric UTC invariant:",report["checks"]["geocentricUtcConsistent"])
    print("Cross-dawn continuity:",report["checks"]["crossDawnContinuityPassed"])
    print("Independent Lahiri calibration:",report["methodologyIndependentlyCalibrated"])
    print("Publication allowed:",report["publicationAuthorized"])

if __name__=="__main__":
    main()
