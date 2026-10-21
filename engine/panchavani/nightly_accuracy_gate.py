"""Automatic ten-city numerical QA, NOT automatic scientific approval.

The input reports come from JPL research and separately backed Swiss files.
A successful numerical gate cannot authorize religious Muhurat, pages or AI.
"""
from __future__ import annotations
import argparse
import json
import math
from collections import defaultdict
from pathlib import Path

TEN=("delhi","mumbai","kolkata","chennai","bengaluru",
     "hyderabad","ahmedabad","pune","jaipur","varanasi")
KINDS=("nakshatra","yoga")

def summarize(swiss, *, alert_seconds=300):
    if (not isinstance(swiss,dict)
        or swiss.get("artifactType")!="PANCHAVANI_SWISS_EXACT_SIDEREAL_PHASE_ROOTS"
        or swiss.get("status")!="UNAPPROVED_REFERENCE_COMPARISON"
        or swiss.get("backend")!="SWISS_EPHEMERIS_ONLY_NO_MOSHIER_FALLBACK"
        or swiss.get("checkedCityIds")!=list(TEN)
        or swiss.get("checkedCityDays")!=20
        or any(swiss.get(k) is not False for k in
               ("scientificApproval","muhuratRecommendationsAuthorized",
                "publicationAuthorized","indexingAuthorized"))
        or swiss.get("approvedClaimsForDeepSeek")!=[]
        or type(alert_seconds) not in (float,int)
        or not math.isfinite(alert_seconds) or alert_seconds<=0):
        raise ValueError("Ten-city Swiss evidence scope or release status invalid")
    results=swiss.get("comparisons")
    if not isinstance(results,list) or not results or len(results)!=swiss.get("comparisonCount"):
        raise ValueError("Malformed Swiss event results")
    values=defaultdict(list)
    seen=set()
    for item in results:
        city=item.get("cityId")
        kind=item.get("kind")
        day=item.get("localDate")
        if city not in TEN or kind not in KINDS or not isinstance(day,str):
            raise ValueError("Invalid comparison city, date or kind")
        t=item.get("jplResearchTransitionUtc")
        if not isinstance(t,str) or not isinstance(item.get("swissSiderealLahiriTransitionUtc"),str):
            raise ValueError("Unspecified phase boundary")
        key=(city,day,kind,item.get("endingNumber"),t)
        if key in seen:raise ValueError("Repeated event cannot count as independent evidence")
        seen.add(key)
        signed=item.get("swissMinusResearchSeconds")
        absolute=item.get("absoluteDifferenceSeconds")
        if (type(signed) not in (float,int) or type(absolute) not in (float,int)
            or not math.isfinite(signed) or not math.isfinite(absolute)
            or abs(abs(signed)-absolute)>0.00001
            or item.get("independentTimingAgreementApproved") is not False):
            raise ValueError("Invalid or falsely approved phase comparison")
        values[(city,kind)].append(absolute)
    if set(values)!={(city,kind) for city in TEN for kind in KINDS}:
        raise ValueError("Both phase types must have observations for all 10 cities")
    worst=max(max(group) for group in values.values())
    outliers=[{"cityId":city,"kind":kind,"maxDifferenceSeconds":round(max(group),6)}
              for (city,kind),group in sorted(values.items()) if max(group)>alert_seconds]
    return {"artifactType":"PANCHAVANI_NIGHTLY_REFERENCE_QA",
       "schemaVersion":1,"status":"RESEARCH_ONLY_NUMERICAL_CHECK",
       "checkedCities":10,"checkedCityDays":20,"transitionCount":len(results),
       "maxSwissVsJplDifferenceSeconds":round(worst,6),
       "investigateAboveSeconds":alert_seconds,
       "outliers":outliers,"numericAlertPassed":not outliers,
       "byCityAndKind":[{"cityId":city,"kind":kind,
           "transitionsCompared":len(group),
           "maxDifferenceSeconds":round(max(group),6)}
           for (city,kind),group in sorted(values.items())],
       "independentMethodCertification":False,
       "ritualRulesApproved":False,
       "scientificApproval":False,"muhuratRecommendationsAuthorized":False,
       "publicationAuthorized":False,"indexingAuthorized":False,
       "approvedClaimsForDeepSeek":[]}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--swiss",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    p.add_argument("--alert-seconds",type=float,default=300)
    a=p.parse_args()
    report=summarize(json.loads(a.swiss.read_text()),alert_seconds=a.alert_seconds)
    a.out.parent.mkdir(parents=True,exist_ok=True)
    with a.out.open("x",encoding="utf-8") as f:
        json.dump(report,f,indent=2);f.write("\n")
    print("NIGHTLY RESEARCH:",report["transitionCount"],"phase boundaries over 10 cities")
    print("MAX_SWISS_VS_JPL_SECONDS",report["maxSwissVsJplDifferenceSeconds"])
    print("NUMERIC_ALERT_PASSED",report["numericAlertPassed"])
    if not report["numericAlertPassed"]:
        raise SystemExit("Large Swiss/JPL disagreement: review required; no automatic approval")

if __name__=="__main__":main()
