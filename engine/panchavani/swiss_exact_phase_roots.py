"""Exact independent Swiss sidereal Nakshatra/Yoga roots near JPL research roots.

Swiss uses its own planetary calculations and SIDM_LAHIRI, so differences
combine ephemeris, coordinate and ayanamsha convention, unlike a linear
sensitivity estimate. NEVER automatically replaces JPL timings.
"""
from __future__ import annotations
import argparse, json
from datetime import datetime, timedelta, timezone
from pathlib import Path

def utc(v):
    d=datetime.fromisoformat(v.replace("Z","+00:00"))
    if d.utcoffset() is None:raise ValueError("Offset-aware timestamp required")
    return d.astimezone(timezone.utc)

def swiss_phase(swe, t, kind):
    hr=t.hour+t.minute/60+t.second/3600+t.microsecond/3.6e9
    jd=swe.julday(t.year,t.month,t.day,hr)
    flags=swe.FLG_SWIEPH|swe.FLG_SIDEREAL
    moon_values,moon_flags=swe.calc_ut(jd,swe.MOON,flags)
    if not (moon_flags & swe.FLG_SWIEPH) or (moon_flags & swe.FLG_MOSEPH):
        raise ValueError("Swiss lunar calculation silently fell back to Moshier")
    moon=moon_values[0]
    if kind=="nakshatra":return moon%360
    sun_values,sun_flags=swe.calc_ut(jd,swe.SUN,flags)
    if not (sun_flags & swe.FLG_SWIEPH) or (sun_flags & swe.FLG_MOSEPH):
        raise ValueError("Swiss solar calculation silently fell back to Moshier")
    sun=sun_values[0]
    return (moon+sun)%360

def signed_phase_error(value,target):
    return (value-target+180)%360-180

def solve(swe,approx,kind,ending_number):
    width=360/27
    target=(ending_number%27)*width
    lo,hi=approx-timedelta(hours=2),approx+timedelta(hours=2)
    f=lambda instant:signed_phase_error(swiss_phase(swe,instant,kind),target)
    left,right=f(lo),f(hi)
    if not (-10<left<0<right<10):
        raise ValueError("Expected advancing Swiss phase boundary not bracketed")
    for _ in range(72):
        if (hi-lo).total_seconds()<0.125:break
        mid=lo+(hi-lo)/2
        if f(mid)>=0:hi=mid
        else:lo=mid
    return lo+(hi-lo)/2

def compare(grid):
    import swisseph as swe
    from .sourced_muhurat_rules import validate_research_grid
    rows,_=validate_research_grid(grid)
    swe.set_sid_mode(swe.SIDM_LAHIRI,0,0)
    results=[]
    for (city,day),row in sorted(rows.items()):
        if city!="delhi":continue
        for kind in ("nakshatra","yoga"):
            last=None
            for w in row["windows"]:
                n=w["elements"][kind]["number"]
                if last is not None and n!=last:
                    model=utc(w["startUtc"])
                    exact=solve(swe,model,kind,last)
                    diff=(exact-model).total_seconds()
                    results.append({"cityId":city,"localDate":day,"kind":kind,
                        "endingNumber":last,
                        "jplResearchTransitionUtc":model.isoformat(),
                        "swissSiderealLahiriTransitionUtc":exact.isoformat(),
                        "swissMinusResearchSeconds":round(diff,6),
                        "absoluteDifferenceSeconds":round(abs(diff),6),
                        "independentTimingAgreementApproved":False})
                last=n
    if not results:raise ValueError("No testable sidereal phase crossings")
    return {"artifactType":"PANCHAVANI_SWISS_EXACT_SIDEREAL_PHASE_ROOTS",
      "status":"UNAPPROVED_REFERENCE_COMPARISON",
      "comparisonCount":len(results),"comparisons":results,
      "largestAbsoluteDifferenceSeconds":max(v["absoluteDifferenceSeconds"] for v in results),
      "scientificApproval":False,"muhuratRecommendationsAuthorized":False,
      "approvedClaimsForDeepSeek":[],"publicationAuthorized":False,"indexingAuthorized":False}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--grid",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    args=p.parse_args()
    result=compare(json.loads(args.grid.read_text()))
    args.out.parent.mkdir(parents=True,exist_ok=True)
    with args.out.open("x") as f:json.dump(result,f,indent=2);f.write("\n")
    for row in result["comparisons"]:print("EXACT SWISS SIDEREAL ROOT",row)
    print("MAX EXACT DIFFERENCE SECONDS",result["largestAbsoluteDifferenceSeconds"])
if __name__=="__main__":main()
