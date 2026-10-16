"""PANCHAVANI Wave 5B: offline, SHA-pinned external astronomy research comparison.

Never substitutes commercial Panchang timings for independent calibration,
silently approves facts, invokes AI, or writes to the public calendar.
"""
from __future__ import annotations

import argparse
from datetime import datetime
import hashlib
import json
from pathlib import Path
import re
from zoneinfo import ZoneInfo

JPL_SHA = "c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2"
SUPPORTED = {"sunrise", "sunset", "nextSunrise", "tithiEnd", "karanaEnd"}
VERSION = "external-observation-reconciliation-v1"


def instant(value: str) -> datetime:
    if not isinstance(value, str) or not re.fullmatch(
            r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)", value):
        raise ValueError("Timezone-aware, second-precision ISO timestamp required")
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.utcoffset() is None:
        raise ValueError("Naive timestamps are forbidden")
    return dt


def candidate_event(record: dict, metric: str, label: str | None) -> datetime:
    if metric in ("sunrise", "sunset", "nextSunrise"):
        if label is not None:
            raise ValueError("Solar observations must not include a segment label")
        field = {"sunrise": "sunriseUtc", "sunset": "sunsetUtc",
                 "nextSunrise": "nextSunriseUtc"}[metric]
        return instant(record["sun"][field])
    if not isinstance(label, str) or not label.strip():
        raise ValueError("Phase-end observations must supply the exact Tithi/Karana name")
    kind = "tithi" if metric == "tithiEnd" else "karana"
    matching = [x for x in record["transitions"]
                if x["type"] == kind and x["value"] == label]
    if len(matching) != 1:
        raise ValueError("No unique matching " + metric + " research interval")
    return instant(matching[0]["endUtc"])


def compare_external_evidence(record: dict, candidate_sha256: str, fixture: dict) -> dict:
    """Measure numerical deltas. PASS means within a research threshold ONLY."""
    if not re.fullmatch(r"[a-f0-9]{64}", candidate_sha256 or ""):
        raise ValueError("Exact SHA-256 provenance is required")
    if (record.get("status") != "calculated" or record.get("approvedBy") is not None
            or record.get("releaseId") is not None
            or record.get("methodology", {}).get("ephemerisHash") != JPL_SHA
            or record.get("methodology", {}).get("ayanamsa") != "NOT_VALIDATED"
            or record.get("panchangAtSunrise", {}).get("nakshatra") is not None
            or record.get("panchangAtSunrise", {}).get("yoga") is not None
            or record.get("validation", {}).get("reviewStatus") != "not-reviewed"
            or record.get("validation", {}).get("blockerCount", 0) < 1):
        raise ValueError("Research-only JPL candidate contract required")
    city, date, zone = record["city"]["id"], record["localDate"], record["city"]["tz"]
    if (fixture.get("schemaVersion") != 1 or fixture.get("city") != city
            or fixture.get("date") != date or fixture.get("timezone") != zone
            or fixture.get("researchOnly") is not True):
        raise ValueError("Reference identity mismatch or not labelled research-only")
    timezone = ZoneInfo(zone)
    sources = fixture.get("sources")
    if not isinstance(sources, list) or not 1 <= len(sources) <= 20:
        raise ValueError("Between 1 and 20 documented sources required")
    if len({s.get("id") for s in sources if isinstance(s, dict)}) != len(sources):
        raise ValueError("Duplicate/malformed source IDs")
    results = []
    for source in sources:
        url = source.get("url", "")
        if (not isinstance(source.get("id"), str) or not source["id"]
                or not isinstance(url, str) or not url.startswith("https://")
                or not isinstance(source.get("publisher"), str) or not source["publisher"]
                or source.get("methodologyComparable") is not False
                or source.get("independenceVerified") is not False):
            # Changing these evidence gates requires an explicit future reviewer policy.
            raise ValueError("Source provenance and unverified method/independence required")
        obs = source.get("observations")
        if not isinstance(obs, list) or not 1 <= len(obs) <= 20:
            raise ValueError("At least one dated observation per source")
        unique = set()
        for item in obs:
            metric = item.get("metric")
            label = item.get("label")
            if metric not in SUPPORTED:
                raise ValueError("Unsupported measured field")
            identity = (metric, label)
            if identity in unique:
                raise ValueError("Repeated observation metric/label")
            unique.add(identity)
            reported = instant(item.get("localIso", ""))
            # Require the supplied wall time + offset to agree with the named IANA zone.
            if reported.utcoffset() != reported.astimezone(timezone).utcoffset():
                raise ValueError("Incorrect local UTC offset for IANA timezone")
            if (metric in ("sunrise", "sunset") and
                    reported.astimezone(timezone).date().isoformat() != date):
                raise ValueError("Solar observation outside named local day")
            precision = item.get("precisionSeconds")
            if type(precision) not in (float, int) or not 0 <= precision <= 120:
                raise ValueError("Reference precision outside supported 0..120 seconds")
            computed = candidate_event(record, metric, label)
            delta = round((computed - reported).total_seconds(), 3)
            # Research tolerance only: not an astronomy accuracy guarantee.
            threshold = 120 + precision / 2
            results.append({
                "sourceId": source["id"], "metric": metric, "label": label,
                "reportedLocalIso": reported.isoformat(),
                "candidateLocalIso": computed.astimezone(timezone).isoformat(),
                "deltaSeconds": delta,
                "referencePrecisionSeconds": precision,
                "researchCeilingSeconds": threshold,
                "withinResearchCeiling": abs(delta) <= threshold
            })
    return {
        "schemaVersion": 1, "auditVersion": VERSION,
        "city": city, "date": date, "timezone": zone,
        "candidateSourceSha256": candidate_sha256,
        "sourceCount": len(sources), "observations": results,
        "allWithinResearchCeiling": all(x["withinResearchCeiling"] for x in results),
        "externalMethodologyReconciled": False,
        "sourceIndependenceVerified": False,
        "scientificApproval": False,
        "approvedClaimsForDeepSeek": [],
        "paidGenerationAuthorized": False,
        "publicationAuthorized": False,
        "indexingAuthorized": False,
        "blockers": [
            "reference coordinate/horizon/ayanamsa conventions not matched and reviewed",
            "reference source independence not demonstrated",
            "unverified city coordinates, timezone data version and horizon rules",
            "Nakshatra/Yoga methodology and regional observance rules pending",
            "independent named scientific and editorial reviewer approval pending"
        ]
    }


def load_sha_pinned_candidate(path: Path, expected_sha256: str) -> dict:
    if not re.fullmatch(r"[a-f0-9]{64}", expected_sha256 or ""):
        raise ValueError("Expected source SHA-256 required")
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != expected_sha256:
        raise ValueError("Candidate source SHA-256 mismatch")
    return json.loads(raw)


def main() -> None:
    p = argparse.ArgumentParser(description="Compare UNAPPROVED PANCHAVANI JPL candidates to dated external observations; NEVER approves.")
    p.add_argument("--candidate", type=Path, required=True)
    p.add_argument("--expected-sha256", required=True)
    p.add_argument("--fixture", type=Path, required=True)
    p.add_argument("--out", type=Path)
    args = p.parse_args()
    candidate = load_sha_pinned_candidate(args.candidate, args.expected_sha256)
    fixture = json.loads(args.fixture.read_text(encoding="utf-8"))
    report = compare_external_evidence(candidate, args.expected_sha256, fixture)
    data = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        with args.out.open("x", encoding="utf-8") as handle:
            handle.write(data)
        print("RESEARCH-ONLY comparison written to", args.out)
    else:
        print(data, end="")


if __name__ == "__main__":
    main()
