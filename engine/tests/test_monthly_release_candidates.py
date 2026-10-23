import copy
import hashlib
import json
import unittest
from datetime import date

from panchavani.monthly_content_pipeline import build_monthly_content,batch_starts
from panchavani.monthly_release_candidates import build_review_queue
from test_ten_city_six_limb_research import ten_city_research_batch

MONTH="2027-02"

def cohort_data():
    rows=[]
    summaries=[]
    for start in batch_starts(MONTH):
        batch=ten_city_research_batch(date.fromisoformat(start))
        for item in batch['records']:
            item['blockers']=['Scientific calendar conventions remain independently unverified']
        data=json.dumps(batch,sort_keys=True).encode()
        sha=hashlib.sha256(data).hexdigest()
        qa={
          "artifactType":"PANCHAVANI_NIGHTLY_REFERENCE_QA",
          "status":"RESEARCH_ONLY_NUMERICAL_CHECK",
          "numericAlertPassed":True,
          "checkedCities":10,"checkedCityDays":20,
          "transitionCount":40,
          "maxSwissVsJplDifferenceSeconds":.95,
          "scientificApproval":False,"publicationAuthorized":False,
          "indexingAuthorized":False,"muhuratRecommendationsAuthorized":False,
          "independentMethodCertification":False,
          "approvedClaimsForDeepSeek":[]
        }
        rows.append((start,batch,sha,qa,"e"*64))
        summaries.append((start,batch,sha))
    report,_=build_monthly_content(MONTH,summaries)
    return report,rows

class ReviewCandidatesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.report,cls.sources=cohort_data()

    def test_complete_280_candidate_queue_never_becomes_approved_pages(self):
        queue=build_review_queue(self.report,self.sources)
        self.assertEqual(queue["cityDays"],280)
        self.assertEqual(len(queue["reviewCandidates"]),280)
        self.assertEqual(queue["eligibilityForPublicRelease"],0)
        self.assertFalse(queue["publicationAuthorized"])
        self.assertFalse(queue["modelInvocationAuthorized"])
        self.assertFalse(queue["indexingAuthorized"])
        self.assertFalse(queue["deepseekReady"])
        first=queue["reviewCandidates"][0]
        self.assertIn("sunriseUtc",first["sun"])
        self.assertIn("tithi",first["panchang"])
        self.assertIn("nakshatra",first["transitions"])
        self.assertTrue(first["blockers"])
        self.assertFalse(first["humanApproved"])
        self.assertFalse(first["publicApprovedRecord"])
        self.assertNotIn("releaseEvidence",first)
        self.assertEqual(first["editorialStatus"],"NOT_GENERATED_PENDING_FACT_REVIEW")

    def test_forged_approval_and_failed_qa_are_rejected(self):
        for kind in ("release","qa","source","missing","duplicate"):
            report=copy.deepcopy(self.report)
            rows=copy.deepcopy(self.sources)
            if kind=="release":report["publicationAuthorized"]=True
            if kind=="qa":rows[0][3]["numericAlertPassed"]=False
            if kind=="source":
                start,batch,sha,qa,qsha=rows[0]
                rows[0]=(start,batch,"0"*64,qa,qsha)
            if kind=="missing":rows.pop()
            if kind=="duplicate":rows.append(rows[0])
            with self.subTest(kind=kind),self.assertRaises(ValueError):
                build_review_queue(report,rows)

    def test_geo_or_sidereal_self_approval_is_rejected(self):
        rows=copy.deepcopy(self.sources)
        rows[0][1]["records"][0]["methodology"]["siderealMethodIndependentlyCalibrated"]=True
        with self.assertRaises(ValueError):
            build_review_queue(self.report,rows)

if __name__=="__main__":
    unittest.main()
