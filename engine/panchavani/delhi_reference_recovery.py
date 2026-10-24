"""Recover a SINGLE verifiable Delhi Tithi transition from a correctly located
festival source page. Never overwrite legacy quarantined references.

The publisher timing and page header were observed in publicly rendered
Drik Panchang festival page for New Delhi (GeoNames 1261481). The source URL
identity is pinned, but this file does not reproduce a snapshot of the served
HTML, independently confirm coordinates, resolve Lahiri convention or certify
the truth of the observed value. Any mismatches remain research blockers.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from .first_six_limb_pilot import TEN_CITY_IDS,verify_batch

ARTIFACT="PANCHAVANI_DELHI_SOURCE_RECAPTURE_CANDIDATE"
EXPECTED_URL="https://www.drikpanchang.com/festivals/vijayadashami/vijayadashami-date-time.html?geoname-id=1261481&year=2026"
EXPECTED_DAY="2026-10-21"
EXPECTED_LOCAL="2026-10-21T14:11:00+05:30"

def _utc(value):
    if not isinstance(value,str):
        raise ValueError("Timestamp must be explicit and offset-aware")
    date=datetime.fromisoformat(value.replace("Z","+00:00"))
    if date.utcoffset() is None:raise ValueError("Missing UTC offset")
    return date.astimezone(timezone.utc)

def _check(value,label):
    if not value:raise ValueError("Rejected independent observation: "+label)

def vet_observation(source):
    _check(isinstance(source,dict),"invalid observation")
    _check(source.get("artifactType")==ARTIFACT and
           source.get("status")=="WEB_RENDERED_RESEARCH_UNAPPROVED" and
           source.get("scientificApproval") is False and
           source.get("publicationAuthorized") is False and
           source.get("indexingAuthorized") is False,
           "research provenance/approval state")
    _check(source.get("cityId")=="delhi" and
           source.get("localDate")==EXPECTED_DAY and
           source.get("sourceDisplayedCity")=="New Delhi, India",
           "city/day displayed label")
    url=source.get("sourceUrl")
    _check(isinstance(url,str) and url==EXPECTED_URL,
           "incorrect independent source URL")
    parsed=urlsplit(url)
    _check(parsed.scheme=="https" and parsed.netloc=="www.drikpanchang.com" and
           parse_qs(parsed.query)=={"geoname-id":["1261481"],"year":["2026"]},
           "wrong geoname/authority/year")
    _check(source.get("eventKind")=="tithi" and
           source.get("eventKey")=="end" and
           source.get("expectedEndingNumber")==10 and
           source.get("eventName")=="Dashami" and
           source.get("sourceLocalTime")==EXPECTED_LOCAL and
           source.get("referencePrecisionSeconds")==60,
           "unsupported time or event in external observation")
    _check(source.get("sourceReadoutIndependentlySigned") is False and
           source.get("publisherCoordinatesVerified") is False and
           source.get("methodConventionReconciled") is False,
           "forged independent publisher/source signoff")
    # Do not trust a third-party URL that requires cookies/localStorage or
    # redirects to a default city. The observed page text needs archivally
    # verifiable screenshot/source-hash and a separately named reviewer.
    return source

def recover(batch,source):
    vet_observation(source)
    _check(isinstance(batch,dict) and
           batch.get("artifactType")=="PANCHAVANI_TEN_CITY_SIX_LIMB_RESEARCH_BATCH" and
           batch.get("cityCount")==10 and
           batch.get("scientificApproval") is False and
           batch.get("publicationAuthorized") is False,
           "JPL research cohort")
    qa=verify_batch(batch["records"],TEN_CITY_IDS)
    _check(qa["localDateFrom"]==EXPECTED_DAY,"wrong JPL research dates")
    records=[r for r in batch["records"] if
             r["cityId"]=="delhi" and r["localDate"]==EXPECTED_DAY]
    _check(len(records)==1,"missing/repeated JPL Delhi day")
    day=records[0]
    edges=[x for x in day["transitions"]["tithi"][:-1]
           if x["number"]==source["expectedEndingNumber"]]
    _check(len(edges)==1,"no unique Dashami boundary")
    predicted=_utc(edges[0]["endUtc"])
    reference=_utc(source["sourceLocalTime"])
    delta=(predicted-reference).total_seconds()
    source_digest=hashlib.sha256(json.dumps(source,sort_keys=True,
        separators=(",",":"),ensure_ascii=False).encode()).hexdigest()
    return {
      "artifactType":"PANCHAVANI_DELHI_SINGLE_TITHI_RECOVERY_REVIEW",
      "status":"SINGLE_SOURCE_READOUT_REQUIRES_ARCHIVED_PUBLISHER_VERIFICATION",
      "cityId":"delhi","localDate":EXPECTED_DAY,
      "sourceUrl":source["sourceUrl"],
      "sourceGeoNamesId":"1261481",
      "sourceDisplayedCity":source["sourceDisplayedCity"],
      "referenceUtc":reference.isoformat(),
      "jplResearchBoundaryUtc":predicted.isoformat(),
      "signedJplMinusPublisherSeconds":round(delta,6),
      "absoluteDifferenceSeconds":round(abs(delta),6),
      "referencePrecisionSeconds":60,
      "withinPublisherDisplayResolution":abs(delta)<=60,
      "sourceCandidateSha256":source_digest,
      "originalQuarantinedReferenceCount":5,
      "correctLocationPublisherEventCount":1,
      "remainingUnrecoveredLimbEventCount":4,
      "publisherCoordinatesVerified":False,
      "publisherMethodConventionReconciled":False,
      "sourceReadoutIndependentlySigned":False,
      "scientificApproval":False,"publicationAuthorized":False,
      "indexingAuthorized":False,"approvedClaimsForDeepSeek":[],
      "blockers":[
        "Publisher page content must be independently archived and source location confirmed by a reviewer",
        "Reconcile published clock rounding and Lahiri calculation convention",
        "Recover at least four missing correctly-located phase observations",
        "Compare Delhi coordinates/elevation and horizon with chosen publisher observer",
        "Independent review, editorial quality, release SHA and per-URL SEO permission absent"
      ]}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--batch",type=Path,required=True)
    p.add_argument("--observation",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    a=p.parse_args()
    report=recover(json.loads(a.batch.read_text()),json.loads(a.observation.read_text()))
    if a.out.exists():raise ValueError("Research artifact must not be overwritten")
    a.out.parent.mkdir(parents=True,exist_ok=True)
    with a.out.open("x",encoding="utf-8") as f:
        json.dump(report,f,indent=2,ensure_ascii=False);f.write("\n")
    print("DELHI INDEPENDENT TITHI RECAPTURE RESIDUAL (s):",report["signedJplMinusPublisherSeconds"])
    print("SCIENCE/PUBLIC RELEASE:",report["scientificApproval"],report["publicationAuthorized"])
if __name__=="__main__":main()
