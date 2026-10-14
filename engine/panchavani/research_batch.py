"""Scheduled autonomous astronomy research: strictly UNAPPROVED candidate archive.

Runs in GitHub Actions, requires NASA/JPL checksum-pinned ephemeris, never
writes to the website, sitemap, public D1/R2 or an approval endpoint.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from .cities import RESEARCH_CITIES, CATALOG_SHA256
from .astronomy import SkyfieldAdapter
from .city_shards import select_city_ids
from .compute import calculate_with_verified_context, digest
from .periods import karana_title
from .release_gate import EditorialEvidence, release_blockers

JPL_DE440S_SHA = "c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2"
REQUIRED_TYPES = {"tithi", "karana", "rahu-kalam", "yamaganda", "gulika"}


def inspect_candidate(record: dict) -> list[str]:
    """Pure sanity checks; passing is NOT independent scientific validation."""
    issues = []
    validation = record.get("validation") or {}
    if (record.get("status") != "calculated" or record.get("approvedBy") is not None or
        record.get("releaseId") is not None or validation.get("blockerCount", 0) < 1):
        issues.append("unsafe-research-status")
    events = record.get("transitions") or []
    if not REQUIRED_TYPES.issubset({e.get("type") for e in events}):
        issues.append("missing-required-research-events")
    if record.get("panchangAtSunrise", {}).get("nakshatra") is not None:
        issues.append("unvalidated-nakshatra")
    if record.get("panchangAtSunrise", {}).get("yoga") is not None:
        issues.append("unvalidated-yoga")
    karanas = [e for e in events if e.get("type") == "karana"]
    tithis = [e for e in events if e.get("type") == "tithi"]
    if not karanas or not tithis or not all(
        k.get("value") in {karana_title(n) for n in range(1, 61)} for k in karanas
    ):
        issues.append("invalid-karana")
    if karanas and record.get("panchangAtSunrise", {}).get("karana") != karanas[0]["value"]:
        issues.append("karana-at-sunrise-mismatch")
    for layer in ("tithi", "karana"):
        ordered = [e for e in events if e.get("type") == layer]
        if not ordered or any(a["endUtc"] != b["startUtc"] for a, b in zip(ordered, ordered[1:])):
            issues.append("noncontiguous-" + layer)
    if "unverified" not in record.get("city", {}).get("catalogVersion", ""):
        issues.append("unexpected-verified-city")
    if record.get("methodology", {}).get("ayanamsa") != "NOT_VALIDATED":
        issues.append("unexpected-sidereal-approval")
    return issues


def run_batch(ephemeris: Path, output_dir: Path, start: date, days: int = 2, *,
              requested: tuple[str,...]|None=None, cohort: str="all",
              shard_index: int=0, shard_count: int=1) -> dict:
    if days < 1 or days > 7:
        raise ValueError("Autonomous horizon must be 1..7 days")
    if output_dir.exists() and any(output_dir.rglob("*")):
        raise ValueError("Refusing to overwrite existing research artifact directory")
    ids = select_city_ids(requested=requested, cohort=cohort,
                          shard_index=shard_index, shard_count=shard_count)
    if digest(ephemeris) != JPL_DE440S_SHA:
        raise ValueError("Pinned JPL ephemeris checksum mismatch")
    # Pin source integrity and load JPL once per SHARD, not once per city-day.
    adapter = SkyfieldAdapter(ephemeris)
    output_dir.mkdir(parents=True, exist_ok=True)
    candidates = []
    for day_offset in range(days):
        local_date = start + timedelta(days=day_offset)
        date_candidates = []
        for city_id in ids:
            record = calculate_with_verified_context(city_id, local_date, adapter, JPL_DE440S_SHA)
            issues = inspect_candidate(record)
            if issues:
                raise ValueError(f"{city_id}/{local_date}: {issues}; full batch BLOCKED")
            date_candidates.append(record)
            # An autonomous calculator may NEVER turn its own output into an
            # indexable page. Apply the identical strict editorial release gate.
            empty_review = EditorialEvidence("", "", (), (), "")
            seo_blockers = release_blockers(
                record, empty_review, tuple(c.name for c in RESEARCH_CITIES.values()))
            if not seo_blockers:
                raise AssertionError("Research candidate bypassed SEO approval gate")
            body = (json.dumps(record, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()
            destination = output_dir / f"{local_date.isoformat()}-{city_id}-UNAPPROVED.json"
            destination.write_bytes(body)
            candidates.append({
                "city": city_id,
                "date": local_date.isoformat(),
                "status": "UNAPPROVED",
                "sha256": hashlib.sha256(body).hexdigest(),
                "file": destination.name,
                "sunriseUtc": record["sun"]["sunriseUtc"],
                "sunsetUtc": record["sun"]["sunsetUtc"],
                "publicationBlockers": record["validation"]["blockerCount"],
                "seoGateBlockers": seo_blockers
            })
        # If multiple city-specific solar values were accidentally duplicated
        # it is a critical location-engine regression, never a "SEO optimization".
        if len({(x["sun"]["sunriseUtc"], x["sun"]["sunsetUtc"])
                for x in date_candidates}) != len(date_candidates):
            raise ValueError(f"Duplicated location-specific solar data: {local_date}")
    report = {
        "reportVersion": "1",
        "generatedAtUtc": datetime.now(ZoneInfo("UTC")).isoformat(),
        "firstLocalDate": start.isoformat(),
        "days": days,
        "cityCount": len(ids),
        "cityIds": list(ids),
        "activeCatalogCityCount": len(RESEARCH_CITIES),
        "catalogSha256": CATALOG_SHA256,
        "shardIndex": shard_index, "shardCount": shard_count,
        "cohort": cohort,
        "candidates": candidates,
        "researchOnly": True,
        "publicReleaseAllowed": False,
        "indexableCityPagesCreated": 0,
        "independentScientificValidation": "NOT_COMPLETED",
        "unverifiedLimbs": ["nakshatra", "yoga"],
        "unreviewedAreas": ["regional_festivals", "wedding_muhurat", "vehicle_purchase",
                            "griha_pravesh", "city_catalogue"]
    }
    (output_dir / "research-report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate nightly research candidates only; NEVER publish")
    parser.add_argument("--ephemeris", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--start", type=date.fromisoformat,
                        default=datetime.now(ZoneInfo("Asia/Kolkata")).date())
    parser.add_argument("--days", type=int, default=2)
    parser.add_argument("--cohort", choices=("all","pilot","expansion"),default="all")
    parser.add_argument("--shard-index",type=int,default=0)
    parser.add_argument("--shard-count",type=int,default=1)
    args = parser.parse_args()
    report = run_batch(args.ephemeris, args.out, args.start, args.days,
                       cohort=args.cohort,shard_index=args.shard_index,
                       shard_count=args.shard_count)
    print("PRIVATE RESEARCH ONLY:", len(report["candidates"]),
          "location/date candidates; indexable pages:", report["indexableCityPagesCreated"])
    print("Methodology unapproved; no data may be copied into public site.")


if __name__ == "__main__":
    main()
