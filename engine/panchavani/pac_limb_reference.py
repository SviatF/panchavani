"""Compare dated government PAC Panchang limb endings to JPL/Skyfield research.

A single PAC daily *central station* entry is NOT four city-specific readings.
Clock timings are IST and sunrise-reckoned (24h+ means next Gregorian day).
Method matching, independent snapshot verification and calendar tradition are
pending. Passing a research alert never authorizes public/SEO release.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from .astronomy import SkyfieldAdapter
from .compute import digest
from .core import phase_intervals
from .research_batch import JPL_DE440S_SHA
from .sidereal import LahiriEpochAnchorResearch, PART_WIDTH

TZ=ZoneInfo("Asia/Kolkata")
PAC_URL="https://packolkata.imd.gov.in/panchang/en"
PAC_CONVENTIONS="https://packolkata.imd.gov.in/panchang/en/explanation"
KINDS={"tithi":(12.0,30),"karana":(6.0,60),
       "nakshatra":(PART_WIDTH,27),"yoga":(PART_WIDTH,27)}
TOKEN=re.compile(r"^(\d{1,2})-(\d{2})$")
RESEARCH_ALERT_S=1800  # Detection only. This is NOT a scientific acceptance threshold.


def pac_clock_to_ist(local_day: date, clock: str) -> datetime:
    m=TOKEN.fullmatch(clock) if isinstance(clock,str) else None
    if not m:
        raise ValueError("PAC clock must be HH-MM")
    hours,minutes=map(int,m.groups())
    if hours>30 or not 0<=minutes<=59:
        raise ValueError("Invalid PAC sunrise-reckoned clock 0..30 hours")
    return datetime(local_day.year,local_day.month,local_day.day,tzinfo=TZ) + timedelta(hours=hours,minutes=minutes)


def validate_fixture(source: dict) -> None:
    if not isinstance(source,dict) or source.get("schemaVersion")!=1:
        raise ValueError("Unsupported PAC limb fixture")
    if (source.get("sourceUrl")!=PAC_URL or
        source.get("timeConventionDocument")!=PAC_CONVENTIONS or
        source.get("timeZone")!="Asia/Kolkata" or
        source.get("dayStartConvention")!="central-station-sunrise" or
        source.get("stationScope")!="adopted-central-station-of-india-not-any-candidate-city"):
        raise ValueError("PAC station/method provenance is missing")
    if (source.get("webSnapshotArchived") is not False or
        source.get("transcribedIndependentlyReviewed") is not False or
        source.get("methodologyIndependentlyValidated") is not False or
        source.get("candidatesNeverPublic") is not True):
        raise ValueError("Research fixture cannot self-certify publication")
    day=date.fromisoformat(source["gregorianDate"])
    if day.year!=2026:
        raise ValueError("Reference date outside current PAC publication")
    observations=source.get("observations")
    if not isinstance(observations,list) or len(observations)!=5:
        raise ValueError("Expected documented Tithi/Nakshatra/Yoga/two Karanas")
    seen=set()
    for x in observations:
        if not isinstance(x,dict) or set(x)!={"type","number","printedName","endClock","resolutionSeconds"}:
            raise ValueError("Source event provenance is incomplete")
        kind=x["type"]
        if kind not in KINDS or type(x["number"]) is not int or not 1<=x["number"]<=KINDS[kind][1]:
            raise ValueError("Invalid astronomical limb number")
        if not isinstance(x["printedName"],str) or not x["printedName"]:
            raise ValueError("Missing PAC printed name")
        if x["resolutionSeconds"]!=60:
            raise ValueError("Only minute-rounded PAC observations supported")
        pac_clock_to_ist(day,x["endClock"])
        key=(kind,x["number"])
        if key in seen: raise ValueError("Duplicate PAC event observation")
        seen.add(key)
    if set(x["type"] for x in observations)!=set(KINDS):
        raise ValueError("Missing a required astronomical limb")
    # Every completed Tithi #n ends on Karana half #2n; no fixed
    # September Ekadashi ordinal may be applied to an October Shashthi.
    tithi=next(x for x in observations if x["type"]=="tithi")
    final_karana=next((x for x in observations if x["type"]=="karana"
                      and x["number"]==2*tithi["number"]),None)
    if final_karana is None or final_karana["endClock"]!=tithi["endClock"]:
        raise ValueError("PAC Tithi and final Karana must share the identical printed end clock")


def compare_limb_endings(source: dict, computed: dict[tuple[str,int],list[datetime]]) -> dict:
    validate_fixture(source)
    day=date.fromisoformat(source["gregorianDate"])
    rows=[]
    blockers=["official-web-snapshot-not-archived",
              "PAC-transcription-not-independently-reviewed",
              "Lahiri-method-not-independently-calibrated",
              "official-central-station-is-not-city-specific",
              "ritual-interpretation-and-publishing-unreviewed"]
    for x in source["observations"]:
        expected=pac_clock_to_ist(day,x["endClock"])
        options=computed.get((x["type"],x["number"]),[])
        if len(options)!=1:
            raise ValueError(f"Cannot uniquely resolve PAC {x['type']} #{x['number']} boundary")
        actual=options[0]
        if actual.tzinfo is None or actual.utcoffset() is None:
            raise ValueError("Computed event must be timezone-aware")
        difference=round((actual-expected).total_seconds(),3)
        rows.append({
            "type":x["type"],"number":x["number"],
            "PACPrintedName":x["printedName"],
            "officialIST":expected.isoformat(timespec="minutes"),
            "computedIST":actual.astimezone(TZ).isoformat(timespec="seconds"),
            "deltaSeconds":difference,
            "withinResearchAlertThreshold":abs(difference)<=RESEARCH_ALERT_S,
            "publicationApproved":False,
        })
    return {
        "status":"PAC_LIMBS_RESEARCH_ONLY",
        "date":source["gregorianDate"],
        "officialSource":PAC_URL,
        "timeConvention":PAC_CONVENTIONS,
        "referenceStation":"CENTRAL_INDIA",
        "citySpecificClaims":0,
        "observationCount":len(rows),
        "maxAbsoluteDeltaSeconds":max(abs(x["deltaSeconds"]) for x in rows),
        "allWithinExploratoryAlert":all(x["withinResearchAlertThreshold"] for x in rows),
        "methodologicallyIndependentValidation":False,
        "ritualOrMuhuratApproved":False,
        "indexingAuthorized":False,
        "publicationAuthorized":False,
        "blockers":blockers,
        "comparisons":rows,
    }


def calculate_reference_comparison(ephemeris: Path, fixture: Path, output: Path) -> dict:
    if output.exists():raise ValueError("Refusing to overwrite existing PAC research results")
    if digest(ephemeris)!=JPL_DE440S_SHA:
        raise ValueError("JPL ephemeris checksum mismatch")
    source_bytes=fixture.read_bytes()
    source=json.loads(source_bytes)
    validate_fixture(source)
    day=date.fromisoformat(source["gregorianDate"])
    start=datetime(day.year,day.month,day.day,tzinfo=TZ)
    # Include dawn of following day; 24..30h PAC values can cross midnight.
    end=start+timedelta(hours=31)
    adapter=SkyfieldAdapter(ephemeris)
    model=LahiriEpochAnchorResearch(adapter)
    funcs={"tithi":adapter.elongation,"karana":adapter.elongation,
           "nakshatra":model.nakshatra_phase,"yoga":model.yoga_phase}
    computed={}
    for kind,(width,_) in KINDS.items():
        segs=phase_intervals(funcs[kind],start,end,width)
        for seg in segs[:-1]:
            computed.setdefault((kind,seg.number),[]).append(seg.end)
    report=compare_limb_endings(source,computed)
    # Generalized across Tithi ordinals and calendar dates: ending Tithi
    # #n always shares its true angular crossing with Karana half #2n.
    tithi=next(r for r in report["comparisons"] if r["type"]=="tithi")
    tithi_number=next(x["number"] for x in source["observations"] if x["type"]=="tithi")
    karana=next(r for r in report["comparisons"]
                if r["type"]=="karana" and r["number"]==2*tithi_number)
    report["tithiKaranaCrossingAgreeWithinSecond"]=abs(tithi["deltaSeconds"]-karana["deltaSeconds"])<=1
    if not report["tithiKaranaCrossingAgreeWithinSecond"]:
        raise ValueError("Mathematically identical Tithi and Karana crossings disagree")
    report["jplSha256"]=JPL_DE440S_SHA
    report["fixtureSha256"]=hashlib.sha256(source_bytes).hexdigest()
    report["provisionalLahiriMethod"]=model.METHOD_ID
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    return report


def main():
    p=argparse.ArgumentParser(description="PAC government central station Panchang limb QA; NEVER publish")
    p.add_argument("--ephemeris",required=True,type=Path)
    p.add_argument("--fixture",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args()
    result=calculate_reference_comparison(a.ephemeris,a.fixture,a.out)
    print("PAC geocentric limb research:",result["observationCount"],"observations")
    for r in result["comparisons"]:
        print(r["type"],r["PACPrintedName"],r["deltaSeconds"],"seconds",r["withinResearchAlertThreshold"])
    print("Maximum published-clock discrepancy:",result["maxAbsoluteDeltaSeconds"],"seconds")
    print("Independent method validated:",result["methodologicallyIndependentValidation"])
    print("SEO publication allowed:",result["publicationAuthorized"])

if __name__=="__main__":
    main()
