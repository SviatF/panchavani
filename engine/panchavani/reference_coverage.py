"""Measure external reference evidence coverage without certifying Panchang science."""
from __future__ import annotations
import argparse
import json
from pathlib import Path

EVENTS=("sunrise","sunset","tithi","karana","nakshatra","yoga")
CITIES=("delhi","mumbai","kolkata","chennai","bengaluru","hyderabad","ahmedabad","pune","jaipur","varanasi")

def assess_coverage(report:dict)->dict:
    if (not isinstance(report,dict) or report.get("artifactType")!="PANCHAVANI_REFERENCE_ACCURACY_BENCHMARK"
        or report.get("status")!="UNAPPROVED_COMPARISON"
        or report.get("scientificApproval") is not False
        or report.get("publicationAuthorized") is not False
        or report.get("indexingAuthorized") is not False
        or report.get("muhuratRecommendationsAuthorized") is not False):
        raise ValueError("Untrusted external benchmark")
    comparisons=report.get("comparisons")
    if not isinstance(comparisons,list) or len(comparisons)!=report.get("sampleCount"):
        raise ValueError("Inconsistent reference sample cohort")
    coverage={city:{event:0 for event in EVENTS} for city in CITIES}
    dates=set()
    precision_counts={"upToMinuteOrCoarser":0,"FinerThanOneMinute":0}
    invalid_geography=[]
    for x in comparisons:
        city=x.get("cityId")
        event=x.get("kind")
        if city not in CITIES or event not in EVENTS:
            if event=="following-sunrise" and city in CITIES:
                continue
            raise ValueError("Unsupported reference observation")
        if x.get("independentlyVerified") is not False:
            raise ValueError("External comparison is not approved evidence")
        duration=x.get("referencePrecisionSeconds")
        if type(duration) not in (int,float) or not 0<duration<=3600:
            raise ValueError("Unstated reference resolution")
        if x.get("sourceLocationQualifiedForDelhi") is True:
            coverage[city][event]+=1
            dates.add((city,x.get("localDate")))
        else:
            invalid_geography.append({"cityId":city,"kind":event,
                                      "reason":x.get("sourceLocationStatus","NO_SOURCE_IDENTITY_PROOF")})
        precision_counts["upToMinuteOrCoarser" if duration>=60 else "FinerThanOneMinute"]+=1
    counts={event:sum(coverage[city][event] for city in CITIES) for event in EVENTS}
    missing=[{"cityId":city,"missingKinds":[event for event in EVENTS if coverage[city][event]==0]}
             for city in CITIES if any(coverage[city][event]==0 for event in EVENTS)]
    return {"artifactType":"PANCHAVANI_REFERENCE_EVIDENCE_COVERAGE",
            "status":"INCOMPLETE_SCIENTIFIC_EVIDENCE",
            "cityCoverage":coverage,"sampleCountsByEvent":counts,
            "cityDaysCovered":len(dates),"missingCityEventGroups":missing,
            "quarantinedObservationCount":len(invalid_geography),
            "quarantinedObservations":invalid_geography,
            "sourcePrecisionCounts":precision_counts,
            "hasAllTenCityEventGroups":not missing,
            "independentScientificApproval":False,
            "ritualEligibilityApproved":False,
            "muhuratRecommendationsAuthorized":False,
            "publicationAuthorized":False,"indexingAuthorized":False}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--benchmark",type=Path,required=True)
    parser.add_argument("--out",type=Path,required=True)
    a=parser.parse_args()
    output=assess_coverage(json.loads(a.benchmark.read_text()))
    a.out.parent.mkdir(parents=True,exist_ok=True)
    with a.out.open("x") as f:
        json.dump(output,f,indent=2)
        f.write("\n")
    print("Reference coverage by event:",output["sampleCountsByEvent"])
    print("Missing ten-city event groups:",len(output["missingCityEventGroups"]))
    print("Independent scientific approval:",output["independentScientificApproval"])

if __name__=="__main__":
    main()
