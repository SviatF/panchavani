"""Independent Swiss Ephemeris crosschecks for all four Panchang phase layers.

Tithi and Karana are tropical Sun/Moon geocentric elongation, so their
root times do not depend on sidereal ayanamsha. Nakshatra/Yoga use Swiss'
SIDM_LAHIRI and separate Swiss kernels. Even excellent timing agreement
does NOT independently certify the chosen publisher convention or city
sunrise, or authorize a factual public Panchang record.
"""
from __future__ import annotations
import argparse
import json
import os
from datetime import datetime,timedelta,timezone
from pathlib import Path
from .first_six_limb_pilot import KINDS,TEN_CITY_IDS,verify_batch
from .swiss_exact_phase_roots import utc,solve as solve_sidereal,signed_phase_error

WIDTH={"tithi":12.0,"karana":6.0,"nakshatra":360/27,"yoga":360/27}
REQUIRED_EPH=("sepl_18.se1","semo_18.se1")

def as_utc(value):
    if isinstance(value,datetime):
        if value.utcoffset() is None:
            raise ValueError("Offset-aware datetime required")
        return value.astimezone(timezone.utc)
    return utc(value)

def tropical_phase(swe,instant,kind):
    if kind not in ("tithi","karana"):
        raise ValueError("Swiss tropical elongation is only for Tithi and Karana")
    t=as_utc(instant)
    h=t.hour+t.minute/60+t.second/3600+t.microsecond/3.6e9
    jd=swe.julday(t.year,t.month,t.day,h)
    flags=swe.FLG_SWIEPH
    moon,moonflags=swe.calc_ut(jd,swe.MOON,flags)
    sun,sunflags=swe.calc_ut(jd,swe.SUN,flags)
    if not (moonflags & swe.FLG_SWIEPH) or not (sunflags & swe.FLG_SWIEPH) or (
       moonflags & swe.FLG_MOSEPH) or (sunflags & swe.FLG_MOSEPH):
        raise ValueError("Swiss solar/lunar ephemerides cannot silently fall back to Moshier")
    return (moon[0]-sun[0])%360

def solve_tropical(swe,approx,kind,ending_number):
    if kind not in ("tithi","karana"):raise ValueError("Unsupported tropical root")
    width=WIDTH[kind]
    maximum=int(round(360/width))
    if type(ending_number) is not int or not 1<=ending_number<=maximum:
        raise ValueError("Invalid lunar phase ending number")
    target=(ending_number%maximum)*width
    lo,hi=as_utc(approx)-timedelta(hours=2),as_utc(approx)+timedelta(hours=2)
    f=lambda timestamp:signed_phase_error(tropical_phase(swe,timestamp,kind),target)
    left,right=f(lo),f(hi)
    if not(-10<left<0<right<10):
        raise ValueError("Independent tropical phase root not bracketed by JPL research")
    for _ in range(75):
        if (hi-lo).total_seconds()<=0.125:break
        mid=lo+(hi-lo)/2
        if f(mid)>=0:hi=mid
        else:lo=mid
    final=lo+(hi-lo)/2
    if abs(f(final))*3600>3:
        raise ValueError("Swiss tropical phase root angular residual too high")
    return final

