"""Research-only sensitivity of Nakshatra/Yoga crossing times to Lahiri convention.

Estimate timing effects from measured angular mismatch and local angular speed.
Linearization is diagnostic, not an independent recomputation of crossing roots.
"""
from __future__ import annotations
import argparse, json, math
from datetime import datetime, timedelta, timezone
from pathlib import Path

def _utc(value):
    dt=datetime.fromisoformat(value.replace("Z","+00:00"))
    if dt.utcoffset() is None:raise ValueError("UTC offset required")
    return dt.astimezone(timezone.utc)

def _signed_arcsec(a,b):
    return ((a-b+180)%360-180)*3600

def _speed(phase,instant):
    left=phase(instant-timedelta(minutes=5))
    right=phase(instant+timedelta(minutes=5))
    return ((right-left+180)%360-180)*3600/600

def transition_sensitivity(ephemeris, grid, city="delhi"):
    import swisseph as swe
    from .astronomy import SkyfieldAdapter
    from .sidereal import LahiriEpochAnchorResearch
    from .sourced_muhurat_rules import validate_research_grid
    rows,_=validate_research_grid(grid)
    adapter=SkyfieldAdapter(ephemeris)
    sidereal=LahiriEpochAnchorResearch(adapter)
    swe.set_sid_mode(swe.SIDM_LAHIRI,0,0)
    values=[]
    for (cid,day),row in sorted(rows.items()):
        if cid!=city:continue
        for kind in ("nakshatra","yoga"):
            previous=None
            for window in row["windows"]:
                number=window["elements"][kind]["number"]
                if previous is not None and previous!=number:
                    boundary=_utc(window["startUtc"])
                    hour=boundary.hour+boundary.minute/60+boundary.second/3600+boundary.microsecond/3.6e9
                    jd=swe.julday(boundary.year,boundary.month,boundary.day,hour)
                    model_ayan=sidereal.ayanamsa(boundary)
                    swiss_ayan=swe.get_ayanamsa_ut(jd)
                    arcsec=_signed_arcsec(model_ayan,swiss_ayan)
                    phase=sidereal.nakshatra_phase if kind=="nakshatra" else sidereal.yoga_phase
                    speed=_speed(phase,boundary)
                    if not math.isfinite(speed) or not 0.1<=speed<=1.0:
                        raise ValueError("Unexpected angular phase rate")
                    multiplier=1 if kind=="nakshatra" else 2
                    shift_seconds=multiplier*arcsec/speed
                    values.append({"cityId":cid,"localDate":day,"kind":kind,
                                   "transitionUtc":boundary.isoformat(),
                                   "provisionalLahiriMinusSwissArcseconds":round(arcsec,6),
                                   "phaseSpeedArcsecondsPerSecond":round(speed,8),
                                   "firstOrderTransitionShiftSeconds":round(shift_seconds,3),
                                   "exactSwissRecomputedTransition":False})
                previous=number
    if not values:raise ValueError("No Nakshatra/Yoga boundaries to compare")
    return {"artifactType":"PANCHAVANI_LAHIRI_TRANSITION_SENSITIVITY",
            "status":"UNAPPROVED_FIRST_ORDER_ESTIMATE","cityId":city,
            "transitionCount":len(values),"transitions":values,
            "maxAbsoluteEstimatedShiftSeconds":max(abs(x["firstOrderTransitionShiftSeconds"]) for x in values),
            "independentTransitionRootsConfirmed":False,"scientificApproval":False,
            "publicationAuthorized":False,"indexingAuthorized":False,
            "muhuratRecommendationsAuthorized":False,"approvedClaimsForDeepSeek":[]}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--ephemeris",type=Path,required=True)
    p.add_argument("--grid",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    a=p.parse_args()
    result=transition_sensitivity(a.ephemeris,json.loads(a.grid.read_text()))
    a.out.parent.mkdir(parents=True,exist_ok=True)
    with a.out.open("x") as f:
        json.dump(result,f,indent=2)
        f.write("\n")
    print("Nakshatra/Yoga boundary sensitivity:",result["transitions"])
    print("MAX FIRST ORDER SHIFT SECONDS:",result["maxAbsoluteEstimatedShiftSeconds"])
    print("Scientific validation:",result["scientificApproval"])

if __name__=="__main__":main()
