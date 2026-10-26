"""Method-conscious PAC/IMD vs JPL same-date central-STATION evidence overlay.

PAC geocentric Tithi/Nakshatra/Yoga/Karana ends may be compared by UTC;
PAC central-station sunrise may NOT become Delhi/Mumbai/Chennai sunrise.
Official text transcriptions are unreviewed. The report never signs science.
"""
from __future__ import annotations
import argparse,hashlib,json
from datetime import date,timedelta
from pathlib import Path
from .pac_limb_reference import calculate_reference_comparison,validate_fixture
from .seven_day_science_pilot import PILOT,validate_week
from .research_batch import JPL_DE440S_SHA

PAC_CANONICAL="https://packolkata.imd.gov.in/panchang/en"
METHOD="PANCHAVANI_PAC_DATE_MATCHED_UNAPPROVED_GEO_LIMB_COMPARISON"
KINDS={"tithi","nakshatra","yoga","karana"}

def week_pac_sources(science,fixtures):
    start=date.fromisoformat(science["localDates"][0])
    validate_week(science["records"],start)
    included=set(science["localDates"])
    if len(included)!=7:raise ValueError("Expected seven distinct pilot dates")
    sources={}
    for file in fixtures:
        raw=file.read_bytes()
        obj=json.loads(raw)
        validate_fixture(obj)
        day=obj["gregorianDate"]
        if day not in included:
            # An old verified fixture must not be used as same-day evidence.
            continue
        if day in sources:raise ValueError("More than one PAC reference for same date")
        sources[day]=(file,hashlib.sha256(raw).hexdigest())
    return sources

def build_report(science,matched,computed):
    dates=science["localDates"]
    status={x["date"]:x for x in computed}
    if set(status)!=set(matched):raise ValueError("Missing or extra PAC computed report")
    rows=[]
    for day in dates:
        if day not in matched:
            rows.append({"gregorianDate":day,"status":"NO_DATE_MATCHED_OFFICIAL_TRANSCRIPTION",
             "sourceArchivedAndIndependentlyVerified":False,"publicApproved":False})
            continue
        _,sha=matched[day]
        record=status[day]
        if record.get("status")!="PAC_LIMBS_RESEARCH_ONLY" or record.get("date")!=day or record.get("referenceStation")!="CENTRAL_INDIA" or record.get("observationCount")!=5:
            raise ValueError("PAC central station comparison was not anchored")
        if record.get("publicationAuthorized") is not False or record.get("citySpecificClaims")!=0:
            raise ValueError("Forbidden PAC source publication/mapping authority")
        if set(x["type"] for x in record["comparisons"])!=KINDS:
            raise ValueError("Missing one or more of four PAC Panchang components")
        rows.append({
           "gregorianDate":day,"status":"OFFICIAL_PAC_RESEARCH_TRANSCRIPTION_METHOD_UNCERTIFIED",
           "referenceFixtureSha256":sha,"sourceUrl":PAC_CANONICAL,
           "station":"CENTRAL_STATION_NOT_PILOT_CITIES",
           "measurementCount":5,
           "maxAbsoluteClockDifferenceSeconds":record["maxAbsoluteDeltaSeconds"],
           "deltas":[{"kind":r["type"],"number":r["number"],
             "pacEndIst":r["officialIST"],"computedEndIst":r["computedIST"],
             "computedMinusPacSeconds":r["deltaSeconds"],
             "outsideExploratory30MinuteAlert":not r["withinResearchAlertThreshold"]}
             for r in record["comparisons"]],
           "sourceArchivedAndIndependentlyVerified":False,
           "sourceTranscriptionIndependentlyReviewed":False,
           "methodologyEquivalenceEstablished":False,
           "citySunriseReferenceVerified":False,
           "expertScienceSignoff":False,"publicApproved":False
        })
    return {
      "artifactType":METHOD,"schemaVersion":1,
      "status":"PARTIAL_OFFICIAL_DATE_COVERAGE_RESEARCH_ONLY",
      "cohort":{"cities":list(PILOT),"localDates":dates,"cityDayCount":21},
      "PACDateMatchedCount":len(matched),
      "PACDateMissingCount":7-len(matched),
      "officialPublishedPhenomenaReferenced":5*len(matched),
      "geocentricComparisonNotCitySpecific":True,
      "officialSourceReference":PAC_CANONICAL,
      "sourceTranscriptionsIndependentlyReviewed":False,
      "approvedCitySunriseClaims":0,"approvedRitualDates":0,
      "scienceApproval":False,"approvedClaimsForDeepSeek":[],
      "modelInvocationAuthorized":False,"publicationAuthorized":False,
      "indexingAuthorized":False,
      "dates":rows
    }

def compare_week(ephemeris:Path,science:Path,fixtures:Path,out:Path):
    if out.exists():raise ValueError("Refuse overwriting historical official PAC evidence")
    data=json.loads(science.read_text())
    if data.get("artifactType")!="PANCHAVANI_THREE_CITY_SEVEN_DAY_INDEPENDENT_RECOMPUTATION_RESEARCH" or data.get("ephemerisSha256")!=JPL_DE440S_SHA or data.get("scientificApproval") is not False:
        raise ValueError("Bad science source for independent comparison")
    found=week_pac_sources(data,sorted(fixtures.glob("pac-*-central-limbs-UNREVIEWED.json")))
    computed=[]
    for day,(fixture,sha) in sorted(found.items()):
        partial=out.with_name("PAC-"+day+"-NOT_APPROVED.json")
        # The existing first-principles PAC phase solver uses exactly the PAC date
        # and the kernel's pinned SHA, and independently checks Tithi/Karana identity.
        row=calculate_reference_comparison(ephemeris,fixture,partial)
        if row.get("date")!=day:raise ValueError("Date confusion in official comparison")
        computed.append(row)
        partial.unlink()  # only the aggregate review report is retained
    result=build_report(data,found,computed)
    out.parent.mkdir(parents=True,exist_ok=True)
    with out.open("x",encoding="utf8") as f:json.dump(result,f,indent=2,ensure_ascii=False)
    print("Official same-date PAC research:",result["PACDateMatchedCount"],
          "out of",len(data["localDates"]),"days")
    print("Scientific approval:",result["scienceApproval"])
    return result

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--ephemeris",required=True,type=Path)
    p.add_argument("--science",required=True,type=Path)
    p.add_argument("--fixtures",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args()
    compare_week(a.ephemeris,a.science,a.fixtures,a.out)
if __name__=="__main__":main()
