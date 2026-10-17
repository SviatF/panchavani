"""Wave 7C — same-city alternative gazetteer points, official PAC solar crosschecks.

This is NOT a city observer survey. The PAC station coordinates and horizon
are not identified in the published table, so no numerical result can approve
the GeoNames point or the original PANCHAVANI point.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from dataclasses import replace
from datetime import date
from pathlib import Path
from zoneinfo import ZoneInfo

from .astronomy import SkyfieldAdapter, STANDARD_SOLAR_HORIZON_DEGREES
from .cities import RESEARCH_CITIES, CATALOG_SHA256
from .compute import digest
from .geodata_audit import km_between
from .pac_solar_reference import (pac_local_instant, validate_pac_dataset)
from .research_batch import JPL_DE440S_SHA

THREE=("delhi","mumbai","chennai")
DAYS=(date(2026,4,21),date(2026,10,16),
      date(2026,10,17),date(2026,10,23))
PAC_DAYS={date(2026,4,21),date(2026,10,23)}
SOURCE_IDS={"delhi":1273294,"mumbai":1275339,"chennai":1264527}


def validate_alt_sites(bundle:dict):
    if (not isinstance(bundle,dict) or bundle.get("schemaVersion")!=1
        or bundle.get("publisher")!="GeoNames" or bundle.get("country")!="IN"
        or bundle.get("sourceSnapshotArchived") is not False
        or bundle.get("sourceReviewedBy") is not None
        or bundle.get("transcriptionIndependentlyReviewed") is not False
        or bundle.get("altitudeIsSurveyedStationElevation") is not False
        or bundle.get("officialObservatoryStationForAllCities") is not False
        or bundle.get("scienceApproval") is not False
        or bundle.get("publicReleaseAuthorized") is not False):
        raise ValueError("Officially-reviewed station status cannot be forged")
    rows=bundle.get("records")
    if not isinstance(rows,list) or len(rows)!=3 or set(r.get("cityId") for r in rows)!=set(THREE):
        raise ValueError("Exactly 3 distinct metro reference points")
    for row in rows:
        city=RESEARCH_CITIES[row["cityId"]]
        if (row.get("geonameId")!=SOURCE_IDS[city.id] or
            row.get("sourceUrl")!=f"https://www.geonames.org/{SOURCE_IDS[city.id]}/{city.id}.html"
            or row.get("cityLabel")!=city.name or
            row.get("featureCode")!="PPLA" or
            row.get("timezone")!="Asia/Kolkata"):
            raise ValueError("City/GeoNames source or gazetteer feature mismatch")
        for key in ("latitude","longitude","digitalElevationModelMeters"):
            if type(row.get(key)) not in (int,float) or not math.isfinite(row[key]):
                raise ValueError("Invalid gazetteer measurement: "+key)
        if (not 6<=row["latitude"]<=37.5 or not 68<=row["longitude"]<=98
            or not -450<=row["digitalElevationModelMeters"]<=9000):
            raise ValueError("GeoNames place is not a plausible India city")
        if km_between(city.latitude,city.longitude,row["latitude"],row["longitude"])>25:
            raise ValueError("Wrong city or too distant gazetteer match")


def _clock(t):
    return t.astimezone(ZoneInfo("Asia/Kolkata")).isoformat(timespec="seconds")


def compare_station_assumptions(bundle:dict,pac:dict,solar_day):
    validate_alt_sites(bundle)
    validate_pac_dataset(pac)
    by_pac={date.fromisoformat(x["gregorianDate"]):x for x in pac["rows"]}
    if not PAC_DAYS.issubset(by_pac):
        raise ValueError("PAC dated official solar rows missing")
    allrows=[]
    max_abs=0
    for source in sorted(bundle["records"],key=lambda r:r["cityId"]):
        original=RESEARCH_CITIES[source["cityId"]]
        alternative=replace(original,
            latitude=source["latitude"],longitude=source["longitude"],
            elevation_m=source["digitalElevationModelMeters"])
        dist=km_between(original.latitude,original.longitude,
                        alternative.latitude,alternative.longitude)
        if dist<=0:
            raise ValueError("Same points cannot probe city model sensitivity")
        rows=[]
        for day in DAYS:
            (sunrise,sunset,next_sunrise)=solar_day(original,day)
            (sunrise_alt,sunset_alt,next_alt)=solar_day(alternative,day)
            if not (sunrise<sunset<next_sunrise and sunrise_alt<sunset_alt<next_alt):
                raise ValueError("Invalid solar chronology")
            if sunrise.astimezone(ZoneInfo("Asia/Kolkata")).date()!=day:
                raise ValueError("Wrong local day for research city")
            deltas={
                "sunriseSeconds":round((sunrise_alt-sunrise).total_seconds(),3),
                "sunsetSeconds":round((sunset_alt-sunset).total_seconds(),3),
            }
            row={
                "localDate":day.isoformat(),
                "catalogClockIST":{"sunrise":_clock(sunrise),"sunset":_clock(sunset)},
                "gazetteerClockIST":{"sunrise":_clock(sunrise_alt),"sunset":_clock(sunset_alt)},
                "gazetteerMinusCatalogSeconds":deltas,
                "externalPACReference":None
            }
            if day in by_pac:
                solar=by_pac[day]["cities"][original.id]
                ref={}
                for kind,calc,alt in (("sunrise",sunrise,sunrise_alt),
                                      ("sunset",sunset,sunset_alt)):
                    official=pac_local_instant(day.isoformat(),solar[kind])
                    c=round((calc-official).total_seconds(),3)
                    a=round((alt-official).total_seconds(),3)
                    max_abs=max(max_abs,abs(c),abs(a))
                    ref[kind]={
                        "publishedIST":official.isoformat(timespec="minutes"),
                        "publishedResolutionSeconds":60,
                        "catalogMinusPACSeconds":c,
                        "gazetteerMinusPACSeconds":a}
                row["externalPACReference"]=ref
            rows.append(row)
        allrows.append({
            "cityId":original.id,"referencePlaceGeoNamesId":source["geonameId"],
            "gazetteerSourceUrl":source["sourceUrl"],
            "researchCityPoint":{"latitude":original.latitude,
                 "longitude":original.longitude,"elevationMeters":original.elevation_m},
            "gazetteerPopulatedPlace":{"latitude":source["latitude"],
                 "longitude":source["longitude"],
                 "unsurveyedDigitalElevationModelMeters":source["digitalElevationModelMeters"]},
            "distanceBetweenResearchPointsKm":round(dist,4),
            "elevationModelVsCatalogMeters":round(
                source["digitalElevationModelMeters"]-original.elevation_m,3),
            "sensitivityResearchOnly":True,
            "stationPointScientificallyApproved":False,
            "dates":rows,
        })
    return {
        "artifactType":"PANCHAVANI_WAVE7C_PILOT_GEO_SOLAR_SENSITIVITY",
        "schemaVersion":1,"status":"UNAPPROVED_RESEARCH",
        "cityCount":3,"cityDayComparisonCount":12,
        "officialPACClockComparisons":12,
        "maxAbsoluteCatalogOrGazetteerPACDeltaSeconds":round(max_abs,3),
        "catalogSha256":CATALOG_SHA256,
        "horizonDegreesAssumedForBothModels":STANDARD_SOLAR_HORIZON_DEGREES,
        "sourcePublishedStationCoordinatesMatched":False,
        "gazetteerIsNotAnObservatory":True,
        "gazetteerStationElevationVerified":False,
        "geoSourceIndependentHumanReview":False,
        "officialPACTranscriptionReviewed":False,
        "methodologicallyIndependentValidation":False,
        "publicReleaseAuthorized":False,"indexingAuthorized":False,
        "approvedClaimsForDeepSeek":[],
        "blockers":[
          "Neither research-city point nor GeoNames populated-place center is a surveyed official PAC station",
          "GeoNames SRTM-style DEM elevation is not a reviewed observer's elevation",
          "Official PAC instrument/station coordinates and solar horizon conventions unverified",
          "Direct geo page values lack independent transcription/source capture review",
          "Calendar sidereal/ritual science and live D1 conflict triage not approved",
        ],
        "records":allrows,
    }


def run(ephemeris:Path,geo:Path,pac:Path,out:Path):
    if out.exists():
        raise ValueError("Refusing to overwrite immutable research artifact")
    if digest(ephemeris)!=JPL_DE440S_SHA:
        raise ValueError("Invalid JPL DE440s checksum")
    source_geo=geo.read_bytes()
    source_pac=pac.read_bytes()
    adapter=SkyfieldAdapter(ephemeris)
    report=compare_station_assumptions(json.loads(source_geo),
        json.loads(source_pac),adapter.solar_day)
    report["geoFixtureSha256"]=hashlib.sha256(source_geo).hexdigest()
    report["pacFixtureSha256"]=hashlib.sha256(source_pac).hexdigest()
    report["jplKernelSha256"]=JPL_DE440S_SHA
    out.parent.mkdir(parents=True,exist_ok=True)
    with out.open("x",encoding="utf-8") as f:
        json.dump(report,f,indent=2,ensure_ascii=False)
        f.write("\n")
    return report


def main():
    parser=argparse.ArgumentParser(description="3-city GeoNames-vs-JPL-vs-official PAC, unapproved")
    parser.add_argument("--ephemeris",type=Path,required=True)
    parser.add_argument("--geo",type=Path,required=True)
    parser.add_argument("--pac",type=Path,required=True)
    parser.add_argument("--out",type=Path,required=True)
    args=parser.parse_args()
    r=run(args.ephemeris,args.geo,args.pac,args.out)
    print("City comparisons",r["cityDayComparisonCount"])
    print("Official PAC clock events",r["officialPACClockComparisons"])
    for x in r["records"]:
        print(x["cityId"],"catalog vs GeoNames distance in km",
              x["distanceBetweenResearchPointsKm"],
              "elevation estimate delta meters",x["elevationModelVsCatalogMeters"])
    print("This cannot approve observing stations or publish pages:",r["indexingAuthorized"])


if __name__=="__main__":
    main()
