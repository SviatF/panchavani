"""Deterministic, fail-closed city workload assignment for autonomous research.

The same city selection/shard is shared across Tithi/Karana and Sidereal
candidate generators. Pure planning never initiates publication.
"""
from __future__ import annotations
import argparse
import json
from hashlib import sha256
from pathlib import Path
from .cities import RESEARCH_CITIES, PILOT_CITIES, CATALOG_SHA256

def select_city_ids(*, requested: tuple[str,...]|None=None, cohort: str="all",
                    shard_index: int=0, shard_count: int=1,
                    research_cities=None) -> tuple[str,...]:
    catalog = research_cities if research_cities is not None else RESEARCH_CITIES
    if not isinstance(shard_index,int) or not isinstance(shard_count,int) or (
        shard_count < 1 or shard_count > 128 or not 0 <= shard_index < shard_count
    ):
        raise ValueError("Shard count 1..128 and zero-based index within range required")
    if cohort not in ("all","pilot","expansion"):
        raise ValueError("Unknown city cohort")
    eligible = {
        cid for cid,city in catalog.items()
        if city.research_enabled and (cohort=="all" or city.cohort==cohort)
    }
    if requested is not None:
        if not requested or len(set(requested))!=len(requested):
            raise ValueError("Empty or repeated city selection")
        if set(requested)-eligible:
            raise ValueError("Requested city is unknown, inactive or in another cohort")
        eligible = set(requested)
    if not eligible:
        raise ValueError("No eligible city records; cannot run empty research shard")
    # Keyed by CITY slug, not list position: addition of new cities does not
    # relocate all pre-existing city jobs to different shards.
    # First-order distribution is deterministic and stable across machines.
    ids = tuple(sorted(cid for cid in eligible if (
        int(sha256(cid.encode("ascii")).hexdigest(),16) % shard_count == shard_index
    )))
    if not ids:
        raise ValueError("Shard contains no active cities; choose fewer shards")
    return ids

def describe_research_plan(*, requested=None, cohort="all", shard_index=0,
                           shard_count=1, days=2) -> dict:
    if type(days) is not int or not 1<=days<=7:
        raise ValueError("Research days must be 1..7")
    ids=select_city_ids(requested=requested,cohort=cohort,
                        shard_index=shard_index,shard_count=shard_count)
    return {
        "status":"RESEARCH_ONLY","catalogSha256":CATALOG_SHA256,
        "catalogTotalActiveCities":len(RESEARCH_CITIES),
        "baselinePilotCities":len(PILOT_CITIES),
        "cohort":cohort,"shardIndex":shard_index,"shardCount":shard_count,
        "cityIds":list(ids),"cityCount":len(ids),"days":days,
        "expectedCityDays":len(ids)*days,
        "scientificallyApproved":False,
        "indexingAuthorized":False,"publicationAuthorized":False,
    }


def adaptive_shard_matrix(*, cohort: str="all", per_shard_limit: int=12,
                          manual_count: int|None=None, research_cities=None) -> dict:
    """Bound maximum work per shard; cover each eligible city exactly once."""
    from math import ceil
    catalog=research_cities if research_cities is not None else RESEARCH_CITIES
    eligible={k for k,c in catalog.items() if c.research_enabled and
              (cohort=="all" or c.cohort==cohort)}
    if cohort not in ("all","pilot","expansion") or not eligible:
        raise ValueError("Unknown or empty city cohort")
    if type(per_shard_limit) is not int or not 1<=per_shard_limit<=100:
        raise ValueError("Invalid city-per-shard budget")
    if len(eligible)>128*per_shard_limit:
        raise ValueError("City catalog exceeds safe 128-shard capacity")
    count=manual_count if manual_count is not None else max(1,ceil(len(eligible)/per_shard_limit))
    if type(count) is not int or not 1<=count<=128:
        raise ValueError("Invalid explicit shard count")
    while count<=128:
        groups=[]
        all_seen=set()
        for i in range(count):
            try:
                ids=select_city_ids(cohort=cohort,shard_index=i,shard_count=count,
                                    research_cities=catalog)
            except ValueError as exc:
                if "Shard contains no active cities" not in str(exc):
                    raise
                continue
            if all_seen.intersection(ids):
                raise AssertionError("Duplicate city in workload matrix")
            all_seen.update(ids)
            groups.append({"index":i,"count":count,"cityCount":len(ids)})
        if all_seen!=eligible:
            raise AssertionError("Incomplete city catalogue coverage")
        if max(g["cityCount"] for g in groups)<=per_shard_limit:
            return {"include":groups}
        if manual_count is not None:
            raise ValueError("Requested shard count exceeds per-shard city budget")
        count+=1
    raise ValueError("Unable to fit city workloads within safe shard budget")

def main():
    p=argparse.ArgumentParser(description="Plan city batches; research-only; no publish")
    p.add_argument("--cohort",default="all",choices=("all","pilot","expansion"))
    p.add_argument("--shard-index",type=int,default=0)
    p.add_argument("--shard-count",type=int,default=1)
    p.add_argument("--days",type=int,default=2)
    p.add_argument("--out",type=Path)
    a=p.parse_args()
    plan=describe_research_plan(cohort=a.cohort,shard_index=a.shard_index,
                                shard_count=a.shard_count,days=a.days)
    if a.out:
        if a.out.exists():
            raise ValueError("Refusing to overwrite research plan")
        a.out.parent.mkdir(parents=True,exist_ok=True)
        a.out.write_text(json.dumps(plan,indent=2)+"\n")
    print(json.dumps(plan,indent=2))

if __name__=="__main__":
    main()
