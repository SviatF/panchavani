"""Ephemeral Swiss Moshier-vs-JPL 21-dawn calibration, research-only.

Depends on pyswisseph in isolated CI, never in the Worker or public bundle.
Method/ephemeris mismatch is a *finding*, never science approval.
"""
from __future__ import annotations
import argparse,json
from datetime import datetime, date
from pathlib import Path

import swisseph as swe
from panchavani.astronomy import SkyfieldAdapter
from panchavani.sidereal import LahiriEpochAnchorResearch
from panchavani.research_batch import JPL_DE440S_SHA
from panchavani.compute import digest
from panchavani.seven_day_science_pilot import validate_week,PILOT
from swiss_lahiri_probe import compare_instant,find_swiss_boundary

def evaluate_research(data,adapter,model,limit=16):
    records=data["records"]
    start=date.fromisoformat(data["localDates"][0])
    validate_week(records,start)
    if (data.get("scientificApproval") is not False or
        data.get("publicationAuthorized") is not False or
        data.get("approvedClaimsForDeepSeek")!=[] or
        data.get("ephemerisSha256")!=JPL_DE440S_SHA):
        raise ValueError("Recomputed research candidate attempted science approval")
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    day_rows=[]
    for rec in records:
        t=datetime.fromisoformat(rec["sun"]["sunriseUtc"].replace("Z","+00:00"))
        probe=compare_instant(adapter,model,t,
                              rec["cityId"]+"/"+rec["localDate"]+"/SUNRISE")
        day_rows.append({"cityId":rec["cityId"],"localDate":rec["localDate"],
            "sunriseUtc":rec["sun"]["sunriseUtc"],
            "nakshatraLabelAgrees":probe["nakshatraLabelAgrees"],
            "yogaLabelAgrees":probe["yogaLabelAgrees"],
            "differences":probe["differences"]})
    if len(day_rows)!=21:
        raise ValueError("Missing independent 21 dawn comparisons")
    candidates={}
    for rec in records:
        for kind,events in rec["geocentricBoundariesUtc"].items():
            for x in events:
                key=(kind,x["endingNumber"],x["endUtc"])
                candidates[key]=x["endUtc"]
    kinds=("tithi","karana","nakshatra","yoga")
    per_kind=max(1,limit//len(kinds))
    samples=[]
    for kind in kinds:
        samples.extend([x for x in sorted(candidates) if x[0]==kind][:per_kind])
    samples=samples[:limit]
    if len({x[0] for x in samples})!=len(kinds):
        raise ValueError("Missing independent boundary samples for one or more lunar components")
    solved=[]
    for kind,number,text in samples:
        origin=datetime.fromisoformat(text.replace("Z","+00:00"))
        try:
            different=find_swiss_boundary(kind,origin,number)
            delta=round((different-origin).total_seconds(),6)
            solved.append({"kind":kind,"endingNumber":number,"jplUtc":text,
                "swissMinusJplSeconds":delta,"status":"independently-solved"})
        except ValueError:
            solved.append({"kind":kind,"endingNumber":number,"jplUtc":text,
                "swissMinusJplSeconds":None,
                "status":"independent-crossing-not-bracketed-NEEDS_EXPERT_REVIEW"})
    return {
        "artifactType":"PANCHAVANI_21_CITY_DAY_SWISS_ANALYTIC_DIAGNOSTIC",
        "schemaVersion":1,
        "status":"INDEPENDENT_DIAGNOSTIC_NOT_METHOD_EQUIVALENCE",
        "comparator":"pyswisseph "+swe.version,
        "swissBackend":"MOSEPH_ANALYTIC",
        "independentProgramAndEphemerisFamilyCompared":True,
        "sameEphemerisMethodConfirmed":False,
        "compared21RealCityDawns":len(day_rows),
        "independentBoundarySampleCount":len(solved),
        "unresolvedIndependentBoundaries":sum(x["status"]!="independently-solved" for x in solved),
        "nakshatraSunriseDisagreements":sum(not x["nakshatraLabelAgrees"] for x in day_rows),
        "yogaSunriseDisagreements":sum(not x["yogaLabelAgrees"] for x in day_rows),
        "cityDawnComparisons":day_rows,
        "boundaryComparisons":solved,
        "remainingApprovalBlockers":[
            "Moshier analytic Swiss is not ephemeris/method-matched JPL DE440s",
            "Ayanamsa reference-frame/UTC-UT1/TT conventions not certified",
            "City coordinates, elevation, horizon and refraction not independently confirmed",
            "Recomputed samples not byte-identical to stored private D1/R2 candidates",
            "Ritual regional rules and independent expert science signature missing"
        ],
        "scientificApproval":False,
        "modelInvocationAuthorized":False,
        "approvedClaimsForDeepSeek":[],
        "publicationAuthorized":False,
        "indexingAuthorized":False
    }

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--science",type=Path,required=True)
    p.add_argument("--ephemeris",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    a=p.parse_args()
    if a.out.exists():raise ValueError("Refuse overwriting existing independent evidence")
    if digest(a.ephemeris)!=JPL_DE440S_SHA:
        raise ValueError("Unverified NASA/JPL kernel")
    data=json.loads(a.science.read_text())
    if data.get("artifactType")!="PANCHAVANI_THREE_CITY_SEVEN_DAY_INDEPENDENT_RECOMPUTATION_RESEARCH":
        raise ValueError("Not a seven-day scientific research source")
    adapter=SkyfieldAdapter(a.ephemeris)
    report=evaluate_research(data,adapter,LahiriEpochAnchorResearch(adapter))
    a.out.parent.mkdir(parents=True,exist_ok=True)
    with a.out.open("x",encoding="utf8") as f:
        json.dump(report,f,indent=2,ensure_ascii=False)
        f.write("\n")
    print("Compared sunrise sites:",report["compared21RealCityDawns"])
    print("External source diagnostic boundary samples:",report["independentBoundarySampleCount"])
    print("Nakshatra/Yoga mismatches:",report["nakshatraSunriseDisagreements"],
          report["yogaSunriseDisagreements"])
    print("Publication authorized:",report["publicationAuthorized"])
if __name__=="__main__":main()
