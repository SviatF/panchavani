import unittest
from panchavani.reference_coverage import assess_coverage

def report():
    return {"artifactType":"PANCHAVANI_REFERENCE_ACCURACY_BENCHMARK",
            "status":"UNAPPROVED_COMPARISON","scientificApproval":False,
            "publicationAuthorized":False,"indexingAuthorized":False,
            "muhuratRecommendationsAuthorized":False,"sampleCount":2,
            "comparisons":[
                {"cityId":"delhi","localDate":"2026-10-21","kind":kind,
                 "referencePrecisionSeconds":60,"independentlyVerified":False,
                 "sourceLocationQualifiedForDelhi":True}
                for kind in ("sunrise","sunset")]}

class CoverageTests(unittest.TestCase):
    def test_two_solar_samples_do_not_certify_four_limbs(self):
        out=assess_coverage(report())
        self.assertEqual(out["sampleCountsByEvent"]["sunrise"],1)
        self.assertEqual(out["sampleCountsByEvent"]["sunset"],1)
        for event in ("tithi","karana","nakshatra","yoga"):
            self.assertEqual(out["sampleCountsByEvent"][event],0)
        self.assertFalse(out["hasAllTenCityEventGroups"])
        self.assertEqual(len(out["missingCityEventGroups"]),10)
        self.assertFalse(out["publicationAuthorized"])

    def test_reject_falsified_status_and_counts(self):
        for key,value in (("publicationAuthorized",True),("sampleCount",3),
                          ("scientificApproval",True)):
            r=report()
            r[key]=value
            with self.assertRaises(ValueError):
                assess_coverage(r)
        r=report()
        r["comparisons"][0]["independentlyVerified"]=True
        with self.assertRaises(ValueError):
            assess_coverage(r)

if __name__=="__main__":
    unittest.main()
