"""Eight-city sidereal research batch using a single pinned JPL ephemeris instance.

No indexable pages, no live publication; 27-part Nakshatra/Yoga using a
provisional IAE Lahiri-1956 anchor. City-day attribution uses actual
city-specific local sunrise, not arbitrary timezone/day overrides.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo
from .astronomy import SkyfieldAdapter
from .cities import RESEARCH_CITIES, CATALOG_SHA256
from .city_shards import select_city_ids
from .compute import digest
from .core import phase_intervals
from .research_batch import JPL_DE440S_SHA
from .sidereal import (
    LahiriEpochAnchorResearch, NAKSHATRA_NAMES, YOGA_NAMES, PART_WIDTH
)

def compute_for_city_day(adapter, model, city, local_day: date) -> dict:
    sunrise,sunset,next_sunrise=adapter.solar_day(city,local_day)
    nak=phase_intervals(model.nakshatra_phase,sunrise,next_sunrise,PART_WIDTH)
    yoga=phase_intervals(model.yoga_phase,sunrise,next_sunrise,PART_WIDTH)
    def encode(layer,names):
        return [
            {"number":seg.number,"name":names[seg.number-1],
             "startUtc":seg.start.isoformat(),"endUtc":seg.end.isoformat()}
            for seg in layer
        ]
    return {
        "cityId":city.id,"date":local_day.isoformat(),"timezone":city.timezone,
        "cityCoordinatesVerified":city.coordinates_verified,
        "method":model.METHOD_ID,"status":"UNAPPROVED",
        "publicReleaseAllowed":False,"independentScientificValidation":"NOT_COMPLETED",
        "sunriseUtc":sunrise.isoformat(),"nextSunriseUtc":next_sunrise.isoformat(),
        "ayanamsaAtSunrise":model.ayanamsa(sunrise),
        "nakshatraAtSunrise":NAKSHATRA_NAMES[nak[0].number-1],
        "yogaAtSunrise":YOGA_NAMES[yoga[0].number-1],
        "nakshatra":encode(nak,NAKSHATRA_NAMES),
        "yoga":encode(yoga,YOGA_NAMES),
        "blockers":["IAE-Lahiri-model-unverified","city-coordinates-unverified",
                    "independent-method-comparison-required","ritual-rules-unverified",
                    "editorial-SEO-review-required"]
    }

def ensure_cross_city_consistency(records: list[dict]) -> None:
    """Same geocentric event must have identical absolute UTC crossing time.

    A boundary may appear in several city-day windows. Check only when the
    *same* astronomical event (kind, number, calendar date of event UTC)
    occurs in more than one city's report.
    """
    seen={}
    for record in records:
        for kind in ('nakshatra','yoga'):
            for seg in record[kind][:-1]:
                # endUtc is a real angular crossing, not a clipped interval end.
                key=(kind,seg['number'],seg['endUtc'][:10])
                boundary=datetime.fromisoformat(seg['endUtc'])
                prior=seen.get(key)
                if prior is not None and abs((prior-boundary).total_seconds())>1:
                    raise ValueError("Geocentric boundary differs between cities: "+str(key))
                seen[key]=boundary

def run_sidereal_batch(ephemeris: Path, out: Path, start: date, days: int=2, *,
                       requested: tuple[str,...]|None=None,cohort: str="all",
                       shard_index: int=0,shard_count: int=1) -> dict:
    if not 1 <= days <= 7:
        raise ValueError("Allowed research window is 1..7 local days")
    if out.exists() and any(out.iterdir()):
        raise ValueError("Refusing to overwrite existing sidereal research files")
    if digest(ephemeris)!=JPL_DE440S_SHA:
        raise ValueError("Pinned JPL SHA-256 mismatch")
    ids=select_city_ids(requested=requested,cohort=cohort,
                        shard_index=shard_index,shard_count=shard_count)
    adapter=SkyfieldAdapter(ephemeris)
    model=LahiriEpochAnchorResearch(adapter)
    out.mkdir(parents=True,exist_ok=True)
    results=[]
    for offset in range(days):
        day=start+timedelta(days=offset)
        for cid in ids:
            record=compute_for_city_day(adapter,model,RESEARCH_CITIES[cid],day)
            if record['publicReleaseAllowed'] or not record['blockers']:
                raise AssertionError("Sidereal research accidentally approved")
            results.append(record)
    ensure_cross_city_consistency(results)
    index=[]
    for record in results:
        raw=(json.dumps(record,sort_keys=True,indent=2)+"\n").encode()
        filename=f"{record['date']}-{record['cityId']}-sidereal-UNAPPROVED.json"
        (out/filename).write_bytes(raw)
        index.append({"city":record['cityId'],"date":record['date'],"file":filename,
                      "sha256":hashlib.sha256(raw).hexdigest(),
                      "blocked":True})
    report={
        "status":"RESEARCH_ONLY","method":model.METHOD_ID,
        "jplSha256":JPL_DE440S_SHA,
        "cityCount":len(ids),"cityIds":list(ids),
        "activeCatalogCityCount":len(RESEARCH_CITIES),
        "catalogSha256":CATALOG_SHA256,
        "shardIndex":shard_index,"shardCount":shard_count,"cohort":cohort,
        "days":days,"candidates":index,
        "publicReleaseAllowed":False,"independentScientificValidation":"NOT_COMPLETED",
        "createdAtUtc":datetime.now(timezone.utc).isoformat(),
        "crossCityGeocentricConsistency":"PASSED",
    }
    (out/"index-UNAPPROVED.json").write_text(json.dumps(report,indent=2)+"\n")
    return report

def main():
    p=argparse.ArgumentParser(description="Research sidereal city/day batch; no publication")
    p.add_argument('--ephemeris',required=True,type=Path)
    p.add_argument('--out',required=True,type=Path)
    p.add_argument('--start',type=date.fromisoformat,
                   default=datetime.now(ZoneInfo("Asia/Kolkata")).date())
    p.add_argument('--days',type=int,default=2)
    p.add_argument("--cohort",choices=("all","pilot","expansion"),default="all")
    p.add_argument("--shard-index",type=int,default=0)
    p.add_argument("--shard-count",type=int,default=1)
    a=p.parse_args()
    result=run_sidereal_batch(a.ephemeris,a.out,a.start,a.days,
                              cohort=a.cohort,shard_index=a.shard_index,
                              shard_count=a.shard_count)
    print("UNAPPROVED sidereal candidates:",len(result['candidates']))
    print("Geocentric integrity:",result['crossCityGeocentricConsistency'])
    print("Public releases allowed:",result['publicReleaseAllowed'])

if __name__=='__main__':main()
