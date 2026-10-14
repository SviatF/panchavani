"""Reproducible JPL/Skyfield SIDEREAL RESEARCH PROBE.

Produces UNAPPROVED Nakshatra and Yoga transitions. Compared with two publicly
reported values, which have UNKNOWN methodological independence. This is not
a public Panchang or a validation of Lahiri-IAE 1985 compliance.
"""
from __future__ import annotations
import argparse
import json
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from .astronomy import SkyfieldAdapter
from .cities import PILOT_CITIES
from .compute import digest
from .core import phase_intervals
from .research_batch import JPL_DE440S_SHA
from .sidereal import (
    LahiriEpochAnchorResearch, PART_WIDTH, NAKSHATRA_NAMES, YOGA_NAMES
)

def examine(ephemeris: Path, city_id: str, local_date: date, sources: dict|None = None) -> dict:
    if city_id not in PILOT_CITIES:
        raise ValueError("Unrecognized research city")
    if digest(ephemeris) != JPL_DE440S_SHA:
        raise ValueError("JPL DE440s ephemeris checksum mismatch")
    city=PILOT_CITIES[city_id]
    adapter=SkyfieldAdapter(ephemeris)
    sunrise,sunset,next_sunrise=adapter.solar_day(city,local_date)
    m=LahiriEpochAnchorResearch(adapter)
    nak=phase_intervals(m.nakshatra_phase,sunrise,next_sunrise,PART_WIDTH)
    yoga=phase_intervals(m.yoga_phase,sunrise,next_sunrise,PART_WIDTH)
    tz=ZoneInfo(city.timezone)
    def local(t):
        return t.astimezone(tz).isoformat(timespec="seconds")
    def items(segs,names):
        return [
            {"name":names[seg.number-1],
             "beginUtc":seg.start.isoformat(),
             "endUtc":seg.end.isoformat(),
             "endLocal":local(seg.end)}
            for seg in segs
        ]
    comparisons=[]
    if sources:
        if sources.get("city")!=city_id or sources.get("date")!=local_date.isoformat():
            raise ValueError("Comparator belongs to another city or day")
        for reference in sources.get("sources",[]):
            if not str(reference.get("url","")).startswith("https://"):
                raise ValueError("Source URL missing HTTPS")
            for kind,segments,key in (
                ("nakshatra",nak,"nakshatraEnd"),
                ("yoga",yoga,"yogaEnd"),
            ):
                reference_time=datetime.fromisoformat(reference[key])
                if reference_time.tzinfo is None:
                    raise ValueError("Comparator time must include timezone offset")
                difference=round((segments[0].end-reference_time).total_seconds(),3)
                comparisons.append({
                    "name":reference["name"],
                    "url":reference["url"],
                    "metric":kind+"-end",
                    "differenceSeconds":difference,
                    "withinExploratory15Minutes":abs(difference)<=900,
                })
    return {
        "city":city_id,"date":local_date.isoformat(),
        "researchOnly":True,"status":"UNAPPROVED",
        "publicReleaseAllowed":False,"independentScientificValidation":"NOT_COMPLETED",
        "method":m.METHOD_ID,"jplKernelSha256":JPL_DE440S_SHA,
        "sourceEphemeris":ephemeris.name,
        "ayanamsaAtSunriseDegrees":m.ayanamsa(sunrise),
        "sunriseLocal":local(sunrise),
        "nakshatraAtSunrise":NAKSHATRA_NAMES[nak[0].number-1],
        "yogaAtSunrise":YOGA_NAMES[yoga[0].number-1],
        "nakshatraWindows":items(nak,NAKSHATRA_NAMES),
        "yogaWindows":items(yoga,YOGA_NAMES),
        "comparators":comparisons,
        "blockers":[
            "IAE-Lahiri-ayanamsa-not-independently-calibrated",
            "city-coordinates-unreviewed",
            "two-independent-methodology-comparators-missing",
            "ritual-festival-rules-unreviewed",
            "editorial-SEO-review-missing",
        ],
    }

def main():
    p=argparse.ArgumentParser(description="Pilot Nakshatra/Yoga — UNAPPROVED")
    p.add_argument("--ephemeris",type=Path,required=True)
    p.add_argument("--city",choices=sorted(PILOT_CITIES),default="delhi")
    p.add_argument("--date",type=date.fromisoformat,default=date(2026,10,13))
    p.add_argument("--references",type=Path)
    p.add_argument("--out",type=Path,required=True)
    args=p.parse_args()
    sources=json.loads(args.references.read_text()) if args.references else None
    report=examine(args.ephemeris,args.city,args.date,sources)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    if args.out.exists():raise SystemExit("Refusing to overwrite previous scientific probe")
    args.out.write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print("UNAPPROVED SIDEREAL RESEARCH",args.city,args.date)
    print("Ayanamsa at sunrise (research model):",report["ayanamsaAtSunriseDegrees"])
    print("Nakshatra:",report["nakshatraAtSunrise"],"until",report["nakshatraWindows"][0]["endLocal"])
    print("Yoga:",report["yogaAtSunrise"],"until",report["yogaWindows"][0]["endLocal"])
    for c in report["comparators"]:
        print(c["name"],c["metric"],"difference(seconds)",c["differenceSeconds"])
    print("Blockers:",len(report["blockers"]), "Published:",report["publicReleaseAllowed"])

if __name__=="__main__":main()
