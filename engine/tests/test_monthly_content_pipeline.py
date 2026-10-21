import copy
import hashlib
import json
import unittest
from datetime import date

from panchavani.monthly_content_pipeline import (
    batch_starts, build_monthly_content, month_days,
)
from test_ten_city_six_limb_research import ten_city_research_batch


def prepared(month):
    result=[]
    for start in batch_starts(month):
        batch=ten_city_research_batch(date.fromisoformat(start))
        encoded=json.dumps(batch,sort_keys=True).encode()
        result.append((start,batch,hashlib.sha256(encoded).hexdigest()))
    return result


class MonthlyContentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.february=prepared("2027-02")

    def test_month_plan_handles_year_month_boundaries_and_leap_day(self):
        self.assertEqual(len(month_days("2027-02")),28)
        self.assertEqual(len(month_days("2028-02")),29)
        self.assertEqual(len(batch_starts("2027-02")),14)
        self.assertEqual(len(batch_starts("2028-02")),15)
        self.assertEqual(len(batch_starts("2027-01")),16)
        self.assertEqual(batch_starts("2027-12")[-1],"2027-12-31")
        for wrong in ("2027-13","2027-00","2027-2","1900-02","20ab-02"):
            with self.subTest(month=wrong),self.assertRaises(ValueError):
                month_days(wrong)

    def test_complete_month_has_real_city_date_reader_seeds_never_public_pages(self):
        report,briefs=build_monthly_content("2027-02",self.february)
        self.assertEqual(report["daysInMonth"],28)
        self.assertEqual(report["cityCount"],10)
        self.assertEqual(report["cityDays"],280)
        self.assertEqual(report["dailyResearchBriefs"],280)
        self.assertEqual(report["monthlyResearchBriefs"],10)
        self.assertEqual(len(briefs),290)
        self.assertEqual(len({row["dayBriefSha256"] for row in report["records"]}),280)
        self.assertEqual(report["eligibleIndexableUrls"],0)
        self.assertEqual(report["publicPagesCreated"],0)
        self.assertEqual(report["aiDraftsCreated"],0)
        self.assertFalse(report["modelInvocationAuthorized"])
        self.assertFalse(report["publicationAuthorized"])
        self.assertFalse(report["indexingAuthorized"])
        self.assertTrue(report["humanScienceReviewsRequired"])
        self.assertTrue(report["humanEditorialReviewsRequired"])
        self.assertIn("No festival, fast or Muhurat recommendation",
            briefs["days/delhi-2027-02-01-UNAPPROVED.md"])
        self.assertIn("preceding city's recorded dawn",
            briefs["days/delhi-2027-02-02-UNAPPROVED.md"])
        self.assertIn("28 complete local solar days",
            briefs["months/kolkata-2027-02-UNAPPROVED.md"])

    def test_missing_or_duplicate_batch_fails_closed(self):
        with self.assertRaisesRegex(ValueError,"Missing, duplicate"):
            build_monthly_content("2027-02",self.february[:-1])
        with self.assertRaisesRegex(ValueError,"Missing, duplicate"):
            build_monthly_content("2027-02",self.february+[self.february[0]])

    def test_unapproved_science_cannot_be_forged_into_public_release(self):
        source=copy.deepcopy(self.february)
        source[0][1]["publicationAuthorized"]=True
        with self.assertRaises(ValueError):
            build_monthly_content("2027-02",source)
        source=copy.deepcopy(self.february)
        source[0][1]["records"][0]["methodology"]["siderealMethodIndependentlyCalibrated"]=True
        with self.assertRaises(ValueError):
            build_monthly_content("2027-02",source)

    def test_duplicate_or_wrong_source_identifiers_abort(self):
        source=copy.deepcopy(self.february)
        source[0]=(source[0][0],source[0][1],"not-a-sha")
        with self.assertRaises(ValueError):
            build_monthly_content("2027-02",source)
        source=copy.deepcopy(self.february)
        source[0][1]["records"][0]["cityId"]="unknown"
        with self.assertRaises(ValueError):
            build_monthly_content("2027-02",source)


if __name__=="__main__":
    unittest.main()
