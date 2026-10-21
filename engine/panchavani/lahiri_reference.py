"""Independent Swiss Ephemeris Lahiri comparison for research-only Panchang.

This measures angular discrepancies; it does not replace the JPL solution or
authorize publishing dates. Swiss' default Lahiri modes must not be mistaken
for the project's unverified IAE-anchor interpretation.
"""
from __future__ import annotations
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

DATES=("2026-01-15T12:00:00+00:00","2026-04-15T12:00:00+00:00",
       "2026-07-15T12:00:00+00:00","2026-10-21T12:00:00+00:00",
       "2027-01-15T12:00:00+00:00")

def circular_arcseconds(a,b):
    return abs((a-b+180)%360-180)*3600

def compare(ephemeris:Path):
    import swisseph as swe
    from .astronomy import SkyfieldAdapter
    from .sidereal import LahiriEpochAnchorResearch
    adapter=SkyfieldAdapter(ephemeris)
    model=LahiriEpochAnchorResearch(adapter)
    swe.set_sid_mode(swe.SIDM_LAHIRI,0,0)
    cases=[]
    for iso in DATES:
        instant=datetime.fromisoformat(iso).astimezone(timezone.utc)
        jd=swe.julday(instant.year,instant.month,instant.day,
                      instant.hour+instant.minute/60+instant.second/3600)
        # TT/UT distinction is explicit. Swiss get_ayanamsa_ut converts UT->TT.
        swiss=float(swe.get_ayanamsa_ut(jd))
        ours=float(model.ayanamsa(instant))
        difference=circular_arcseconds(ours,swiss)
        cases.append({"utc":iso,"modelDegrees":round(ours,10),
                      "swissLahiriDegrees":round(swiss,10),
                      "differenceArcseconds":round(difference,6)})
    return {"artifactType":"PANCHAVANI_LAHIRI_INDEPENDENT_COMPARISON",
            "status":"UNAPPROVED_RESEARCH","reference":"Swiss Ephemeris SIDM_LAHIRI",
            "comparisonDates":len(cases),"samples":cases,
            "maximumDifferenceArcseconds":max(x["differenceArcseconds"] for x in cases),
            "methodologiesIdenticalProven":False,"scientificApproval":False,
            "muhuratRecommendationsAuthorized":False,
            "approvedClaimsForDeepSeek":[],"publicationAuthorized":False,
            "indexingAuthorized":False}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--ephemeris",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    a=p.parse_args()
    result=compare(a.ephemeris)
    a.out.parent.mkdir(parents=True,exist_ok=True)
    with a.out.open("x",encoding="utf-8") as f:
        json.dump(result,f,indent=2)
        f.write("\n")
    for row in result["samples"]:
        print("LAHIRI COMPARISON",row)
    print("MAX ARCSECONDS:",result["maximumDifferenceArcseconds"])
    print("METHODOLOGIES APPROVED:",result["methodologiesIdenticalProven"])

if __name__=="__main__":
    main()
