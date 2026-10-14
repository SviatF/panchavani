"""Conservative human-first editorial page control; never a Google ranking oracle.

This checks machine-detectable editorial omissions, but it cannot reliably
identify AI writing or certify voice, cultural nuance, source independence or
helpfulness. Human review remains mandatory and is never auto-filled.
"""
from __future__ import annotations
import json
import re
from pathlib import Path
from .cities import RESEARCH_CITIES
from .release_gate import signature

BLOCKED_PHRASES = (
    "lorem ipsum", "as an ai", "in today's fast-paced world",
    "discover the secrets", "unlock the power",
)
PLACEHOLDER = re.compile(r"(\{\{|\}\}|\[\s*city\s*\]|\b(?:todo|tbd)\b)",re.IGNORECASE)


def inspect_brief_registry(data: dict) -> dict:
    if not isinstance(data,dict) or data.get("status")!="RESEARCH_BRIEFS_ONLY" or (
        data.get("publicationAuthorized") is not False
    ):
        raise ValueError("Editorial source falsely indicates approved publishing")
    briefs=data.get("cityBriefs")
    expected={cid for cid,c in RESEARCH_CITIES.items() if c.cohort=="expansion"}
    if not isinstance(briefs,list) or len(briefs)!=len(expected):
        raise ValueError("The exact expansion cohort must have editorial briefs")
    ids=[b.get("cityId") for b in briefs if isinstance(b,dict)]
    if len(ids)!=len(briefs) or set(ids)!=expected:
        raise ValueError("Missing or duplicated city editorial scope")
    angles=set()
    for b in briefs:
        if (b.get("readiness")!="EVIDENCE_MISSING" or
            b.get("publicIndexingAuthorized") is not False or
            b.get("verifiedLocalClaims")!=[] or b.get("primarySourceRefs")!=[] or
            b.get("validatedAstronomyRecordHashes")!=[] or
            b.get("humanWrittenBody") is not None or
            b.get("editorialReviewer") is not None or
            b.get("ritualExpertReviewer") is not None):
            raise ValueError("Draft brief may not fabricate scientific/editorial approval")
        angle=b.get("localResearchAngle")
        if not isinstance(angle,str) or len(angle.strip())<60 or angle.casefold() in angles:
            raise ValueError("Missing or repeated genuinely city-specific editorial direction")
        angles.add(angle.casefold())
        if not isinstance(b.get("evidenceToFind"),str) or len(b["evidenceToFind"])<60:
            raise ValueError("Missing distinct research questions and verification targets")
    return {"cityBriefCount":len(briefs),"publicationAuthorized":False,
            "indexablePages":0,"editorialReviewsCompleted":0,
            "status":"RESEARCH_BRIEFS_ONLY"}


def copy_review_flags(body: str, compared: tuple[str,...], names: tuple[str,...]) -> list[str]:
    """Signals are conservative editorial prompts, not an automated AI detector."""
    issues=[]
    if not isinstance(body,str) or not body.strip():
        return ["human-authored-content-missing"]
    if PLACEHOLDER.search(body) or any(s in body.casefold() for s in BLOCKED_PHRASES):
        issues.append("placeholder-or-robotic-stock-phrase")
    if len(body.strip())<250:
        issues.append("insufficient-explanatory-coverage-for-editorial-review")
    current=signature(body,names)
    if not current:
        issues.append("content-language-tokenization-failed")
    def location_neutral(text: str) -> str:
        value=text.casefold()
        for label in sorted(names,key=len,reverse=True):
            if isinstance(label,str) and label.strip():
                # Exact substring for Indic scripts: Python word boundaries can
                # split at combining marks and miss a city-name substitution.
                value=value.replace(label.casefold()," CITY ")
        return " ".join(value.split())

    neutral=location_neutral(body)
    for other in compared:
        if not isinstance(other,str) or not other.strip():
            continue
        previous=signature(other,names)
        if (neutral==location_neutral(other) or
            (previous and current and len(current & previous)/len(current | previous) >= 0.67)):
            issues.append("location-swap-or-near-duplicate-city-prose")
            break
    return sorted(set(issues))


def release_readiness_check(*, city_id: str, body: str,
                            reviewed_by: str|None=None,
                            reviewed_local_claims: list|None=None,
                            verified_astronomy_hash: str|None=None,
                            source_refs: list|None=None,
                            competing_bodies: tuple[str,...]=(),
                            city_labels: tuple[str,...]=()) -> list[str]:
    """Only report outstanding blockers. Never grant indexing or publication."""
    errors=copy_review_flags(body,competing_bodies,city_labels)
    if city_id not in RESEARCH_CITIES:
        errors.append("city-not-in-verified-workflow-catalog")
    if not reviewed_by:
        errors.append("human-editorial-review-missing")
    claims=reviewed_local_claims or []
    if not isinstance(claims,list) or len(claims)<2 or any(
        not isinstance(c,dict) or not c.get("assertion") or
        not c.get("sourceUrl") or not c.get("reviewedBy")
        for c in claims):
        errors.append("two-or-more-source-linked-local-facts-missing")
    if not isinstance(verified_astronomy_hash,str) or not re.fullmatch(r"[a-f0-9]{64}",verified_astronomy_hash):
        errors.append("astronomy-record-not-independently-approved")
    if not isinstance(source_refs,list) or len(set(source_refs))<2:
        errors.append("independent-source-provenance-not-provided")
    if city_id in RESEARCH_CITIES and not RESEARCH_CITIES[city_id].coordinates_verified:
        errors.append("city-station-geodata-unverified")
    return sorted(set(errors))


def main():
    p=Path(__file__).resolve().parents[1]/"editorial"/"expansion-17-research-briefs.v1.json"
    report=inspect_brief_registry(json.loads(p.read_text(encoding="utf-8")))
    print(json.dumps(report,indent=2))
    if report["indexablePages"]!=0:
        raise SystemExit("Unsafe editorial research publishing detected")

if __name__=="__main__":
    main()
