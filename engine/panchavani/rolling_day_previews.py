"""Rolling JPL-only, provisional six-limb page research previews (never public).

Produces locally archived, city-specific astronomical explanatory facts for
human review. Does not use paid AI, signed release or public page generators.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from .first_six_limb_pilot import KINDS,PILOT,verify_batch
from .research_batch import JPL_DE440S_SHA

IST=ZoneInfo("Asia/Kolkata")
PREFIX="PANCHAVANI_ROLLING_CITY_DAY_RESEARCH_PREVIEWS"

def local(utc):
    dt=datetime.fromisoformat(utc.replace("Z","+00:00"))
    if dt.utcoffset() is None:raise ValueError("Unzoned research event")
    return dt.astimezone(IST).isoformat(timespec="seconds")

def make_rolling_previews(batch:dict) -> dict:
    if (batch.get("artifactType")!="PANCHAVANI_FIRST_SIX_LIMB_SCIENCE_BATCH" or
        batch.get("status")!="UNAPPROVED_RESEARCH" or
        batch.get("kernelSha256")!=JPL_DE440S_SHA or
        batch.get("scientificApproval") is not False or
        batch.get("publicationAuthorized") is not False or
        batch.get("indexingAuthorized") is not False or
        batch.get("approvedClaimsForDeepSeek")!=[]):
        raise ValueError("Cannot preview untrusted or approved-source science")
    qa=verify_batch(batch["records"])
    pages=[]
    for rec in sorted(batch["records"],key=lambda x:(x["localDate"],x["cityId"])):
        city,date=rec["cityId"],rec["localDate"]
        if rec["methodology"]["siderealMethodIndependentlyCalibrated"] is not False:
            raise ValueError("Research run attempted scientific sidereal approval")
        if rec["cityReference"]["coordinatesVerified"] is not False:
            raise ValueError("Research location status unexpectedly reviewed")
        sunrise=local(rec["sun"]["sunriseUtc"])
        sunset=local(rec["sun"]["sunsetUtc"])
        dawn=local(rec["sun"]["nextSunriseUtc"])
        label=rec["panchangAtSunrise"]
        body=[
          "# "+rec["cityName"]+" | "+date+" — UNAPPROVED astronomy review",
          "",
          "> This is a non-indexable science preview, not a certified Hindu Panchang or a published article.",
          "",
          "## City-specific modeled solar clock (IST)",
          "- Research coordinate: "+str(rec["cityReference"]["latitude"])+", "+
          str(rec["cityReference"]["longitude"]),
          "- Modeled local sunrise: "+sunrise,
          "- Modeled local sunset: "+sunset,
          "- Following sunrise: "+dawn,
          "- Observer point, physical horizon and elevation: **NOT INDEPENDENTLY VERIFIED**",
          "",
          "## Six Panchang values active at the city's modeled sunrise",
        ]
        body.extend("- "+k.title()+": "+label[k] for k in
                    ("tithi","karana","nakshatra","yoga","vara","paksha"))
        transitions=0
        for kind in KINDS:
            body.extend(["","## "+kind.title()+" timeline (local solar day)"])
            spans=rec["transitions"][kind]
            for i,segment in enumerate(spans):
                body.append("- "+segment["name"]+": "+local(segment["startUtc"])+
                            " to "+local(segment["endUtc"]))
                if i+1<len(spans):
                    transitions+=1
                    event=datetime.fromisoformat(segment["endUtc"].replace("Z","+00:00"))
                    dusk=datetime.fromisoformat(rec["sun"]["sunsetUtc"].replace("Z","+00:00"))
                    body.append("  - Boundary "+local(segment["endUtc"])+
                                (", before local sunset" if event<dusk else ", after local sunset"))
        body.extend(["",
          "## Not yet scientifically established",
          "- Exact official city observation site and measured altitude",
          "- Refraction/horizon choice and pinned tzdb",
          "- Matched and signed Lahiri reference model",
          "- Relevant ritual/regional calendar rules",
          "- Resolved original D1/R2 source SHA and editorial fact approval",
          "",
          "**No DeepSeek approvals, no indexable URL and no public publishing are authorized.**",
          ""])
        payload="\n".join(body)
        ident=hashlib.sha256(payload.encode()).hexdigest()
        pages.append({
            "cityId":city,"localDate":date,
            "previewName":city+"-"+date+"-UNAPPROVED.md",
            "previewSha256":ident,
            "reviewMarkdown":payload,
            "modeledSunriseIST":sunrise,"modeledSunsetIST":sunset,
            "changeCount":transitions,
            "scientificApproval":False,
            "paidGenerationAuthorized":False,
            "indexingAuthorized":False
        })
    assert len(pages)==6
    if any(not p["reviewMarkdown"].startswith("# ") for p in pages):
        raise ValueError("Review markdown missing")
    return {
      "artifactType":PREFIX,"schemaVersion":1,
      "status":"UNAPPROVED_RESEARCH",
      "dateFrom":qa["localDateFrom"],"dateThrough":qa["localDateThrough"],
      "cityDays":6,"fourLimbDawnChecks":qa["checkedFourLimbDawnContinuities"],
      "records":pages,
      "scientificApproval":False,"modelInvocationAuthorized":False,
      "approvedClaimsForDeepSeek":[],
      "publicationAuthorized":False,"indexingAuthorized":False,
    }

def write_previews(report:dict,directory:Path):
    if directory.exists():raise ValueError("Do not overwrite old research previews")
    directory.mkdir(parents=True)
    for page in report["records"]:
        target=directory/page["previewName"]
        with target.open("x",encoding="utf-8") as output:
            output.write(page["reviewMarkdown"])

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--batch",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    p.add_argument("--previews",required=True,type=Path)
    args=p.parse_args()
    if args.out.exists() or args.previews.exists():
        raise ValueError("Refuse overwriting a prior research archive")
    source=args.batch.read_bytes()
    report=make_rolling_previews(json.loads(source))
    report["jplResearchBatchSha256"]=hashlib.sha256(source).hexdigest()
    args.out.parent.mkdir(parents=True,exist_ok=True)
    with args.out.open("x",encoding="utf-8") as file:
        json.dump(report,file,indent=2,ensure_ascii=False)
        file.write("\n")
    write_previews(report,args.previews)
    print("Generated",report["cityDays"],"city-specific DAILY research previews for",
          report["dateFrom"],"to",report["dateThrough"])
    print("Indexing authorized:",report["indexingAuthorized"])

if __name__=="__main__":main()
