"""ISOLATED third-party Swiss comparison, NOT PANCHAVANI runtime or a release.

AGPL-3.0 / Astrodienst dual license: this script is only used in a disposable
research CI environment and is not installed, linked, distributed, or invoked
by the public PANCHAVANI app, private Worker, or its production calculator.
Do not introduce Swiss as a service or runtime dependency without legal review.

Swiss uses explicit analytic MOSEPH, not the same JPL DE440s kernel.
Program/method comparison is NOT independent certification of a Panchang.
"""
from __future__ import annotations

import argparse
import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import swisseph as swe  # AGPL: ephemeral research-only QA program
from panchavani.astronomy import SkyfieldAdapter
from panchavani.compute import digest
from panchavani.research_batch import JPL_DE440S_SHA
from panchavani.sidereal import (LahiriEpochAnchorResearch,
                                 nakshatra_index, yoga_index)
from panchavani.core import wrap

SAMPLES = (
    "1956-03-21T00:00:00+00:00",  # historical Lahiri epoch (UTC not TT)
    "2000-01-01T12:00:00+00:00",
    "2024-02-29T00:00:00+00:00",
    "2025-03-20T12:00:00+00:00",
    "2025-06-21T12:00:00+00:00",
    "2025-09-23T12:00:00+00:00",
    "2026-10-16T00:52:25+00:00",  # Delhi research dawn nearby
    "2030-01-01T12:00:00+00:00",
    "2050-03-20T12:00:00+00:00",
)
METHOD = "SWISS_ANALYTIC_MOSHIER_LAHIRI_RESEARCH_ONLY"


def signed_circular_delta_deg(a: float, b: float) -> float:
    return (float(a)-float(b)+180.0)%360.0-180.0


def utc_julday(dt: datetime) -> float:
    if dt.utcoffset() is None:
        raise ValueError("Naive time forbidden")
    x=dt.astimezone(timezone.utc)
    hour=x.hour + (x.minute+(x.second+x.microsecond/1e6)/60)/60
    return swe.julday(x.year,x.month,x.day,hour)


def _swiss(jd: float, body: int, sidereal: bool) -> float:
    # Explicit MOSEPH to avoid implicit ephemeris file search and fallback.
    flags=swe.FLG_MOSEPH | (swe.FLG_SIDEREAL if sidereal else 0)
    coords, actual=swe.calc_ut(jd,body,flags)
    if not actual & swe.FLG_MOSEPH:
        raise ValueError("Swiss used an unexpected ephemeris backend")
    if sidereal and not actual & swe.FLG_SIDEREAL:
        raise ValueError("Swiss ignored requested Lahiri sidereal mode")
    return float(coords[0])


def compare_instant(adapter, model, instant: datetime, category: str) -> dict:
    if instant.utcoffset() is None:
        raise ValueError("Timezone-aware sample required")
    jd=utc_julday(instant)
    sky_moon,sky_sun=model.longitudes(instant)
    sky_aya=model.ayanamsa(instant)
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    swiss_aya=float(swe.get_ayanamsa_ut(jd))
    moon_trop=_swiss(jd,swe.MOON,False)
    sun_trop=_swiss(jd,swe.SUN,False)
    moon_sid=_swiss(jd,swe.MOON,True)
    sun_sid=_swiss(jd,swe.SUN,True)
    sky_moon_sid=wrap(sky_moon-sky_aya)
    sky_sun_sid=wrap(sky_sun-sky_aya)
    sky_yoga=wrap(sky_moon_sid+sky_sun_sid)
    swiss_yoga=wrap(moon_sid+sun_sid)
    drift={
        "ayanamsaArcsec":round(3600*signed_circular_delta_deg(sky_aya,swiss_aya),6),
        "moonTropicalArcsec":round(3600*signed_circular_delta_deg(sky_moon,moon_trop),6),
        "sunTropicalArcsec":round(3600*signed_circular_delta_deg(sky_sun,sun_trop),6),
        "moonSiderealArcsec":round(3600*signed_circular_delta_deg(sky_moon_sid,moon_sid),6),
        "sunSiderealArcsec":round(3600*signed_circular_delta_deg(sky_sun_sid,sun_sid),6),
        "yogaPhaseArcsec":round(3600*signed_circular_delta_deg(sky_yoga,swiss_yoga),6)
    }
    return {
        "sampleCategory":category,
        "instantUtc":instant.astimezone(timezone.utc).isoformat(),
        "provisionalLahiriAyanamsaDegrees":round(sky_aya,9),
        "swissLahiriAyanamsaDegrees":round(swiss_aya,9),
        "differences":drift,
        "nakshatraNumberPanchavani":nakshatra_index(sky_moon_sid),
        "nakshatraNumberSwiss":nakshatra_index(moon_sid),
        "yogaNumberPanchavani":yoga_index(sky_yoga),
        "yogaNumberSwiss":yoga_index(swiss_yoga),
        "nakshatraLabelAgrees":nakshatra_index(sky_moon_sid)==nakshatra_index(moon_sid),
        "yogaLabelAgrees":yoga_index(sky_yoga)==yoga_index(swiss_yoga),
    }


