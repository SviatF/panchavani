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

from .cities import PILOT_CITIES
from .compute import calculate
from .periods import karana_title

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
    if not record.get("city", {}).get("catalogVersion", "").startswith("pilot-unverified"):
        issues.append("unexpected-verified-city")
    if record.get("methodology", {}).get("ayanamsa") != "NOT_VALIDATED":
        issues.append("unexpected-sidereal-approval")
    return issues


def run_batch(ephemeris: Path, output_dir: Path, start: date, days: int = 2) -> dict:
    if days < 1 or days > 7:
        raise ValueError("Autonomous horizon must be 1..7 days")
    if output_dir.exists() and any(output_dir.rglob("*")):
        raise ValueError("Refusing to overwrite existing research artifact directory")
    output_dir.mkdir(parents=True, exist_ok=True)
    candidates = []
    for day_offset in range(days):
        local_date = start + timedelta(days=day_offset)
        date_candidates = []
        for city_id in sorted(PILOT_CITIES):
            record = calculate(city_id, local_date, ephemeris, JPL_DE440S_SHA)
            issues = inspect_candidate(record)
            if issues:
                raise ValueError(f"{city_id}/{local_date}: {issues}; full batch BLOCKED")
            date_candidates.append(record)
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
                "publicationBlockers": record["validation"]["blockerCount"]
            })
        # If all eight city-specific solar values were accidentally duplicated
        # it is a critical location-engine regression, never a "SEO optimization".
        if len({(x["sun"]["sunriseUtc"], x["sun"]["sunsetUtc"])
                for x in date_candidates}) != len(date_candidates):
            raise ValueError(f"Duplicated location-specific solar data: {local_date}")
    report = {
        "reportVersion": "1",
        "generatedAtUtc": datetime.now(ZoneInfo("UTC")).isoformat(),
        "firstLocalDate": start.isoformat(),
        "days": days,
        "cityCount": len(PILOT_CITIES),
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
    args = parser.parse_args()
    report = run_batch(args.ephemeris, args.out, args.start, args.days)
    print("PRIVATE RESEARCH ONLY:", len(report["candidates"]),
          "location/date candidates; indexable pages:", report["indexableCityPagesCreated"])
    print("Methodology unapproved; no data may be copied into public site.")


if __name__ == "__main__":
    main()
