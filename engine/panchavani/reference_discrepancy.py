"""Conservative classification of JPL-versus-publisher timing discrepancies.

A discrepancy is NOT proof the ephemeris is wrong: reference minute
precision, city coordinates, refraction, ayanamsha must be reconciled.
"""
from __future__ import annotations
import argparse
import json
import math
from collections import Counter
from pathlib import Path

ARTIFACT="PANCHAVANI_REFERENCE_DISCREPANCY_TRIAGE"
def triage(report:dict)->dict:
    if (not isinstance(report,dict) or report.get("artifactType")!="PANCHAVANI_REFERENCE_ACCURACY_BENCHMARK"
        or report.get("status")!="UNAPPROVED_COMPARISON"
        or any(report.get(k) is not False for k in
               ("scientificApproval","muhuratRecommendationsAuthorized","publicationAuthorized","indexingAuthorized"))
        or report.get("approvedClaimsForDeepSeek")!=[]):
        raise ValueError("Cannot triage approved or untrusted result")
    samples=report.get("comparisons")
    if not isinstance(samples,list) or not samples or len(samples)!=report.get("sampleCount"):
        raise ValueError("Missing or contradictory comparison evidence")
    analyzed=[]
    statuses=Counter()
    for s in samples:
        error=s.get("signedErrorSeconds")
        absolute=s.get("absoluteErrorSeconds")
        resolution=s.get("referencePrecisionSeconds")
        if (any(type(v) not in (int,float) or not math.isfinite(v) for v in (error,absolute,resolution))
            or resolution<=0 or resolution>3600
            or abs(abs(error)-absolute)>0.00001 or absolute<0):
            raise ValueError("Invalid residual or resolution")
        # Strict classification: a one-minute displayed clock is not
        # evidence of second-level agreement, even for an exact match.
        if absolute<=resolution:
            status="WITHIN_SOURCE_DISPLAY_RESOLUTION"
        elif absolute<=2*resolution:
            status="ABOVE_DISPLAY_RESOLUTION_REVIEW_METHOD"
        else:
            status="LARGE_DISCREPANCY_REQUIRES_INVESTIGATION"
        statuses[status]+=1
        analyzed.append({
            "cityId":s["cityId"],"localDate":s["localDate"],"kind":s["kind"],
            "signedErrorSeconds":error,"absoluteErrorSeconds":absolute,
            "referencePrecisionSeconds":resolution,"status":status,
            "astronomicalAccuracyCertified":False,
            "needsObserverAndAyanamshaMethodReconciliation":True
        })
    return {"artifactType":ARTIFACT,"schemaVersion":1,"status":"UNAPPROVED_DISCREPANCY_TRIAGE",
            "sampleCount":len(analyzed),"countsByStatus":dict(sorted(statuses.items())),
            "samples":analyzed,"overallMethodAccuracyCertified":False,
            "requiresIndependentScienceReview":True,
            "muhuratRecommendationsAuthorized":False,"publicationAuthorized":False,
            "indexingAuthorized":False,"approvedClaimsForDeepSeek":[]}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--benchmark",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    args=p.parse_args()
    report=triage(json.loads(args.benchmark.read_text()))
    args.out.parent.mkdir(parents=True,exist_ok=True)
    with args.out.open("x") as f:
        json.dump(report,f,indent=2)
        f.write("\n")
    print("Discrepancy triage:",report["countsByStatus"])
    print("Science method certified:",report["overallMethodAccuracyCertified"])

if __name__=="__main__":
    main()
