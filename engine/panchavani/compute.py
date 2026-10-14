"""Generate real astronomical RESEARCH CANDIDATES, never approved public pages."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import date
from pathlib import Path

from .astronomy import SkyfieldAdapter
from .cities import RESEARCH_CITIES
from .core import phase_intervals, tithi_title
from .periods import karana_title, daylight_windows, WINDOW_LABELS
from . import __version__


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def calculate(city_id: str, local_date: date, ephemeris: Path, expected_sha256: str) -> dict:
    """Single-city API; authenticate source once then enter shared calculation."""
    if not re.fullmatch(r"[a-fA-F0-9]{64}", expected_sha256):
        raise ValueError("Expected ephemeris SHA-256 required")
    actual_hash = digest(ephemeris)
    if actual_hash.lower() != expected_sha256.lower():
        raise ValueError("JPL ephemeris SHA-256 mismatch, calculation blocked")
    return calculate_with_verified_context(city_id, local_date, SkyfieldAdapter(ephemeris), actual_hash)


def calculate_with_verified_context(city_id: str, local_date: date, a: SkyfieldAdapter,
                                    actual_hash: str) -> dict:
    """Internal batch entry: caller MUST authenticate ephemeris hash before reuse."""
    if city_id not in RESEARCH_CITIES:
        raise ValueError("Unknown or disabled research city: " + city_id)
    city = RESEARCH_CITIES[city_id]
    sunrise, sunset, following = a.solar_day(city, local_date)
    tithis = phase_intervals(a.elongation, sunrise, following, 12.0)
    karanas = phase_intervals(a.elongation, sunrise, following, 6.0)
    tithi_edges = [v.end for v in tithis[:-1]]
    half_tithi_edges = [v.end for v in karanas[:-1]]
    if any(min((abs((edge - k).total_seconds()) for k in half_tithi_edges),
               default=float("inf")) > 1.0 for edge in tithi_edges):
        raise ValueError("Tithi/Karana numerical boundary disagreement: research candidate blocked")
    windows = daylight_windows(sunrise, sunset, local_date.weekday())
    # These are independent astronomy-based results, but NOT a complete panchang.
    # Lahiri Ayanamsa, other limbs and ritual rules remain intentionally unfilled.
    sunrise_tithi = tithis[0].number
    return {
        "schemaVersion": "1.0.0", "recordId": f"{city_id}:{local_date.isoformat()}:{actual_hash[:12]}",
        "city": {
            "id": city.id, "name": city.name, "lat": city.latitude,
            "lon": city.longitude, "elevationMeters": city.elevation_m,
            "tz": city.timezone, "catalogVersion": city.catalog_version,
        },
        "localDate": local_date.isoformat(), "tradition": None,
        "methodology": {
            "engineVersion": __version__, "ephemerisId": ephemeris.name,
            "ephemerisHash": actual_hash, "ayanamsa": "NOT_VALIDATED",
            "sunriseConvention": "Skyfield Sun upper limb, geocentric horizon -50 arcmin",
            "rulePackId": "NONE", "tzdbVersion": "system-not-yet-pinned",
        },
        "sun": {
            "sunriseUtc": sunrise.isoformat().replace("+00:00", "Z"),
            "sunsetUtc": sunset.isoformat().replace("+00:00", "Z"),
            "nextSunriseUtc": following.isoformat().replace("+00:00", "Z"),
            "moonriseUtc": None, "moonsetUtc": None,
        },
        "panchangAtSunrise": {
            "tithi": tithi_title(sunrise_tithi), "nakshatra": None,
            "yoga": None, "karana": karana_title(karanas[0].number), "vara": local_date.strftime("%A"),
            "paksha": "Shukla" if sunrise_tithi <= 15 else "Krishna",
        },
        "transitions": [{
            "type": "tithi", "value": tithi_title(seg.number),
            "startUtc": seg.start.isoformat().replace("+00:00", "Z"),
            "endUtc": seg.end.isoformat().replace("+00:00", "Z"),
            "ruleId": None,
        } for seg in tithis] + [{
            "type": "karana", "value": karana_title(seg.number),
            "startUtc": seg.start.isoformat().replace("+00:00", "Z"),
            "endUtc": seg.end.isoformat().replace("+00:00", "Z"),
            "ruleId": "karana-geocentric-6deg-research-v1",
        } for seg in karanas] + [{
            "type": w.kind, "value": WINDOW_LABELS[w.kind],
            "startUtc": w.start.isoformat().replace("+00:00", "Z"),
            "endUtc": w.end.isoformat().replace("+00:00", "Z"),
            "ruleId": "weekday-daylight-eighths-research-v1",
        } for w in windows],
        "validation": {
            "blockerCount": 4, "fixturesPassed": 0, "fixturesTotal": 0,
            "referenceComparisons": [], "reviewStatus": "not-reviewed",
            "reviewer": None, "reviewedAt": None, "evidenceHash": None,
        },
        "status": "calculated", "approvedBy": None, "releaseId": None,
    }


def main() -> None:
    p = argparse.ArgumentParser(description="PANCHAVANI offline astronomy candidate generator (NOT for publication)")
    p.add_argument("--city", required=True, choices=sorted(RESEARCH_CITIES))
    p.add_argument("--date", required=True, type=date.fromisoformat)
    p.add_argument("--ephemeris", required=True, type=Path)
    p.add_argument("--expected-sha256", required=True)
    p.add_argument("--out", required=True, type=Path)
    args = p.parse_args()
    record = calculate(args.city, args.date, args.ephemeris, args.expected_sha256)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    if args.out.exists():
        raise SystemExit("Refusing to overwrite a candidate; use a new versioned output filename")
    args.out.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"RESEARCH CANDIDATE ONLY (4 publication blockers): {args.out}")


if __name__ == "__main__":
    main()
