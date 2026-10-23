"""Independent, reproducible Delhi first-day REVIEW DOSSIER. NEVER a public release."""
from __future__ import annotations
import argparse,hashlib,json
from datetime import datetime
from pathlib import Path
from urllib.parse import urlsplit,parse_qs
from zoneinfo import ZoneInfo

DAY="2026-10-21"
LIMBS=("tithi","karana","nakshatra","yoga")

def _ok(condition,message):
    if not condition:raise ValueError(message)

def _ist(v):
    d=datetime.fromisoformat(v.replace("Z","+00:00"))
    _ok(d.utcoffset() is not None,"UTC offset required")
    return d.astimezone(ZoneInfo("Asia/Kolkata")).strftime("%d %b %Y %H:%M:%S IST")

def _hash(v):
    return hashlib.sha256(json.dumps(v,sort_keys=True,ensure_ascii=False,
        separators=(",",":")).encode()).hexdigest()

def check_reference_origin(item):
    """Explicit source city/date URI, not a browser-cookie dependent Today view."""
    p=urlsplit(item["sourceUrl"])
    q=parse_qs(p.query)
    _ok(p.scheme=="https","Source URLs require HTTPS")
    if item["sourceProvider"]=="Drik Panchang":
        _ok(p.netloc=="www.drikpanchang.com"
            and p.path=="/panchang/day-panchang.html"
            and q.get("date")==["21/10/2026"]
            and q.get("geoname-id")==["934657"],
            "Drik URI must pin Delhi location and 21 October 2026")
    elif item["sourceProvider"]=="Timeanddate":
        _ok(p.netloc=="www.timeanddate.com" and p.path=="/sun/india/new-delhi"
            and q.get("month")==["10"] and q.get("year")==["2026"],
            "Timeanddate URI must specify New Delhi October 2026")
    else:raise ValueError("Unrecognised source provider")
    return {"provider":item["sourceProvider"],"uri":item["sourceUrl"],
            "dateAndCityInUri":True,"publisherConventionVerified":False}

