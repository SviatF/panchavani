"""Integration tests: research Muhurat temporal lattice is NOT a ritual selector."""
from __future__ import annotations

import copy
import unittest

from panchavani.muhurat_windows import intersection_grid,draft_rule_filter
from test_ten_city_six_limb_research import ten_city_research_batch

class MuhuratIntervalTests(unittest.TestCase):
    def grid(self):
        return intersection_grid(ten_city_research_batch())

    def spec(self):
        return {
          "id":"hypothetical-wedding-criteria-test",
          "version":"SYNTHETIC-ONLY-v1",
          "status":"DRAFT",
          "kind":"wedding",
          "region":"TEST_REGION_NOT_OFFICIAL",
          "tradition":"SYNTHETIC_NOT_A_REAL_TRADITION",
          "independentReview":{"status":"PENDING"},
          "cityIds":["delhi","mumbai"],
          "experimentalSelectors":{"tithi":["Shukla Shashthi"],"nakshatra":["Jyestha"]},
          "minimumSeconds":300,
          "sourceRefs":[]
        }

    def test_real_shape_ten_cities_twenty_days_four_layers(self):
        out=self.grid()
        self.assertEqual(out["cityCount"],10)
        self.assertEqual(out["cityDays"],20)
        self.assertEqual(len(out["windows"]),20)
        self.assertEqual(len({(r["cityId"],r["localDate"]) for r in out["windows"]}),20)
        self.assertFalse(out["scientificApproval"])
        self.assertFalse(out["publicationAuthorized"])
        self.assertFalse(out["indexingAuthorized"])
        self.assertFalse(out["muhuratRecommendationsAuthorized"])
        self.assertEqual(out["approvedClaimsForDeepSeek"],[])
        for row in out["windows"]:
            self.assertEqual(row["windowCount"],1)
            window=row["windows"][0]
            self.assertEqual(window["durationSeconds"],86400)
            self.assertEqual(set(window["elements"]),{"tithi","karana","nakshatra","yoga"})
            self.assertFalse(window["auspiciousRecommendation"])
            self.assertEqual(window["sunlightContext"],"STRADDLES_SUNSET")

    def test_single_research_grid_can_evaluate_experimental_filters_without_muhurat(self):
        grid=self.grid()
        result=draft_rule_filter(grid,self.spec())
        self.assertEqual(result["status"],"DRAFT_RESEARCH_ONLY")
        self.assertEqual(result["matchingWindowCount"],4)
        self.assertTrue(all(not w["muhuratRecommended"] for w in result["matches"]))
        self.assertFalse(result["muhuratRecommendationsAuthorized"])
        self.assertFalse(result["publicationAuthorized"])
        self.assertEqual(result["approvedClaimsForDeepSeek"],[])
        self.assertEqual(result["kind"],"wedding")
        no_match=self.spec()
        no_match["experimentalSelectors"]["tithi"]=["Krishna Amavasya"]
        self.assertEqual(draft_rule_filter(grid,no_match)["matchingWindowCount"],0)

    def test_vehicle_filters_cannot_infer_lagna_or_asta(self):
        spec=self.spec()
        spec["kind"]="vehicle-purchase"
        spec["experimentalSelectors"]={"karana":["Kaulava"]}
        result=draft_rule_filter(self.grid(),spec)
        self.assertFalse(result["regionalValidityConfirmed"])
        self.assertFalse(result["ruleMethodApproved"])
        self.assertIn("Asta and Lagna applicability",result["missingChecks"])
        self.assertTrue(all(x["experimentalSelectorMatched"] for x in result["matches"]))

    def test_forged_approved_status_or_ritual_signoff_is_rejected(self):
        grid=self.grid()
        for patch in [
          {"indexingAuthorized":True},{"scientificApproval":True},
          {"approvedClaimsForDeepSeek":["invent a date"]},
          {"publicationAuthorized":True}
        ]:
            with self.subTest(patch=patch), self.assertRaises(ValueError):
                draft_rule_filter({**grid,**patch},self.spec())
        for override in [
          {"status":"APPROVED"},
          {"independentReview":{"status":"VERIFIED"}},
          {"kind":"funeral"},
          {"tradition":""},
          {"experimentalSelectors":{}},
          {"experimentalSelectors":{"tithi":["Shukla Shashthi","Shukla Shashthi"]}},
          {"experimentalSelectors":{"lagna":["Capricorn"]}},
          {"cityIds":["not-a-city"]},
          {"minimumSeconds":0}
        ]:
            s=self.spec()
            s.update(override)
            with self.subTest(override=override), self.assertRaises(ValueError):
                draft_rule_filter(grid,s)

    def test_not_falsely_treat_calendar_results_as_approved_science(self):
        raw=ten_city_research_batch()
        for key,bad in [
          ("scientificApproval",True),("indexingAuthorized",True),
          ("approvedClaimsForDeepSeek",["anything"]),("publicationAuthorized",True),
          ("cityCount",9)
        ]:
            other=copy.deepcopy(raw)
            other[key]=bad
            with self.subTest(key=key),self.assertRaises(ValueError):
                intersection_grid(other)
        wrong=copy.deepcopy(raw)
        wrong["records"][0]["sun"]["sunriseUtc"]="2027-01-01T13:00:00Z"
        with self.assertRaises(ValueError):
            intersection_grid(wrong)

if __name__=="__main__":
    unittest.main()
