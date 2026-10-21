import unittest
from panchavani.reference_discrepancy import triage

def benchmark(errors):
    return {
        "artifactType":"PANCHAVANI_REFERENCE_ACCURACY_BENCHMARK",
        "status":"UNAPPROVED_COMPARISON","scientificApproval":False,
        "muhuratRecommendationsAuthorized":False,"publicationAuthorized":False,
        "indexingAuthorized":False,"approvedClaimsForDeepSeek":[],
        "sampleCount":len(errors),
        "comparisons":[{"cityId":"delhi","localDate":"2026-10-21",
          "kind":"tithi","signedErrorSeconds":e,"absoluteErrorSeconds":abs(e),
          "referencePrecisionSeconds":60} for e in errors]
    }

class TriageTests(unittest.TestCase):
    def test_review_bands_and_no_approval(self):
        out=triage(benchmark([6.82,31.44,45.58,70.99,82.73,86.99,180]))
        self.assertEqual(out["countsByStatus"]["WITHIN_SOURCE_DISPLAY_RESOLUTION"],3)
        self.assertEqual(out["countsByStatus"]["ABOVE_DISPLAY_RESOLUTION_REVIEW_METHOD"],3)
        self.assertEqual(out["countsByStatus"]["LARGE_DISCREPANCY_REQUIRES_INVESTIGATION"],1)
        self.assertFalse(out["overallMethodAccuracyCertified"])
        self.assertFalse(out["publicationAuthorized"])
        self.assertTrue(all(not x["astronomicalAccuracyCertified"] for x in out["samples"]))
    def test_reject_forged_science_and_mismatched_error(self):
        data=benchmark([12])
        data["comparisons"][0]["absoluteErrorSeconds"]=22
        with self.assertRaises(ValueError):
            triage(data)
        data=benchmark([12])
        data["publicationAuthorized"]=True
        with self.assertRaises(ValueError):
            triage(data)
        data=benchmark([12])
        data["sampleCount"]=2
        with self.assertRaises(ValueError):
            triage(data)
if __name__=="__main__":
    unittest.main()
