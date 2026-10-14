"""Classify source independence of publicly reported Panchang references.

Two web URLs are NOT two independently computed astronomical sources.
This tool refuses to infer independence from branding, matched timestamps,
or a self-declared methodology. Its output is advisory RESEARCH ONLY.
"""
from __future__ import annotations
from datetime import date, datetime
from urllib.parse import urlsplit

SUPPORTED_METRICS={"sunrise","sunset","tithi_end","nakshatraEnd","yogaEnd"}
REQUIRED_METHOD_FIELDS=("ayanamsaMode","ephemeris","coordinateConvention","timeConvention")

def audit_reference_evidence(fixture: dict) -> dict:
    problems=[]
    if not isinstance(fixture,dict):
        raise ValueError("Reference evidence must be an object")
    try:
        if not isinstance(fixture["city"],str) or not fixture["city"]:
            raise ValueError("invalid-city")
        date.fromisoformat(fixture["date"])
    except (ValueError,KeyError,TypeError):
        problems.append("invalid-city-or-date")
    sources=fixture.get("sources")
    if not isinstance(sources,list) or len(sources)<2:
        sources=[]
        problems.append("fewer-than-two-sources")
    valid_domains=set()
    upstream=set()
    checked_metrics=set()
    for i,ref in enumerate(sources):
        if not isinstance(ref,dict):
            problems.append("invalid-source")
            continue
        try:
            url=urlsplit(ref.get("url",""))
            if url.scheme!="https" or not url.netloc or url.username or url.password:
                raise ValueError("url")
            domain=url.hostname or ""
            if domain in valid_domains:
                problems.append("repeated-website-domain")
            valid_domains.add(domain)
        except (ValueError,TypeError):
            problems.append("invalid-source-url")
        family=ref.get("independentlyDocumentedUpstream")
        if not isinstance(family,str) or not family.strip() or family.lower() in ("unknown","unverified","none"):
            problems.append("unverified-upstream-provenance")
        elif family.strip().lower() in upstream:
            problems.append("shared-upstream-family")
        else:
            upstream.add(family.strip().lower())
        method=ref.get("methodology")
        if not isinstance(method,dict) or any(not method.get(key) for key in REQUIRED_METHOD_FIELDS):
            problems.append("methodology-not-documented")
        provenance=ref.get("provenanceReview")
        if not isinstance(provenance,dict) or not provenance.get("reviewer") or not provenance.get("evidenceUrl"):
            problems.append("source-provenance-not-independently-reviewed")
        for metric in SUPPORTED_METRICS:
            value=ref.get(metric)
            if value is None:
                continue
            checked_metrics.add(metric)
            if not isinstance(value,str):
                problems.append("non-text-observation")
                continue
            # A clock time without explicit date/offset is a research comparator,
            # not an absolute astronomical instant.
            try:
                instant=datetime.fromisoformat(value.replace("Z","+00:00"))
                if instant.tzinfo is None:
                    problems.append("ambiguous-clock-time-no-offset")
            except (ValueError,TypeError):
                problems.append("ambiguous-clock-time-no-offset")
        if not isinstance(ref.get("precisionSeconds"),int) or ref.get("precisionSeconds",0)<1:
            problems.append("measurement-precision-unspecified")
    if not checked_metrics:
        problems.append("no-observed-events")
    # Even perfectly documented website metadata is not cryptographic proof
    # the providers are independent: this classification never authorizes release.
    return {
        "classification":"RESEARCH_SOURCE_AUDIT",
        "sourcesSeen":len(sources),
        "distinctWebsiteDomains":len(valid_domains),
        "documentedUpstreamFamilies":len(upstream),
        "observedMetrics":sorted(checked_metrics),
        "sourceDocumentationIssues":sorted(set(problems)),
        "methodologicalIndependenceVerified":False,
        "publicationAuthorized":False,
        "nextAction":"independent expert verification of upstream calculations and source methods",
    }
