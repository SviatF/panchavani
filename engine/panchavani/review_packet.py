"""Create a deterministic, read-only review packet from a seasonal QA report.

This is NOT a publication manifest, a signature, or authorization to deploy.
No status in this tool can be used to turn public SEO indexing on.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path

def review_packet(qa_report: dict, sha256: str) -> dict:
    if not isinstance(qa_report,dict) or qa_report.get("status")!="RESEARCH_ONLY":
        raise ValueError("Missing research-only QA status")
    if qa_report.get("publicReleaseAllowed") is not False:
        raise ValueError("Release unexpectedly enabled in research evidence")
    if qa_report.get("scientificIndependence")!="NOT_VALIDATED":
        raise ValueError("Unexpected claim of method-independent validation")
    cases=qa_report.get("cases")
    if not isinstance(cases,list) or not cases:
        raise ValueError("No city-date evidence")
    if any(x.get("status")!="UNAPPROVED" for x in cases):
        raise ValueError("Reviewed-only data required")
    allowed_city_dates={(x["city"],x["localDate"]) for x in cases}
    if len(allowed_city_dates)!=len(cases):
        raise ValueError("Duplicate city/date keys")
    unresolved=qa_report.get("blockingReasons")
    if not isinstance(unresolved,list) or not unresolved:
        raise ValueError("Research blockers must be reported")
    return {
        "artifactType":"PANCHAVANI_QA_REVIEW_PACKET",
        "schemaVersion":1,
        "sourceSha256":sha256,
        "recordCount":len(cases),
        "scope":[{"city":c,"localDate":d} for c,d in sorted(allowed_city_dates)],
        "status":"BLOCKED_PENDING_EXTERNAL_VALIDATION",
        "releaseAuthorized":False,
        "indexingAuthorized":False,
        "reviewNeeded":[
            {"id":"astronomical-independent-comparison",
             "status":"UNVERIFIED","requiredEvidence":"matched-method reference datasets"},
            {"id":"city-geodata", "status":"UNVERIFIED",
             "requiredEvidence":"sourced coordinates/elevation and horizon convention"},
            {"id":"regional-ritual-rules","status":"UNVERIFIED",
             "requiredEvidence":"versioned tradition/region-specific expert fixtures"},
            {"id":"editorial-usefulness","status":"UNVERIFIED",
             "requiredEvidence":"per-city evidence and human originality review"},
        ],
        "blockingReasons":unresolved,
    }

def main():
    p=argparse.ArgumentParser(description="Build an immutable research REVIEW packet, never release")
    p.add_argument("--qa",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args()
    if a.out.exists(): raise ValueError("Refusing to overwrite existing review packet")
    source=a.qa.read_bytes()
    packet=review_packet(json.loads(source),hashlib.sha256(source).hexdigest())
    a.out.parent.mkdir(parents=True,exist_ok=True)
    a.out.write_text(json.dumps(packet,indent=2,sort_keys=True)+"\n")
    print("Prepared",packet["recordCount"],"blocked research records for scientific/editorial review.")
    print("SEO indexing authorized:",packet["indexingAuthorized"])

if __name__=="__main__":
    main()
