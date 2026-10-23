"""Fail-closed city identity for external Panchang observations.

A date parameter does NOT establish an observer location. Never count results
from a wrong GeoNames ID as Delhi scientific evidence, even if numbers happen
to agree. Static ID matching is not verification of publisher methodology.
"""
from __future__ import annotations
from urllib.parse import urlsplit, parse_qs

DELHI_GEONAMES_IDS=frozenset({"1273294","1261481"})
WRONG_LEGACY_ID="934657"
SOURCE_LOCATION_REFERENCE_URLS={
    "delhi":"https://www.drikpanchang.com/location/panchang-location-details.html?geoname-id=1273294",
    "new-delhi":"https://www.geonames.org/1261481/new-delhi.html",
    "legacy-location":"https://www.geonames.org/934657/",
}

def classify_external_source(provider:str,url:str,city:str,day:str)->dict:
    if city!="delhi" or day!="2026-10-21":
        raise ValueError("No reviewed external city/date source identity mapping")
    parsed=urlsplit(url)
    if parsed.scheme!="https" or not parsed.netloc or parsed.username or parsed.password:
        raise ValueError("External observation must use absolute HTTPS URL")
    q=parse_qs(parsed.query,keep_blank_values=True)
    if provider=="Drik Panchang":
        if (parsed.netloc!="www.drikpanchang.com" or
            parsed.path!="/panchang/day-panchang.html" or
            q.get("date")!=["21/10/2026"] or
            q.get("time-format")!=["24plushour"]):
            raise ValueError("External Drik source is not pinned to the observed date")
        geo=q.get("geoname-id")
        if not geo or len(geo)!=1 or not geo[0].isdigit():
            raise ValueError("Drik observer ID is missing or ambiguous")
        correct=geo[0] in DELHI_GEONAMES_IDS
        return {"sourceCityId":"delhi" if correct else None,
                "provider":provider,"suppliedGeonameId":geo[0],
                "expectedGeonameIds":sorted(DELHI_GEONAMES_IDS),
                "sourceLocationQualifiedForDelhi":correct,
                "status":"ID_MATCHES_DELHI_REQUIRES_PUBLISHER_CHECK" if correct
                     else "QUARANTINED_NON_DELHI_GEONAME",
                "independentScientificApproval":False,
                "sourceCityVerifiedByPublisher":False}
    if provider=="Timeanddate":
        if (parsed.netloc!="www.timeanddate.com" or
            parsed.path!="/sun/india/new-delhi" or
            q.get("month")!=["10"] or q.get("year")!=["2026"]):
            raise ValueError("Solar source identity/date mismatch")
        return {"sourceCityId":"delhi","provider":provider,
                "sourceLocationQualifiedForDelhi":True,
                "status":"NAMED_NEW_DELHI_REQUIRES_METHOD_REVIEW",
                "independentScientificApproval":False,
                "sourceCityVerifiedByPublisher":False}
    raise ValueError("Unrecognised external reference publisher")

def audit_reference_fixture(fixture:dict)->dict:
    if (not isinstance(fixture,dict) or
        fixture.get("artifactType")!="PANCHAVANI_INDEPENDENT_REFERENCE_TIMINGS" or
        fixture.get("scientificApproval") is not False or
        fixture.get("publicationAuthorized") is not False):
        raise ValueError("Untrusted scientific reference fixture")
    samples=fixture.get("samples")
    if not isinstance(samples,list) or len(samples)!=7:
        raise ValueError("Unexpected Delhi research cohort size")
    checked=[]
    for item in samples:
        source=item.get("source",{})
        result=classify_external_source(source.get("provider"),source.get("url"),
                                        item.get("cityId"),item.get("localDate"))
        checked.append({"kind":item.get("kind"),"eventKey":item.get("eventKey"),
                        "referenceUtc":item.get("referenceUtc"),**result})
    invalid=[x for x in checked if not x["sourceLocationQualifiedForDelhi"]]
    valid=[x for x in checked if x["sourceLocationQualifiedForDelhi"]]
    return {"artifactType":"PANCHAVANI_EXTERNAL_GEO_IDENTITY_AUDIT",
            "status":"QUARANTINED" if invalid else "SOURCE_IDS_MATCH_NOT_SCIENTIFICALLY_APPROVED",
            "totalObservations":len(checked),
            "qualifiedObserverIdCount":len(valid),
            "quarantinedObserverIdCount":len(invalid),
            "quarantinedKinds":[x["kind"] for x in invalid],
            "sourceObservations":checked,
            "independentScienceApproved":False,"publicationAuthorized":False,
            "indexingAuthorized":False,
            "requiredRemediation":"Recapture limb transition times from correctly pinned Delhi/New Delhi source before interpreting minute discrepancies."}
