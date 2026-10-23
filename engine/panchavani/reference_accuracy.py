"""Fail-closed benchmark of independent timestamp references against PANCHAVANI.

References must be collected separately and must identify provider, method and
timestamp precision. This reports errors; it NEVER certifies scientific output.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean
from .sourced_muhurat_rules import validate_research_grid
from .source_geo_identity import classify_external_source

KINDS = {"sunrise", "sunset", "following-sunrise", "tithi", "karana", "nakshatra", "yoga"}
LIMBS = {"tithi", "karana", "nakshatra", "yoga"}
ARTIFACT = "PANCHAVANI_INDEPENDENT_REFERENCE_TIMINGS"
MAX_TOLERANCE = 3600

def utc(value):
    if not isinstance(value,str):
        raise ValueError("Timestamp must be ISO 8601")
    dt=datetime.fromisoformat(value.replace("Z","+00:00"))
    if dt.utcoffset() is None:
        raise ValueError("Offset required")
    return dt.astimezone(timezone.utc)

def _require(expr, msg):
    if not expr:
        raise ValueError(msg)

def _metrics(values):
    ordered=sorted(values)
    n=len(ordered)
    return {"count":n,"meanAbsoluteErrorSeconds":round(mean(ordered),6),
            "medianAbsoluteErrorSeconds":round((ordered[(n-1)//2]+ordered[n//2])/2,6),
            "p95AbsoluteErrorSeconds":round(ordered[math.ceil(.95*n)-1],6),
            "maxAbsoluteErrorSeconds":round(ordered[-1],6)}

def benchmark(grid, references):
    rows,_=validate_research_grid(grid)
    _require(isinstance(references,dict) and references.get("artifactType")==ARTIFACT
             and references.get("schemaVersion")==1
             and references.get("status")=="EXTERNAL_UNREVIEWED"
             and references.get("scientificApproval") is False
             and references.get("publicationAuthorized") is False
             and references.get("indexingAuthorized") is False,
             "Independent source manifest must be explicitly unreviewed")
    samples=references.get("samples")
    _require(isinstance(samples,list) and len(samples)>0 and len(samples)<=5000,
             "No finite reference sample cohort")
    output=[]
    groups=defaultdict(list)
    qualified_groups=defaultdict(list)
    seen=set()
    for index,sample in enumerate(samples):
        _require(isinstance(sample,dict),"Invalid reference row")
        city, day, kind=sample.get("cityId"),sample.get("localDate"),sample.get("kind")
        _require((city,day) in rows and kind in KINDS,
                 "Reference city/date or event type absent from grid")
        source=sample.get("source")
        _require(isinstance(source,dict) and all(isinstance(source.get(k),str)
                    and source[k].strip() for k in ("provider","url","method","retrievedAt"))
                 and source["url"].startswith("https://"),
                 "Every datum must have independently auditable source provenance")
        retrieved=utc(source["retrievedAt"])
        _require(retrieved.year>=2020,"Unreasonable retrieval date")
        precision=sample.get("precisionSeconds")
        _require(type(precision) in (int,float) and math.isfinite(precision)
                 and 0<precision<=3600,"Explicit bounded display precision required")
        reference=utc(sample.get("referenceUtc"))
        event_key=sample.get("eventKey")
        row=rows[(city,day)]
        if kind in LIMBS:
            _require(isinstance(event_key,str) and event_key in ("start","end"),
                     "Limb phase boundary must be start or end")
            expected=sample.get("expectedNumber")
            _require(type(expected) is int and 1<=expected<=(
                30 if kind=="tithi" else 60 if kind=="karana" else 27),
                "Event number required to avoid incorrect phase matching")
            positions=[]
            for item in row["windows"]:
                _require(type(item["elements"][kind]["number"]) is int,
                         "Invalid phase number")
            for i,item in enumerate(row["windows"]):
                this_number=item["elements"][kind]["number"]
                other=(row["windows"][i-1]["elements"][kind]["number"] if i else None) if event_key=="start" else (
                    row["windows"][i+1]["elements"][kind]["number"] if i+1<len(row["windows"]) else None)
                if this_number==expected and other is not None and other!=expected:
                    positions.append(utc(item["startUtc"] if event_key=="start" else item["endUtc"]))
            _require(bool(positions),"Requested phase transition not observed within modeled solar day")
            calculated=min(positions,key=lambda t:abs((t-reference).total_seconds()))
        else:
            _require(event_key is None and sample.get("expectedNumber") is None,
                     "Solar event must not have phase identifiers")
            key={"sunrise":"modeledSunriseUtc","sunset":"modeledSunsetUtc",
                 "following-sunrise":"modeledFollowingSunriseUtc"}[kind]
            calculated=utc(row[key])
        identity=(city,day,kind,event_key,sample.get("expectedNumber"),source["provider"],
                  source["url"],sample["referenceUtc"])
        _require(identity not in seen,"Duplicate reference evidence")
        seen.add(identity)
        delta=(calculated-reference).total_seconds()
        _require(math.isfinite(delta),"Non-finite reference delta")
        if source["provider"] in ("Drik Panchang","Timeanddate"):
            identity_geo=classify_external_source(source["provider"],source["url"],city,day)
            source_ok=identity_geo["sourceLocationQualifiedForDelhi"]
            source_status=identity_geo["status"]
        else:
            source_ok=False
            source_status="UNMAPPED_EXTERNAL_SOURCE_NOT_EVIDENCE"
        result={"cityId":city,"localDate":day,"kind":kind,
                "eventKey":event_key if kind in LIMBS else None,
                "expectedNumber":sample.get("expectedNumber") if kind in LIMBS else None,
                "sourceProvider":source["provider"],"sourceUrl":source["url"],
                "sourceMethod":source["method"],
                "referenceUtc":reference.isoformat(),"calculatedUtc":calculated.isoformat(),
                "signedErrorSeconds":round(delta,6),
                "absoluteErrorSeconds":round(abs(delta),6),
                "referencePrecisionSeconds":precision,
                "withinDisplayPrecision":abs(delta)<=precision,
                "sourceLocationQualifiedForDelhi":source_ok,
                "sourceLocationStatus":source_status,
                "independentlyVerified":False}
        output.append(result)
        groups[kind].append(abs(delta))
        if source_ok:qualified_groups[kind].append(abs(delta))
    return {"artifactType":"PANCHAVANI_REFERENCE_ACCURACY_BENCHMARK",
            "schemaVersion":1,"status":"UNAPPROVED_COMPARISON",
            "gridSourceBatchSha256":grid["sourceBatchSha256"],
            "referenceManifestSha256":hashlib.sha256(json.dumps(references,sort_keys=True,
                 separators=(",",":"),ensure_ascii=False).encode()).hexdigest(),
            "sampleCount":len(output),"coverageCityDays":len({(r["cityId"],r["localDate"]) for r in output}),
            "metricsByKind":{k:_metrics(v) for k,v in sorted(groups.items())},
            "metricsByKindQualifiedSourceOnly":{k:_metrics(v) for k,v in sorted(qualified_groups.items())},
            "sourceLocationQualifiedCount":sum(x["sourceLocationQualifiedForDelhi"] for x in output),
            "sourceLocationQuarantinedCount":sum(not x["sourceLocationQualifiedForDelhi"] for x in output),
            "invalidReferenceEventsExcludedFromCertification":True,
            "comparisons":output,
            "scientificApproval":False,"muhuratRecommendationsAuthorized":False,
            "approvedClaimsForDeepSeek":[],"publicationAuthorized":False,
            "indexingAuthorized":False,
            "note":"Raw numerical comparison may include quarantined non-Delhi source records. Only source-location-qualified metrics can be used in future scientific review; no method certification is provided."}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--grid",type=Path,required=True)
    parser.add_argument("--references",type=Path,required=True)
    parser.add_argument("--out",type=Path,required=True)
    args=parser.parse_args()
    result=benchmark(json.loads(args.grid.read_text()),json.loads(args.references.read_text()))
    args.out.parent.mkdir(parents=True,exist_ok=True)
    with args.out.open("x",encoding="utf-8") as f:
        json.dump(result,f,indent=2,ensure_ascii=False)
        f.write("\n")
    print("Compared independent timestamp samples:",result["sampleCount"])
    print("Coverage city-days:",result["coverageCityDays"])
    print("PUBLICATION AUTHORIZED:",result["publicationAuthorized"])

if __name__=="__main__":
    main()