def make_dossier(batch,benchmark,coverage,triage,swiss):
    _ok(batch.get("artifactType")=="PANCHAVANI_TEN_CITY_SIX_LIMB_RESEARCH_BATCH"
        and batch.get("status")=="UNAPPROVED_RESEARCH"
        and batch.get("scientificApproval") is False
        and batch.get("publicationAuthorized") is False
        and batch.get("indexingAuthorized") is False,
        "JPL research batch not eligible for independent review")
    found=[x for x in batch.get("records",[])
           if x.get("cityId")=="delhi" and x.get("localDate")==DAY]
    _ok(len(found)==1,"Expected exactly one Delhi 2026-10-21 day")
    record=found[0]
    _ok(record.get("scientificApproval") is False
        and record.get("independentMethodologicalAccuracyProven") is False
        and record.get("publicReleaseAllowed") is False
        and record.get("indexingAuthorized") is False
        and record.get("methodology",{}).get("siderealMethodIndependentlyCalibrated") is False
        and record.get("cityReference",{}).get("coordinatesVerified") is False,
        "Unreviewed source has forged scientific or geography approval")
    _ok(isinstance(record.get("blockers"),list) and len(record["blockers"])>0,
        "Research blockers missing")
    limbs=record.get("panchangAtSunrise",{})
    _ok(all(isinstance(limbs.get(k),str) and limbs[k] for k in
        (*LIMBS,"vara","paksha")),"Missing Panchang element at sunrise")
    sun=record["sun"]
    _ok(_ist(sun["sunriseUtc"]).startswith("21 Oct 2026"),
        "Wrong IST sunrise date")
    edges=[]
    for kind in LIMBS:
        segments=record["transitions"].get(kind)
        _ok(isinstance(segments,list) and bool(segments),"Missing "+kind+" intervals")
        _ok(segments[0]["name"]==limbs[kind],"Sunrise "+kind+" label mismatch")
        _ok(segments[0]["startUtc"]==sun["sunriseUtc"]
            and segments[-1]["endUtc"]==sun["nextSunriseUtc"],
            "Incomplete "+kind+" interval")
        for a,b in zip(segments,segments[1:]):
            _ok(a["endUtc"]==b["startUtc"],"Broken "+kind+" continuity")
            edges.append({"kind":kind,"from":a["name"],"to":b["name"],
                          "modelUtc":a["endUtc"],"modelIST":_ist(a["endUtc"])})
    _ok(benchmark.get("artifactType")=="PANCHAVANI_REFERENCE_ACCURACY_BENCHMARK"
        and benchmark.get("status")=="UNAPPROVED_COMPARISON"
        and benchmark.get("scientificApproval") is False
        and benchmark.get("publicationAuthorized") is False
        and benchmark.get("indexingAuthorized") is False
        and benchmark.get("sampleCount")==7,"Missing seven external observations")
    refs=benchmark["comparisons"]
    _ok(len(refs)==7 and all(x["cityId"]=="delhi" and x["localDate"]==DAY
                            and x["independentlyVerified"] is False for x in refs),
        "Reference event belongs to another date/city or claims approval")
    required={"sunrise":1,"sunset":1,"tithi":1,"karana":2,"nakshatra":1,"yoga":1}
    _ok(all(sum(x["kind"]==kind for x in refs)==count
            for kind,count in required.items()),"Reference event cohort incomplete")
    _ok(all(x.get("referencePrecisionSeconds")==60 for x in refs),
        "Source minute-level display precision lost")
    provenance=[check_reference_origin(x) for x in refs]
    _ok(coverage.get("artifactType")=="PANCHAVANI_REFERENCE_EVIDENCE_COVERAGE"
        and coverage.get("hasAllTenCityEventGroups") is False
        and coverage.get("publicationAuthorized") is False,
        "Coverage cannot authorize public data")
    _ok(triage.get("artifactType")=="PANCHAVANI_REFERENCE_DISCREPANCY_TRIAGE"
        and triage.get("sampleCount")==7
        and triage.get("overallMethodAccuracyCertified") is False
        and triage.get("publicationAuthorized") is False,
        "Discrepancy classification missing")
    _ok(swiss.get("artifactType")=="PANCHAVANI_SWISS_EXACT_SIDEREAL_PHASE_ROOTS"
        and swiss.get("status")=="UNAPPROVED_REFERENCE_COMPARISON"
        and swiss.get("backend")=="SWISS_EPHEMERIS_ONLY_NO_MOSHIER_FALLBACK"
        and swiss.get("checkedCityIds")==["delhi"]
        and swiss.get("scientificApproval") is False
        and swiss.get("publicationAuthorized") is False,
        "Swiss independent numerical evidence missing or unauthorized fallback")
    swiss_checks=[x for x in swiss["comparisons"]
                  if x["cityId"]=="delhi" and x["localDate"]==DAY]
    _ok({x["kind"] for x in swiss_checks}=={"nakshatra","yoga"}
        and all(x["independentTimingAgreementApproved"] is False for x in swiss_checks),
        "Both unapproved Swiss phase crossing checks required")
    pending=list(dict.fromkeys(record["blockers"]+[
        "Resolve external clock-time precision and source observer convention",
        "Reconcile coordinates, elevation, refraction and Lahiri definition",
        "Record named independent scientific and editorial sign-offs",
        "Festival, Vrat and Muhurat traditions remain separately unapproved"]))
    return {
        "artifactType":"PANCHAVANI_DELHI_FIRST_DAY_EVIDENCE_DOSSIER",
        "status":"HUMAN_REVIEW_REQUIRED","cityId":"delhi","date":DAY,
        "sourceResearchSha256":_hash(record),
        "benchmarkSha256":_hash(benchmark),
        "sun":sun,"panchang":limbs,"phaseCrossings":sorted(edges,key=lambda x:x["modelUtc"]),
        "independentPublisherMeasurements":refs,"sourceIdentityChecks":provenance,
        "swissResearchCrossings":swiss_checks,
        "maximumSwissDiscrepancySeconds":max(x["absoluteDifferenceSeconds"] for x in swiss_checks),
        "unresolvedBlockers":pending,"independentReviewer":None,"editorialReviewer":None,
        "readinessForHumanFactCheck":True,"scientificApproval":False,
        "ritualEligibilityApproved":False,"publicationAuthorized":False,
        "muhuratRecommendationsAuthorized":False,"indexingAuthorized":False,
        "approvedClaimsForDeepSeek":[],"publicPagesCreated":0
    }

