"""Deterministic evidence matrix for the 3-city seven-day pilot.

Merges pinned JPL and independent Swiss diagnostic reports, never confuses
analytic MOSEPH with JPL DE440s, never promotes research to signed science.
Historical production D1/R2 comparisons remain a separate live, SHA-verified
Admin operation. PAC central-station data cannot prove city-specific sunrise.
"""
from __future__ import annotations
import argparse
from collections import Counter
from datetime import date
import hashlib
import json
import math
from pathlib import Path

from .seven_day_science_pilot import validate_week, PILOT
from .science_factpack_handoff import build_handoff

KINDS=("tithi","karana","nakshatra","yoga")
DIFF_FIELDS=("ayanamsaArcsec","moonTropicalArcsec","sunTropicalArcsec",
             "moonSiderealArcsec","sunSiderealArcsec","yogaPhaseArcsec")
PROVENANCE="RECOMPUTED_JPL_NOT_ORIGINAL_PRIVATE_D1_R2_BYTES"
PAC_INFO={
 "publisher":"India Meteorological Department / Positional Astronomy Centre",
 "url":"https://packolkata.imd.gov.in/panchang/en/explanation",
 "scope":"ADOPTED_CENTRAL_STATION_NOT_DELHI_MUMBAI_CHENNAI",
 "methodologyMatchCertified":False
}
def digest(raw:bytes)->str:
    return hashlib.sha256(raw).hexdigest()

def finite(v):
    return type(v) in (float,int) and math.isfinite(v)

