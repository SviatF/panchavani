"""Pure source contracts for isolated external astronomy research, not approval."""
import copy
import unittest
from swiss_lahiri_probe import (signed_circular_delta_deg, utc_julday,
                                validate_report, find_swiss_boundary)
from datetime import datetime, timezone, timedelta
from unittest.mock import patch

def fixture():
    return {
        "artifactType":"PANCHAVANI_EXTERNAL_LAHIRI_PROBE",
        "status":"UNAPPROVED_RESEARCH","swissBackend":"MOSEPH_ANALYTIC",
        "scientificApproval":False,"releaseAuthorized":False,
        "indexingAuthorized":False,"approvedClaimsForDeepSeek":[],
        "independentBoundaryComparisons":[{"kind":"tithi","endingNumber":6,"swissMinusJplSeconds":0.0,"publicationApproved":False,"sameMoonSunEphemerisFamily":False}],
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
    def test_independent_angular_root_solver_near_jpl_transition(self):
        pivot=datetime(2026,10,16,12,0,tzinfo=timezone.utc)
        crossing=pivot+timedelta(seconds=47)
        def fake_phase(kind,instant):
            # Smooth monotone synthetic 12-degree Tithi boundary
            return 72.0+(instant-crossing).total_seconds()/3600
        with patch('swiss_lahiri_probe.swiss_phase',side_effect=fake_phase):
            result=find_swiss_boundary("tithi",pivot,6)
        self.assertLess(abs((result-crossing).total_seconds()),.1)
        with self.assertRaises(ValueError):
            find_swiss_boundary("tithi",pivot,31)
    def test_incomplete_or_fake_approval_of_solved_events_rejected(self):
        a=fixture();a["independentBoundaryComparisons"]=[]
        with self.assertRaises(ValueError):validate_report(a)
        a=fixture();a["independentBoundaryComparisons"][0]["publicationApproved"]=True
        with self.assertRaises(ValueError):validate_report(a)
    def test_missing_cross_era_samples_refused(self):
        a=fixture()
        a["comparisons"]=a["comparisons"][:3]
        with self.assertRaises(ValueError):validate_report(a)
if __name__=="__main__":
    unittest.main()
