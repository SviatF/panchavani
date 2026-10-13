"""Generate real astronomical RESEARCH CANDIDATES, never approved public pages."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import date
from pathlib import Path

from .astronomy import SkyfieldAdapter
from .cities import PILOT_CITIES
from .core import phase_intervals, tithi_title
from . import __version__


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def calculate(city_id: str, local_date: date, ephemeris: Path, expected_sha256: str) -> dict:
    if city_id not in PILOT_CITIES:
        raise ValueError("Unsupported city: " + city_id)
    if not re.fullmatch(r"[a-fA-F0-9]{64}", expected_sha256):
        raise ValueError("Expected ephemeris SHA-256 required; never silently trust downloaded files")
    actual_hash = digest(ephemeris)
    if actual_hash.lower() != expected_sha256.lower():
        raise ValueError("JPL ephemeris SHA-256 mismatch, calculation blocked")
    city = PILOT_CITIES[city_id]
    a = SkyfieldAdapter(ephemeris)
    sunrise, sunset, following = a.solar_day(city, local_date)
    tithis = phase_intervals(a.elongation, sunrise, following, 12.0)
    # These are independent astronomy-based results, but NOT a complete panchang.
    # Lahiri Ayanamsa, other limbs and ritual rules remain intentionally unfilled.
    sunrise_tithi = tithis[0].number
    return {
        "schemaVersion": "1.0.0", "recordId": f"{city_id}:{local_date.isoformat()}:{actual_hash[:12]}",
        "city": {
            "id": city.id, "name": city.name, "lat": city.latitude,
            "lon": city.longitude, "elevationMeters": city.elevation_m,
            "tz": city.timezone, "catalogVersion": "pilot-unverified-v1",
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
            "yoga": None, "karana": None, "vara": local_date.strftime("%A"),
            "paksha": "Shukla" if sunrise_tithi <= 15 else "Krishna",
        },
        "transitions": [{
            "type": "tithi", "value": tithi_title(seg.number),
            "startUtc": seg.start.isoformat().replace("+00:00", "Z"),
            "endUtc": seg.end.isoformat().replace("+00:00", "Z"),
            "ruleId": None,
        } for seg in tithis],
        "validation": {
            "blockerCount": 4, "fixturesPassed": 0, "fixturesTotal": 0,
            "referenceComparisons": [], "reviewStatus": "not-reviewed",
            "reviewer": None, "reviewedAt": None, "evidenceHash": None,
        },
        "status": "calculated", "approvedBy": None, "releaseId": None,
    }


def main() -> None:
    p = argparse.ArgumentParser(description="PANCHAVANI offline astronomy candidate generator (NOT for publication)")
    p.add_argument("--city", required=True, choices=sorted(PILOT_CITIES))
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
