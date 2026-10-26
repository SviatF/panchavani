"""PANCHAVANI Science Certification V1: deterministic EXTERNAL REVIEW WORKSHEET.

Combines independently executed JPL, Swiss analytic and source-matched PAC
research, plus exact source-bound 21 reviewer packets. Never synthesizes an
expert reviewer, modifies production records, signs a claim or calls DeepSeek.
"""
from __future__ import annotations
import argparse,hashlib,json,math
from pathlib import Path

SOURCE_KIND="PANCHAVANI_SCIENCE_CERTIFICATION_V1_PENDING_EXTERNAL_SIGNOFF"
DAY_STATUS="SOURCE_EVIDENCE_INCOMPLETE_NEEDS_INDEPENDENT_REVIEW"
def sha(raw:bytes)->str:return hashlib.sha256(raw).hexdigest()
def read(p:Path):
    raw=p.read_bytes()
    return json.loads(raw),sha(raw)
def build(jpl:dict,j_sha:str,swiss:dict,s_sha:str,pac:dict,p_sha:str,review_manifest:dict,
          packet_dir:Path):
    dates=jpl.get("localDates",[])
    cities=jpl.get("scopeCities",[])
    if jpl.get("artifactType")!="PANCHAVANI_THREE_CITY_SEVEN_DAY_INDEPENDENT_RECOMPUTATION_RESEARCH" or len(dates)!=7 or len(cities)!=3 or len(jpl.get("records",[]))!=21:
        raise ValueError("Invalid complete recomputed JPL cohort")
    if jpl.get("scientificApproval") is not False or swiss.get("scientificApproval") is not False or pac.get("scienceApproval") is not False:
        raise ValueError("Research source attempts unauthorized science approval")
    if swiss.get("artifactType")!="PANCHAVANI_21_CITY_DAY_SWISS_ANALYTIC_DIAGNOSTIC" or swiss.get("compared21RealCityDawns")!=21 or swiss.get("independentBoundarySampleCount")!=16 or swiss.get("uniqueOrdinaryPhaseBoundarySampling") is not True:
        raise ValueError("Independent Swiss diagnostic is incomplete or repeated")
    if pac.get("artifactType")!="PANCHAVANI_PAC_DATE_MATCHED_UNAPPROVED_GEO_LIMB_COMPARISON" or pac.get("cohort",{}).get("localDates")!=dates or pac.get("approvedCitySunriseClaims")!=0:
        raise ValueError("Official PAC source dates not tied to exact cohort")
    if review_manifest.get("count")!=21 or review_manifest.get("sourceJplSha256")!=j_sha or review_manifest.get("sourceSwissSha256")!=s_sha:
        raise ValueError("Review manifest SHA is not bound to the actual computed sources")
    if review_manifest.get("independentScientificApproval") is not False or review_manifest.get("modelInvocationAuthorized") is not False:
        raise ValueError("Unapproved reviewer packet claims permission")
    report_index={(x["gregorianDate"]):x for x in pac["dates"]}
    if set(report_index)!=set(dates):raise ValueError("Unexpected source dates")
    source_by_day={}
    for source in jpl["records"]:
        k=(source["cityId"],source["localDate"])
        if k in source_by_day or k[0] not in cities or k[1] not in dates:
            raise ValueError("Duplicate or cross-city scientific source")
        source_by_day[k]=source
    pointers={}
    for item in review_manifest["records"]:
        city=item["cityId"];day=item["localDate"];key=(city,day)
        if key not in source_by_day or key in pointers:
            raise ValueError("Reviewer manifest duplicated or foreign city/day")
        fn=item["filename"]
        if fn!=f"{city}-{day}-UNAPPROVED.json":
            raise ValueError("Reviewer file identity does not match manifest")
        raw=(packet_dir/fn).read_bytes()
        if sha(raw)!=item["sha256"]:raise ValueError("Reviewer packet SHA-256 mismatch")
        packet=json.loads(raw)
        if packet.get("scientificApproval") is not False or packet.get("modelInvocationAuthorized") is not False or packet.get("publicationAuthorized") is not False or packet.get("indexingAuthorized") is not False:
            raise ValueError("Unsigned reviewer packet cannot claim approval")
        if packet.get("cityId")!=city or packet.get("localDate")!=day:
            raise ValueError("Review packet city/date not bound to manifest")
        ids=packet.get("sourceIdentity",{})
        if ids.get("parentJplReportSha256")!=j_sha or ids.get("isolatedSwissReportSha256")!=s_sha or ids.get("matchesHistoricalD1R2OriginalByteSha") is not False:
            raise ValueError("Source handoff misrepresents historical or independent evidence")
        pointers[key]=item["sha256"]
    if len(pointers)!=21 or len(source_by_day)!=21:
        raise ValueError("Science/packet cohort not complete")
    rows=[]
    for city in cities:
        for day in dates:
            source=report_index[day]
            findings=[{"kind":x["kind"],"number":x["number"],"jplMinusPrintedPACSeconds":x["computedMinusPacSeconds"],
                       "investigate":x["requiresSourceAndMethodInvestigation"]}
                      for x in source.get("deltas",[]) if x["requiresSourceAndMethodInvestigation"]]
            blockers=["official-pac-snapshot-not-independently-archived-or-verified",
              "PAC-method-vs-JPL-time-frame-not-certified",
              "observatory-coordinates-elevation-horizon-refraction-not-independently-validated",
              "historical-production-D1-R2-byte-SHA-not-reconciled",
              "qualified-human-scientific-review-and-HMAC-signature-missing"]
            if source.get("status")=="NO_DATE_MATCHED_OFFICIAL_TRANSCRIPTION":
                blockers.append("PAC-source-for-this-date-missing")
            if findings:blockers.append("source-specific-numeric-discrepancies-unresolved")
            rows.append({"cityId":city,"localDate":day,
              "unsignedReviewerPacketSha256":pointers[(city,day)],
              "pacFixtureSha256":source.get("referenceFixtureSha256"),
              "pacComparisonStatus":source["status"],
              "unresolvedPACDiscrepancies":findings,"reviewBlockers":blockers,
              "candidateUsableByDeepSeek":False,"independentlyScienceApproved":False,
              "eligibleForHumanScienceReview":True,"publicIndexingAuthorized":False})
    anomaly=swiss.get("targetedPACVanijDiscrepancy")
    if "2026-10-21" in dates:
        if not isinstance(anomaly,dict) or anomaly.get("kind")!="karana" or anomaly.get("endingNumber")!=21 or anomaly.get("dateLabel")!="2026-10-21":
            raise ValueError("Missing independent Swiss calibration of known PAC Karana 21 outlier")
        if anomaly.get("scientificApproval") is not False or anomaly.get("methodEquivalenceEstablished") is not False or anomaly.get("sourceSnapshotReviewed") is not False:
            raise ValueError("Targeted anomaly cannot self-certify a method")
        delta=anomaly.get("swissMinusJplSeconds")
        if not isinstance(delta,(int,float)) or not math.isfinite(delta):
            raise ValueError("Independent Swiss anomaly solver did not converge")
        pac_row=next(x for x in report_index["2026-10-21"]["deltas"] if x["kind"]=="karana" and x["number"]==21)
        if abs(pac_row["computedMinusPacSeconds"]-(anomaly["swissMinusPACSeconds"]-delta))>1.5:
            raise ValueError("Swiss PAC comparison was not bound to the same physical phase")
    return {
        "artifactType":SOURCE_KIND,"schemaVersion":1,"status":"PENDING_NAMED_INDEPENDENT_SCIENTIST",
        "dataSourceSHA256":{"recomputedJPL":j_sha,"isolatedSwiss":s_sha,"datedPAC":p_sha},
        "reviewPacketCount":21,"cityDayCount":21,"eligibleForModel":0,"approvedForPublicSearch":0,
        "pacDateCoverage":pac["PACDateMatchedCount"],"pacPhenomenaCompared":pac["officialPublishedPhenomenaReferenced"],
        "pacSourceMethodOutlierCount":pac["sourceAndMethodDiscrepancyCount"],
        "anomalyResearch":anomaly,
        "humanReviewRequirements":[
          "Archive and independently check exact dated PAC tables and Karana ordinal 21.",
          "Independently verify JPL/Swiss/official civil-day time-scale and adopted Lahiri conventions.",
          "Review city geodata, elevation, horizon and refraction with primary sources.",
          "Compare original private D1/R2 candidate bytes and resolve source conflicts.",
          "Document qualified independent reviewer name, original citations and per-claim evidence.",
          "Approve separately with authenticated scientific HMAC; never copy this unsigned worksheet into approved science.",
          "Perform separate editorial usefulness and independently audited SEO page authorization."
        ],
        "scientificReviewer":None,"sourceTranscriptionsIndependentlyReviewed":False,
        "scienceApproved":False,"approvedClaimsForDeepSeek":[],
        "automaticHmacSigningPermitted":False,"paidDeepSeekRunAuthorized":False,
        "publicationAuthorized":False,"indexingAuthorized":False,"rows":rows
    }

def main():
 p=argparse.ArgumentParser()
 for field in ("jpl","swiss","pac","review-dir","out"):
  p.add_argument("--"+field,required=True,type=Path)
 a=p.parse_args()
 if a.out.exists():raise ValueError("Never overwrite a private certification report")
 j,js=read(a.jpl);s,ss=read(a.swiss);p,ps=read(a.pac)
 manifest=json.loads((a.review_dir/"manifest-UNAPPROVED.json").read_text())
 result=build(j,js,s,ss,p,ps,manifest,a.review_dir)
 a.out.parent.mkdir(parents=True,exist_ok=True)
 a.out.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
 print("SCIENCE V1: 21 evidence-bound review rows; published PAC phenomena:",result["pacPhenomenaCompared"])
 print("Unresolved PAC outliers:",result["pacSourceMethodOutlierCount"])
 print("Approved for DeepSeek or indexing:",result["paidDeepSeekRunAuthorized"],result["indexingAuthorized"])
if __name__=="__main__":main()
