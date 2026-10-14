"""Single versioned, auditable research city catalogue. Never auto-approve.

The eight baseline cities remain PILOT_CITIES for fixed scientific QA fixtures.
RESEARCH_CITIES is data-driven and may be enlarged by adding vetted research
metadata to one JSON file, without editing astronomical algorithms.
"""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path
from types import MappingProxyType
from zoneinfo import ZoneInfo

DEFAULT_CATALOG = Path(__file__).resolve().parents[1] / "catalog" / "cities.v1.json"
SLUG = re.compile(r"^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$")
VALID_COHORTS = frozenset({"pilot", "expansion", "staged"})

@dataclass(frozen=True)
class City:
    id: str
    name: str
    latitude: float
    longitude: float
    elevation_m: float
    timezone: str = "Asia/Kolkata"
    coordinates_verified: bool = False
    coordinate_source: str = "approximate-city-centre-research-only"
    catalog_version: str = "pilot-unverified-v1"
    cohort: str = "pilot"
    research_enabled: bool = True
    publishing_approved: bool = False

    def __post_init__(self):
        if not isinstance(self.id, str) or not SLUG.fullmatch(self.id):
            raise ValueError("City id must be a safe canonical ASCII slug")
        if (not isinstance(self.name, str) or not self.name.strip()
            or not isinstance(self.latitude, (int, float))
            or not isinstance(self.longitude, (int, float))
            or not isinstance(self.elevation_m, (int, float))
            or isinstance(self.latitude, bool)
            or isinstance(self.longitude, bool)):
            raise ValueError("Missing or invalid city coordinates/name")
        if not 6 <= self.latitude <= 37.5 or not 68 <= self.longitude <= 98:
            raise ValueError("Research catalogue only supports located Indian cities")
        if not -450 <= self.elevation_m <= 9000:
            raise ValueError("Implausible or missing city elevation")
        ZoneInfo(self.timezone)
        if self.cohort not in VALID_COHORTS:
            raise ValueError("Invalid city research cohort")
        if self.publishing_approved or self.coordinates_verified:
            raise ValueError("Research catalogue cannot self-approve coordinates or SEO")
        if not isinstance(self.coordinate_source, str) or not self.coordinate_source.strip():
            raise ValueError("Research city must state coordinate source or uncertainty")
        if "unverified" not in self.catalog_version:
            raise ValueError("Research-only catalog version must retain unverified status")


def load_catalog(path: Path = DEFAULT_CATALOG) -> tuple[dict[str, City], str]:
    original = path.read_bytes()
    content = json.loads(original)
    if (not isinstance(content, dict) or content.get("schemaVersion") != 1
        or content.get("country") != "IN"):
        raise ValueError("Unrecognized city catalogue schema or country")
    version = content.get("catalogVersion")
    if not isinstance(version, str) or "unverified" not in version:
        raise ValueError("Unverified catalogue provenance required")
    rows = content.get("cities")
    if not isinstance(rows, list) or not rows or len(rows) > 25000:
        raise ValueError("Empty/oversized city registry")
    result = {}
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("Invalid city object")
        required = ("id","name","latitude","longitude","elevationMeters","timezone",
                    "countryCode","researchEnabled","cohort","coordinatesVerified",
                    "coordinateSource","sourceReviewedBy","publishingApproved")
        if set(row) != set(required) or row["countryCode"] != "IN":
            raise ValueError("Missing/unexpected research city fields or country")
        if (type(row["researchEnabled"]) is not bool
            or type(row["coordinatesVerified"]) is not bool
            or type(row["publishingApproved"]) is not bool
            or row["sourceReviewedBy"] is not None):
            raise ValueError("Research city cannot invent verified source/approval")
        city = City(
            id=row["id"],name=row["name"],latitude=row["latitude"],
            longitude=row["longitude"],elevation_m=row["elevationMeters"],
            timezone=row["timezone"],coordinates_verified=row["coordinatesVerified"],
            coordinate_source=row["coordinateSource"],catalog_version=version,
            cohort=row["cohort"],research_enabled=row["researchEnabled"],
            publishing_approved=row["publishingApproved"],
        )
        if city.id in result:
            raise ValueError("Duplicate city id")
        result[city.id] = city
    pilots = {k for k,v in result.items() if v.cohort == "pilot"}
    if pilots != {"delhi","mumbai","kolkata","chennai","bengaluru",
                  "ahmedabad","pune","varanasi"}:
        raise ValueError("The eight immutable pilot baselines must remain present")
    if any(not result[k].research_enabled for k in pilots):
        raise ValueError("Baseline scientific QA cities cannot be disabled")
    return result, hashlib.sha256(original).hexdigest()

CITY_REGISTRY, CATALOG_SHA256 = load_catalog()
PILOT_CITIES = MappingProxyType({k:v for k,v in CITY_REGISTRY.items() if v.cohort=="pilot"})
RESEARCH_CITIES = MappingProxyType({k:v for k,v in CITY_REGISTRY.items() if v.research_enabled})
