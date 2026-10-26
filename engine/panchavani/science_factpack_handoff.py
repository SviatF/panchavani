"""Generate 21 UNSIGNED science review handoff packets, never approval.

Inputs are freshly recomputed JPL research and isolated independent-program
Swiss evidence, NOT byte-identical old private D1/R2 research candidates.
Reviewers must independently validate method, city sites, source identity,
and facts, then use separately authenticated approval flow.
"""
from __future__ import annotations
import argparse,hashlib,json
from datetime import datetime,timezone,date
from pathlib import Path

from .seven_day_science_pilot import PILOT,validate_week
from .first_six_limb_pilot import KINDS

def sha(raw:bytes)->str:
    return hashlib.sha256(raw).hexdigest()

def canon(x)->bytes:
    return json.dumps(x,sort_keys=True,separators=(",",":"),
      ensure_ascii=False).encode("utf-8")

def canonical_utc(v:str)->str:
    if not isinstance(v,str):raise ValueError("Invalid UTC value")
    d=datetime.fromisoformat(v.replace("Z","+00:00"))
    if d.utcoffset() is None:raise ValueError("Timezone-free evidence")
    return d.astimezone(timezone.utc).isoformat().replace("+00:00","Z")

def build_handoff(science:dict,swiss:dict,science_hash:str,swiss_hash:str):
    if science.get("artifactType")!="PANCHAVANI_THREE_CITY_SEVEN_DAY_INDEPENDENT_RECOMPUTATION_RESEARCH":
        raise ValueError("Unrecognized signed-source input")
    if science.get("scientificApproval") is not False or science.get("approvedClaimsForDeepSeek")!=[]:
        raise ValueError("Forbidden preapproved science source")
    if (swiss.get("artifactType")!="PANCHAVANI_21_CITY_DAY_SWISS_ANALYTIC_DIAGNOSTIC"
        or swiss.get("scientificApproval") is not False
        or swiss.get("approvedClaimsForDeepSeek")!=[]
        or swiss.get("modelInvocationAuthorized") is not False
        or swiss.get("compared21RealCityDawns")!=21):
        raise ValueError("Missing independent scientific diagnostic")
    for val in (science_hash,swiss_hash):
        if not isinstance(val,str) or len(val)!=64 or any(x not in "0123456789abcdef" for x in val):
            raise ValueError("Evidence blob SHA-256 must be pinned")
    first=date.fromisoformat(science["localDates"][0])
    validate_week(science["records"],first)
    dawns=swiss.get("cityDawnComparisons",[])
    if len(dawns)!=21:raise ValueError("Incomplete Swiss comparison census")
    keyed={}
    for dawn in dawns:
        key=(dawn["cityId"],dawn["localDate"])
        if key in keyed or dawn["cityId"] not in PILOT:
            raise ValueError("Duplicate/foreign independent city-day comparison")
        keyed[key]=dawn
    packets=[]
    for record in science["records"]:
        key=(record["cityId"],record["localDate"])
        probe=keyed.get(key)
        if not probe or canonical_utc(probe["sunriseUtc"])!=canonical_utc(record["sun"]["sunriseUtc"]):
            raise ValueError("Swiss science dawn does not match an exact JPL source")
        city=record["cityId"]
        observed=record["panchangAtSunrise"]
        facts={
            "schemaVersion":1,
            "status":"PENDING_INDEPENDENT_SCIENTIFIC_REVIEW_NOT_APPROVED",
            "cityId":city,"date":record["localDate"],"timezone":"Asia/Kolkata",
            "sourceRecordHash":sha(canon(record)),
            "originalSourceIdentity":"FRESH_JPL_RECOMPUTATION_NOT_HISTORICAL_D1_R2_BYTES",
            "sun":{k:canonical_utc(record["sun"][k]) for k in
               ("sunriseUtc","sunsetUtc","nextSunriseUtc")},
            "panchang":{k:observed[k] for k in (*KINDS,"vara","paksha")},
            "transitions":{kind:[{
               "name":part["name"],
               "startUtc":canonical_utc(part["startUtc"]),
               "endUtc":canonical_utc(part["endUtc"])
              } for part in record["transitions"][kind]] for kind in KINDS},
            "cityFacts":[],
            "scienceReview":None,
            "festivalApproved":False,"vratApproved":False,"muhuratApproved":False,
            "publicationAuthorized":False,"indexingAuthorized":False,
            "approval":None
        }
        packets.append({
            "artifactType":"PANCHAVANI_INDEPENDENT_REVIEW_PACKET_UNSIGNED",
            "status":"REQUIRES_OUTSIDE_EXPERT_REVIEW",
            "cityId":city,"localDate":record["localDate"],
            "sourceIdentity":{
                "recomputedJplRecordSha256":facts["sourceRecordHash"],
                "parentJplReportSha256":science_hash,
                "isolatedSwissReportSha256":swiss_hash,
                "matchesHistoricalD1R2OriginalByteSha":False,
                "productionSourceDisposition":"NOT_YET_RECONCILED"
            },
            "sourceMethod":record["methodology"],
            "sourceCityReference":record["cityReference"],
            "independentSwissDiagnostics":{
                "comparator":swiss.get("comparator"),
                "sameEphemerisMethodConfirmed":False,
                "nakshatraLabelAgrees":probe["nakshatraLabelAgrees"],
                "yogaLabelAgrees":probe["yogaLabelAgrees"],
                "numericDifferences":probe["differences"],
            },
            "unapprovedFactpackTemplate":facts,
            "reviewerTasks":[
                "Compare with two independent, method-defined astronomical sources; identify frame/UTC-UT1/TT differences.",
                "Verify adopted city observation coordinates, elevation, horizon and refraction with source links.",
                "Verify exact Tithi/Karana/Nakshatra/Yoga boundary instants, especially near sunrise.",
                "Reconcile historical production D1/R2 source identities and any conflicting city/date SHA.",
                "Attach at least two genuine independently reviewed city/source references and document their claim scope.",
                "Only a separately authorized independent scientist can authenticate a completed factpack; keep this one unsigned."
            ],
            "scienceReviewSigned":False,"scientificApproval":False,
            "approvedClaimsForDeepSeek":[],
            "modelInvocationAuthorized":False,
            "publicationAuthorized":False,"indexingAuthorized":False
        })
    if len(packets)!=21:raise ValueError("21 unique science review dossiers required")
    return packets

