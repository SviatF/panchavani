"""Wave 8: deterministic, evidence-bound human REVIEW dossiers for six city-days.

Strictly NOT the approved-panchang bundle, not DeepSeek inputs and not a
publication/SEO release. Uses real JPL Wave 7 results, independent Swiss
diagnostic Wave 7B and city-point sensitivity Wave 7C as distinct evidence,
retaining each source file's exact SHA-256 and every unresolved blocker.

No astronomy is recalculated here. Derived facts only; no rituals invented.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from .first_six_limb_pilot import PILOT, KINDS, verify_batch
from .research_batch import JPL_DE440S_SHA

VERSION="panchavani-evidence-bound-editorial-dossier-v1"
DAYS=("2026-10-16","2026-10-17")
IST=ZoneInfo("Asia/Kolkata")


def _hash(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _load(path:Path) -> tuple[dict,str]:
    raw=path.read_bytes()
    value=json.loads(raw)
    if not isinstance(value,dict):
        raise ValueError("Evidence source root must be an object")
    return value,_hash(raw)


def _t(value:str) -> datetime:
    instant=datetime.fromisoformat(value.replace("Z","+00:00"))
    if instant.utcoffset() is None:
        raise ValueError("Source instant needs absolute timezone offset")
    return instant.astimezone(timezone.utc)


def _ist(utc:str) -> str:
    return _t(utc).astimezone(IST).isoformat(timespec="seconds")


def _facts_for(record:dict, geo_row:dict) -> list[dict]:
    city,day=record["cityId"],record["localDate"]
    label=city+"/"+day
    baseline=geo_row["dates"]
    picked=next(x for x in baseline if x["localDate"]==day)
    sun=record["sun"]
    solar_times={
        "sunriseIST":_ist(sun["sunriseUtc"]),
        "sunsetIST":_ist(sun["sunsetUtc"]),
        "followingSunriseIST":_ist(sun["nextSunriseUtc"]),
    }
    # The actual time must match independent recomputation of the same city
    # point within its truncated-second precision; otherwise refuse to draft.
    for source_field, science_field in (("sunrise","sunriseUtc"),("sunset","sunsetUtc")):
        geo_clock=picked["catalogClockIST"][source_field]
        delta=abs((_t(sun[science_field])-_t(geo_clock)).total_seconds())
        if delta>1.0:
            raise ValueError("Geo/JPL chronology for adopted city point differs: "+label)
    facts=[]
    def add(kind:str,value,source_ids:list[str]):
        idx=len(facts)+1
        canonical=json.dumps({"city":city,"day":day,"kind":kind,"value":value},
                             sort_keys=True,separators=(",",":"),ensure_ascii=False)
        return {"factId":"fx-"+_hash(canonical.encode())[:18],
                "kind":kind,"value":value,
                "evidenceSections":source_ids,"claimStatus":"RESEARCH_ONLY"}
    facts.append(add("citySolarDay",solar_times,["jpl.solar","geo.adoptedCitySolar"]))
    facts.append(add("sunrisePanchangSixLimbs",record["panchangAtSunrise"],
                     ["jpl.sixLimbAtSunrise","jpl.fourLimbTimelines"]))
    facts.append(add("cityReferenceSiteUnverified",{
        "adoptedResearchPoint":geo_row["researchCityPoint"],
        "alternativeGazetteerPoint":geo_row["gazetteerPopulatedPlace"],
        "alternativeGeoNamesUrl":geo_row["gazetteerSourceUrl"],
        "distanceKm":geo_row["distanceBetweenResearchPointsKm"],
        "estimatedElevationDifferenceMeters":geo_row["elevationModelVsCatalogMeters"],
        "isOfficialObservatory":False},
        ["geo.gazetteerAlternative","geo.cityModelComparison"]))
    facts.append(add("citySpecificSolarSensitivity",{
        "adoptedResearchPointSunriseIST":picked["catalogClockIST"]["sunrise"],
        "alternativePopulatedPlaceSunriseIST":picked["gazetteerClockIST"]["sunrise"],
        "sunriseDeltaSeconds":picked["gazetteerMinusCatalogSeconds"]["sunriseSeconds"],
        "sunsetDeltaSeconds":picked["gazetteerMinusCatalogSeconds"]["sunsetSeconds"],
        "measuredPhysicalUncertainty":False},
        ["geo.cityModelComparison"]))
    for kind in KINDS:
        items=record["transitions"][kind]
        transition_list=[]
        for index,interval in enumerate(items[:-1]):
            ending=interval["endUtc"]
            follow=items[index+1]
            transition_list.append({
                "from":interval["name"],"to":follow["name"],
                "atUtc":ending,"atIST":_ist(ending),
                "duringLocalDaylight":_t(sun["sunriseUtc"])<=_t(ending)<_t(sun["sunsetUtc"]),
                "afterLocalSunsetBeforeFollowingSunrise":
                    _t(sun["sunsetUtc"])<=_t(ending)<_t(sun["nextSunriseUtc"]),
            })
        facts.append(add(kind+"Timeline",{
            "activeAtLocalSunrise":items[0]["name"],
            "boundaryCountBetweenTwoSunrises":len(transition_list),
            "transitions":transition_list,
            "fullIntervals":items,
            "timeConvention":"Asia/Kolkata"},
            ["jpl.fourLimbTimelines","swiss.independentProgramResearch"]))
    return facts


def build_dossier(science:dict,geo:dict,swiss:dict,sha:dict,
                  forensic:dict|None=None,forensic_hash:str|None=None) -> dict:
    if (science.get("artifactType")!="PANCHAVANI_FIRST_SIX_LIMB_SCIENCE_BATCH"
        or science.get("status")!="UNAPPROVED_RESEARCH"
        or science.get("kernelSha256")!=JPL_DE440S_SHA
        or science.get("scientificApproval") is not False
        or science.get("publicationAuthorized") is not False
        or science.get("indexingAuthorized") is not False
        or science.get("approvedClaimsForDeepSeek")!=[]):
        raise ValueError("Untrusted initial JPL research bundle")
    verify_batch(science["records"])
    if (geo.get("artifactType")!="PANCHAVANI_WAVE7C_PILOT_GEO_SOLAR_SENSITIVITY"
        or geo.get("status")!="UNAPPROVED_RESEARCH"
        or geo.get("jplKernelSha256")!=JPL_DE440S_SHA
        or geo.get("catalogSha256")!=science.get("cityCatalogSha256")
        or geo.get("geoSourceIndependentHumanReview") is not False
        or geo.get("sourcePublishedStationCoordinatesMatched") is not False
        or geo.get("publicReleaseAuthorized") is not False
        or geo.get("indexingAuthorized") is not False
        or geo.get("approvedClaimsForDeepSeek")!=[]):
        raise ValueError("Incompatible, forged or released geo research")
    if (swiss.get("artifactType")!="PANCHAVANI_EXTERNAL_LAHIRI_PROBE"
        or swiss.get("status")!="UNAPPROVED_RESEARCH"
        or swiss.get("panchavaniEphemerisSha256")!=JPL_DE440S_SHA
        or swiss.get("swissBackend")!="MOSEPH_ANALYTIC"
        or swiss.get("methodEquivalenceConfirmed") is not False
        or swiss.get("scientificApproval") is not False
        or swiss.get("releaseAuthorized") is not False
        or swiss.get("indexingAuthorized") is not False
        or swiss.get("approvedClaimsForDeepSeek")!=[]
        or swiss.get("sampleCount")!=15
        or swiss.get("independentBoundaryEventCount",0)<1):
        raise ValueError("Independent software calibration report missing/forged")
    geos={x["cityId"]:x for x in geo.get("records",[])}
    if set(geos)!=set(PILOT) or len(geo["records"])!=3:
        raise ValueError("Wrong geo-city scope")
    # Every city dawn compared independently by Swiss must match this exact
    # JPL scientific report, not an unrelated run or chosen timestamp.
    swiss_dawns={x["sampleCategory"]:x for x in swiss["comparisons"]
                 if x["sampleCategory"].endswith("/SUNRISE")}
    if len(swiss_dawns)!=6:
        raise ValueError("Incomplete independent program dawn coverage")
    research_cases=[]
    for r in science["records"]:
        city,day=r["cityId"],r["localDate"]
        geo_row=geos[city]
        adopted=geo_row["researchCityPoint"]
        stored=r["cityReference"]
        for a,b in (("latitude","latitude"),("longitude","longitude"),
                    ("elevationMeters","estimatedElevationMeters")):
            if abs(float(adopted[a])-float(stored[b]))>1e-8:
                raise ValueError("Mixed geographical reference points: "+city)
        mark=city+"/"+day+"/SUNRISE"
        compared=swiss_dawns.get(mark)
        if not compared or abs((_t(compared["instantUtc"])-
                                _t(r["sun"]["sunriseUtc"])).total_seconds())>1:
            raise ValueError("Independent sunrise evidence belongs to another JPL candidate")
        if geo_row.get("stationPointScientificallyApproved") is not False:
            raise ValueError("Geo source falsely signed")
        facts=_facts_for(r,geo_row)
        packet={
            "recordType":"CITY_DAY_EDITORIAL_RESEARCH_DOSSIER",
            "cityId":city,"localDate":day,
            "proposedCanonical":"/panchang/"+city+"/"+day+"/",
            "timeZone":"Asia/Kolkata",
            "status":"READY_FOR_HUMAN_EVIDENCE_REVIEW_NOT_APPROVED",
            "sourceResearchCandidateCanonicalSha256":r["recomputedJplCandidateCanonicalSha256"],
            "sixLimbFactsPresent":True,
            "fourContinuousTimelinesPresent":True,
            "facts":facts,
            "independentComparisonAtSunrise":{
                "swissSampleCategory":mark,
                "nakshatraLabelAgrees":compared["nakshatraLabelAgrees"],
                "yogaLabelAgrees":compared["yogaLabelAgrees"],
                "independentMethodEquivalenceConfirmed":False,
            },
            "humanReview":{
                "astronomyReviewer":None,"geoReviewer":None,
                "ritualRuleReviewer":None,"editorialReviewer":None,
                "sourceConflictDisposition":None,
                "canApprove":False,
            },
            "approvedFactIdsForDeepSeek":[],
            "publicReleaseAuthorized":False,"indexingAuthorized":False,
            "blockingReasons":[
                "GeoNames and adopted city points are not approved official observing stations",
                "Solar horizon, elevation, physical refraction and tzdb remain unmatched",
                "Sidereal Lahiri methodological equivalence remains unapproved",
                "Private D1/R2 historical source conflicts not dispositioned by science reviewer",
                "Regional Panchang ritual/rule packs not approved",
                "Unique city-specific editorial text and external human reviews not completed",
            ],
        }
        research_cases.append(packet)
    if forensic is not None:
        if (forensic.get("artifactType")!="PANCHAVANI_PRIVATE_THREE_CITY_SHA_CONFLICT_AUDIT"
            or forensic.get("status")!="UNAPPROVED_RESEARCH"
            or forensic.get("localDate")!="2026-10-16"
            or forensic.get("realProductionD1ReadForAllCities") is not True
            or forensic.get("historicalConflictsScientificallyResolved") is not False
            or forensic.get("scientificApproval") is not False
            or forensic.get("indexingAuthorized") is not False
            or forensic.get("releaseAuthorized") is not False
            or forensic.get("approvedClaimsForDeepSeek")!=[]
            or forensic.get("caseCount")!=3
            or {c["cityId"] for c in forensic["cases"]}!=set(PILOT)):
            raise ValueError("Untrustworthy or unrelated private three-city SHA forensic report")
        # JSON report alone is not a signed reviewer decision; even 0 changed
        # hashes do NOT clear the independent scientific source-truth problem.
        forensic_status="PRODUCTION_FORENSICS_IMPORTED_UNREVIEWED"
    else:
        if forensic_hash is not None:
            raise ValueError("Forensic SHA supplied without forensic bytes")
        forensic_status="PRODUCTION_FORENSICS_NOT_FETCHED"
    result={
        "artifactType":"PANCHAVANI_SIX_CITY_DAY_EDITORIAL_RESEARCH_DOSSIERS",
        "schemaVersion":1,"policyVersion":VERSION,
        "status":"BLOCKED_PENDING_SCIENCE_AND_EDITORIAL_REVIEW",
        "evidenceFileSha256":sha,
        "productionForensicsInputSha256":forensic_hash,
        "productionForensicsStatus":forensic_status,
        "cityCount":len(PILOT),"cityDayCount":len(research_cases),
        "records":research_cases,
        "sourceIndependenceScientificallyConfirmed":False,
        "scientificReviewSigned":False,
        "approvedClaimsForDeepSeek":[],
        "modelInvocationAuthorized":False,
        "publicReleaseAuthorized":False,
        "indexingAuthorized":False,
        "siteSitemapUpdated":False,
        "nextMilestone":"Independent expert disposition of methodology, geodata, private SHA conflicts and per-page editorial claims; build separate signed approved release only after that."
    }
    validate_dossier(result)
    return result


def validate_dossier(report:dict):
    if (report.get("artifactType")!="PANCHAVANI_SIX_CITY_DAY_EDITORIAL_RESEARCH_DOSSIERS"
        or report.get("status")!="BLOCKED_PENDING_SCIENCE_AND_EDITORIAL_REVIEW"
        or report.get("publicReleaseAuthorized") is not False
        or report.get("indexingAuthorized") is not False
        or report.get("modelInvocationAuthorized") is not False
        or report.get("approvedClaimsForDeepSeek")!=[]
        or report.get("scientificReviewSigned") is not False):
        raise ValueError("Dossier attempted to approve unreviewed science")
    rows=report.get("records",[])
    if len(rows)!=6 or {(x["cityId"],x["localDate"]) for x in rows}!={(city,day)
                                   for city in PILOT for day in DAYS}:
        raise ValueError("Expected six unique pilot city-day review records")
    for record in rows:
        if (record.get("indexingAuthorized") is not False
            or record.get("publicReleaseAuthorized") is not False
            or record.get("approvedFactIdsForDeepSeek")!=[]
            or record.get("humanReview",{}).get("canApprove") is not False
            or len(record.get("facts",[]))!=7
            or len({f["factId"] for f in record["facts"]})!=7
            or any(f["claimStatus"]!="RESEARCH_ONLY" for f in record["facts"])):
            raise ValueError("Fact provenance or page release denial violated")


def write_review_previews(report:dict,folder:Path):
    """Write clearly UNPUBLISHED reviewer notes, not crawlable SEO HTML."""
    folder.mkdir(parents=True,exist_ok=True)
    for record in report["records"]:
        facts={f["kind"]:f["value"] for f in record["facts"]}
        point=facts["cityReferenceSiteUnverified"]
        solar=facts["citySolarDay"]
        six=facts["sunrisePanchangSixLimbs"]
        lines=[
            "# UNAPPROVED RESEARCH — "+record["cityId"].title()+" · "+record["localDate"],
            "",
            "> HUMAN REVIEW ONLY. NOT A PUBLIC PANCHANG, SEO ARTICLE OR AI FACT ALLOWLIST.",
            "",
            "## Place-specific solar model (Asia/Kolkata)",
            "Adopted preliminary location: "+json.dumps(point["adoptedResearchPoint"]),
            "GeoNames alternative: "+json.dumps(point["alternativeGazetteerPoint"]),
            "Source: "+point["alternativeGeoNamesUrl"],
            "Modeled reference-point separation: "+str(point["distanceKm"])+" km",
            "Sunrise: **"+solar["sunriseIST"]+"**",
            "Sunset: **"+solar["sunsetIST"]+"**",
            "Following sunrise: **"+solar["followingSunriseIST"]+"**",
            "",
            "## All six at the adopted local sunrise",
        ]
        lines += ["- "+name+": **"+str(six[name])+"**"
                  for name in ("tithi","karana","nakshatra","yoga","vara","paksha")]
        lines += ["","## Actual limb changes before the following local sunrise"]
        for kind in KINDS:
            timeline=facts[kind+"Timeline"]
            lines.append("### "+kind.title()+" (active at dawn: "+timeline["activeAtLocalSunrise"]+")")
            if not timeline["transitions"]:
                lines.append("No transition within this city's sunrise-to-sunrise interval.")
            else:
                for item in timeline["transitions"]:
                    region="daylight" if item["duringLocalDaylight"] else "nighttime"
                    lines.append("- "+item["atIST"]+" · "+region+" · "+
                                 item["from"]+" → "+item["to"])
        lines.extend([
            "","## Scientific/editorial blockers",
            *("- "+reason for reason in record["blockingReasons"]),
            "",
            "**Neither observations nor date-specific customs are human approved. "
            "Do not publish or generate AI ritual/festival guidance.**",
            "",
        ])
        filename=record["cityId"]+"-"+record["localDate"]+"-UNAPPROVED.md"
        path=folder/filename
        with path.open("x",encoding="utf-8") as f:f.write("\n".join(lines))


def main():
    p=argparse.ArgumentParser(description="Evidence-bound first six city-day FACT CANDIDATES; NEVER PUBLISH")
    p.add_argument("--science",type=Path,required=True)
    p.add_argument("--geo",type=Path,required=True)
    p.add_argument("--swiss",type=Path,required=True)
    p.add_argument("--forensic",type=Path)
    p.add_argument("--out",type=Path,required=True)
    p.add_argument("--previews",type=Path,required=True)
    args=p.parse_args()
    if args.out.exists() or args.previews.exists():
        raise ValueError("Refuse overwrite existing dossiers or previews")
    records={}; hashes={}
    for name,path in (("science",args.science),("geo",args.geo),("swiss",args.swiss)):
        records[name],hashes[name]=_load(path)
    forensic=None
    if args.forensic is not None:
        forensic,hashes["privateProductionForensics"]=_load(args.forensic)
    report=build_dossier(records["science"],records["geo"],records["swiss"],
                         {k:v for k,v in hashes.items() if k!="privateProductionForensics"},
                         forensic,hashes.get("privateProductionForensics"))
    args.out.parent.mkdir(parents=True,exist_ok=True)
    with args.out.open("x",encoding="utf-8") as f:
        json.dump(report,f,indent=2,ensure_ascii=False)
        f.write("\n")
    write_review_previews(report,args.previews)
    print("Prepared",report["cityDayCount"],"evidence-bound research dossiers")
    print("Actual private D1 examined:",report["productionForensicsStatus"])
    print("Scientific and SEO approval:",report["scientificReviewSigned"],
          report["indexingAuthorized"])
    print("No paid generation; no Google sitemap updates")


if __name__=="__main__":main()