def compare_batch(batch,scope="delhi",swe=None):
    if (not isinstance(batch,dict) or
       batch.get("artifactType")!="PANCHAVANI_TEN_CITY_SIX_LIMB_RESEARCH_BATCH" or
       batch.get("scientificApproval") is not False or
       batch.get("publicationAuthorized") is not False or
       batch.get("indexingAuthorized") is not False or
       batch.get("approvedClaimsForDeepSeek")!=[] or
       batch.get("cityCount")!=10):
        raise ValueError("Input must be unapproved ten-city JPL research")
    qa=verify_batch(batch["records"],TEN_CITY_IDS)
    if scope not in ("delhi","ten"):raise ValueError("Unsupported independent Swiss scope")
    ids={"delhi"} if scope=="delhi" else set(TEN_CITY_IDS)
    ephe_path=os.environ.get("PANCHAVANI_SWISS_EPHE_PATH")
    if (not ephe_path or not all(
       (Path(ephe_path)/x).is_file() and (Path(ephe_path)/x).stat().st_size>100000
       for x in REQUIRED_EPH)):
        raise ValueError("Verified Swiss planetary and lunar ephemeris files required")
    if swe is None:
        import swisseph as swe
    swe.set_ephe_path(ephe_path)
    swe.set_sid_mode(swe.SIDM_LAHIRI,0,0)
    results=[]
    for packet in batch["records"]:
        city=packet["cityId"]
        if city not in ids:continue
        for kind in KINDS:
            for segment in packet["transitions"][kind][:-1]:
                approx=utc(segment["endUtc"])
                number=segment["number"]
                exact=(solve_tropical(swe,approx,kind,number)
                    if kind in ("tithi","karana") else
                    solve_sidereal(swe,approx,kind,number))
                delta=(exact-approx).total_seconds()
                results.append({
                  "cityId":city,"localDate":packet["localDate"],
                  "kind":kind,"endingNumber":number,
                  "jplTransitionUtc":approx.isoformat(),
                  "swissTransitionUtc":exact.isoformat(),
                  "signedSwissMinusJplSeconds":round(delta,6),
                  "absoluteDifferenceSeconds":round(abs(delta),6),
                  "swissCalculationMode":"SWISS_TROPICAL_GEOCENTRIC_ELONGATION"
                      if kind in ("tithi","karana") else
                      "SWISS_SIDEREAL_LAHIRI",
                  "scientificApproval":False})
    if not results:raise ValueError("No testable lunar phase roots")
    per_kind={k:[x["absoluteDifferenceSeconds"] for x in results if x["kind"]==k]
              for k in KINDS}
    if not all(per_kind.values()):
        raise ValueError("Independent phase observations incomplete: all 4 limbs required")
    return {
      "artifactType":"PANCHAVANI_SWISS_ALL_FOUR_LIMB_RESEARCH_QA",
      "status":"UNAPPROVED_COMPARISON",
      "checkedCityIds":sorted(ids),
      "checkedCityDays":2*len(ids),
      "sourceDayFrom":qa["localDateFrom"],
      "comparisonCount":len(results),
      "byKind":{k:{"comparisons":len(v),"maxAbsoluteDifferenceSeconds":max(v)}
                for k,v in per_kind.items()},
      "maxAbsoluteDifferenceSeconds":max(x["absoluteDifferenceSeconds"] for x in results),
      "comparisons":results,
      "backend":"SWISS_EPHEMERIS_ONLY_NO_MOSHIER_FALLBACK",
      "independentLahiriConventionCertified":False,
      "observerSunriseMethodCertified":False,
      "sourceCoordinatesVerified":False,
      "scientificApproval":False,"publicationAuthorized":False,
      "indexingAuthorized":False,"approvedClaimsForDeepSeek":[]}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--batch",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    p.add_argument("--cities",choices=("delhi","ten"),default="delhi")
    args=p.parse_args()
    data=compare_batch(json.loads(args.batch.read_text()),scope=args.cities)
    if args.out.exists():raise ValueError("Refuse overwriting previous independent QA")
    args.out.parent.mkdir(parents=True,exist_ok=True)
    with args.out.open("x",encoding="utf-8") as f:
        json.dump(data,f,indent=2,ensure_ascii=False);f.write("\n")
    print("SWISS INDEPENDENT FOUR-LIMB QA:",data["byKind"])
    print("MAX ABSOLUTE DIFFERENCE SECONDS:",data["maxAbsoluteDifferenceSeconds"])
    print("AUTHORIZED PUBLICATION:",data["publicationAuthorized"])
if __name__=="__main__":main()
