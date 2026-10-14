"""City solar-event sensitivity to *assumed* location and horizon parameters.

This is a RESEARCH stress test, NOT observational error bars or a verified
local horizon/pressure/elevation correction. The same JPL/Skyfield model is
used for all probes, and NO public site or sitemap can consume this report.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from dataclasses import replace
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from .astronomy import SkyfieldAdapter, STANDARD_SOLAR_HORIZON_DEGREES
from .cities import RESEARCH_CITIES, CATALOG_SHA256
from .compute import digest
from .research_batch import JPL_DE440S_SHA

SENSITIVITY_PROBES = (
    "latitude_plus_0_02_degree",
    "longitude_plus_0_02_degree",
    "elevation_plus_100_meters",
    "horizon_minus_34_arcminutes",
    "horizon_minus_66_arcminutes",
)
# These are deliberately arbitrary small parameter perturbations, NOT a
# statistical confidence interval or an attempt to match unknown PAC settings.
LAT_LON_SHIFT_DEG = 0.02
ELEVATION_SHIFT_M = 100.0
ALTERNATE_SOLAR_HORIZONS = {
    "horizon_minus_34_arcminutes": -34.0 / 60.0,
    "horizon_minus_66_arcminutes": -66.0 / 60.0,
}


def sensitivity_scenarios(city) -> dict:
    if not -450 <= city.elevation_m <= 9000:
        raise ValueError("City research elevation absent or implausible")
    new_elevation = min(9000, city.elevation_m + ELEVATION_SHIFT_M)
    return {
        "latitude_plus_0_02_degree": (
            replace(city, latitude=city.latitude + LAT_LON_SHIFT_DEG),
            STANDARD_SOLAR_HORIZON_DEGREES
        ),
        "longitude_plus_0_02_degree": (
            replace(city, longitude=city.longitude + LAT_LON_SHIFT_DEG),
            STANDARD_SOLAR_HORIZON_DEGREES
        ),
        "elevation_plus_100_meters": (
            replace(city, elevation_m=new_elevation),
            STANDARD_SOLAR_HORIZON_DEGREES
        ),
        "horizon_minus_34_arcminutes": (city, -34.0 / 60.0),
        "horizon_minus_66_arcminutes": (city, -66.0 / 60.0),
    }


def compare_solar_sensitivity(adapter, cities: dict, day: date, *,
                              source_sha256: str="RESEARCH_TEST") -> dict:
    if not cities:
        raise ValueError("At least one city required")
    rows=[]
    for city_id,city in sorted(cities.items()):
        # NOTE: this is an adopted city-center model, not a measured
        # physical horizon or surveyed astronomical station.
        baseline = {
            "sunrise": adapter._solar_event(city, day, True,
                        horizon_degrees=STANDARD_SOLAR_HORIZON_DEGREES),
            "sunset": adapter._solar_event(city, day, False,
                        horizon_degrees=STANDARD_SOLAR_HORIZON_DEGREES),
        }
        if not baseline["sunrise"] < baseline["sunset"]:
            raise ValueError("Impossible baseline solar order")
        if any(t.tzinfo is None or t.utcoffset() is None for t in baseline.values()):
            raise ValueError("Solar events must have timezone-aware UTC instants")
        local = ZoneInfo(city.timezone)
        if baseline["sunrise"].astimezone(local).date()!=day:
            raise ValueError("Local sunrise belongs to the wrong city date")
        probes={}
        for name,(changed,horizon) in sensitivity_scenarios(city).items():
            sampled={}
            for event,rising in (("sunrise",True),("sunset",False)):
                t = adapter._solar_event(changed,day,rising,horizon_degrees=horizon)
                if t.tzinfo is None or t.utcoffset() is None:
                    raise ValueError("Unspecified timezone for solar sensitivity")
                delta = round((t - baseline[event]).total_seconds(),3)
                if not math.isfinite(delta) or abs(delta)>3600:
                    raise ValueError("Implausible sensitivity result; block candidate")
                sampled[event+"ShiftSeconds"]=delta
            probes[name]=sampled
        rows.append({
            "cityId":city_id,"localDate":day.isoformat(),
            "adoptedResearchPoint":{"latitude":city.latitude,
                                    "longitude":city.longitude,
                                    "elevationMeters":city.elevation_m,
                                    "timezone":city.timezone},
            "baselineHorizonDegrees":STANDARD_SOLAR_HORIZON_DEGREES,
            "baselineSunriseLocal":baseline["sunrise"].astimezone(local).isoformat(timespec="seconds"),
            "baselineSunsetLocal":baseline["sunset"].astimezone(local).isoformat(timespec="seconds"),
            "parameterPerturbations":probes,
            "largestObservedModelShiftSeconds":max(abs(value) for vals in probes.values()
                                                    for value in vals.values()),
            "stationCoordinatesVerified":False,
            "stationElevationVerified":False,
            "physicalHorizonVerified":False,
            "publicTimeRecommendationAuthorized":False,
        })
    return {
        "status":"SOLAR_SENSITIVITY_RESEARCH_ONLY",
        "solarModel":"Skyfield-JPL-USNO-level-horizon-minus-50-arcmin-research-v1",
        "catalogSha256":CATALOG_SHA256 if set(cities)==set(RESEARCH_CITIES) else "SELECTED_TEST_CATALOG",
        "jplSha256":source_sha256,
        "date":day.isoformat(),
        "cityCount":len(rows),
        "scenarioCountPerCity":len(SENSITIVITY_PROBES),
        "globalLargestObservedModelShiftSeconds":round(max(r["largestObservedModelShiftSeconds"] for r in rows),3),
        "independentScientificValidation":False,
        "quantifiedPhysicalUncertainty":False,
        "publicationAuthorized":False,
        "indexingAuthorized":False,
        "blockers":[
            "research-city-station-not-surveyed",
            "elevation-source-not-verified",
            "local-physical-horizon-and-refraction-not-observed",
            "perturbation-size-is-not-a-measured-error-distribution",
            "PAC-station-and-solar-methodology-matching-pending",
            "independent-calendar-and-editorial-review-required",
        ],
        "cities":rows,
    }


def main() -> None:
    p=argparse.ArgumentParser(description="All 25-city solar sensitivity RESEARCH only")
    p.add_argument("--ephemeris",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    p.add_argument("--date",type=date.fromisoformat,default=date(2026,10,13))
    a=p.parse_args()
    if a.out.exists():
        raise ValueError("Never overwrite a prior solar sensitivity report")
    if digest(a.ephemeris)!=JPL_DE440S_SHA:
        raise ValueError("JPL DE440s checksum mismatch")
    report=compare_solar_sensitivity(SkyfieldAdapter(a.ephemeris),RESEARCH_CITIES,
                                     a.date,source_sha256=JPL_DE440S_SHA)
    a.out.parent.mkdir(parents=True,exist_ok=True)
    a.out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Solar-model stress test:",report["cityCount"],"India research cities")
    print("Model scenarios per city:",report["scenarioCountPerCity"])
    print("Maximum explored shift:",report["globalLargestObservedModelShiftSeconds"],"seconds")
    for row in report["cities"]:
        print(row["cityId"],"largest perturbation shift(s)",
              round(row["largestObservedModelShiftSeconds"],2))
    print("True observatory/horizon verification:",report["independentScientificValidation"])
    print("SEO/publication authorized:",report["publicationAuthorized"])

if __name__=="__main__":
    main()
