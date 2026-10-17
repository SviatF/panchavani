"""Pure source contracts for isolated external astronomy research, not approval."""
import copy
import unittest
from swiss_lahiri_probe import (signed_circular_delta_deg, utc_julday,
                                validate_report)
from datetime import datetime

def fixture():
    return {
        "artifactType":"PANCHAVANI_EXTERNAL_LAHIRI_PROBE",
        "status":"UNAPPROVED_RESEARCH","swissBackend":"MOSEPH_ANALYTIC",
        "scientificApproval":False,"releaseAuthorized":False,
        "indexingAuthorized":False,"approvedClaimsForDeepSeek":[],
        "comparisons":[{
            "sampleCategory":"STRATIFIED","instantUtc":f"2026-10-{i:02d}T00:00:00+00:00",
            "differences":{"ayanamsaArcsec":0},
            "nakshatraLabelAgrees":True,"yogaLabelAgrees":True
        } for i in range(1,11)]
    }

class SwissResearchContract(unittest.TestCase):
    def test_circular_signed_difference_across_zero(self):
        self.assertAlmostEqual(signed_circular_delta_deg(.1,359.9),.2,places=7)
        self.assertAlmostEqual(signed_circular_delta_deg(359.9,.1),-.2,places=7)
    def test_timezone_required_before_swiss_utc(self):
        with self.assertRaises(ValueError):
            utc_julday(datetime(2026,10,16,0))
    def test_valid_research_report_does_not_approve(self):
        validate_report(fixture())
    def test_forged_approval_backend_or_duplicated_sample_fails(self):
        for key,val in (("scientificApproval",True),("indexingAuthorized",True),
                        ("releaseAuthorized",True),("swissBackend","SWIEPH"),
                        ("approvedClaimsForDeepSeek",["fake"])):
            a=fixture()
            a[key]=val
            with self.subTest(field=key),self.assertRaises(ValueError):
                validate_report(a)
        a=fixture()
        a["comparisons"].append(copy.deepcopy(a["comparisons"][0]))
        with self.assertRaises(ValueError):validate_report(a)
    def test_missing_cross_era_samples_refused(self):
        a=fixture()
        a["comparisons"]=a["comparisons"][:3]
        with self.assertRaises(ValueError):validate_report(a)
if __name__=="__main__":
    unittest.main()