def markdown(report):
    p=report["panchang"]
    lines=["# Delhi Panchang — 21 October 2026","",
        "**PRIVATE INDEPENDENT REVIEW · NOT APPROVED FOR INDEXING OR CALENDAR ADVICE**","",
        "## Modeled Panchang at local sunrise","",
        "| Element | Research result |","|---|---|"]
    lines += [f"| {name.title()} | {p[name]} |" for name in
              (*LIMBS,"vara","paksha")]
    lines += ["","## Solar day","",
        f"- Sunrise: {_ist(report['sun']['sunriseUtc'])}",
        f"- Sunset: {_ist(report['sun']['sunsetUtc'])}",
        f"- Next sunrise: {_ist(report['sun']['nextSunriseUtc'])}","",
        "## Calculated astronomical transition boundaries","",
        "| Layer | From → To | Modeled IST |","|---|---|---|"]
    lines += [f"| {x['kind']} | {x['from']} → {x['to']} | {x['modelIST']} |"
              for x in report["phaseCrossings"]]
    lines += ["","## Independent publisher comparisons (60-second display resolution)","",
        "| Event | Source | Publisher UTC | Modeled UTC | Absolute difference (s) |",
        "|---|---|---|---|---:|"]
    lines += [f"| {x['kind']} | {x['sourceProvider']} | {x['referenceUtc']} | {x['calculatedUtc']} | {x['absoluteErrorSeconds']} |"
              for x in report["independentPublisherMeasurements"]]
    lines += ["","## Source URLs (date pinned, actual observer convention not yet approved)",""]
    lines += [f"- [{x['provider']}]({x['uri']})" for x in
              {x["uri"]:x for x in report["sourceIdentityChecks"]}.values()]
    lines += ["","## Outstanding reviews",""]
    lines += [f"- [ ] {x}" for x in report["unresolvedBlockers"]]
    lines += ["","**No public daily URL, DeepSeek factual release, sitemap or ritual claims authorized.**",""]
    return "\n".join(lines)

def main():
    p=argparse.ArgumentParser()
    for key in ("batch","benchmark","coverage","triage","swiss"):
        p.add_argument("--"+key,type=Path,required=True)
    p.add_argument("--out-json",type=Path,required=True)
    p.add_argument("--out-md",type=Path,required=True)
    args=p.parse_args()
    inputs={key:json.loads(getattr(args,key).read_text()) for key in
            ("batch","benchmark","coverage","triage","swiss")}
    report=make_dossier(**inputs)
    for file in (args.out_json,args.out_md):
        if file.exists():raise ValueError("Refuse overwriting prior evidence")
        file.parent.mkdir(parents=True,exist_ok=True)
    with args.out_json.open("x",encoding="utf-8") as f:
        json.dump(report,f,ensure_ascii=False,indent=2);f.write("\n")
    with args.out_md.open("x",encoding="utf-8") as f:f.write(markdown(report))
    print("DELHI REVIEW DOSSIER: 7 independent published event observations")
    print("ELIGIBLE FOR PUBLICATION:",report["publicationAuthorized"])
if __name__=="__main__":main()
