"""No synthetic astronomical fixtures ever certify 25 new locations."""
import copy
import unittest
from datetime import date,datetime,timedelta,timezone
from panchavani.cities import RESEARCH_CITIES
from panchavani.first_six_limb_pilot import (
 RESEARCH_25_CITY_IDS,TEN_CITY_IDS,KINDS,verify_batch,verify_six_limb_record
)
from test_ten_city_six_limb_research import ten_city_research_batch

START=date(2026,11,1)
def twentyfive_synthetic():
 base=ten_city_research_batch(START)
 data=copy.deepcopy(base)
 rows=data["records"]
 for index,city in enumerate(RESEARCH_25_CITY_IDS[10:],10):
  for offset in (0,1):
   day=START+timedelta(days=offset)
   record=copy.deepcopy(next(x for x in rows
     if x["cityId"]=="delhi" and x["localDate"]==day.isoformat()))
   begin=datetime(day.year,day.month,day.day,0,50,tzinfo=timezone.utc)+timedelta(minutes=index*3)
   end=begin+timedelta(days=1)
   record["cityId"]=city
   record["cityName"]=RESEARCH_CITIES[city].name
   record["cityReference"]={"latitude":RESEARCH_CITIES[city].latitude,
                            "longitude":RESEARCH_CITIES[city].longitude,
                            "coordinatesVerified":False}
   record["sun"]={"sunriseUtc":begin.isoformat(),
                  "sunsetUtc":(begin+timedelta(hours=11)).isoformat(),
                  "nextSunriseUtc":end.isoformat()}
   for kind in KINDS:
    for part in record["transitions"][kind]:
     part["startUtc"]=begin.isoformat()
     part["endUtc"]=end.isoformat()
   rows.append(record)
 data["cityCount"]=25
 data["artifactType"]="PANCHAVANI_25_CITY_SIX_LIMB_RESEARCH_BATCH"
 return data

class ExpansionResearchTests(unittest.TestCase):
 def test_exact_ten_plus_fifteen_city_scope(self):
  self.assertEqual(len(RESEARCH_25_CITY_IDS),25)
  self.assertEqual(len(RESEARCH_25_CITY_IDS[10:]),15)
  self.assertEqual(RESEARCH_25_CITY_IDS[:10],TEN_CITY_IDS)
  self.assertEqual(len(set(RESEARCH_25_CITY_IDS)),25)
  self.assertTrue(all(not RESEARCH_CITIES[c].coordinates_verified for c in RESEARCH_25_CITY_IDS))
  self.assertTrue(all(not RESEARCH_CITIES[c].publishing_approved for c in RESEARCH_25_CITY_IDS))
 def test_fifty_25_city_days_remain_unapproved(self):
  batch=twentyfive_synthetic()
  report=verify_batch(batch["records"],RESEARCH_25_CITY_IDS)
  self.assertEqual(report["checkedCityDays"],50)
  self.assertEqual(report["checkedFourLimbDawnContinuities"],100)
  self.assertEqual(len(report["cities"]),25)
  self.assertFalse(report["sourceScientificValidation"])
  for packet in batch["records"]:
   verify_six_limb_record(packet,RESEARCH_25_CITY_IDS)
   self.assertFalse(packet["scientificApproval"])
   self.assertFalse(packet["publicReleaseAllowed"])
   self.assertFalse(packet["indexingAuthorized"])
 def test_one_mislocated_city_or_missing_day_fails_25_city_cohort(self):
  batch=twentyfive_synthetic()
  batch["records"].pop()
  with self.assertRaises(ValueError):
   verify_batch(batch["records"],RESEARCH_25_CITY_IDS)
  batch=twentyfive_synthetic()
  batch["records"][0]["cityId"]="unknown-fake-city"
  with self.assertRaises(ValueError):
   verify_batch(batch["records"],RESEARCH_25_CITY_IDS)
 def test_cannot_upgrade_25_city_unreviewed_data_into_10_city_approved_qa(self):
  batch=twentyfive_synthetic()
  with self.assertRaises(ValueError):
   verify_batch(batch["records"],TEN_CITY_IDS)
  for row in batch["records"]:
   self.assertEqual(row["approvedClaimsForDeepSeek"],[])
   self.assertFalse(row["paidGenerationAuthorized"])

if __name__=="__main__":unittest.main()
