import unittest
from panchavani.external_compare import compare_external

class ExternalComparatorTests(unittest.TestCase):
    def candidate(self):
        return {
            "city":{"id":"delhi","tz":"Asia/Kolkata"},
            "localDate":"2026-10-13",
            "sun":{"sunriseUtc":"2026-10-13T00:50:00Z",
                   "sunsetUtc":"2026-10-13T12:24:00Z",
                   "nextSunriseUtc":"2026-10-14T00:50:00Z"},
            "transitions":[
                {"type":"tithi","value":"Shukla Tritiya",
                 "startUtc":"2026-10-13T00:50:00Z","endUtc":"2026-10-13T17:57:00Z"},
                {"type":"tithi","value":"Shukla Chaturthi",
                 "startUtc":"2026-10-13T17:57:00Z","endUtc":"2026-10-14T00:50:00Z"},
            ],
        }
    def bundle(self):
        return {
          "city":"delhi","date":"2026-10-13","timezone":"Asia/Kolkata",
          "references":[{
              "sourceId":name, "upstreamFamily":family,
              "methodEvidence":{"calculationMethod":"documented-method",
                  "coordinateConvention":"specified-convention","timeStandard":"IST",
                  "reviewedBy":"reviewer","provenanceUrl":"https://example.invalid/a"},
              "observations":[{"type":"sunrise","instant":time,
                               "precisionSeconds":60},
                              {"type":"tithiEnd","label":"Shukla Tritiya",
                               "instant":"2026-10-13T23:27:00+05:30",
                               "precisionSeconds":60}],
          } for name,family,time in [
              ("primary-research","source-family-a","2026-10-13T06:20:00+05:30"),
              ("secondary-research","source-family-b","2026-10-13T06:20:00+05:30")
          ]]
        }
    def test_matching_dated_events_are_only_research(self):
        res=compare_external(self.candidate(),self.bundle())
        self.assertEqual(len(res["samples"]),4)
        self.assertEqual(res["issues"],[])
        self.assertTrue(all(v["withinExploratoryTolerance"] for v in res["samples"]))
        self.assertFalse(res["methodologicalIndependenceVerified"])
        self.assertFalse(res["publicationAuthorized"])
    def test_shared_provider_flagged(self):
        b=self.bundle()
        b["references"][1]["upstreamFamily"]="source-family-a"
        self.assertIn("same-upstream-source-used-more-than-once",
                      compare_external(self.candidate(),b)["issues"])
    def test_bad_time_and_far_off_data_flagged(self):
        b=self.bundle()
        b["references"][0]["observations"][0]["instant"]="06:20"
        b["references"][1]["observations"][0]["instant"]="2026-10-13T07:30:00+05:30"
        res=compare_external(self.candidate(),b)
        self.assertIn("invalid-timestamp-or-precision",res["issues"])
        self.assertIn("large-unexplained-observation-discrepancy",res["issues"])
    def test_clipped_next_sunrise_is_not_fake_phase_boundary(self):
        b=self.bundle()
        b["references"][0]["observations"]=[{
            "type":"tithiEnd","label":"Shukla Chaturthi",
            "instant":"2026-10-14T06:20:00+05:30","precisionSeconds":60}]
        self.assertIn("missing-matched-computed-event",
                      compare_external(self.candidate(),b)["issues"])
    def test_city_timezone_mismatch_rejected(self):
        b=self.bundle();b["timezone"]="Europe/London"
        with self.assertRaises(ValueError): compare_external(self.candidate(),b)
    def test_missing_provenance_not_assumed_independent(self):
        b=self.bundle()
        del b["references"][0]["methodEvidence"]
        self.assertIn("missing-documented-methodology",
                      compare_external(self.candidate(),b)["issues"])
if __name__=="__main__":
    unittest.main()
