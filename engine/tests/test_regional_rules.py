import unittest
from panchavani.regional_rules import evaluate_local_predicate

class RegionalRulesTests(unittest.TestCase):
    def record(self):
        return {
          "status":"calculated","localDate":"2026-10-13",
          "city":{"id":"delhi","catalogVersion":"pilot-unverified-v1"},
          "methodology":{"rulePackId":"NONE"},
          "validation":{"blockerCount":4},
          "sun":{"sunriseUtc":"2026-10-13T00:50:00Z",
                 "nextSunriseUtc":"2026-10-14T00:51:00Z"},
          "panchangAtSunrise":{"tithi":"Shukla Tritiya"},
          "transitions":[{"type":"tithi","value":"Shukla Tritiya",
                           "startUtc":"2026-10-13T00:50:00Z",
                           "endUtc":"2026-10-13T17:57:00Z"},
                         {"type":"tithi","value":"Shukla Chaturthi",
                           "startUtc":"2026-10-13T17:57:00Z",
                           "endUtc":"2026-10-14T00:51:00Z"}]
        }
    def pack(self):
        return {
          "id":"qa-delhi-tithi-sunrise","version":"draft-0.1",
          "status":"DRAFT", "kind":"vrat","region":"Delhi NCT",
          "tradition":"UNREVIEWED north-Indian calendar variant",
          "cityIds":["delhi"],
          "criterion":{"type":"tithi-at-local-sunrise","equals":"Shukla Tritiya"},
          "sourceRefs":[],
          "independentReview":{"status":"PENDING"},
        }
    def test_matching_tithi_is_not_a_festival_or_vrat_approval(self):
        result=evaluate_local_predicate(self.record(),self.pack())
        self.assertTrue(result["researchPredicateMet"])
        self.assertFalse(result["observanceDetermined"])
        self.assertFalse(result["muhuratRecommended"])
        self.assertFalse(result["publicationAuthorized"])
        self.assertIn("full-ritual-eligibility-not-implemented",result["blockingReasons"])
    def test_mismatched_tithi_does_not_infer_event(self):
        pack=self.pack()
        pack["criterion"]["equals"]="Shukla Ekadashi"
        result=evaluate_local_predicate(self.record(),pack)
        self.assertFalse(result["researchPredicateMet"])
        self.assertFalse(result["observanceDetermined"])
    def test_wrong_city_blocked_even_if_tithi_matches(self):
        pack=self.pack()
        pack["cityIds"]=["mumbai"]
        result=evaluate_local_predicate(self.record(),pack)
        self.assertIn("wrong-city-or-city-scope-unknown",result["blockingReasons"])
        self.assertFalse(result["publicationAuthorized"])
    def test_missing_sunrise_or_contradictory_tithi_blocked(self):
        record=self.record()
        record["panchangAtSunrise"]["tithi"]="Krishna Amavasya"
        result=evaluate_local_predicate(record,self.pack())
        self.assertIsNone(result["researchPredicateMet"])
        self.assertIn("tithi-sunrise-evidence-inconsistent",result["blockingReasons"])
    def test_forged_verified_rulepack_never_auto_recommends_wedding(self):
        pack=self.pack()
        pack["status"]="VERIFIED"
        pack["kind"]="wedding"
        pack["sourceRefs"]=["official-1","expert-2"]
        pack["independentReview"]={"status":"VERIFIED","reviewer":"untrusted"}
        result=evaluate_local_predicate(self.record(),pack)
        self.assertFalse(result["muhuratRecommended"])
        self.assertFalse(result["indexingAuthorized"])
        self.assertIn("rulepack-not-an-explicit-research-draft",result["blockingReasons"])
    def test_unsupported_predicate_abstains(self):
        pack=self.pack()
        pack["criterion"]={"type":"best-wedding-date","equals":"yes"}
        result=evaluate_local_predicate(self.record(),pack)
        self.assertIsNone(result["researchPredicateMet"])
        self.assertFalse(result["publicationAuthorized"])
        self.assertIn("unsupported-or-missing-research-predicate",result["blockingReasons"])
if __name__=="__main__":
    unittest.main()
