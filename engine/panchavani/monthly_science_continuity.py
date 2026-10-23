"""Whole-month scientific STRUCTURE gate: all cities, all neighboring days.

Two-day JPL batches already pass their own checks; this gate detects drift
between adjacent batches and duplicate/inconsistent lunar crossings over the
FULL month. It does NOT establish an independently correct Lahiri convention,
surveyed coordinates, ritual eligibility, or publication permission.
"""
from __future__ import annotations
import argparse
import json
from datetime import datetime
from pathlib import Path
from .first_six_limb_pilot import KINDS,TEN_CITY_IDS,verify_six_limb_record
from .monthly_content_pipeline import batch_starts,month_days
from .validation_matrix import cross_city_utc_invariance

def _datetime(value):
    if not isinstance(value,str):
        raise ValueError("Unrecognized event timestamp")
    dt=datetime.fromisoformat(value.replace("Z","+00:00"))
    if dt.utcoffset() is None:
        raise ValueError("Timezone-less event time")
    return dt

def audit_full_month(month:str,records:list[dict])->dict:
    """Check all 10 city/day records, dawn continuity and event identity."""
    days=month_days(month)
    expected={(city,day.isoformat()) for city in TEN_CITY_IDS for day in days}
    if not isinstance(records,list) or len(records)!=len(expected):
        raise ValueError("Month/day-city cohort incomplete or oversized")
    indexed={}
    for item in records:
        verify_six_limb_record(item,TEN_CITY_IDS)
        key=(item["cityId"],item["localDate"])
        if key in indexed or key not in expected:
            raise ValueError("Duplicate or out-of-scope city/date research record")
        indexed[key]=item
        # Reconcile geocentric-event pointers with exact phase intervals.
        # Neither may silently mutate after the original JPL solve.
        for kind in KINDS:
            expected_events=[
                (x["number"],x["endUtc"]) for x in item["transitions"][kind][:-1]
            ]
            actual=item.get("geocentricBoundariesUtc",{}).get(kind)
            if not isinstance(actual,list) or [
                (x.get("endingNumber"),x.get("endUtc")) for x in actual
            ]!=expected_events:
                raise ValueError("Source event timeline diverges from geocentric crossing data: "+str(key)+"/"+kind)
    if set(indexed)!=expected:
        raise ValueError("Missing city/date evidence")
    dawns=0
    layer_boundaries=0
    cross_batches=0
    method_copies=0
    for city in TEN_CITY_IDS:
        origin=indexed[(city,days[0].isoformat())]
        source_location=origin.get("cityReference")
        method=origin.get("methodology")
        if not isinstance(source_location,dict) or not isinstance(method,dict):
            raise ValueError("No reproducible method/location for city "+city)
        for index,day in enumerate(days):
            current=indexed[(city,day.isoformat())]
            if (current.get("cityReference")!=source_location or
                current.get("methodology")!=method):
                raise ValueError("City's coordinate/methodology source changed inside month: "+city+"/"+str(day))
            method_copies+=1
            if index==0:
                continue
            previous=indexed[(city,days[index-1].isoformat())]
            if (_datetime(previous["sun"]["nextSunriseUtc"])!=
                _datetime(current["sun"]["sunriseUtc"])):
                raise ValueError("Cross-day local sunrise discontinuity: "+city+"/"+str(day))
            dawns+=1
            for kind in KINDS:
                prior=previous["transitions"][kind][-1]
                following=current["transitions"][kind][0]
                if (prior["name"]!=following["name"] or
                    prior["number"]!=following["number"] or
                    _datetime(prior["endUtc"])!=_datetime(following["startUtc"])):
                    raise ValueError("Cross-cohort phase discontinuity: "+city+"/"+str(day)+"/"+kind)
                layer_boundaries+=1
            if index%2==0:
                cross_batches+=1
    # Geocentric phase crossing belongs to one UTC instant, regardless of
    # local sunrise in Delhi, Mumbai, Kolkata, Chennai or any other Indian city.
    shared=cross_city_utc_invariance(list(indexed.values()))
    if shared<0:
        raise ValueError("Bad cross-city numerical consistency")
    return {
        "artifactType":"PANCHAVANI_WHOLE_MONTH_JPL_CONTINUITY_AUDIT",
        "status":"STRUCTURAL_CHECK_PASSED_NOT_SCIENCE_APPROVED",
        "month":month,"cityCount":len(TEN_CITY_IDS),"checkedCityDays":len(expected),
        "checkedNeighboringSolarDays":dawns,
        "checkedAdjacentFourLimbBoundaries":layer_boundaries,
        "checkedCrossCohortDayBoundaries":cross_batches,
        "checkedUnchangedCityMethodRecords":method_copies,
        "crossCitySharedGeocentricEventsCompared":shared,
        "localDayUniquenessIsCityAndDateNotArtificialLunarVariation":True,
        "scientificApproval":False,
        "externalObserverCoordinatesVerified":False,
        "independentLahiriMethodCertified":False,
        "festivalObservanceRulesCertified":False,
        "publicationAuthorized":False,"indexingAuthorized":False,
        "approvedClaimsForDeepSeek":[],
        "note":"All checks are intra-model consistency only; independent astronomy and coordinates remain unapproved.",
    }

def audit_from_batches(month:str,batches:list[dict])->dict:
    starts=batch_starts(month)
    if not isinstance(batches,list) or len(batches)!=len(starts):
        raise ValueError("Missing two-day cohorts")
    rows=[]
    for start,batch in zip(starts,batches):
        if (batch.get("artifactType")!="PANCHAVANI_TEN_CITY_SIX_LIMB_RESEARCH_BATCH"
            or batch.get("status")!="UNAPPROVED_RESEARCH"
            or batch.get("publicationAuthorized") is not False
            or batch.get("scientificApproval") is not False
            or batch.get("indexingAuthorized") is not False
            or batch.get("cityCount")!=len(TEN_CITY_IDS)
            or len(batch.get("records",[]))!=2*len(TEN_CITY_IDS)):
            raise ValueError("Untrusted batch source")
        checked=verify_batch(batch["records"],TEN_CITY_IDS)
        if checked["localDateFrom"]!=start:
            raise ValueError("Reordered or mislabeled two-day cohort: "+start)
        for x in batch["records"]:
            if x.get("localDate","").startswith(month+"-"):
                rows.append(x)
    return audit_full_month(month,rows)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--month",required=True)
    parser.add_argument("--batches-dir",required=True,type=Path)
    parser.add_argument("--out",required=True,type=Path)
    args=parser.parse_args()
    inputs=[]
    for start in batch_starts(args.month):
        inputs.append(json.loads((args.batches_dir/("batch-"+start+".json")).read_text()))
    result=audit_from_batches(args.month,inputs)
    if args.out.exists():
        raise ValueError("Refuse overwriting prior monthly evidence")
    args.out.parent.mkdir(parents=True,exist_ok=True)
    with args.out.open("x",encoding="utf-8") as handle:
        json.dump(result,handle,indent=2,ensure_ascii=False)
        handle.write("\n")
    print("FULL MONTH STRUCTURAL CHECKS:",result["checkedCityDays"])
    print("CROSS-COHORT DAWNS:",result["checkedCrossCohortDayBoundaries"])
    print("PUBLICATION AUTHORIZED:",result["publicationAuthorized"])
if __name__=="__main__":main()
