"""Private review queue derived from *actual* monthly JPL six-limb packets.

No record produced here is an approved public calendar date. Each candidate
retains original model times, provenance hashes and unresolved blockers.
Only a separately sourced human-reviewed release may enter approved-panchang.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
from .monthly_content_pipeline import batch_starts, month_days, ARTIFACT, FAIL_CLOSED
from .first_six_limb_pilot import TEN_CITY_IDS, KINDS, verify_batch, verify_six_limb_record

def sha_bytes(content:bytes)->str:
    return hashlib.sha256(content).hexdigest()

def build_review_queue(report:dict, inputs:list[tuple[str,dict,str,dict,str]])->dict:
    month=report.get("month")
    days=month_days(month)
    if (report.get("artifactType")!=ARTIFACT
        or report.get("status")!="UNAPPROVED_MONTHLY_CONTENT_RESEARCH"
        or report.get("cityDays")!=len(days)*len(TEN_CITY_IDS)
        or report.get("publicPagesCreated")!=0
        or report.get("approvedClaimsForDeepSeek")!=[]
        or any(report.get(k) is not False for k in
               ("scientificApproval","publicationAuthorized","indexingAuthorized",
                "muhuratRecommendationsAuthorized","modelInvocationAuthorized"))):
        raise ValueError("Only complete private unapproved month can become review candidates")
    starts=batch_starts(month)
    sources={x["startDate"]:x["batchSha256"] for x in report["sourceBatches"]}
    if len(sources)!=len(starts) or set(sources)!=set(starts):
        raise ValueError("Incomplete, duplicate or unexpected source batch manifest")
    if len(inputs)!=len(starts) or len({x[0] for x in inputs})!=len(starts):
        raise ValueError("Missing or repeated review input cohort")
    original={}
    for start,batch,digest,qa,qa_sha in inputs:
        if start not in sources or digest!=sources[start]:
            raise ValueError("Mismatched immutable source batch digest")
        if (batch.get("artifactType")!="PANCHAVANI_TEN_CITY_SIX_LIMB_RESEARCH_BATCH"
            or batch.get("status")!="UNAPPROVED_RESEARCH"
            or batch.get("scientificApproval") is not False
            or batch.get("publicationAuthorized") is not False
            or batch.get("indexingAuthorized") is not False):
            raise ValueError("Research batch was incorrectly marked approved")
        checked=verify_batch(batch["records"],TEN_CITY_IDS)
        if checked["localDateFrom"]!=start:
            raise ValueError("Cohort date mismatch")
        if (qa.get("artifactType")!="PANCHAVANI_NIGHTLY_REFERENCE_QA"
            or qa.get("status")!="RESEARCH_ONLY_NUMERICAL_CHECK"
            or qa.get("numericAlertPassed") is not True
            or qa.get("checkedCities")!=10 or qa.get("checkedCityDays")!=20
            or qa.get("scientificApproval") is not False
            or qa.get("publicationAuthorized") is not False
            or qa.get("indexingAuthorized") is not False
            or qa.get("muhuratRecommendationsAuthorized") is not False
            or qa.get("independentMethodCertification") is not False
            or qa.get("approvedClaimsForDeepSeek")!=[]
            or not isinstance(qa.get("transitionCount"),int)
            or qa["transitionCount"]<1):
            raise ValueError("Ten-city Swiss/JPL numeric QA missing or not passed")
        if len(qa_sha)!=64:
            raise ValueError("QA artifact SHA-256 missing")
        for packet in batch["records"]:
            verify_six_limb_record(packet,TEN_CITY_IDS)
            if (packet.get("methodology",{}).get("siderealMethodIndependentlyCalibrated") is not False
                or packet.get("cityReference",{}).get("coordinatesVerified") is not False
                or not isinstance(packet.get("blockers"),list)
                or not packet["blockers"]
                or not all(isinstance(reason,str) and len(reason)>=12 for reason in packet["blockers"])):
                raise ValueError("Candidate must retain real unresolved science and location blockers")
            day=packet["localDate"]
            if not day.startswith(month+"-"):
                continue
            key=(packet["cityId"],day)
            if key in original:
                raise ValueError("Duplicate city/day packet")
            original[key]=(packet,digest,qa_sha,qa["maxSwissVsJplDifferenceSeconds"])
    expected={(c,d.isoformat()) for c in TEN_CITY_IDS for d in days}
    if set(original)!=expected:
        raise ValueError("Missing or out-of-scope complete research records")
    synopsis={(x["cityId"],x["localDate"]):x for x in report["records"]}
    if set(synopsis)!=expected:
        raise ValueError("Monthly synopsis fails coverage")
    queue=[]
    for city,day in sorted(expected):
        packet,batch_sha,qa_sha,max_error=original[(city,day)]
        row=synopsis[(city,day)]
        if (row["sunrisePanchang"]!=packet["panchangAtSunrise"]
            or not isinstance(row["modeledSunriseIST"],str)
            or len(row["modeledSunriseIST"])<20
            or row["scienceMethodVerified"] is not False
            or row["publicReaderValueReviewPassed"] is not False
            or row["publicationAuthorized"] is not False):
            raise ValueError("Monthly summary diverges from immutable JPL packet")
        packet_hash=sha_bytes(json.dumps(packet,sort_keys=True,separators=(",",":"),ensure_ascii=False).encode())
        queue.append({
            "status":"REQUIRES_INDEPENDENT_SCIENCE_AND_EDITORIAL_REVIEW",
            "cityId":city,"date":day,"timezone":"Asia/Kolkata",
            "sourceRecordHash":packet_hash,"sourceBatchSha256":batch_sha,
            "independentNumericalQaArtifactSha256":qa_sha,
            "batchMaximumSwissVsJplSeconds":max_error,
            "sun":packet["sun"],
            "panchang":packet["panchangAtSunrise"],
            "transitions":packet["transitions"],
            "cityReference":packet["cityReference"],
            "methodology":packet["methodology"],
            "blockers":packet["blockers"],
            "editorialStatus":"NOT_GENERATED_PENDING_FACT_REVIEW",
            "scientificReviewer":None,"editorialReviewer":None,
            "humanApproved":False,
            "publicApprovedRecord":False,
            **FAIL_CLOSED
        })
    return {
        "artifactType":"PANCHAVANI_MONTHLY_PRIVATE_RELEASE_REVIEW_QUEUE",
        "status":"UNAPPROVED_RESEARCH_ONLY",
        "month":month,"cityCount":10,"cityDays":len(queue),
        "reviewCandidates":queue,
        "eligibilityForPublicRelease":0,"deepseekReady":False,
        "independentScientificApproval":False,
        "publicManifestGenerated":False,
        **FAIL_CLOSED
    }

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--month-report",required=True,type=Path)
    p.add_argument("--batches-dir",required=True,type=Path)
    p.add_argument("--qa-dir",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    args=p.parse_args()
    report=json.loads(args.month_report.read_text())
    inputs=[]
    for start in batch_starts(report["month"]):
        path=args.batches_dir / ("batch-"+start+".json")
        qa_path=args.qa_dir / ("qa-"+start+".json")
        raw=path.read_bytes()
        qa_raw=qa_path.read_bytes()
        inputs.append((start,json.loads(raw),sha_bytes(raw),json.loads(qa_raw),sha_bytes(qa_raw)))
    result=build_review_queue(report,inputs)
    if args.out.exists():raise ValueError("Review candidates may never be overwritten")
    args.out.parent.mkdir(parents=True,exist_ok=True)
    with args.out.open("x",encoding="utf-8") as f:
        json.dump(result,f,indent=2,ensure_ascii=False)
        f.write("\n")
    print("PRIVATE REVIEW CANDIDATES:",result["cityDays"])
    print("AUTO-PUBLICATION AUTHORIZED:",result["publicationAuthorized"])

if __name__=="__main__":
    main()
