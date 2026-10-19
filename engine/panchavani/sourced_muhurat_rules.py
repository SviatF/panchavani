"""Versioned, sourced Wedding/Vehicle Muhurat selection RESEARCH engine.

Pure deterministic arithmetic on complete JPL/Panchang intersection grids.
Explicit remaining prerequisites prevent an unsupported "auspicious" claim.
Do not put these reports in public HTML, paid AI prompts or sitemap.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from .first_six_limb_pilot import TEN_CITY_IDS, KINDS
from .muhurat_windows import ARTIFACT as GRID_ARTIFACT
from .research_batch import JPL_DE440S_SHA
from .core import tithi_title
from .periods import karana_title, daylight_windows
from .sidereal import NAKSHATRA_NAMES, YOGA_NAMES

IST = ZoneInfo("Asia/Kolkata")
SOURCE_PROFILE = "PANCHAVANI_REFERENCE_MUHURAT_RULEBOOK"
RESULT_TYPE = "PANCHAVANI_SOURCED_MUHURAT_RESEARCH_METRICS"
EXPECTED_KINDS = {"wedding", "vehicle-purchase"}
MIN_SECOND = 300
PREFERRED_WEDDING_NAKSHATRA = {4,5,10,12,13,15,17,19,21,26,27}
REJECT_WEDDING_YOGA = {1,6,9,10,13,15,17,19,27}
BAD_KARANA = {"vishti","shakuni","chatushpada","nagava"}
MOVABLE_VEHICLE_NAKSHATRA = {7,15,22,23,24}
SUNDAY_FIRST_RAHU_PART = (8,2,7,5,6,4,3)
LABEL_ALIASES = {
    "Jyestha":"Jyeshtha",
    "Mrigashira":"Mrigashirsha",
    "Dhanishtha":"Dhanishta",
    "Nagava":"Naga",
    "Kinstughna":"Kimstughna",
}
ALLOWED_HOSTS = {
  "www.drikpanchang.com",
  "github.com",
}

def _dt(value):
    if not isinstance(value,str):
        raise ValueError("UTC timestamp missing")
    obj = datetime.fromisoformat(value.replace("Z","+00:00"))
    if obj.tzinfo is None or obj.utcoffset() is None:
        raise ValueError("naive timestamp")
    return obj.astimezone(timezone.utc)

def _utc(value):
    return value.isoformat(timespec="microseconds").replace("+00:00","Z")

def _ist(value):
    return value.astimezone(IST).isoformat(timespec="microseconds")

def _s(a,b):
    return (b-a).total_seconds()

def _date(value):
    if not isinstance(value,str):
        raise ValueError("date required")
    d=date.fromisoformat(value)
    if d.isoformat()!=value:
        raise ValueError("non canonical date")
    return d

def check_reference_profiles(book):
    """Sources are *evidence for a chosen reference convention*, not approval."""
    from urllib.parse import urlsplit
    if (not isinstance(book,dict) or
        book.get("artifactType")!=SOURCE_PROFILE or
        book.get("schemaVersion")!=1 or
        book.get("status")!="DRAFT_SOURCED_RESEARCH_ONLY" or
        book.get("independentExpertReview")!="PENDING" or
        set(book.get("profiles",{}))!=EXPECTED_KINDS or
        book.get("interpretationRestrictions",{}).get("releaseAuthorized") is not False or
        book["interpretationRestrictions"].get("indexingAuthorized") is not False or
        book["interpretationRestrictions"].get("deepSeekClaimsApproved")!=[]):
        raise ValueError("invalid or falsely-approved Muhurat reference source")
    w=book["profiles"]["wedding"]
    v=book["profiles"]["vehicle-purchase"]
    fixed=(
      (w,"allowedNakshatraNumbers",PREFERRED_WEDDING_NAKSHATRA),
      (w,"prohibitedYogaNumbers",REJECT_WEDDING_YOGA),
      (w,"prohibitedKaranaNames",BAD_KARANA),
      (v,"preferredMovableNakshatraNumbers",MOVABLE_VEHICLE_NAKSHATRA),
      (v,"prohibitedWeekdayIso",{2,6}),
    )
    for obj,key,values in fixed:
        raw=obj.get(key,[])
        if not isinstance(raw,list) or not raw or len(raw)!=len(set(raw)):
            raise ValueError("changed/missing screening list "+key)
        actual={x.casefold() if isinstance(x,str) else x for x in raw}
        if actual!=values:
            raise ValueError("reference list changed; source and test re-review required: "+key)
    if (v.get("rahuSegmentNumberSundayFirst")!=list(SUNDAY_FIRST_RAHU_PART) or
        v.get("rejectWindowStartLocalTime")!="21:00" or
        v.get("conservativeTrimAt2100") is not True or
        v.get("minimumPreviewSeconds")!=MIN_SECOND or
        w.get("minimumPreviewSeconds")!=MIN_SECOND or
        w.get("applyOptionalTithiWeekday") is not False):
        raise ValueError("reference timing or event semantics changed")
    if [(x.get("number"),x.get("prohibitedPadas")) for x in w.get("nakshatraQuarterExceptions",[])] != [
         (10,[1]),(19,[1]),(27,[4])]:
        raise ValueError("pada exception coverage changed")
    for kind,profile in book["profiles"].items():
        if profile.get("kind")!=kind or not profile.get("policyId"):
            raise ValueError("unversioned or mistyped reference profile")
        if not isinstance(profile.get("missingMandatoryEvidence"),list) or len(profile["missingMandatoryEvidence"])<4:
            raise ValueError("missing real-world Muhurat conditions")
        sources=profile.get("sources")
        if not isinstance(sources,list) or len(sources)<1:
            raise ValueError("source-backed profile required")
        for source in sources:
            link=source.get("url","")
            parts=urlsplit(link)
            if parts.scheme!="https" or parts.hostname not in ALLOWED_HOSTS or not source.get("supports"):
                raise ValueError("untrusted or unscoped rule provenance")
    return book

def validate_research_grid(grid):
    if (not isinstance(grid,dict) or grid.get("artifactType")!=GRID_ARTIFACT or
        grid.get("schemaVersion")!=1 or grid.get("status")!="UNAPPROVED_RESEARCH" or
        grid.get("cityCount")!=10 or grid.get("cityDays")!=20 or
        grid.get("jplKernelSha256")!=JPL_DE440S_SHA or
        not isinstance(grid.get("sourceBatchSha256"),str) or
        len(grid["sourceBatchSha256"])!=64 or
        grid.get("scientificApproval") is not False or
        grid.get("muhuratRecommendationsAuthorized") is not False or
        grid.get("publicationAuthorized") is not False or
        grid.get("indexingAuthorized") is not False or
        grid.get("paidDeepSeekGenerationAuthorized") is not False or
        grid.get("approvedClaimsForDeepSeek")!=[] or
        grid.get("approval",{}).get("scientificReviewer") is not None or
        grid.get("approval",{}).get("ruleReviewer") is not None or
        not isinstance(grid.get("windows"),list) or len(grid["windows"])!=20):
        raise ValueError("incomplete grid or forged authorization")
    first=_date(grid["localDateFrom"])
    second=first+timedelta(days=1)
    if grid.get("localDateThrough")!=second.isoformat():
        raise ValueError("noncontiguous grid dates")
    rows={}
    checks={"cityDaysValidated":0,"phaseSlicesValidated":0,
            "fourLimbLabelsValidated":0,"localSolarDaysValidated":0,
            "maximumSunriseChainErrorSeconds":0.0,
            "maximumPartitionGapSeconds":0.0,
            "maximumDurationErrorSeconds":0.0}
    for row in grid["windows"]:
        key=(row.get("cityId"),row.get("localDate"))
        if (key in rows or key[0] not in TEN_CITY_IDS or
            key[1] not in (first.isoformat(),second.isoformat()) or
            row.get("scientificApproval") is not False or
            row.get("indexingAuthorized") is not False or
            row.get("traditionRuleApplied") is not False or
            row.get("coordinatesIndependentlyVerified") is not False or
            row.get("lahiriIndependentlyApproved") is not False or
            not isinstance(row.get("windows"),list) or not row["windows"] or
            row.get("windowCount")!=len(row["windows"]) or
            row["windowCount"]>65):
            raise ValueError("city/day identity or unknown science integrity")
        sunrise=_dt(row["windows"][0]["startUtc"])
        next_sunrise=_dt(row["windows"][-1]["endUtc"])
        sunset=_dt(row["modeledSunsetUtc"])
        if (_dt(row["modeledSunriseUtc"])!=sunrise or
            _dt(row["modeledFollowingSunriseUtc"])!=next_sunrise):
            raise ValueError("Independent solar day and phase-window endpoints disagree")
        if not (sunrise < sunset < next_sunrise and 20*3600 <_s(sunrise,next_sunrise)<28*3600 and
                sunrise.astimezone(IST).date().isoformat()==key[1] and
                next_sunrise.astimezone(IST).date()==_date(key[1])+timedelta(days=1)):
            raise ValueError("wrong local sunrise and sunset chronology")
        # Existing source has IST to whole seconds but UTC roots to microseconds.
        for label,instant in (("modeledSunriseIST",sunrise),
                              ("modeledSunsetIST",sunset),
                              ("modeledFollowingSunriseIST",next_sunrise)):
            actual=datetime.fromisoformat(row[label])
            if actual.utcoffset() is None or abs((actual.astimezone(timezone.utc)-instant).total_seconds())>=1:
                raise ValueError("source IST disagrees with UTC event: "+label)
        previous=sunrise
        for sl in row["windows"]:
            start,end=_dt(sl["startUtc"]),_dt(sl["endUtc"])
            if (start!=previous or not start<end<=next_sunrise or
                sl.get("ritualEligibilityDetermined") is not False or
                sl.get("auspiciousRecommendation") is not False or
                not isinstance(sl.get("elements"),dict) or
                set(sl["elements"])!=set(KINDS)):
                raise ValueError("missing/overlapping or 'approved' time slice")
            err=abs(_s(start,end)-sl["durationSeconds"])
            checks["maximumDurationErrorSeconds"]=max(checks["maximumDurationErrorSeconds"],err)
            if err>0.001: raise ValueError("wrong precision or slice length")
            for k in KINDS:
                v=sl["elements"][k]
                n=v.get("number")
                if (type(n) is not int or
                    not 1<=n<=({"tithi":30,"karana":60,"nakshatra":27,"yoga":27}[k]) or
                    not isinstance(v.get("name"),str) or not v["name"]):
                    raise ValueError("corrupt limb evidence: "+k)
                expected = {
                    "tithi":lambda:tithi_title(n),
                    "karana":lambda:karana_title(n),
                    "nakshatra":lambda:NAKSHATRA_NAMES[n-1],
                    "yoga":lambda:YOGA_NAMES[n-1],
                }[k]()
                if LABEL_ALIASES.get(v["name"],v["name"])!=expected:
                    raise ValueError("inconsistent ordinal/name evidence: "+k)
            for local_key,utc in (("startIST",start),("endIST",end)):
                raw=sl.get(local_key)
                if not isinstance(raw,str):
                    raise ValueError("missing local source time")
                local_dt=datetime.fromisoformat(raw)
                if (local_dt.utcoffset()!=timedelta(hours=5,minutes=30) or
                    abs(_s(local_dt.astimezone(timezone.utc),utc))>=1):
                    raise ValueError("local timestamp differs from UTC edge")
            checks["fourLimbLabelsValidated"]+=4
            checks["phaseSlicesValidated"]+=1
            previous=end
        if previous!=next_sunrise:raise ValueError("grid does not reach following dawn")
        rows[key]=row
        checks["cityDaysValidated"]+=1
        checks["localSolarDaysValidated"]+=1
    if len(rows)!=20:raise ValueError("missing city/day grid")
    for city in TEN_CITY_IDS:
        today=rows[(city,first.isoformat())]
        tomorrow=rows[(city,second.isoformat())]
        a=_dt(today["windows"][-1]["endUtc"])
        b=_dt(tomorrow["windows"][0]["startUtc"])
        drift=abs(_s(a,b))
        checks["maximumSunriseChainErrorSeconds"]=max(checks["maximumSunriseChainErrorSeconds"],drift)
        if drift>0.001:raise ValueError("cross-day sunrise discontinuity: "+city)
    return rows,checks

def _minus(start,end,exclude_a,exclude_b):
    """Return half-open pieces of [start,end) after subtracting [a,b)."""
    if exclude_b<=start or exclude_a>=end:return [(start,end)]
    result=[]
    if start<exclude_a:result.append((start,min(end,exclude_a)))
    if exclude_b<end:result.append((max(start,exclude_b),end))
    return [(a,b) for a,b in result if b>a]

def _rahu_interval(day,sunrise,sunset):
    # Each of the 8 parts is a fraction of the actual local sunrise-to-sunset
    # duration; NEVER a fixed wall-clock time and never 12h by assumption.
    sunday_first=(day.weekday()+1)%7
    number=SUNDAY_FIRST_RAHU_PART[sunday_first]
    library=next(w for w in daylight_windows(sunrise,sunset,day.weekday()) if w.kind=="rahu-kalam")
    if library.part!=number:
        raise ValueError("Rahu daylight offset mismatches existing trusted solar periods engine")
    return library.start,library.end,number

def _merge(candidates):
    out=[]
    for sl in sorted(candidates,key=lambda v:(v["cityId"],v["localDate"],v["_a"])):
        if (out and out[-1]["cityId"]==sl["cityId"] and
            out[-1]["localDate"]==sl["localDate"] and
            out[-1]["_b"]==sl["_a"]):
            out[-1]["_b"]=sl["_b"]
            out[-1]["sourceSliceIndices"].extend(sl["sourceSliceIndices"])
            out[-1]["sourceSliceIndices"]=sorted(set(out[-1]["sourceSliceIndices"]))
        else:
            out.append(dict(sl))
    return out

def score_reference_grid(grid,book):
    """Analyze 20 city-days with explicit veto and uncomputed prerequisite counts."""
    check_reference_profiles(book)
    rows,metrics=validate_research_grid(grid)
    results={}
    for kind in ("wedding","vehicle-purchase"):
        profile=book["profiles"][kind]
        vetoes=Counter()
        eligible=[]
        reviewed=0
        subtractions=0
        split_samples=0
        for (city,day),row in sorted(rows.items()):
            sunrise=_dt(row["windows"][0]["startUtc"])
            sunset=_dt(row["modeledSunsetUtc"])
            day_obj=_date(day)
            rahu_start,rahu_end,rahu_segment=_rahu_interval(day_obj,sunrise,sunset)
            for i,sl in enumerate(row["windows"]):
                reviewed+=1
                start,end=_dt(sl["startUtc"]),_dt(sl["endUtc"])
                e=sl["elements"]
                reasons=[]
                if kind=="wedding":
                    nak=e["nakshatra"]["number"]
                    if nak not in PREFERRED_WEDDING_NAKSHATRA:reasons.append("NAKSHATRA_NOT_IN_SOURCE_LIST")
                    if nak in (10,19,27):reasons.append("NAKSHATRA_PADA_NOT_COMPUTED")
                    if e["yoga"]["number"] in REJECT_WEDDING_YOGA:
                        reasons.append("YOGA_PROHIBITED_CONSERVATIVE_WHOLE_INTERVAL")
                    if (e["karana"]["name"].casefold() in BAD_KARANA or
                        e["karana"]["number"] in (58,59,60) or
                        e["karana"]["number"] in set(range(8,58,7))):
                        reasons.append("KARANA_PROHIBITED")
                else:
                    if e["nakshatra"]["number"] not in MOVABLE_VEHICLE_NAKSHATRA:
                        reasons.append("NOT_PREFERRED_MOVABLE_NAKSHATRA")
                    if day_obj.isoweekday() in (2,6):
                        reasons.append("SOURCE_PROHIBITED_WEEKDAY")
                if reasons:
                    vetoes.update(reasons)
                    continue
                segments=[(start,end)]
                if kind=="vehicle-purchase":
                    # This trims conservatively to 21:00 of the *Panchang day's*
                    # civil date. The reference says windows beginning AFTER
                    # 21:00 are discarded, which is NOT the same as this trim.
                    # The distinction is explicit in methodology metadata.
                    limit=datetime.combine(day_obj,time(21,0),IST).astimezone(timezone.utc)
                    segments=[(a,min(b,limit)) for a,b in segments if a<limit and min(b,limit)>a]
                    if not segments:
                        vetoes["PAST_CONSERVATIVE_21_IST_LIMIT"]+=1
                        continue
                    first_segment=segments[0]
                    pieces=[]
                    for a,b in segments:
                        pieces.extend(_minus(a,b,rahu_start,rahu_end))
                    if len(pieces)>len(segments) or pieces!=segments:
                        subtractions+=1
                    segments=pieces
                    if not segments:
                        vetoes["EXCLUDED_BY_LOCAL_RAHU_KAAL"]+=1
                        continue
                for a,b in segments:
                    split_samples+=1
                    if b<=a:raise ValueError("negative intersection")
                    eligible.append({
                        "cityId":city,"localDate":day,
                        "_a":a,"_b":b,"sourceSliceIndices":[i]
                    })
        merged=_merge(eligible)
        min_seconds=profile["minimumPreviewSeconds"]
        passing=[]
        for w in merged:
            duration=_s(w["_a"],w["_b"])
            if duration<min_seconds:
                vetoes["SHORTER_THAN_FIVE_MINUTES"]+=1
                continue
            passing.append({
                "cityId":w["cityId"],"localDate":w["localDate"],
                "startUtc":_utc(w["_a"]),"endUtc":_utc(w["_b"]),
                "startIST":_ist(w["_a"]),"endIST":_ist(w["_b"]),
                "durationSeconds":round(duration,6),
                "contributingSourceSliceIndices":w["sourceSliceIndices"],
                "criteriaSatisfied":"REFERENCE_INITIAL_SCREEN_ONLY",
                "notYetChecked":profile["missingMandatoryEvidence"],
                "expertApproved":False,
                "auspiciousRecommendation":False
            })
        results[kind]={
            "policyId":profile["policyId"],"sourceIds":[s["id"] for s in profile["sources"]],
            "tradition":book["tradition"],
            "testedCityDays":20,
            "inputPhaseSlices":reviewed,
            "rawScreeningPieces":split_samples,
            "rahuExclusionOperations":subtractions,
            "initialSurvivingWindows":len(passing),
            "initialSurvivingSeconds":round(sum(w["durationSeconds"] for w in passing),6),
            "filteredReasonsBySlice":dict(sorted(vetoes.items())),
            "rawInitialMatches":passing,
            "remainingIndependentChecks":profile["missingMandatoryEvidence"],
            "allCriticalChecksComplete":False,
            "qualifyingWeddingOrPurchaseMuhuratCount":0,
            "approvedRitualWindows":[],
            "muhuratRecommendationsAuthorized":False,
            "approvedClaimsForDeepSeek":[]
        }
    return {
        "artifactType":RESULT_TYPE,"schemaVersion":1,
        "status":"SOURCE_GROUNDED_PRELIMINARY_SCREEN_ONLY",
        "sourceGridSha256":hashlib.sha256(json.dumps(
            grid,sort_keys=True,separators=(",",":"),ensure_ascii=False
        ).encode()).hexdigest(),
        "rulebookSha256":hashlib.sha256(json.dumps(
            book,sort_keys=True,separators=(",",":"),ensure_ascii=False
        ).encode()).hexdigest(),
        "rulebookVersion":book["version"],
        "cityCount":10,"localDateFrom":grid["localDateFrom"],
        "localDateThrough":grid["localDateThrough"],
        "metrics":metrics,
        "analysis":results,
        "scientificApproval":False,
        "independentRuleApproval":False,
        "muhuratRecommendationsAuthorized":False,
        "paidDeepSeekGenerationAuthorized":False,
        "approvedClaimsForDeepSeek":[],
        "publicationAuthorized":False,
        "indexingAuthorized":False,
    }

def main():
    p=argparse.ArgumentParser(description="Deterministic sourced rule screening; NO auspicious Muhurat release")
    p.add_argument("--grid",type=Path,required=True)
    p.add_argument("--rules",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    args=p.parse_args()
    if args.out.exists():
        raise ValueError("Refuse to overwrite versioned research provenance")
    grid=json.loads(args.grid.read_bytes())
    book=json.loads(args.rules.read_bytes())
    report=score_reference_grid(grid,book)
    report["sourceGridFileSha256"]=hashlib.sha256(args.grid.read_bytes()).hexdigest()
    report["rulebookFileSha256"]=hashlib.sha256(args.rules.read_bytes()).hexdigest()
    args.out.parent.mkdir(parents=True,exist_ok=True)
    with args.out.open("x",encoding="utf-8") as f:
        json.dump(report,f,indent=2,ensure_ascii=False)
        f.write("\n")
    print("PROVENANCE-LOCKED reference rule:",report["rulebookVersion"])
    for kind,result in report["analysis"].items():
        print(kind,":",result["inputPhaseSlices"],"phase slices /",
              result["initialSurvivingWindows"],"PRELIMINARY windows /",
              result["qualifyingWeddingOrPurchaseMuhuratCount"],"approved Muhurats")
    print("PASS: 10 cities, 20 complete solar days, 0 automatically authorized Muhurats")

if __name__=="__main__":
    main()
