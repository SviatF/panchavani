import copy
import json
import unittest
from datetime import date
from pathlib import Path
from panchavani.pac_regional_months import (
    validate_regional_source, exact_month_start, regional_comparison_report
)
FIXTURE=Path(__file__).resolve().parents[1]/"fixtures"/"pac-rashtriya-2026-selected-regional-solar-UNREVIEWED.json"

class PACRegionalMonthsTests(unittest.TestCase):
    def setUp(self):
        self.raw=FIXTURE.read_bytes()
        self.source=json.loads(self.raw)
    def test_exact_government_reported_solar_start_by_school(self):
        validate_regional_source(self.source)
        self.assertEqual(exact_month_start(self.source,"punjab-haryana-odisha",date(2026,10,17))["localMonthName"],"Kartika")
        self.assertEqual(exact_month_start(self.source,"bengal-assam",date(2026,10,18))["localMonthName"],"Kartika")
        self.assertEqual(exact_month_start(self.source,"tamil-nadu",date(2026,10,18))["localMonthName"],"Arppisi")
        self.assertEqual(exact_month_start(self.source,"kerala",date(2026,10,18))["localMonthName"],"Thula")
    def test_no_invention_for_missing_month_or_wrong_calendar_school(self):
        self.assertIsNone(exact_month_start(self.source,"bengal-assam",date(2026,10,17)))
        self.assertIsNone(exact_month_start(self.source,"tamil-nadu",date(2026,10,19)))
        with self.assertRaises(ValueError):
            exact_month_start(self.source,"north-india-lunar",date(2026,10,18))
    def test_source_shows_real_region_variation_but_zero_releases(self):
        report=regional_comparison_report(self.source,self.raw)
        self.assertTrue(report["observedRegionSpecificVariation"])
        self.assertEqual([v["spreadDays"] for v in report["regionalSolarBoundaryGroups"]],[1,1])
        self.assertFalse(report["festivalOrVratDatesAuthorized"])
        self.assertFalse(report["indexingAuthorized"])
        self.assertFalse(report["publicationAuthorized"])
    def test_modified_source_or_forged_approval_fails(self):
        f=copy.deepcopy(self.source);f["publishingAllowed"]=True
        with self.assertRaises(ValueError):validate_regional_source(f)
        f=copy.deepcopy(self.source);f["monthStarts"][0]["regionId"]="unknown"
        with self.assertRaises(ValueError):validate_regional_source(f)
        f=copy.deepcopy(self.source);f["monthStarts"][1]["gregorianStart"]="2026-10-19"
        with self.assertRaises(ValueError):validate_regional_source(f)
if __name__=="__main__":
    unittest.main()