def build_files(jpl:Path,swiss:Path,outdir:Path):
    if outdir.exists():raise ValueError("Never overwrite science review packets")
    rb=jpl.read_bytes();sb=swiss.read_bytes()
    packets=build_handoff(json.loads(rb),json.loads(sb),sha(rb),sha(sb))
    outdir.mkdir(parents=True)
    manifest={"artifactType":"PANCHAVANI_21_UNSIGNED_REVIEW_PACKETS_MANIFEST",
       "schemaVersion":1,"count":len(packets),
       "sourceJplSha256":sha(rb),"sourceSwissSha256":sha(sb),
       "independentScientificApproval":False,
       "modelInvocationAuthorized":False,"indexingAuthorized":False,
       "records":[]}
    for item in packets:
        file=outdir/(item["cityId"]+"-"+item["localDate"]+"-UNAPPROVED.json")
        data=json.dumps(item,indent=2,ensure_ascii=False).encode("utf8")+b"\n"
        file.write_bytes(data)
        manifest["records"].append({"cityId":item["cityId"],
          "localDate":item["localDate"],"filename":file.name,
          "sha256":sha(data)})
    (outdir/"manifest-UNAPPROVED.json").write_text(
       json.dumps(manifest,indent=2)+"\n")
    return manifest

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--jpl",type=Path,required=True)
    p.add_argument("--swiss",type=Path,required=True)
    p.add_argument("--outdir",type=Path,required=True)
    a=p.parse_args()
    r=build_files(a.jpl,a.swiss,a.outdir)
    print("PASS: produced",r["count"],"independently-reviewable UNSIGNED packets")
    print("DeepSeek and Google permissions:",r["modelInvocationAuthorized"],r["indexingAuthorized"])
if __name__=="__main__":main()
