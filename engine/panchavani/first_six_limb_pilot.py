"""Wave 7: complete SIX-LIMB research facts for real city/day input.

JPL/Skyfield calculation and provisional Lahiri projections are both present,
but scientifically independent calibration remains OUTSTANDING.
NEVER converts an existing R2/D1 'calculated' candidate into 'approved'.
Never writes D1/R2, DeepSeek, public content, sitemap or SEO indexability.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from datetime import date, timedelta, datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from .astronomy import SkyfieldAdapter
from .cities import CATALOG_SHA256, RESEARCH_CITIES
from .compute import calculate_with_verified_context, digest
from .core import phase_intervals, tithi_title
from .periods import karana_title
from .research_batch import JPL_DE440S_SHA, inspect_candidate
from .sidereal import (LahiriEpochAnchorResearch, PART_WIDTH,
                       NAKSHATRA_NAMES, YOGA_NAMES)
from .validation_matrix import (verify_partition, compare_samplings,
                                cross_city_utc_invariance)

PILOT = ("delhi", "mumbai", "chennai")
KINDS = ("tithi", "karana", "nakshatra", "yoga")
VERSION = "first-six-limb-provenance-v1"
MAX_GRID_DRIFT_S = 1.0
MAX_ROOT_RESIDUAL_ARCSEC = 2.0


def _iso(t):
    return t.astimezone(timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z")


def verify_six_limb_record(packet: dict) -> dict:
    """Pure invariants that also run on synthetic fixtures, without Skyfield."""
    if (not isinstance(packet, dict) or packet.get("artifactType") !=
            "PANCHAVANI_SIX_LIMB_RESEARCH_PACKET" or
            packet.get("status") != "UNAPPROVED_RESEARCH" or
            packet.get("publicReleaseAllowed") is not False or
            packet.get("indexingAuthorized") is not False or
            packet.get("scientificApproval") is not False or
            packet.get("paidGenerationAuthorized") is not False or
            packet.get("approvedClaimsForDeepSeek") != []):
        raise ValueError("Research status or release safety missing")
    if packet.get("cityId") not in PILOT:
        raise ValueError("Pilot city scope mismatch")
    if packet.get("timezone") != "Asia/Kolkata":
        raise ValueError("Timezone unsupported")
    day=date.fromisoformat(packet["localDate"])
    sunrise=datetime.fromisoformat(packet["sun"]["sunriseUtc"].replace("Z","+00:00"))
    sunset=datetime.fromisoformat(packet["sun"]["sunsetUtc"].replace("Z","+00:00"))
    next_sunrise=datetime.fromisoformat(packet["sun"]["nextSunriseUtc"].replace("Z","+00:00"))
    local=ZoneInfo(packet["timezone"])
    if (sunrise.utcoffset() is None or sunset.utcoffset() is None or
            next_sunrise.utcoffset() is None or
            sunrise.astimezone(local).date()!=day or
            next_sunrise.astimezone(local).date()!=day+timedelta(days=1) or
            not sunrise < sunset < next_sunrise or
            not timedelta(hours=20)<next_sunrise-sunrise<timedelta(hours=28)):
        raise ValueError("Local sunrise-to-sunrise facts invalid")
    limbs=packet["panchangAtSunrise"]
    if not all(isinstance(limbs.get(x),str) and limbs[x] for x in
               (*KINDS,"vara","paksha")):
        raise ValueError("Six Panchang limbs missing")
    transitions=packet.get("transitions")
    if not isinstance(transitions,dict) or set(transitions)!=set(KINDS):
        raise ValueError("Exactly four complete transition layers required")
    n_boundaries=0
    for kind in KINDS:
        layer=transitions[kind]
        if not isinstance(layer,list) or not layer or len(layer)>8:
            raise ValueError("Missing or oversized phase layer: "+kind)
        previous=sunrise
        previous_number=None
        number_max=30 if kind=="tithi" else 60 if kind=="karana" else 27
        for segment in layer:
            a=datetime.fromisoformat(segment["startUtc"].replace("Z","+00:00"))
            b=datetime.fromisoformat(segment["endUtc"].replace("Z","+00:00"))
            n=segment["number"]
            if (a!=previous or not a<b<=next_sunrise or
                    type(n) is not int or not 1<=n<=number_max or
                    not isinstance(segment.get("name"),str) or not segment["name"] or
                    (previous_number is not None and
                     n!=previous_number%number_max+1)):
                raise ValueError("Phase gap / overlap / ordinal error: "+kind)
            previous=b
            previous_number=n
        if (previous!=next_sunrise or
                layer[0]["name"]!=limbs[kind]):
            raise ValueError("Incorrect sunrise label / missing last interval: "+kind)
        n_boundaries+=len(layer)-1
    tithi_edges={x["endUtc"] for x in transitions["tithi"][:-1]}
    karana_edges={x["endUtc"] for x in transitions["karana"][:-1]}
    # Solves can differ by <=1 s because two step-grid bisections are independent.
    if any(not any(abs((datetime.fromisoformat(t.replace("Z","+00:00"))-
                        datetime.fromisoformat(k.replace("Z","+00:00"))).total_seconds())<=1
                       for k in karana_edges) for t in tithi_edges):
        raise ValueError("Tithi/Karana boundaries disagree")
    return {"checkedLayers":4,"checkedTransitions":n_boundaries,
            "localSunriseAttributionPassed":True,
            "layerContinuityPassed":True,"tithiKaranaIdentityPassed":True}


def build_day(adapter, sidereal, city_id: str, day: date) -> dict:
    """Return one SHA-linked but *UNAPPROVED* complete six-limb candidate."""
    if city_id not in PILOT:
        raise ValueError("Only three agreed pilot cities permitted")
    raw=calculate_with_verified_context(
        city_id,day,adapter,JPL_DE440S_SHA,"de440s.bsp")
    if inspect_candidate(raw) or raw["validation"]["blockerCount"]<1:
        raise ValueError("Base SHA-pinned JPL research candidate failed integrity")
    city=RESEARCH_CITIES[city_id]
    sunrise,sunset,next_sunrise=adapter.solar_day(city,day)
    functions={
        "tithi": (adapter.elongation,12.0,
                  lambda n:tithi_title(n)),
        "karana": (adapter.elongation,6.0,
                   lambda n:karana_title(n)),
        "nakshatra": (sidereal.nakshatra_phase,PART_WIDTH,
                      lambda n:NAKSHATRA_NAMES[n-1]),
        "yoga": (sidereal.yoga_phase,PART_WIDTH,
                 lambda n:YOGA_NAMES[n-1]),
    }
    transitions={}
    qa={}
    all_boundaries={}
    for kind,(phase,width,label) in functions.items():
        items=phase_intervals(phase,sunrise,next_sunrise,width,
                              step_minutes=30,tolerance_seconds=.25)
        numeric=verify_partition(items,phase,sunrise,next_sunrise,width,
                                  max_residual_arcsec=MAX_ROOT_RESIDUAL_ARCSEC)
        finer=phase_intervals(phase,sunrise,next_sunrise,width,
                              step_minutes=11,tolerance_seconds=.25)
        numeric["gridStep11Vs30MaxDeltaSeconds"]=round(
            compare_samplings(items,finer,tolerance_s=MAX_GRID_DRIFT_S),6)
        transitions[kind]=[
            {"number":x.number,"name":label(x.number),
             "startUtc":_iso(x.start),"endUtc":_iso(x.end)}
            for x in items]
        all_boundaries[kind]=[
            {"endingNumber":x.number,"endUtc":_iso(x.end)}
            for x in items[:-1]]
        qa[kind]=numeric
    # Canonicalized local serialization of this new *research* candidate.
    # This is NOT the original stored D1/R2 byte SHA and NEVER resolves its
    # historical conflicts; original first-wins hashes require live forensics.
    raw_bytes=(json.dumps(raw,ensure_ascii=False,
                         sort_keys=True,separators=(",",":"))+"\n").encode()
    packet={
        "artifactType":"PANCHAVANI_SIX_LIMB_RESEARCH_PACKET",
        "schemaVersion":1,"policyVersion":VERSION,
        "status":"UNAPPROVED_RESEARCH","cityId":city_id,
        "cityName":city.name,"localDate":day.isoformat(),
        "timezone":city.timezone,
        "cityReference":{"latitude":city.latitude,
                         "longitude":city.longitude,
                         "estimatedElevationMeters":city.elevation_m,
                         "coordinatesVerified":False,"elevationVerified":False,
                         "horizonConventionValidated":False},
        "methodology":{
            "ephemeris":"NASA/JPL DE440s",
            "ephemerisSha256":JPL_DE440S_SHA,
            "provisionalSiderealModel":sidereal.METHOD_ID,
            "siderealMethodIndependentlyCalibrated":False,
            "sunriseModel":raw["methodology"]["sunriseConvention"],
            "tzdbVersion":"system-not-yet-pinned",
            "sourceCityCatalogSha256":CATALOG_SHA256
        },
        "recomputedJplCandidateCanonicalSha256":hashlib.sha256(raw_bytes).hexdigest(),
        "recomputedJplCandidate":raw,
        "sun":{"sunriseUtc":_iso(sunrise),"sunsetUtc":_iso(sunset),
               "nextSunriseUtc":_iso(next_sunrise)},
        "panchangAtSunrise":{
            "tithi":transitions["tithi"][0]["name"],
            "karana":transitions["karana"][0]["name"],
            "nakshatra":transitions["nakshatra"][0]["name"],
            "yoga":transitions["yoga"][0]["name"],
            "vara":day.strftime("%A"),
            "paksha":"Shukla" if transitions["tithi"][0]["number"]<=15 else "Krishna"
        },
        "transitions":transitions,
        "numericalQa":qa,
        "geocentricBoundariesUtc":all_boundaries,
        "conflictForensics":"LIVE_PRIVATE_D1_R2_CASE_NOT_YET_RECONCILED",
        "independentExternalComparisonsCompleted":False,
        "independentMethodologicalAccuracyProven":False,
        "ritualInterpretationApproved":False,
        "scientificApproval":False,
        "approvedClaimsForDeepSeek":[],
        "paidGenerationAuthorized":False,
        "publicReleaseAllowed":False,
        "indexingAuthorized":False,
        "blockers":[
            "sidereal IAE-Lahiri implementation not independently calibrated",
            "city center/elevation and horizon not independently verified",
            "tzdb and physical solar conventions not pinned/matched",
            "16-Oct-2026 D1/R2 SHA conflicts not investigated in live production",
            "independent external comparison over sufficient boundary dates missing",
            "tradition-specific ritual rules and editorial scientific signoff absent",
        ],
    }
    packet["scienceInvariants"]=verify_six_limb_record(packet)
    if (packet["panchangAtSunrise"]["tithi"]!=raw["panchangAtSunrise"]["tithi"]
       or packet["panchangAtSunrise"]["karana"]!=raw["panchangAtSunrise"]["karana"]):
        raise ValueError("Base JPL lunar limb disagrees with complete research packet")
    return packet


def verify_batch(packets: list[dict]) -> dict:
    if len(packets)!=6:
        raise ValueError("Exactly 3 cities x 2 local days required")
    try:
        start=min(date.fromisoformat(x["localDate"]) for x in packets)
    except (ValueError,KeyError,TypeError):
        raise ValueError("Invalid city/day in science batch") from None
    first_date=start.isoformat()
    following_date=(start+timedelta(days=1)).isoformat()
    if {(x["cityId"],x["localDate"]) for x in packets}!={ 
        (c,d) for c in PILOT for d in (first_date,following_date)}:
        raise ValueError("Exactly 3 cities x 2 CONTIGUOUS local days required")
    for packet in packets:
        verify_six_limb_record(packet)
    same_date={}
    for record in packets:
        same_date.setdefault(record["localDate"],[]).append(record)
    for date_str,recs in same_date.items():
        if len({x["sun"]["sunriseUtc"] for x in recs})!=3:
            raise ValueError("Different city sites share identical sunrise: "+date_str)
    dawn_checked=0
    for city in PILOT:
        first=next(x for x in packets if x["cityId"]==city and x["localDate"]==first_date)
        next_=next(x for x in packets if x["cityId"]==city and x["localDate"]==following_date)
        for kind in KINDS:
            last=first["transitions"][kind][-1]
            opening=next_["transitions"][kind][0]
            if (last["endUtc"]!=opening["startUtc"] or
                    last["name"]!=opening["name"] or last["number"]!=opening["number"]):
                raise ValueError("Cross-day Panchang limb discontinuity: "+city+"/"+kind)
            dawn_checked+=1
    cross_city_duplicates=cross_city_utc_invariance(packets)
    return {
        "checkedCityDays":6,"cities":list(PILOT),
        "localDateFrom":first_date,"localDateThrough":following_date,
        "checkedFourLimbDawnContinuities":dawn_checked,
        "crossCitySharedGeocentricEventsCompared":cross_city_duplicates,
        "localSunriseDistinctWithinDate":True,
        "geocentricEventConsistencyPassed":True,
        "sourceScientificValidation":False,
    }


def build_pilot(ephemeris: Path, out: Path, start:date=date(2026,10,16)):
    if out.exists():
        raise ValueError("Refusing to overwrite a prior immutable science packet")
    if digest(ephemeris)!=JPL_DE440S_SHA:
        raise ValueError("Exact NASA/JPL DE440s SHA mismatch")
    adapter=SkyfieldAdapter(ephemeris)
    sidereal=LahiriEpochAnchorResearch(adapter)
    packets=[build_day(adapter,sidereal,c,start+timedelta(days=d))
             for d in (0,1) for c in PILOT]
    checks=verify_batch(packets)
    result={
        "artifactType":"PANCHAVANI_FIRST_SIX_LIMB_SCIENCE_BATCH",
        "schemaVersion":1,"status":"UNAPPROVED_RESEARCH",
        "scienceChecks":checks,
        "kernelSha256":JPL_DE440S_SHA,"cityCatalogSha256":CATALOG_SHA256,
        "records":packets,
        "publicationAuthorized":False,"scientificApproval":False,
        "approvedClaimsForDeepSeek":[],"indexingAuthorized":False,
        "conflictDisposition":"NOT_REVIEWED_IN_PRIVATE_D1",
    }
    out.parent.mkdir(parents=True,exist_ok=True)
    with out.open("x",encoding="utf-8") as f:
        json.dump(result,f,ensure_ascii=False,indent=2)
        f.write("\n")
    return result


def main():
    p=argparse.ArgumentParser(description="6-limb JPL/Lahiri PROVISIONAL evidence, NEVER approve")
    p.add_argument("--ephemeris",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    p.add_argument("--start",type=date.fromisoformat,default=date(2026,10,16),
                   help="India local date of first 3-city research day")
    a=p.parse_args()
    if a.start.year<2000 or a.start.year>2099:
        p.error("Outside approved historical/future ephemeris pilot interval")
    packet=build_pilot(a.ephemeris,a.out,a.start)
    print("SIX-LIMB UNAPPROVED research",packet["scienceChecks"])
    print("DeepSeek approved claims:",len(packet["approvedClaimsForDeepSeek"]))
    print("Google indexing allowed:",packet["indexingAuthorized"])

if __name__=="__main__":
    main()
