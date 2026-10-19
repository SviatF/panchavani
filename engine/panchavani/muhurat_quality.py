"""Quantitative Muhurat research quality gate, never scientific approval.

Separates COMPUTATIONAL integrity from unresolved independent astronomy and
tradition-specific eligibility. A passing value cannot authorize a Muhurat.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone

KINDS=("wedding","vehicle-purchase")
def dt(v):
    p=datetime.fromisoformat(v.replace("Z","+00:00"))
    if p.utcoffset() is None:
        raise ValueError("Unzoned interval")
    return p.astimezone(timezone.utc)

def quality_metrics(report:dict)->dict:
    if (report.get("status")!="SOURCE_GROUNDED_PRELIMINARY_SCREEN_ONLY"
        or report.get("scientificApproval") is not False
        or report.get("independentRuleApproval") is not False
        or report.get("muhuratRecommendationsAuthorized") is not False
        or report.get("publicationAuthorized") is not False
        or report.get("indexingAuthorized") is not False
        or report.get("approvedClaimsForDeepSeek")!=[]
        or set(report.get("analysis",{}))!=set(KINDS)):
        raise ValueError("Invalid or falsely approved source evidence")
    upstream=report.get("metrics",{})
    days=upstream.get("cityDaysValidated")
    slices=upstream.get("phaseSlicesValidated")
    limbs=upstream.get("fourLimbLabelsValidated")
    if (days!=20 or type(slices) is not int or slices<20
        or limbs!=4*slices
        or upstream.get("localSolarDaysValidated")!=20
        or upstream.get("maximumSunriseChainErrorSeconds",float("inf"))>0.001
        or upstream.get("maximumDurationErrorSeconds",float("inf"))>0.001
        or upstream.get("maximumPartitionGapSeconds",float("inf"))>0.001):
        raise ValueError("Mathematical continuity checks failed")
    by_kind={}
    for kind,raw in report["analysis"].items():
        if (raw.get("testedCityDays")!=20 or
            raw.get("inputPhaseSlices")!=slices or
            raw.get("muhuratRecommendationsAuthorized") is not False or
            raw.get("qualifyingWeddingOrPurchaseMuhuratCount")!=0 or
            raw.get("approvedRitualWindows")!=[] or
            raw.get("approvedClaimsForDeepSeek")!=[] or
            raw.get("allCriticalChecksComplete") is not False):
            raise ValueError("Misrepresented eligibility or evidence")
        windows=raw.get("rawInitialMatches",[])
        if raw.get("initialSurvivingWindows")!=len(windows):
            raise ValueError("Reported window count inaccurate")
        total=0.0
        unique=defaultdict(list)
        for w in windows:
            if (w.get("expertApproved") is not False or
                w.get("auspiciousRecommendation") is not False or
                w.get("criteriaSatisfied")!="REFERENCE_INITIAL_SCREEN_ONLY" or
                w.get("cityId") is None or w.get("localDate") is None):
                raise ValueError("Preview misrepresented as confirmed Muhurat")
            a,b=dt(w["startUtc"]),dt(w["endUtc"])
            seconds=(b-a).total_seconds()
            if (seconds<300 or abs(seconds-w["durationSeconds"])>0.001 or
                w.get("notYetChecked")!=raw.get("remainingIndependentChecks")):
                raise ValueError("Window duration or missing prerequisite inconsistent")
            unique[(w["cityId"],w["localDate"])].append((a,b))
            total+=seconds
        for intervals in unique.values():
            earlier=None
            for a,b in sorted(intervals):
                if earlier is not None and a<earlier:
                    raise ValueError("Overlapping results double-count time")
                earlier=b
        if abs(total-raw.get("initialSurvivingSeconds",-1))>0.001:
            raise ValueError("Total candidate seconds do not reconcile")
        rejections=raw.get("filteredReasonsBySlice",{})
        if not isinstance(rejections,dict) or any(type(v) is not int or v<0 for v in rejections.values()):
            raise ValueError("Invalid exclusion tally")
        vetoes=sum(rejections.values())
        blockers=raw.get("remainingIndependentChecks")
        if not isinstance(blockers,list) or len(blockers)<4 or len(blockers)!=len(set(blockers)):
            raise ValueError("Unstated mandatory tradition checks")
        total_window_seconds=20*86400
        by_kind[kind]={
            "phaseSlicesEvaluated":slices,
            "candidateWindowCount":len(windows),
            "candidateSeconds":round(total,6),
            "rawCandidateHours":round(total/3600,4),
            "candidateFractionOfNominal20Days":round(total/total_window_seconds,6),
            "vetoEventsByReason":dict(sorted(rejections.items())),
            "vetoEventsTotal":vetoes,
            "daysWithAtLeastOnePreview":len(unique),
            "remainingMandatoryChecks":blockers,
            "independentRuleCheckCountRemaining":len(blockers),
            "methodComplete":False,
            "scientificallyCertifiedRecommendedWindowCount":0
        }
    return {
        "artifactType":"PANCHAVANI_MUHURAT_NUMERICAL_QA_METRICS",
        "version":1,
        "status":"COMPUTATIONAL_SCREENING_ONLY",
        "cityDays":20,
        "sourcePhaseSlices":slices,
        "fourLimbLabelsChecked":limbs,
        "maxSunriseContinuityErrorSeconds":upstream["maximumSunriseChainErrorSeconds"],
        "maxPartitionGapSeconds":upstream["maximumPartitionGapSeconds"],
        "maxSliceDurationErrorSeconds":upstream["maximumDurationErrorSeconds"],
        "arithmeticContinuityPassed":True,
        "astronomicalEphemerisIndependentlyVerified":False,
        "observerCoordinatesIndependentlyVerified":False,
        "regionalTraditionRulesFullyValidated":False,
        "weddingAndVehicle":by_kind,
        "approvedClaimsForDeepSeek":[],
        "muhuratRecommendationsAuthorized":False,
        "indexingAuthorized":False
    }