def swiss_phase(kind: str, instant: datetime) -> float:
    """Independent analytic Swiss body phases; no NASA/JPL helper is called."""
    jd=utc_julday(instant)
    if kind in ("tithi","karana"):
        moon=_swiss(jd,swe.MOON,False)
        sun=_swiss(jd,swe.SUN,False)
        return wrap(moon-sun)
    if kind=="nakshatra":
        return wrap(_swiss(jd,swe.MOON,True))
    if kind=="yoga":
        return wrap(_swiss(jd,swe.MOON,True)+_swiss(jd,swe.SUN,True))
    raise ValueError("Unsupported astronomical phase")


def find_swiss_boundary(kind: str, guess: datetime, ending_number: int,
                        *, bracket_minutes: int = 180) -> datetime:
    """Solve same NUMBERED boundary independently of JPL, near JPL's timestamp.

    Fixed external +/-180 minute bracket is an investigation WINDOW, not a
    claim of method-matched physical accuracy or permitted publication error.
    """
    width={"tithi":12.0,"karana":6.0,
           "nakshatra":360.0/27,"yoga":360.0/27}[kind]
    part_count={"tithi":30,"karana":60,"nakshatra":27,"yoga":27}[kind]
    if type(ending_number) is not int or not 1<=ending_number<=part_count:
        raise ValueError("Invalid boundary ordinal")
    if guess.utcoffset() is None:
        raise ValueError("Unzoned crossing")
    target=wrap(ending_number*width)
    lo=guess-timedelta(minutes=bracket_minutes)
    hi=guess+timedelta(minutes=bracket_minutes)
    left=signed_circular_delta_deg(swiss_phase(kind,lo),target)
    right=signed_circular_delta_deg(swiss_phase(kind,hi),target)
    if not (left<0<right):
        raise ValueError("Swiss phase boundary not bracketed near JPL crossing: "+kind)
    for _ in range(55):
        mid=lo+(hi-lo)/2
        if signed_circular_delta_deg(swiss_phase(kind,mid),target)>=0:
            hi=mid
        else:
            lo=mid
        if (hi-lo).total_seconds()<=.05:
            break
    return lo+(hi-lo)/2


