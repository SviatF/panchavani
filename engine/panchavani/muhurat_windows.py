"""Research-only time-resolved four-limb intersections for ten Indian cities.

This module is the calculation layer required BEFORE an independently reviewed
Wedding / Vehicle Purchase observance rule engine can issue recommendations.
It never infers "auspicious", never invokes DeepSeek, and never publishes HTML.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from .first_six_limb_pilot import KINDS, TEN_CITY_IDS, verify_batch
from .research_batch import JPL_DE440S_SHA

IST = ZoneInfo("Asia/Kolkata")
ARTIFACT = "PANCHAVANI_TEN_CITY_FOUR_LIMB_INTERSECTION_GRID"
INPUT_ARTIFACT = "PANCHAVANI_TEN_CITY_SIX_LIMB_RESEARCH_BATCH"

def instant(value: str) -> datetime:
    if not isinstance(value, str):
        raise ValueError("Time must be explicit UTC ISO-8601")
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.utcoffset() is None:
        raise ValueError("Timezone-aware UTC instant required")
    return dt.astimezone(timezone.utc)

def ist(value: datetime) -> str:
    return value.astimezone(IST).isoformat(timespec="seconds")

def intersection_grid(batch: dict) -> dict:
    if (not isinstance(batch, dict) or batch.get("artifactType") != INPUT_ARTIFACT
        or batch.get("status") != "UNAPPROVED_RESEARCH"
        or batch.get("kernelSha256") != JPL_DE440S_SHA
        or batch.get("cityCount") != 10
        or batch.get("scientificApproval") is not False
        or batch.get("publicationAuthorized") is not False
        or batch.get("indexingAuthorized") is not False
        or batch.get("approvedClaimsForDeepSeek") != []):
        raise ValueError("Only exact ten-city unapproved JPL science input is accepted")
    qa = verify_batch(batch.get("records", []), TEN_CITY_IDS)
    rows = []
    for packet in sorted(batch["records"], key=lambda v: (v["localDate"], v["cityId"])):
        city = packet["cityId"]
        sun = packet["sun"]
        sunrise, sunset, following = (instant(sun[key]) for key in
                                      ("sunriseUtc", "sunsetUtc", "nextSunriseUtc"))
        timelines = {k: [(instant(segment["startUtc"]), instant(segment["endUtc"]),
                          segment["name"], segment["number"])
                         for segment in packet["transitions"][k]]
                     for k in KINDS}
        boundaries = {sunrise, following}
        for layer in timelines.values():
            boundaries.update(t for a,b,_,__ in layer for t in (a,b))
        ordered = sorted(boundaries)
        windows = []
        for a,b in zip(ordered, ordered[1:]):
            if not sunrise <= a < b <= following:
                raise ValueError("Outside local sunrise-to-sunrise interval")
            fields = {}
            for kind in KINDS:
                matches = [segment for segment in timelines[kind]
                           if segment[0] <= a and b <= segment[1]]
                if len(matches) != 1:
                    raise ValueError("Gap or simultaneous duplicate segment: " + kind)
                _, _, name, number = matches[0]
                fields[kind] = {"name": name, "number": number}
            windows.append({
                "startUtc": a.isoformat().replace("+00:00","Z"),
                "endUtc": b.isoformat().replace("+00:00","Z"),
                "startIST": ist(a),
                "endIST": ist(b),
                # Separate independently solved Tithi/Karana crossings can be
                # <1 second apart. Preserve fractional seconds rather than
                # silently creating a zero-length, unusable window.
                "durationSeconds": (b-a).total_seconds(),
                "sunlightContext": ("BEFORE_SUNSET" if b <= sunset else
                                    "AFTER_SUNSET" if a >= sunset else "STRADDLES_SUNSET"),
                "elements": fields,
                "ritualEligibilityDetermined": False,
                "auspiciousRecommendation": False,
            })
        if sum(w["durationSeconds"] for w in windows) < 20 * 3600:
            raise ValueError("Incomplete day grid")
        if (windows[0]["startUtc"] != sunrise.isoformat().replace("+00:00","Z")
            or windows[-1]["endUtc"] != following.isoformat().replace("+00:00","Z")):
            raise ValueError("Incomplete grid endpoints")
        rows.append({
            "cityId": city, "localDate": packet["localDate"],
            "modeledSunriseIST": ist(sunrise),
            "modeledFollowingSunriseIST": ist(following),
            "modeledSunsetIST": ist(sunset),
            # Preserve subsecond UTC solar roots for 1/8-day Rahu calculation:
            # IST convenience strings may be rounded to whole seconds.
            "modeledSunriseUtc": sunrise.isoformat(timespec="microseconds").replace("+00:00","Z"),
            "modeledSunsetUtc": sunset.isoformat(timespec="microseconds").replace("+00:00","Z"),
            "modeledFollowingSunriseUtc": following.isoformat(timespec="microseconds").replace("+00:00","Z"),
            "windowCount": len(windows), "windows": windows,
            "coordinatesIndependentlyVerified": False,
            "lahiriIndependentlyApproved": False,
            "traditionRuleApplied": False,
            "scientificApproval": False,
            "indexingAuthorized": False
        })
    return {
        "artifactType": ARTIFACT, "schemaVersion": 1,
        "status": "UNAPPROVED_RESEARCH",
        "cityCount": len(TEN_CITY_IDS), "cityDays": len(rows),
        "localDateFrom": qa["localDateFrom"],
        "localDateThrough": qa["localDateThrough"],
        "jplKernelSha256": JPL_DE440S_SHA,
        "cityCatalogSha256": batch.get("cityCatalogSha256"),
        "sourceBatchSha256": hashlib.sha256(json.dumps(
            batch, sort_keys=True, ensure_ascii=False, separators=(",",":")
        ).encode()).hexdigest(),
        "windows": rows,
        "approval": {
            "scientificReviewer": None, "ruleReviewer": None,
            "geometryMethod": "RESEARCH_UNVERIFIED",
            "ritualTradition": None,
        },
        "scientificApproval": False, "muhuratRecommendationsAuthorized": False,
        "approvedClaimsForDeepSeek": [], "paidDeepSeekGenerationAuthorized": False,
        "publicationAuthorized": False, "indexingAuthorized": False,
        "note": "Raw Tithi/Karana/Nakshatra/Yoga interval intersections only; "
                "not wedding, vehicle-purchase, festival or vrat recommendations."
    }

def draft_rule_filter(grid: dict, rule: dict) -> dict:
    """Preview intersections for a manually supplied DRAFT selector only.

    The selector never becomes a reviewed ritual rule by passing tests. It may
    aid later evidence review; a false-positive match is NOT a good Muhurat.
    """
    if (grid.get("artifactType") != ARTIFACT
        or grid.get("status") != "UNAPPROVED_RESEARCH"
        or grid.get("scientificApproval") is not False
        or grid.get("publicationAuthorized") is not False
        or grid.get("indexingAuthorized") is not False
        or grid.get("approvedClaimsForDeepSeek") != []):
        raise ValueError("Only unapproved four-limb grids accepted")
    if (not isinstance(rule, dict) or rule.get("status") != "DRAFT"
        or rule.get("kind") not in ("wedding","vehicle-purchase")
        or rule.get("independentReview",{}).get("status") != "PENDING"
        or not isinstance(rule.get("id"), str) or not rule["id"]
        or not isinstance(rule.get("version"),str) or not rule["version"]
        or not isinstance(rule.get("region"),str) or not rule["region"]
        or not isinstance(rule.get("tradition"),str) or not rule["tradition"]):
        raise ValueError("Must declare unreviewed explicit kind, region, tradition and rule identity")
    criteria = rule.get("experimentalSelectors")
    if not isinstance(criteria,dict) or not criteria or set(criteria)-set(KINDS):
        raise ValueError("Selectors must explicitly name one or more supported limbs")
    for values in criteria.values():
        if not isinstance(values,list) or not values or any(
            not isinstance(v,str) or not v.strip() for v in values
        ) or len(set(values)) != len(values):
            raise ValueError("Invalid experiment label selection")
    city_ids = rule.get("cityIds")
    if not isinstance(city_ids,list) or not city_ids or any(
        city not in TEN_CITY_IDS for city in city_ids
    ):
        raise ValueError("Explicit supported city scope required")
    seconds = rule.get("minimumSeconds",300)
    if type(seconds) is not int or not 60 <= seconds <= 21600:
        raise ValueError("Explicit duration bounds required")
    if rule.get("sourceRefs") is None or not isinstance(rule["sourceRefs"],list):
        raise ValueError("Cannot claim unstated ritual sources")
    matches=[]
    for row in grid["windows"]:
        if row["cityId"] not in city_ids:
            continue
        for w in row["windows"]:
            if (w["durationSeconds"]>=seconds and all(
                w["elements"][kind]["name"] in allowed for kind, allowed in criteria.items()
            )):
                matches.append({
                  "cityId":row["cityId"],"localDate":row["localDate"],
                  "startIST":w["startIST"],"endIST":w["endIST"],
                  "durationSeconds":w["durationSeconds"],
                  "matchingElements":{k:w["elements"][k]["name"] for k in criteria},
                  "experimentalSelectorMatched":True,
                  "muhuratRecommended":False
                })
    return {
      "artifactType":"PANCHAVANI_MUHURAT_EXPERIMENTAL_SELECTOR_RESULT",
      "schemaVersion":1,"status":"DRAFT_RESEARCH_ONLY",
      "ruleId":rule["id"],"ruleVersion":rule["version"],
      "kind":rule["kind"],"matches":matches,
      "matchingWindowCount":len(matches),
      "ruleMethodApproved":False,"regionalValidityConfirmed":False,
      "missingChecks":["tradition-specific exclusions","independent rule source review",
                       "Asta and Lagna applicability","sunrise/reference calibration"],
      "muhuratRecommendationsAuthorized":False,
      "approvedClaimsForDeepSeek":[],
      "publicationAuthorized":False,"indexingAuthorized":False
    }

def main():
    p=argparse.ArgumentParser(description="Build private ten-city scientific interval grid, never a Muhurat schedule")
    p.add_argument("--batch",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    a=p.parse_args()
    if a.out.exists():
        raise ValueError("Never overwrite a private immutable interval grid")
    raw=a.batch.read_bytes()
    grid=intersection_grid(json.loads(raw))
    grid["rawSourceFileSha256"]=hashlib.sha256(raw).hexdigest()
    a.out.parent.mkdir(parents=True,exist_ok=True)
    with a.out.open("x",encoding="utf-8") as file:
        json.dump(grid,file,indent=2,ensure_ascii=False)
        file.write("\n")
    print("TEN CITY astronomical interval grids:",grid["cityDays"])
    print("Research-only interval windows:",sum(r["windowCount"] for r in grid["windows"]))
    print("Auspicious recommendations:",grid["muhuratRecommendationsAuthorized"])

if __name__=="__main__":
    main()
