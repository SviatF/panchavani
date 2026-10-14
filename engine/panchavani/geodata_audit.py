"""External GeoNames India gazetteer cross-check for PANCHAVANI research cities.

Checks whether approximate city coordinates resemble a real populated-place
gazetteer entry. This is NOT survey-grade location verification, and it is
NOT verification of observing-station elevation, local horizon or refraction.

Source: https://download.geonames.org/export/dump/IN.zip
GeoNames dump: CC BY 4.0 (check current provider terms before reuse).
Never writes to the city registry, Cloudflare or public site.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import math
import re
import unicodedata
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from .cities import RESEARCH_CITIES, CATALOG_SHA256

SOURCE_URL = "https://download.geonames.org/export/dump/IN.zip"
# Place names are not unique. Aliases are for identifying candidates in the
# GAZETTEER, never for supplying missing coordinates or silently changing sites.
ALIASES = {
    "bengaluru": ("bangalore",),
    "prayagraj": ("allahabad",),
    "kochi": ("cochin",),
    "varanasi": ("benares", "banaras"),
    "bhubaneswar": ("bhubaneshwar",),
    "nashik": ("nasik",),
    "guwahati": ("gauhati",),
    "ayodhya": ("faizabad",),  # nearby administrative city; treat as AMBIGUOUS alias
}
REVIEW_DISTANCE_KM = 10.0
MATCH_MAX_DISTANCE_KM = 50.0


def normalize_name(value: str) -> str:
    if not isinstance(value, str):
        return ""
    value = unicodedata.normalize("NFKD", value.casefold())
    value = "".join(x for x in value if not unicodedata.combining(x))
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def km_between(a_lat: float, a_lon: float, b_lat: float, b_lon: float) -> float:
    r1, r2 = math.radians(a_lat), math.radians(b_lat)
    d1, d2 = math.radians(b_lat - a_lat), math.radians(b_lon - a_lon)
    hav = math.sin(d1/2)**2 + math.cos(r1)*math.cos(r2)*math.sin(d2/2)**2
    return 6371.0088 * 2 * math.asin(min(1, math.sqrt(hav)))


def _read_record(line: str):
    """GeoNames main dump (not postal-code dump), official field order."""
    parts = line.rstrip("\n").split("\t")
    if len(parts) < 19 or parts[8] != "IN" or parts[6] != "P":
        return None
    try:
        lat, lon = float(parts[4]), float(parts[5])
        if not (6 <= lat <= 37.5 and 68 <= lon <= 98):
            return None
        population = int(parts[14]) if parts[14] else 0
        elev = int(parts[15]) if parts[15] else None
        geoname_id = int(parts[0])
    except (ValueError, TypeError):
        return None
    return {
        "geonameId": geoname_id,
        "primaryName": parts[1],
        "asciiName": parts[2],
        "alternateNames": parts[3],
        "latitude": lat, "longitude": lon,
        "featureCode": parts[7],
        "admin1Code": parts[10],
        "population": population,
        "gazetteerElevationMeters": elev,
        "timezone": parts[17],
        "recordModifiedOn": parts[18],
    }


def candidates_for_cities(lines: io.TextIOBase, cities=None):
    catalog = cities if cities is not None else RESEARCH_CITIES
    targets = {
        cid: {normalize_name(v) for v in (city.name, cid.replace("-", " "),
                                          *ALIASES.get(cid, ()))}
        for cid, city in catalog.items()
    }
    indexes = defaultdict(set)
    for cid, names in targets.items():
        for name in names:
            indexes[name].add(cid)
    found = defaultdict(list)
    populated_places_seen = 0
    for line in lines:
        row = _read_record(line)
        if row is None:
            continue
        populated_places_seen += 1
        # Avoid exploding alternative aliases for unneeded cities.
        names = {normalize_name(row["primaryName"]), normalize_name(row["asciiName"])}
        for alias in row["alternateNames"].split(","):
            if alias:
                names.add(normalize_name(alias))
        related_ids = set()
        for name in names.intersection(indexes):
            related_ids.update(indexes[name])
        for cid in related_ids:
            city = catalog[cid]
            distance = km_between(city.latitude, city.longitude,
                                  row["latitude"], row["longitude"])
            if distance <= MATCH_MAX_DISTANCE_KM:
                found[cid].append({
                    **{k: v for k,v in row.items() if k != "alternateNames"},
                    "distanceFromResearchCityKm": round(distance, 4),
                    "matchedByPrimaryName": normalize_name(row["primaryName"]) ==
                                             normalize_name(city.name),
                    "reviewNeeds": ["gazetteer-is-not-observatory",
                                    "site-elevation-and-horizon-not-proven"],
                })
    return found, populated_places_seen


def geodata_research_report(zip_bytes: bytes, cities=None) -> dict:
    catalog = cities if cities is not None else RESEARCH_CITIES
    if not zip_bytes.startswith(b"PK"):
        raise ValueError("GeoNames gazetteer is not a ZIP archive")
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as archive:
        if "IN.txt" not in archive.namelist():
            raise ValueError("Expected GeoNames IN.txt, not an unrelated ZIP or postal dump")
        meta = archive.getinfo("IN.txt")
        if meta.file_size > 220 * 1024 * 1024:
            raise ValueError("Unsafe oversized GeoNames country extract")
        with archive.open("IN.txt") as file:
            stream = io.TextIOWrapper(file, encoding="utf-8",errors="strict")
            found, populated = candidates_for_cities(stream,catalog)
    if populated == 0:
        raise ValueError("Invalid GeoNames India file: no populated places found")
    cities_out = []
    for cid, city in sorted(catalog.items()):
        entries=sorted(found.get(cid, []),
                       key=lambda r:(r["distanceFromResearchCityKm"],
                                     not r["matchedByPrimaryName"],
                                     -r["population"]))
        best=entries[0] if entries else None
        # No assertion of city coordinate identity: nearest matching point
        # may represent a subdivision or nearby administrative centre.
        status = ("NO_POPULATED_PLACE_MATCH" if best is None else
                  "GAZETTEER_DIFFERENCE_NEEDS_REVIEW"
                  if best["distanceFromResearchCityKm"] > REVIEW_DISTANCE_KM
                  else "PROVISIONAL_GAZETTEER_MATCH")
        cities_out.append({
            "cityId":cid, "cityName":city.name,
            "researchCoordinates":{"latitude":city.latitude,
                                   "longitude":city.longitude,
                                   "elevationMeters":city.elevation_m},
            "status":status,
            "nearestCandidate":best,
            "candidateCount":len(entries),
            "stationCoordinatesVerified":False,
            "stationElevationVerified":False,
            "horizonModelVerified":False,
            "readyForPanchangPublication":False,
        })
    return {
        "schemaVersion":1, "classification":"EXTERNAL_CITY_GAZETTEER_RESEARCH_ONLY",
        "sourcePublisher":"GeoNames", "sourceUrl":SOURCE_URL,
        "sourceDumpSha256":hashlib.sha256(zip_bytes).hexdigest(),
        "catalogSha256":CATALOG_SHA256 if cities is None else "SYNTHETIC_TEST_CATALOG",
        "country":"IN", "researchCityCount":len(cities_out),
        "populatedPlacesScanned":populated,
        "nearestGazetteerMatchCount":sum(x["nearestCandidate"] is not None for x in cities_out),
        "needsDistanceOrMissingMatchReview":[x["cityId"] for x in cities_out
                                            if x["status"]!="PROVISIONAL_GAZETTEER_MATCH"],
        "externalGazetteerIsNotAStationSurvey":True,
        "cityCoordinatesVerifiedCount":0,
        "publicIndexingAuthorized":False, "publicReleaseAuthorized":False,
        "scientificallyValidated":False,
        "records":cities_out,
        "remainingMandatoryReviews":[
            "human-confirm-exact-observation-point-per-city",
            "independent-station-latitude-longitude-elevation-review",
            "sunrise-horizon-refraction-convention-and-timezone-review",
            "external-reference-comparison-of-local-solar-event-times",
            "astronomy-and-editorial-signed-release-required",
        ],
    }


def main():
    p=argparse.ArgumentParser(description="Cross-check 25 cities against GeoNames India: research only")
    p.add_argument("--zip",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args()
    if a.out.exists():
        raise ValueError("Refusing to overwrite geodata evidence")
    out=geodata_research_report(a.zip.read_bytes())
    if out["researchCityCount"]!=25:
        raise ValueError("Unexpected expansion cohort count; review scale assumptions")
    a.out.parent.mkdir(parents=True,exist_ok=True)
    a.out.write_text(json.dumps(out,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print("GeoNames country gazetteer P-class rows scanned:",out["populatedPlacesScanned"])
    print("Cities with a nearby matching gazetteer populated place:",out["nearestGazetteerMatchCount"])
    print("Cities requiring distance or ambiguity review:",out["needsDistanceOrMissingMatchReview"])
    print("Station coordinates independently verified:",out["cityCoordinatesVerifiedCount"])
    print("Approved public pages:",out["publicReleaseAuthorized"])


if __name__=="__main__":
    main()
