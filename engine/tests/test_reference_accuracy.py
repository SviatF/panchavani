import copy
import unittest
from datetime import date, datetime, timezone

from panchavani.muhurat_windows import intersection_grid
from panchavani.reference_accuracy import benchmark
from test_ten_city_six_limb_research import ten_city_research_batch


class ExternalBenchmarkTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.grid = intersection_grid(ten_city_research_batch(start=date(2027,1,1)))

    def manifest(self):
        row=self.grid["windows"][0]
        start=datetime.fromisoformat(row["modeledSunriseUtc"].replace("Z","+00:00"))
        from datetime import timedelta
        ref=(start+timedelta(seconds=30)).isoformat().replace("+00:00","Z")
        return {
            "artifactType":"PANCHAVANI_INDEPENDENT_REFERENCE_TIMINGS",
            "schemaVersion":1,"status":"EXTERNAL_UNREVIEWED",
            "scientificApproval":False,"publicationAuthorized":False,"indexingAuthorized":False,
            "samples":[{
                "cityId":row["cityId"],"localDate":row["localDate"],"kind":"sunrise",
                "referenceUtc":ref,"precisionSeconds":60,
                "source":{"provider":"TEST_ONLY_INDEPENDENT_SOURCE_NOT_VERIFIED",
                          "url":"https://example.org/manual-sunrise-reference",
                          "method":"Synthetic one-minute-granularity regression example",
                          "retrievedAt":"2026-10-20T00:00:00Z"}
            }]
        }

    def test_signed_and_absolute_error_are_separate(self):
        out=benchmark(self.grid,self.manifest())
        self.assertEqual(out["sampleCount"],1)
        self.assertEqual(out["coverageCityDays"],1)
        self.assertAlmostEqual(out["comparisons"][0]["signedErrorSeconds"],-30,places=4)
        self.assertEqual(out["metricsByKind"]["sunrise"]["p95AbsoluteErrorSeconds"],30)
        self.assertTrue(out["comparisons"][0]["withinDisplayPrecision"])
        self.assertFalse(out["scientificApproval"])
        self.assertFalse(out["publicationAuthorized"])
        self.assertEqual(out["approvedClaimsForDeepSeek"],[])

    def test_missing_provenance_and_duplicate_reference_fail_closed(self):
        for change in ["missing-url","duplicate","wrong-date","falsely-approved","naive-time"]:
            manifest=self.manifest()
            item=manifest["samples"][0]
            if change=="missing-url": del item["source"]["url"]
            if change=="duplicate":manifest["samples"].append(copy.deepcopy(item))
            if change=="wrong-date":item["localDate"]="2030-01-01"
            if change=="falsely-approved":manifest["publicationAuthorized"]=True
            if change=="naive-time":item["referenceUtc"]="2027-01-01T06:30:00"
            with self.subTest(change=change),self.assertRaises(ValueError):
                benchmark(self.grid,manifest)

    def test_cannot_claim_scientific_accuracy_from_synthetic_source(self):
        out=benchmark(self.grid,self.manifest())
        self.assertFalse(out["comparisons"][0]["independentlyVerified"])
        self.assertFalse(out["muhuratRecommendationsAuthorized"])


if __name__=="__main__":
    unittest.main()
