"""Fail-closed SEO/indexability preflight for REVIEWED public release candidates.

Not an SEO ranking score. It detects basic evidence, canonical and uniqueness
failures and delegates scientific/editorial decisions to the release gate.
"""
from __future__ import annotations
from dataclasses import dataclass
from datetime import date
from .release_gate import EditorialEvidence, release_blockers, signature

@dataclass(frozen=True)
class CityPage:
    city_id: str
    local_date: str
    canonical_path: str
    title: str
    body: str
    editorial: EditorialEvidence
    record: dict

def audit_city_pages(pages: list[CityPage]) -> dict[str, list[str]]:
    city_labels=tuple({str(p.record.get('city',{}).get('name','')) for p in pages if p.record})
    keys=set()
    result={}
    for p in pages:
        problems=[]
        key=(p.city_id,p.local_date)
        expected=f"/panchang/{p.city_id}/{p.local_date}/"
        if not p.city_id or not p.city_id.replace('-','').isalpha():
            problems.append('invalid-city-slug')
        try: date.fromisoformat(p.local_date)
        except ValueError: problems.append('invalid-date')
        if not p.canonical_path.startswith('/') or p.canonical_path!=expected:
            problems.append('invalid-or-duplicate-canonical')
        if (p.city_id,p.local_date) in keys:
            problems.append('duplicate-city-date')
        keys.add(key)
        if p.record.get('city',{}).get('id')!=p.city_id or p.record.get('localDate')!=p.local_date:
            problems.append('content-record-mismatch')
        if p.record.get('status')!='approved':
            problems.append('unapproved-astronomical-record')
        sun=p.record.get('sun') or {}
        if any(not sun.get(k) for k in ('sunriseUtc','sunsetUtc','nextSunriseUtc')):
            problems.append('missing-local-solar-evidence')
        kinds={e.get('type') for e in (p.record.get('transitions') or [])}
        if not {'tithi','karana','rahu-kalam','yamaganda','gulika'}.issubset(kinds):
            problems.append('missing-local-panchang-evidence')
        if p.city_id.lower().replace('-',' ') not in p.title.lower():
            problems.append('city-not-in-title')
        if not p.title.strip() or not p.body.strip():
            problems.append('empty-content')
        other_bodies=tuple(other.body for other in pages if other is not p)
        ed=EditorialEvidence(
            reviewed_by=p.editorial.reviewed_by,
            city_relevance_explanation=p.editorial.city_relevance_explanation,
            source_ids=p.editorial.source_ids,
            comparison_evidence_ids=p.editorial.comparison_evidence_ids,
            normalized_body=p.body,
            competing_page_bodies=other_bodies,
        )
        problems.extend(release_blockers(p.record,ed,city_labels))
        result[p.canonical_path+'#'+p.city_id+'#'+p.local_date] = sorted(set(problems))
    return result

def may_index(audit: dict[str,list[str]]) -> bool:
    """Only means passing these preliminary gates; never grants publication."""
    return bool(audit) and all(not blockers for blockers in audit.values())