def compare_event_boundaries(records: list[dict]) -> list[dict]:
    """Use unique real JPL crossings, not only sunrise labels far from edges."""
    found={}
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    for record in records:
        for kind, events in record["geocentricBoundariesUtc"].items():
            for event in events:
                instant=datetime.fromisoformat(event["endUtc"].replace("Z","+00:00"))
                # One physical crossing can be visible in more than one city.
                # Never compare duplicated copies as independent evidence.
                key=(kind,event["endingNumber"],int(instant.timestamp()//60))
                if key not in found:
                    found[key]=(kind,event["endingNumber"],instant)
    output=[]
    for (kind,ending_number,_),(_,__,jpl) in sorted(found.items()):
        other=find_swiss_boundary(kind,jpl,ending_number)
        output.append({
            "kind":kind,"endingNumber":ending_number,
            "jplEndUtc":jpl.isoformat(),
            "swissMoshierEndUtc":other.isoformat(),
            "swissMinusJplSeconds":round((other-jpl).total_seconds(),6),
            "sameMoonSunEphemerisFamily":False,
            "publicationApproved":False
        })
    return output


def validate_report(report: dict) -> None:
    if (report.get("artifactType")!="PANCHAVANI_EXTERNAL_LAHIRI_PROBE"
            or report.get("status")!="UNAPPROVED_RESEARCH"
            or report.get("swissBackend")!="MOSEPH_ANALYTIC"
            or report.get("scientificApproval") is not False
            or report.get("releaseAuthorized") is not False
            or report.get("indexingAuthorized") is not False
            or report.get("approvedClaimsForDeepSeek")!=[]):
        raise ValueError("Illegal publication or Swiss research backend")
    rows=report.get("comparisons")
    if not isinstance(rows,list) or len(rows)<10:
        raise ValueError("Insufficient temporal/geographical evidence")
    ids=[(r["sampleCategory"],r["instantUtc"]) for r in rows]
    if len(ids)!=len(set(ids)):
        raise ValueError("Duplicate cross-method comparison")
    if any(not r["differences"] or
           not isinstance(r["nakshatraLabelAgrees"],bool) or
           not isinstance(r["yogaLabelAgrees"],bool) for r in rows):
        raise ValueError("Incomplete Swiss comparison facts")
    events=report.get("independentBoundaryComparisons")
    if not isinstance(events,list) or not events:
        raise ValueError("No physically solved independent Swiss boundaries")
    if any(not isinstance(e.get("swissMinusJplSeconds"),(float,int))
           or e.get("publicationApproved") is not False
           or e.get("sameMoonSunEphemerisFamily") is not False for e in events):
        raise ValueError("Invalid independent boundary event comparison")


def run(ephemeris: Path, batch: Path, out: Path) -> dict:
    if out.exists():
        raise ValueError("Refusing to overwrite prior calibration evidence")
    if digest(ephemeris)!=JPL_DE440S_SHA:
        raise ValueError("NASA/JPL DE440s SHA mismatch")
    six=json.loads(batch.read_text(encoding="utf-8"))
    if (six.get("artifactType")!="PANCHAVANI_FIRST_SIX_LIMB_SCIENCE_BATCH"
        or six.get("status")!="UNAPPROVED_RESEARCH"
        or six.get("kernelSha256")!=JPL_DE440S_SHA
        or len(six.get("records",[]))!=6
        or six.get("scientificApproval") is not False
        or six.get("publicationAuthorized") is not False):
        raise ValueError("Untrusted/incomplete six-limb research input")
    adapter=SkyfieldAdapter(ephemeris)
    model=LahiriEpochAnchorResearch(adapter)
    rows=[compare_instant(adapter,model,datetime.fromisoformat(s),
                          "STRATIFIED_1956_TO_2050")
          for s in SAMPLES]
    for record in six["records"]:
        dt=datetime.fromisoformat(record["sun"]["sunriseUtc"].replace("Z","+00:00"))
        rows.append(compare_instant(adapter,model,dt,
                        record["cityId"]+"/"+record["localDate"]+"/SUNRISE"))
    drift=max(abs(x["differences"]["ayanamsaArcsec"]) for x in rows)
    moon=max(abs(x["differences"]["moonSiderealArcsec"]) for x in rows)
    yoga=max(abs(x["differences"]["yogaPhaseArcsec"]) for x in rows)
    event_rows=compare_event_boundaries(six["records"])
    event_max=max(abs(x["swissMinusJplSeconds"]) for x in event_rows)
    mismatches=[{"instantUtc":x["instantUtc"],
                 "kind":kind,"sampleCategory":x["sampleCategory"]}
                for x in rows for kind,good in
                (("nakshatra",x["nakshatraLabelAgrees"]),
                 ("yoga",x["yogaLabelAgrees"])) if not good]
    result={
        "artifactType":"PANCHAVANI_EXTERNAL_LAHIRI_PROBE",
        "schemaVersion":1,"status":"UNAPPROVED_RESEARCH",
        "researchVersion":"wave7b-swiss-lahiri-moseph-v1",
        "panchavaniEphemerisSha256":JPL_DE440S_SHA,
        "panchavaniProvisionalMethod":model.METHOD_ID,
        "comparator":"pyswisseph 2.10.3.2",
        "comparatorImplementationVersion":swe.version,
        "comparatorLicense":"AGPL-3.0 / Astrodienst dual license",
        "comparatorMode":"SE_SIDM_LAHIRI, true/apparent geocentric default ecliptic",
        "swissBackend":"MOSEPH_ANALYTIC",
        "comparatorInstalledOnlyInIsolatedEphemeralQA":True,
        "comparatorNotShippedInPanchavaniRuntime":True,
        "utcUt1AndTtHandlingStillRequiresMethodReview":True,
        "sampleCount":len(rows),
        "independentBoundaryEventCount":len(event_rows),
        "maxAbsoluteIndependentBoundaryDeltaSeconds":round(event_max,6),
        "independentBoundaryComparisons":event_rows,
        "maxAbsoluteAyanamsaDeltaArcsec":round(drift,6),
        "maxAbsoluteMoonSiderealDeltaArcsec":round(moon,6),
        "maxAbsoluteYogaPhaseDeltaArcsec":round(yoga,6),
        "sunriseNakshatraOrYogaDisagreements":mismatches,
        "comparisons":rows,
        "independentProgramAndEphemerisFamilyCompared":True,
        "methodEquivalenceConfirmed":False,
        "scientificApproval":False,"releaseAuthorized":False,
        "indexingAuthorized":False,"approvedClaimsForDeepSeek":[],
        "blockers":[
          "Distinct programs and ephemerides do not prove method-matched equivalence",
          "IAE-1985 versus standard Swiss Lahiri reference-frame details need expert reconciliation",
          "Swiss MOSEPH and NASA/JPL DE440s numerical models differ by design",
          "UTC vs UT1 and TT / true-versus-mean ecliptic convention need independent review",
          "Three production city observation points, elevations, refraction unverified",
          "Live private D1/R2 2026-10-16 conflicts remain unresolved",
          "AGPL/dual-license restrictions forbid direct unreviewed production integration",
        ],
    }
    validate_report(result)
    out.parent.mkdir(parents=True,exist_ok=True)
    with out.open("x",encoding="utf-8") as f:
        json.dump(result,f,ensure_ascii=False,indent=2)
        f.write("\n")
    return result


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--ephemeris",required=True,type=Path)
    p.add_argument("--batch",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    args=p.parse_args()
    r=run(args.ephemeris,args.batch,args.out)
    print("Independent software/analytic ephemeris research comparisons:",r["sampleCount"])
    print("Maximum absolute Lahiri difference (arcsec)",r["maxAbsoluteAyanamsaDeltaArcsec"])
    print("Max moon sidereal (arcsec)",r["maxAbsoluteMoonSiderealDeltaArcsec"])
    print("Max yoga (arcsec)",r["maxAbsoluteYogaPhaseDeltaArcsec"])
    print("Nakshatra/Yoga label mismatches",len(r["sunriseNakshatraOrYogaDisagreements"]))
    print("Independent actual transit events",r["independentBoundaryEventCount"])
    print("Max Swiss-JPL phase transition difference in seconds",r["maxAbsoluteIndependentBoundaryDeltaSeconds"])
    print("Scientific approval",r["scientificApproval"])
if __name__=="__main__":
    main()
