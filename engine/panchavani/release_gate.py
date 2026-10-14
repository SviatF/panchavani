"""Conservative release eligibility gate, never self-approves data.

This is one of several REQUIRED publication controls. It cannot prove that
an approved source, editorial reviewer or an ephemeris is trustworthy.
"""
from __future__ import annotations

from dataclasses import dataclass
import re


@dataclass(frozen=True)
class EditorialEvidence:
    reviewed_by: str
    city_relevance_explanation: str
    source_ids: tuple[str, ...]
    comparison_evidence_ids: tuple[str, ...]
    normalized_body: str
    competing_page_bodies: tuple[str, ...] = ()


def signature(value: str, city_labels: tuple[str, ...]) -> set[str]:
    """Token shingles after deleting cosmetic location-name substitutions."""
    s = value.lower()
    for label in sorted(city_labels, key=len, reverse=True):
        s = re.sub(r'\b' + re.escape(label.lower()) + r'\b', ' CITY ', s)
    # Preserve Indic and other Unicode script tokens instead of English-only regex.
    terms = re.findall(r'[\w\u0900-\u0D7F]+', s, flags=re.UNICODE)
    return {' '.join(terms[i:i + 4]) for i in range(max(0, len(terms) - 3))}


def release_blockers(record: dict, editorial: EditorialEvidence,
                     city_labels: tuple[str, ...]) -> list[str]:
    """No publishing action exists; this reports why a candidate is ineligible."""
    errors = []
    if record.get('status') != 'approved':
        errors.append('not-explicitly-approved')
    val = record.get('validation') or {}
    if val.get('blockerCount') != 0:
        errors.append('astronomical-or-ritual-blockers')
    if val.get('reviewStatus') != 'domain-reviewed' or not record.get('approvedBy'):
        errors.append('missing-signed-approval')
    if len(val.get('referenceComparisons') or []) < 2 or len(editorial.comparison_evidence_ids) < 2:
        errors.append('missing-independent-crosschecks')
    method = record.get('methodology') or {}
    if (method.get('ayanamsa') in (None, 'NOT_VALIDATED') or
        method.get('rulePackId') in (None, 'NONE') or
        method.get('tzdbVersion') in (None, 'system-not-yet-pinned')):
        errors.append('unversioned-or-incomplete-conventions')
    if 'unverified' in (record.get('city') or {}).get('catalogVersion', '').lower():
        errors.append('unverified-city-coordinates')
    limbs = record.get('panchangAtSunrise') or {}
    if any(not limbs.get(k) for k in ('tithi','nakshatra','yoga','karana','vara','paksha')):
        errors.append('missing-panchang-limbs')
    if len(editorial.source_ids) < 2 or not editorial.reviewed_by:
        errors.append('editorial-evidence-missing')
    if len(editorial.city_relevance_explanation.split()) < 40:
        errors.append('insufficient-city-specific-substance')
    current = signature(editorial.normalized_body, city_labels)
    if len(current) < 25:
        errors.append('thin-page')
    else:
        for competitor in editorial.competing_page_bodies:
            other = signature(competitor, city_labels)
            if other and len(current & other) / len(current | other) > .82:
                errors.append('near-duplicate-location-template')
                break
    return errors
