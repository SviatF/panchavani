"""Seven consecutive India-local city/day six-limb JPL RESEARCH dossier.

This is an independent recomputation for *review*, NOT the byte-identical
historical D1/R2 research record. Its output may NOT become a signed science
pack, a DeepSeek prompt with numerical claims, or an indexable page.
"""
from __future__ import annotations
import argparse,hashlib,json
from datetime import date,timedelta
from pathlib import Path
from .astronomy import SkyfieldAdapter
from .sidereal import LahiriEpochAnchorResearch
from .first_six_limb_pilot import PILOT,KINDS,build_day,verify_six_limb_record
from .validation_matrix import cross_city_utc_invariance
from .compute import digest
from .research_batch import JPL_DE440S_SHA

def validate_week(records:list[dict],start:date):
    days=[(start+timedelta(days=n)).isoformat() for n in range(7)]
    expected={(city,day) for city in PILOT for day in days}
    if not isinstance(records,list) or len(records)!=21:
        raise ValueError("Exactly 21 city-day records required")
    indexed={}
    for record in records:
        verify_six_limb_record(record,PILOT)
        key=(record["cityId"],record["localDate"])
        if key not in expected or key in indexed:
            raise ValueError("Out-of-range or duplicate pilot record")
        indexed[key]=record
    if set(indexed)!=expected:
        raise ValueError("Incomplete 3-city seven-day science coverage")
    transitions=0
    for day in days:
        dawns=[indexed[(city,day)]["sun"]["sunriseUtc"] for city in PILOT]
        if len(set(dawns))!=len(PILOT):
            raise ValueError("Duplicated local sunrise across pilot cities")
    for city in PILOT:
        geo=indexed[(city,days[0])]["cityReference"]
        method=indexed[(city,days[0])]["methodology"]
        for prev,next_ in zip(days,days[1:]):
            first=indexed[(city,prev)]
            current=indexed[(city,next_)]
            if current["cityReference"]!=geo or current["methodology"]!=method:
                raise ValueError("City geolocation/method changed inside the review week")
            if first["sun"]["nextSunriseUtc"]!=current["sun"]["sunriseUtc"]:
                raise ValueError("Cross-day local dawn is discontinuous")
            for kind in KINDS:
                a=first["transitions"][kind][-1]
                b=current["transitions"][kind][0]
                if (a["endUtc"]!=b["startUtc"] or
                    a["number"]!=b["number"] or a["name"]!=b["name"]):
                    raise ValueError("Cross-day phase discrepancy: "+city+"/"+prev+"/"+kind)
                transitions+=1
    shared=cross_city_utc_invariance(records)
    return {"expectedCityDays":21,"checkedCityDays":21,
      "daysPerCity":7,"cityCount":3,"adjacentFourLimbChecks":transitions,
      "sharedGeocentricUtcComparisons":shared,
      "scopeStart":days[0],"scopeEnd":days[-1],
      "internallyConsistent":True,
      "methodIndependentAccuracyProven":False,
      "scientificApproval":False,"indexingAuthorized":False}

def make_week(ephemeris:Path,out:Path,start:date):
    if out.exists(): raise ValueError("Never overwrite an existing science review artifact")
    if not date(2025,1,1)<=start<=date(2030,12,24):
        raise ValueError("Review period outside bounded JPL study scope")
    if digest(ephemeris)!=JPL_DE440S_SHA:
        raise ValueError("Unpinned NASA/JPL DE440s ephemeris")
    adapter=SkyfieldAdapter(ephemeris)
    sidereal=LahiriEpochAnchorResearch(adapter)
    records=[build_day(adapter,sidereal,c,start+timedelta(days=d),PILOT)
             for d in range(7) for c in PILOT]
    report=validate_week(records,start)
    payload={
      "artifactType":"PANCHAVANI_THREE_CITY_SEVEN_DAY_INDEPENDENT_RECOMPUTATION_RESEARCH",
      "schemaVersion":1,"status":"UNAPPROVED_RESEARCH",
      "ephemerisSha256":JPL_DE440S_SHA,
      "scopeCities":list(PILOT),
      "localDates": [(start+timedelta(days=i)).isoformat() for i in range(7)],
      "qualityReport":report,
      "sourceIdentity":"RECOMPUTED_NOT_SAME_AS_PRIVATE_D1_R2_RECORD_SHA",
      "independentEphemerisComparisonPending":True,
      "humanGeolocationAndLahiriReviewPending":True,
      "scientificApproval":False,
      "modelInvocationAuthorized":False,
      "approvedClaimsForDeepSeek":[],
      "publicationAuthorized":False,
      "indexingAuthorized":False,
      "records":records
    }
    out.parent.mkdir(parents=True,exist_ok=True)
    with out.open("x",encoding="utf8") as f:
        json.dump(payload,f,indent=2,ensure_ascii=False)
        f.write("\n")
    return payload

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--ephemeris",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    p.add_argument("--start",type=date.fromisoformat,default=date(2026,10,20))
    a=p.parse_args()
    r=make_week(a.ephemeris,a.out,a.start)
    print("PASS: recomputed",len(r["records"]),"private six-limb review days")
    print("Scientific approval:",r["scientificApproval"],
          "Approved AI facts:",len(r["approvedClaimsForDeepSeek"]))
if __name__=="__main__":main()
