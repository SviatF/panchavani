"""Research-only regional observance predicates, NOT a festival/Muhurat calendar.

A tithi-at-sunrise condition is a *single astronomical predicate*; it does
not establish festival, vrata/parana, wedding or purchase eligibility.
Every result is withheld from publishing irrespective of input metadata.
"""
from __future__ import annotations
from datetime import datetime
from typing import Any

ALLOWED_KINDS={"festival","vrat","wedding","griha-pravesh","vehicle-purchase","start-business"}
RESEARCH_CRITERIA={"tithi-at-local-sunrise"}


def parse_instant(value: str) -> datetime:
    if not isinstance(value, str) or not value:\n        raise ValueError("Timestamp must be a nonempty offset-aware string")\n    dt=datetime.fromisoformat(value.replace("Z","+00:00"))
    if dt.tzinfo is None or dt.utcoffset() is None:
        raise ValueError("Timezone offset required")
    return dt


def evaluate_local_predicate(record: dict, rule_pack: dict) -> dict[str, Any]:
    """Evaluate only a narrow predicate, never issue an auspicious recommendation."""
    issues=[]
    kind=rule_pack.get("kind")
    if kind not in ALLOWED_KINDS:
        issues.append("unsupported-observance-kind")
    if rule_pack.get("status") != "DRAFT":
        issues.append("rulepack-not-an-explicit-research-draft")
    if not rule_pack.get("id") or not rule_pack.get("version"):
        issues.append("unversioned-rulepack")
    if not rule_pack.get("tradition") or not rule_pack.get("region"):
        issues.append("missing-regional-calendar-context")
    city=record.get("city",{}).get("id")
    allowed=rule_pack.get("cityIds")
    if not isinstance(allowed,list) or not allowed or city not in allowed:
        issues.append("wrong-city-or-city-scope-unknown")
    if record.get("methodology",{}).get("rulePackId") not in ("NONE",rule_pack.get("id")):
        issues.append("contradictory-rulepack-on-astronomy-record")
    if record.get("status") != "calculated":
        issues.append("source-must-be-unapproved-research")
    if record.get("validation",{}).get("blockerCount",0) < 1:
        issues.append("unreviewed-astronomy-must-stay-blocked")
    if (record.get("city",{}).get("catalogVersion","").startswith("pilot-unverified")):
        issues.append("unverified-city-coordinates")
    condition=rule_pack.get("criterion")
    condition_true=None
    if not isinstance(condition,dict) or condition.get("type") not in RESEARCH_CRITERIA:
        issues.append("unsupported-or-missing-research-predicate")
    elif not isinstance(condition.get("equals"),str) or not condition["equals"]:
        issues.append("missing-predicate-tithi")
    else:
        try:
            sunrise=parse_instant(record["sun"]["sunriseUtc"])
            next_sunrise=parse_instant(record["sun"]["nextSunriseUtc"])
            if next_sunrise<=sunrise:
                raise ValueError("Invalid solar chronology")
            tithis=[t for t in record.get("transitions",[]) if t.get("type")=="tithi"]
            active=[]
            for t in tithis:
                st=parse_instant(t["startUtc"])
                end=parse_instant(t["endUtc"])
                if st<=sunrise<end:
                    active.append(t)
            if len(active)!=1 or active[0].get("value") != record.get("panchangAtSunrise",{}).get("tithi"):
                issues.append("tithi-sunrise-evidence-inconsistent")
            else:
                condition_true=(active[0]["value"]==condition["equals"])
        except (KeyError,TypeError,ValueError,OverflowError):
            issues.append("missing-or-invalid-sunrise-transition-data")
    source_refs=rule_pack.get("sourceRefs")
    if not isinstance(source_refs,list) or len(source_refs)<2:
        issues.append("insufficient-reviewed-traditional-sources")
    if not isinstance(rule_pack.get("independentReview"),dict) or (
        rule_pack.get("independentReview",{}).get("status") != "VERIFIED"
    ):
        issues.append("regional-ritual-methodology-unverified")
    # No current rule computes actual selection/exclusion/fast-breaking windows.
    issues.append("full-ritual-eligibility-not-implemented")
    issues.append("no-cryptographically-approved-rule-pack")
    return {
        "kind":kind,
        "rulePackId":rule_pack.get("id"),
        "cityId":city,
        "localDate":record.get("localDate"),
        "researchPredicateMet":condition_true,
        "observanceDetermined":False,
        "muhuratRecommended":False,
        "publicationAuthorized":False,
        "indexingAuthorized":False,
        "decision":"WITHHELD_PENDING_EXPERT_AND_METHOD_REVIEW",
        "blockingReasons":sorted(set(issues)),
    }
