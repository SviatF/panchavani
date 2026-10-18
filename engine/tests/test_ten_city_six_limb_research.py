"""Deterministic TEN-city 20-day-card science pipeline constraints.

These fixtures are synthetic: a passing test does NOT certify real Lahiri,
geography, traditional Muhurat rules or permission to publish.
"""
import copy
import unittest
from datetime import date,datetime,timedelta,timezone

from test_first_six_limb_pilot import specimen
from panchavani.first_six_limb_pilot import (
    PILOT,TEN_CITY_IDS,KINDS,verify_batch,verify_six_limb_record
)
from panchavani.rolling_day_previews import make_rolling_previews
from panchavani.research_batch import JPL_DE440S_SHA

def ten_city_research_batch(start=date(2027,1,1)):
    result=[]
    for d in range(2):
        for i,city in enumerate(TEN_CITY_IDS):
            day=start+timedelta(days=d)
            record=specimen("delhi",day)
            begin=datetime(day.year,day.month,day.day,0,50,tzinfo=timezone.utc)+timedelta(minutes=i*3)
            dusk=begin+timedelta(hours=11)
            following=begin+timedelta(days=1)
            record["cityId"]=city
            record["cityName"]=city.title()
            record["cityReference"]={
                "latitude":10.1+i,"longitude":75.5+i,
                "coordinatesVerified":False
            }
            record["methodology"]={"siderealMethodIndependentlyCalibrated":False}
            record["sun"]={
                "sunriseUtc":begin.isoformat(),
                "sunsetUtc":dusk.isoformat(),
                "nextSunriseUtc":following.isoformat()
            }
            for kind in KINDS:
                for segment in record["transitions"][kind]:
                    segment["startUtc"]=begin.isoformat()
                    segment["endUtc"]=following.isoformat()
            result.append(record)
    return {
        "artifactType":"PANCHAVANI_TEN_CITY_SIX_LIMB_RESEARCH_BATCH",
        "status":"UNAPPROVED_RESEARCH",
        "kernelSha256":JPL_DE440S_SHA,
        "scientificApproval":False,"publicationAuthorized":False,
        "indexingAuthorized":False,"approvedClaimsForDeepSeek":[],
        "cityCount":10,"records":result
    }

class TenCityScienceTests(unittest.TestCase):
    def test_pilot_scope_remains_strictly_only_three(self):
        raw=ten_city_research_batch()
        with self.assertRaises(ValueError):
            verify_batch(raw["records"])
        with self.assertRaises(ValueError):
            verify_six_limb_record(raw["records"][2])
        self.assertEqual(len(PILOT),3)
    def test_twenty_day_cards_four_layers_and_all_forty_cross_dawn_checks(self):
        raw=ten_city_research_batch()
        qa=verify_batch(raw["records"],TEN_CITY_IDS)
        self.assertEqual(qa["checkedCityDays"],20)
        self.assertEqual(len(qa["cities"]),10)
        self.assertEqual(qa["checkedFourLimbDawnContinuities"],40)
        self.assertTrue(qa["localSunriseDistinctWithinDate"])
        report=make_rolling_previews(raw)
        self.assertEqual(report["cityCount"],10)
        self.assertEqual(report["cityDays"],20)
        self.assertEqual(len(report["records"]),20)
        self.assertEqual(len({x["previewSha256"] for x in report["records"]}),20)
        self.assertEqual(report["approvedClaimsForDeepSeek"],[])
        self.assertFalse(report["publicationAuthorized"])
        self.assertFalse(report["modelInvocationAuthorized"])
        self.assertFalse(report["indexingAuthorized"])
        for item in report["records"]:
            self.assertIn("UNAPPROVED",item["reviewMarkdown"])
            self.assertFalse(item["paidGenerationAuthorized"])
    def test_wrong_city_or_clone_sunrise_blocks_science(self):
        source=ten_city_research_batch()
        dup=copy.deepcopy(source)
        dup["records"][1]["sun"]["sunriseUtc"]=dup["records"][0]["sun"]["sunriseUtc"]
        with self.assertRaises(ValueError):
            verify_batch(dup["records"],TEN_CITY_IDS)
        unknown=copy.deepcopy(source)
        unknown["records"][0]["cityId"]="not-a-release-city"
        with self.assertRaises(ValueError):
            verify_batch(unknown["records"],TEN_CITY_IDS)
    def test_no_fabricated_approved_research(self):
        for field,value in (
            ("scientificApproval",True),("indexingAuthorized",True),
            ("publicationAuthorized",True),("approvedClaimsForDeepSeek",["bad"])
        ):
            raw=ten_city_research_batch()
            raw[field]=value
            with self.subTest(field=field),self.assertRaises(ValueError):
                make_rolling_previews(raw)
        raw=ten_city_research_batch()
        raw["records"][5]["methodology"]["siderealMethodIndependentlyCalibrated"]=True
        with self.assertRaises(ValueError):
            make_rolling_previews(raw)

if __name__=="__main__":
    unittest.main()
