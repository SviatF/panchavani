"""PAC-published regional solar-month start dates: narrow, auditable facts.

These are selected rows from Rashtriya Panchang regional solar calendars.
They must NEVER be repurposed to infer lunar months, festival observances,
fasting periods, auspicious Muhurat or intermediate unknown dates.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from collections import defaultdict
from datetime import date
from pathlib import Path

PAC_REGIONS = frozenset(("bengal-assam", "punjab-haryana-odisha", "tamil-nadu", "kerala"))
SOLAR_CYCLES = frozenset(("mesha-solar-season", "tula-solar-season"))
SOURCE_URL="https://packolkata.imd.gov.in/panchang/en/regional-calendars"


def validate_regional_source(source: dict) -> None:
    if not isinstance(source,dict) or source.get("schemaVersion")!=1:
        raise ValueError("Invalid PAC regional source schema")
    if source.get("sourceUrl")!=SOURCE_URL:
        raise ValueError("PAC official source URL required")
    if source.get("publishingAllowed") is not False or (
        source.get("transcriptionIndependentlyReviewed") is not False
    ):
        raise ValueError("Regional solar source has forged verification or publish flag")
    if source.get("calendarScope") != (
        "selected regional SOLAR month start dates only; no lunar-month, festival, or Muhurat inference"
    ):
        raise ValueError("Regional-source calendar school mismatch")
    events=source.get("monthStarts")
    if not isinstance(events,list) or len(events)!=8:
        raise ValueError("Expected exactly 8 supported regional month-start events")
    seen=set()
    for row in events:
        if not isinstance(row,dict):
            raise ValueError("Invalid regional calendar event")
        reg=row.get("regionId")
        cycle=row.get("cycle")
        if reg not in PAC_REGIONS or cycle not in SOLAR_CYCLES:
            raise ValueError("Unsupported region or calendar school")
        key=(reg,cycle)
        if key in seen:
            raise ValueError("Duplicate solar cycle/region start")
        seen.add(key)
        if not row.get("regionalTable") or not row.get("sourceRow"):
            raise ValueError("Regional source row provenance missing")
        if not isinstance(row.get("localMonthName"),str) or not row["localMonthName"]:
            raise ValueError("Regional month name unavailable")
        dt=date.fromisoformat(row["gregorianStart"])
        if dt.year!=2026 or dt.month not in (4,10):
            raise ValueError("Unsupported partial research date")
        if (cycle=="mesha-solar-season") != (dt.month==4):
            raise ValueError("Regional solar cycle mapped to wrong season")
    if seen!={(r,c) for r in PAC_REGIONS for c in SOLAR_CYCLES}:
        raise ValueError("Missing regional evidence row")


def exact_month_start(source: dict, region: str, local_date: date) -> dict | None:
    """Return ONLY directly sourced exact-day month starts, never fill gaps."""
    validate_regional_source(source)
    if region not in PAC_REGIONS:
        raise ValueError("Unsupported or underspecified regional calendar")
    for event in source["monthStarts"]:
        if event["regionId"]==region and event["gregorianStart"]==local_date.isoformat():
            return {
                "region":region, "localDate":local_date.isoformat(),
                "localMonthName":event["localMonthName"],
                "calendarType":"regional-solar-only",
                "sourceUrl":SOURCE_URL,
                "status":"RESEARCH_ONLY_TRANSCRIPTION_PENDING",
                "festivalDateDetermined":False,
                "muhuratApproved":False,
                "indexingAuthorized":False,
            }
    return None


def regional_comparison_report(source: dict, raw: bytes) -> dict:
    validate_regional_source(source)
    groups=defaultdict(list)
    for event in source["monthStarts"]:
        groups[event["cycle"]].append(event)
    diffs=[]
    for cycle,rows in sorted(groups.items()):
        days=sorted(date.fromisoformat(r["gregorianStart"]) for r in rows)
        diffs.append({
            "cycle":cycle,
            "earliest":days[0].isoformat(),
            "latest":days[-1].isoformat(),
            "spreadDays":(days[-1]-days[0]).days,
            "documentedRegionalStarts":[
                {"region":r["regionId"],"month":r["localMonthName"],
                 "startDate":r["gregorianStart"]}
                for r in sorted(rows,key=lambda v:v["regionId"])
            ],
        })
    return {
        "status":"RESEARCH_ONLY",
        "sourceUrl":SOURCE_URL,
        "fixtureSha256":hashlib.sha256(raw).hexdigest(),
        "sourceTranscriptionReviewed":False,
        "regionalSolarBoundaryGroups":diffs,
        "observedRegionSpecificVariation":any(v["spreadDays"]>0 for v in diffs),
        "festivalOrVratDatesAuthorized":False,
        "muhuratAuthorized":False,
        "indexingAuthorized":False,
        "publicationAuthorized":False,
        "blockers":[
            "government-calendar-table-transcription-not-independently-reviewed",
            "partial-solar-month-coverage-only",
            "lunar-calendar-and-ritual-observance-not-validated",
            "city-specific-editorial-value-not-reviewed",
        ],
    }


def main():
    p=argparse.ArgumentParser(description="Selected PAC regional solar-month facts only; NOT a calendar")
    p.add_argument("--fixture",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    args=p.parse_args()
    if args.out.exists():
        raise ValueError("Refusing to overwrite regional research report")
    data=args.fixture.read_bytes()
    report=regional_comparison_report(json.loads(data),data)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n")
    for comparison in report["regionalSolarBoundaryGroups"]:
        print(comparison["cycle"],"regional start spread:",comparison["spreadDays"],"day")
    print("Regional facts transcribed but NOT validated for publication")

if __name__=="__main__":
    main()
