"""Bounded, reproducible seasonal QA matrix for research-only Panchang data.

This does NOT constitute independent external scientific validation: both
root-finding runs use the SAME JPL ephemeris and sidereal convention. The
matrix tests numerical convergence, boundaries, sunrise attribution,
cross-city event invariance and broad date coverage without releasing data.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import date, datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from .astronomy import SkyfieldAdapter
from .cities import PILOT_CITIES
from .compute import digest
from .core import Interval, phase_intervals, wrap
from .periods import karana_title, daylight_windows
from .research_batch import JPL_DE440S_SHA
from .sidereal import LahiriEpochAnchorResearch, PART_WIDTH, NAKSHATRA_NAMES, YOGA_NAMES

# Intentionally stratified over seasonal/solar boundary cases and a leap day;
# unlike repeatedly testing the same October Delhi fixture.
MATRIX_DATES = (
    date(2024, 2, 29),   # leap day
    date(2025, 3, 20),   # March equinox
    date(2025, 6, 21),   # June solstice
    date(2025, 9, 23),   # September equinox
    date(2025, 12, 21),  # December solstice
    date(2026, 10, 13),  # existing independently cited pilot date
)

LAYERS = ("tithi", "karana", "nakshatra", "yoga")


def signed_circular_error(actual: float, expected: float) -> float:
    """Shortest signed distance in degrees, including 359.999 -> 0 wrap."""
    return (wrap(actual - expected) + 180.0) % 360.0 - 180.0


def verify_partition(
    intervals: list[Interval], phase, start: datetime, end: datetime,
    width: float, *, max_residual_arcsec: float = 2.0
) -> dict:
    """Detect missed, duplicate, out-of-order or poorly located transitions."""
    if not intervals or intervals[0].start != start or intervals[-1].end != end:
        raise ValueError("Missing interval coverage")
    parts = round(360 / width)
    worst = 0.0
    for i, interval in enumerate(intervals):
        if not (1 <= interval.number <= parts and interval.start < interval.end):
            raise ValueError("Invalid interval number or duration")
        if i and (interval.start != intervals[i-1].end or
                  interval.number != intervals[i-1].number % parts + 1):
            raise ValueError("Partition gap, overlap or skipped phase")
        if i == len(intervals)-1:
            continue  # Last end is sunrise clipping, not an angle boundary.
        desired = wrap(interval.number * width)
        measured = phase(interval.end)
        error = abs(signed_circular_error(measured, desired)) * 3600.0
        worst = max(worst, error)
        if error > max_residual_arcsec:
            raise ValueError(f"Boundary root residual {error:.4f} arcsec exceeds limit")
    return {"boundaries":len(intervals)-1, "maxResidualArcsec":round(worst,6)}


def compare_samplings(first: list[Interval], second: list[Interval], tolerance_s=1.0) -> float:
    """Two independently sampled/bracketed solves against the SAME ephemeris."""
    if len(first) != len(second) or [x.number for x in first] != [x.number for x in second]:
        raise ValueError("Different boundary counts/numbers under a finer sampling grid")
    largest = 0.0
    for a,b in zip(first[:-1],second[:-1]):
        error=abs((a.end-b.end).total_seconds())
        if error > tolerance_s:
            raise ValueError(f"30-minute vs 11-minute transition drift {error:.3f}s")
        largest=max(largest,error)
    return largest


def cross_city_utc_invariance(records: list[dict]) -> int:
    """Shared real geocentric angular crossings cannot depend on an India city."""
    observed={}
    duplicates=0
    for item in records:
        for kind, boundaries in item["geocentricBoundariesUtc"].items():
            for boundary in boundaries:
                event_id=(kind,boundary["endingNumber"],boundary["endUtc"][:10])
                t=datetime.fromisoformat(boundary["endUtc"])
                previous=observed.get(event_id)
                if previous is not None:
                    duplicates+=1
                    if abs((t-previous).total_seconds())>1.0:
                        raise ValueError(f"Geocentric transition changed between cities: {event_id}")
                observed[event_id]=t
    return duplicates


def run_matrix(ephemeris: Path, output: Path) -> dict:
    if digest(ephemeris) != JPL_DE440S_SHA:
        raise ValueError("Checksum mismatch: abort seasonal astronomy research")
    if output.exists():
        raise ValueError("Refusing to overwrite an existing QA evidence file")
    adapter=SkyfieldAdapter(ephemeris)
    sidereal=LahiriEpochAnchorResearch(adapter)
    rows=[]
    worst_residual=0.0
    worst_grid_drift=0.0
    total_transitions=0
    for day in MATRIX_DATES:
        for city in PILOT_CITIES.values():
            sunrise,sunset,next_sunrise=adapter.solar_day(city,day)
            local= sunrise.astimezone(ZoneInfo(city.timezone))
            if local.date()!=day or not (sunrise<sunset<next_sunrise):
                raise ValueError(f"Local sunrise/day ordering failed for {city.id} {day}")
            periods=daylight_windows(sunrise,sunset,day.weekday())
            if len(periods)!=3 or any(not(sunrise <= w.start < w.end <= sunset) for w in periods):
                raise ValueError(f"City-specific weekday daylight partition failed for {city.id}")
            phases={
                "tithi":(adapter.elongation,12.0),
                "karana":(adapter.elongation,6.0),
                "nakshatra":(sidereal.nakshatra_phase,PART_WIDTH),
                "yoga":(sidereal.yoga_phase,PART_WIDTH),
            }
            city_layers={}
            boundaries={}
            for kind,(phase,width) in phases.items():
                intervals=phase_intervals(phase,sunrise,next_sunrise,width,step_minutes=30)
                stats=verify_partition(intervals,phase,sunrise,next_sunrise,width)
                total_transitions+=stats["boundaries"]
                worst_residual=max(worst_residual,stats["maxResidualArcsec"])
                # Smaller-grid repeat for diverse geographical horizons each season.
                # This crosschecks solver convergence, NOT independent ephemeris input.
                if city.id in ("delhi","chennai"):
                    finer=phase_intervals(phase,sunrise,next_sunrise,width,step_minutes=11)
                    worst_grid_drift=max(worst_grid_drift,compare_samplings(intervals,finer))
                city_layers[kind]=intervals
                boundaries[kind]=[
                    {"endingNumber":v.number,"endUtc":v.end.isoformat()}
                    for v in intervals[:-1]
                ]
            # Each complete 12-degree Tithi necessarily crosses a 6-degree
            # Karana phase boundary at the SAME global instant.
            karana_edges=[v.end for v in city_layers["karana"][:-1]]
            for tithi in city_layers["tithi"][:-1]:
                if not any(abs((tithi.end-k).total_seconds())<=1.0 for k in karana_edges):
                    raise ValueError(f"Tithi/Karana half-phase mismatch: {city.id} {day}")
            rows.append({
                "city":city.id, "localDate":day.isoformat(),
                "sunriseUtc":sunrise.isoformat(),
                "sunsetUtc":sunset.isoformat(),
                "tithiAtSunrise":city_layers["tithi"][0].number,
                "karanaAtSunrise":karana_title(city_layers["karana"][0].number),
                "nakshatraAtSunrise":NAKSHATRA_NAMES[city_layers["nakshatra"][0].number-1],
                "yogaAtSunrise":YOGA_NAMES[city_layers["yoga"][0].number-1],
                "geocentricBoundariesUtc":boundaries,
                "status":"UNAPPROVED",
            })
    repeated=cross_city_utc_invariance(rows)
    report={
        "schemaVersion":1,
        "status":"RESEARCH_ONLY",
        "scientificIndependence":"NOT_VALIDATED",
        "conventionStatus":"UNVALIDATED",
        "publicReleaseAllowed":False,
        "indexablePagesCreated":0,
        "method":sidereal.METHOD_ID,
        "sourceKernelSha256":JPL_DE440S_SHA,
        "sampleDays":[x.isoformat() for x in MATRIX_DATES],
        "cityCount":len(PILOT_CITIES),
        "caseCount":len(rows),
        "transitionCount":total_transitions,
        "maxRootResidualArcsec":round(worst_residual,6),
        "maxDualGridDisagreementSeconds":round(worst_grid_drift,6),
        "repeatedCrossCityEventChecks":repeated,
        "blockingReasons":[
            "ayanamsa-calibration-unverified",
            "no-method-independent-reference-ephemeris",
            "all-eight-city-coordinates-unverified",
            "ritual-and-regional-rules-unverified",
            "human-editorial-SEO-approval-required",
        ],
        "cases":rows,
    }
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    return report


def main():
    p=argparse.ArgumentParser(description="PANCHAVANI seasonal research QA only")
    p.add_argument('--ephemeris',required=True,type=Path)
    p.add_argument('--out',required=True,type=Path)
    args=p.parse_args()
    result=run_matrix(args.ephemeris,args.out)
    print(f"PASS: {result['caseCount']} research city/dates; "
          f"{result['transitionCount']} transition boundaries")
    print("Maximum angular residual:",result["maxRootResidualArcsec"],"arcseconds")
    print("Maximum dual-grid disagreement:",result["maxDualGridDisagreementSeconds"],"seconds")
    print("Shared UTC crossing checks:",result["repeatedCrossCityEventChecks"])
    print("Independent external science validated:",result["scientificIndependence"])
    print("Public releases:",result["publicReleaseAllowed"])

if __name__ == "__main__":
    main()