def compute_truth_matrix(jpl:dict,swiss:dict,jpl_sha:str,swiss_sha:str)->dict:
    # This reuses the stricter 21-packet join, which checks exact UTC sunrise,
    # all day keys, independent status and source digest shapes.
    review=build_handoff(jpl,swiss,jpl_sha,swiss_sha)
    day=date.fromisoformat(jpl["localDates"][0])
    qa=validate_week(jpl["records"],day)
    if len(review)!=21 or qa["checkedCityDays"]!=21:
        raise ValueError("Incomplete verified 21-record cohort")
    bykey={(x["cityId"],x["localDate"]):x for x in review}
    if len(bykey)!=21:raise ValueError("Duplicate evidence packet")
    rows=[]
    for record in jpl["records"]:
        k=(record["cityId"],record["localDate"])
        item=bykey[k]
        independent=item["independentSwissDiagnostics"]
        numbers=independent.get("numericDifferences")
        if not isinstance(numbers,dict) or set(numbers)!=set(DIFF_FIELDS) or any(not finite(v) for v in numbers.values()):
            raise ValueError("Incomplete independent numeric measurement")
        label_ok=independent["nakshatraLabelAgrees"] and independent["yogaLabelAgrees"]
        rows.append({
          "cityId":k[0],"localDate":k[1],
          "jplRecomputedSourceSha256":item["sourceIdentity"]["recomputedJplRecordSha256"],
          "sunriseUtc":record["sun"]["sunriseUtc"],
          "localSunriseMustBeCheckedAgainstCitySpecificOfficialStation":True,
          "nakshatraDawnLabelAgreement":independent["nakshatraLabelAgrees"],
          "yogaDawnLabelAgreement":independent["yogaLabelAgrees"],
          "diagnosticAngularDifferencesArcsec":numbers,
          "independentDiagnosticStatus":"LABEL_DISAGREEMENT_INVESTIGATE" if not label_ok
                                   else "LABELS_AGREE_METHOD_STILL_UNCERTIFIED",
          "oldProductionD1R2SourceSha":"NOT_PROVIDED_TO_ISOLATED_CI",
          "historicalCandidateReconciled":False,
          "pacCentralStationAssignableToCity":False,
          "requiresExpertScienceReview":True,
          "approvedForDeepSeek":False,
          "indexingAuthorized":False
        })
    boundaries=swiss.get("boundaryComparisons")
    if not isinstance(boundaries,list) or len(boundaries)!=16:
        raise ValueError("Expected four independent event samples for each four-limb component")
    bykind=Counter(x.get("kind") for x in boundaries)
    if any(bykind.get(k)!=4 for k in KINDS) or len(bykind)!=4:
        raise ValueError("Unbalanced independent crossing cohort")
    triaged=[]
    for e in boundaries:
        kind=e["kind"]
        seconds=e.get("swissMinusJplSeconds")
        state=e.get("status")
        if state=="independently-solved":
            if not finite(seconds):raise ValueError("Solved boundary missing finite delta")
            action="RECONCILE_EPHEMERIS_AYANAMSA_FRAME_AND_TIME_SCALE"
        elif state=="independent-crossing-not-bracketed-NEEDS_EXPERT_REVIEW":
            if seconds is not None:raise ValueError("Unsolved phase must not invent a delta")
            action="INDEPENDENT_CROSSING_UNRESOLVED"
        else:raise ValueError("Unrecognized independent solve status")
        triaged.append({
          "kind":kind,"endingNumber":e["endingNumber"],"jplEndUtc":e["jplUtc"],
          "swissMinusJplSeconds":seconds,
          "absoluteSeconds":round(abs(seconds),6) if seconds is not None else None,
          "investigation":action,
          "scientificToleranceEstablished":False
        })
    return {
      "artifactType":"PANCHAVANI_PRIVATE_SCIENCE_TRUTH_MATRIX_UNAPPROVED",
      "schemaVersion":1,"status":"REQUIRES_METHOD_AND_SOURCE_RECONCILIATION",
      "cohort":{"cities":list(PILOT),"dates":jpl["localDates"],"cityDayCount":21},
      "sourceHashes":{"jplReportSha256":jpl_sha,"swissReportSha256":swiss_sha,
                       "historicalD1R2":PROVENANCE},
      "pacReference":PAC_INFO,
      "pacDailyReferenceComparedAgainstExactMatchingDate":False,
      "methodEquivalenceEstablished":False,
      "comparisons":{"dailyCityDawns":len(rows),"boundaries":len(triaged),
        "nakshatraLabelDisagreements":sum(not x["nakshatraDawnLabelAgreement"] for x in rows),
        "yogaLabelDisagreements":sum(not x["yogaDawnLabelAgreement"] for x in rows),
        "unresolvedBoundaries":sum(x["absoluteSeconds"] is None for x in triaged)},
      "cityDayRows":rows,"boundaryRows":triaged,
      "requiredBeforeScienceApproval":[
       "Reconcile historical D1/R2 candidate source SHA for each city/day in private Admin",
       "Independently verify city coordinates, elevation, atmospheric model and sunrise for adopted observation point",
       "Confirm geocentric versus topocentric, time scales and Lahiri ayanamsa before setting numeric tolerances",
       "Compare dated government PAC central-station reference only against same-date and same-station calculations",
       "Identify qualified independent scientific reviewer and source-linked verification for every claimed value"
      ],
      "scientificApproval":False,"approvedClaimsForDeepSeek":[],
      "modelInvocationAuthorized":False,"publicationAuthorized":False,"indexingAuthorized":False
    }

def make_matrix(jpl:Path,swiss:Path,out:Path)->dict:
    if out.exists():raise ValueError("Refusing to overwrite private science evidence")
    jbytes=jpl.read_bytes();sbytes=swiss.read_bytes()
    result=compute_truth_matrix(json.loads(jbytes),json.loads(sbytes),
                                digest(jbytes),digest(sbytes))
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
    return result

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--jpl",required=True,type=Path)
    p.add_argument("--swiss",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args()
    report=make_matrix(a.jpl,a.swiss,a.out)
    print("RESEARCH truth matrix:",report["comparisons"])
    print("Approved for publication:",report["publicationAuthorized"])
if __name__=="__main__":main()
