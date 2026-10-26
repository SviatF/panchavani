"""PAC date and central-station research guards, no kernel required."""
import copy,json,unittest
from datetime import date,timedelta
from pathlib import Path
from panchavani.pac_week_comparison import week_pac_sources,build_report
from tests.test_seven_day_science_pilot import week

FIXTURES=Path(__file__).resolve().parents[1]/"fixtures"
def research():
 return {"localDates":[(date(2026,10,20)+timedelta(days=i)).isoformat() for i in range(7)],
         "records":week()}
def base_report(day):
 return {
  "gregorianDate":day,"status":"PAC_LIMBS_RESEARCH_ONLY","date":day,
  "referenceStation":"CENTRAL_INDIA","observationCount":5,
  "publicationAuthorized":False,"citySpecificClaims":0,
  "maxAbsoluteDeltaSeconds":69,
  "comparisons":[{"type":kind,"number":1,
    "officialIST":"2026-10-20T12:00:00+05:30",
    "computedIST":"2026-10-20T12:01:09+05:30",
    "deltaSeconds":69,"withinResearchAlertThreshold":True}
    for kind in ("tithi","nakshatra","yoga","karana","karana")]
 }
class PACWeekTests(unittest.TestCase):
 def test_exact_day_coverage_is_three_and_never_city_sunrise(self):
  src=week_pac_sources(research(),[
   FIXTURES/("pac-"+x+"-central-limbs-UNREVIEWED.json") for x in
     ("2026-10-20","2026-10-21","2026-10-22")])
  self.assertEqual(len(src),3)
  reports=[base_report(x) for x in src]
  report=build_report(research(),src,reports)
  self.assertEqual(report["PACDateMatchedCount"],3)
  self.assertEqual(report["PACDateMissingCount"],4)
  self.assertEqual(report["officialPublishedPhenomenaReferenced"],15)
  self.assertEqual(report["approvedCitySunriseClaims"],0)
  self.assertFalse(report["scienceApproval"])
  self.assertFalse(report["publicationAuthorized"])
  self.assertFalse(report["modelInvocationAuthorized"])
  self.assertTrue(all(not d["publicApproved"] for d in report["dates"]))
 def test_old_date_is_not_a_same_date_reference(self):
  src=week_pac_sources(research(),[
     FIXTURES/"pac-2026-10-16-central-limbs-UNREVIEWED.json"])
  self.assertEqual(src,{})
 def test_duplicated_official_day_fails(self):
  file=FIXTURES/"pac-2026-10-20-central-limbs-UNREVIEWED.json"
  with self.assertRaises(ValueError):
   week_pac_sources(research(),[file,file])
 def test_wrong_pac_type_and_station_fails(self):
  src=week_pac_sources(research(),[FIXTURES/"pac-2026-10-20-central-limbs-UNREVIEWED.json"])
  base=base_report("2026-10-20")
  base["referenceStation"]="delhi"
  with self.assertRaises(ValueError):build_report(research(),src,[base])
 def test_mismatched_date_fails(self):
  src=week_pac_sources(research(),[FIXTURES/"pac-2026-10-20-central-limbs-UNREVIEWED.json"])
  with self.assertRaises(ValueError):build_report(research(),src,[base_report("2026-10-22")])
 def test_implicit_publication_fails(self):
  src=week_pac_sources(research(),[FIXTURES/"pac-2026-10-20-central-limbs-UNREVIEWED.json"])
  row=base_report("2026-10-20")
  row["publicationAuthorized"]=True
  with self.assertRaises(ValueError):build_report(research(),src,[row])
if __name__=="__main__":unittest.main()
