"""Externally sourced Panchang clock-event consistency checker.

A machine-readable reference is not automatically scientifically independent.
The engine can quantify discrepancies, missing data and convention mismatches,
but NEVER grants editorial/scientific or SEO approval.
"""
from __future__ import annotations

from datetime import datetime
from math import isfinite
from zoneinfo import ZoneInfo
from .cities import PILOT_CITIES

METRICS = {
    "sunrise": "sunriseUtc",
    "sunset": "sunsetUtc",
    "nextSunrise": "nextSunriseUtc",
}
TRANSITION_TYPES = {"tithi", "karana", "nakshatra", "yoga"}


def _instant(value: str) -> datetime:
    """Reject ambiguous civil time and naive timestamps, never assume IST."""
    if not isinstance(value, str) or not value:
        raise ValueError("Missing dated, offset-aware reference timestamp")
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is None or dt.utcoffset() is None:
        raise ValueError("Reference timestamp lacks an explicit UTC offset")
    return dt


def _candidate_events(candidate: dict) -> dict[tuple[str, str], datetime]:
    result = {}
    for metric, field in METRICS.items():
        value = (candidate.get("sun") or {}).get(field)
        if value:
            result[(metric, "")] = _instant(value)
    for transition in candidate.get("transitions", []):
        kind = transition.get("type")
        if kind not in TRANSITION_TYPES:
            continue
        # A final interval ending at the NEXT sunrise is a clipped observation
        # window, NOT necessarily a genuine astronomical phase transition.
        if transition.get("endUtc") == (candidate.get("sun") or {}).get("nextSunriseUtc"):
            continue
        label = transition.get("value")
        key = (kind + "End", label)
        if label and key in result:
            raise ValueError("Repeated astronomical phase label within the local day")
        if label:
            result[key] = _instant(transition["endUtc"])
    return result


def compare_external(candidate: dict, bundle: dict) -> dict:
    """Return fail-closed research evidence; never self-certifies independence."""
    if candidate.get("city", {}).get("id") != bundle.get("city") or (
        candidate.get("localDate") != bundle.get("date")
    ):
        raise ValueError("Source fixture city/date mismatch")
    city_id = bundle.get("city")
    if city_id not in PILOT_CITIES:
        raise ValueError("Unknown pilot city")
    timezone = candidate.get("city", {}).get("tz")
    if timezone != PILOT_CITIES[city_id].timezone or timezone != bundle.get("timezone"):
        raise ValueError("Timezone is inconsistent with city")
    ZoneInfo(timezone)
    events = _candidate_events(candidate)
    samples = []
    issues = []
    source_families = []
    refs = bundle.get("references")
    if not isinstance(refs, list) or len(refs) < 2:
        issues.append("fewer-than-two-reference-sources")
        refs = refs if isinstance(refs, list) else []
    for ref in refs:
        if not isinstance(ref, dict):
            issues.append("invalid-source-record")
            continue
        family = ref.get("upstreamFamily")
        method = ref.get("methodEvidence")
        if not isinstance(family, str) or not family.strip() or family.lower() == "unknown":
            issues.append("unknown-upstream-family")
        else:
            source_families.append(family.strip().lower())
        if not isinstance(method, dict) or not all(
            isinstance(method.get(k), str) and method[k].strip()
            for k in ("calculationMethod", "coordinateConvention", "timeStandard", "reviewedBy", "provenanceUrl")
        ):
            issues.append("missing-documented-methodology")
        items = ref.get("observations")
        if not isinstance(items, list) or not items:
            issues.append("source-without-observations")
            continue
        for observation in items:
            if not isinstance(observation, dict):
                issues.append("invalid-observation")
                continue
            metric = observation.get("type")
            label = observation.get("label", "")
            key = (metric, label)
            if metric not in METRICS and metric not in {x + "End" for x in TRANSITION_TYPES}:
                issues.append("unknown-event-type")
                continue
            if metric in METRICS and label:
                issues.append("solar-event-cannot-have-phase-label")
                continue
            try:
                reference = _instant(observation.get("instant"))
                precision = observation.get("precisionSeconds")
                if isinstance(precision, bool) or not isinstance(precision, (int,float)) or (
                    not isfinite(precision) or not 0 < precision <= 3600
                ):
                    raise ValueError("Unknown rounding uncertainty")
                computed = events.get(key)
                if computed is None:
                    issues.append("missing-matched-computed-event")
                    continue
                discrepancy = round((computed-reference).total_seconds(), 3)
                # research threshold = 120s + explicitly reported rounding
                # precision; this alone NEVER certifies astronomical accuracy.
                tolerance = 120.0 + precision
                samples.append({
                    "source": ref.get("sourceId", ""),
                    "metric": metric, "label": label,
                    "computedUtc": computed.isoformat(), "referenceUtc": reference.isoformat(),
                    "deltaSeconds": discrepancy,
                    "roundingPrecisionSeconds": precision,
                    "researchToleranceSeconds": tolerance,
                    "withinExploratoryTolerance": abs(discrepancy) <= tolerance,
                })
                if abs(discrepancy) > tolerance:
                    issues.append("large-unexplained-observation-discrepancy")
            except (ValueError, TypeError, OverflowError):
                issues.append("invalid-timestamp-or-precision")
    if len(set(source_families)) != len(source_families):
        issues.append("same-upstream-source-used-more-than-once")
    if len(set(source_families)) < 2:
        issues.append("fewer-than-two-documented-upstream-families")
    if not samples:
        issues.append("no-comparable-events")
    return {
        "status": "RESEARCH_COMPARISON_ONLY",
        "city": city_id,
        "date": candidate["localDate"],
        "samples": samples,
        "issues": sorted(set(issues)),
        "methodologicalIndependenceVerified": False,
        "scientificAccuracyApproved": False,
        "indexingAuthorized": False,
        "publicationAuthorized": False,
    }
