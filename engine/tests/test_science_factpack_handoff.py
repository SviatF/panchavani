"""Only SYNTHETIC inputs: verify the review handoff cannot self-approve."""
import copy,unittest
from datetime import date,timedelta
from panchavani.science_factpack_handoff import build_handoff,canon,sha
from tests.test_seven_day_science_pilot import week

def inputs():
    rows=week()
    science={
       "artifactType":"PANCHAVANI_THREE_CITY_SEVEN_DAY_INDEPENDENT_RECOMPUTATION_RESEARCH",
       "scientificApproval":False,"approvedClaimsForDeepSeek":[],
       "localDates":[(date(2026,10,20)+timedelta(days=i)).isoformat() for i in range(7)],
       "records":rows}
    swiss={"artifactType":"PANCHAVANI_21_CITY_DAY_SWISS_ANALYTIC_DIAGNOSTIC",
       "scientificApproval":False,"approvedClaimsForDeepSeek":[],
       "modelInvocationAuthorized":False,"compared21RealCityDawns":21,
       "comparator":"SYNTHETIC_COMPARATOR_NOT_REAL_EVIDENCE",
       "cityDawnComparisons":[{
           "cityId":r["cityId"],"localDate":r["localDate"],
           "sunriseUtc":r["sun"]["sunriseUtc"],
           "nakshatraLabelAgrees":True,"yogaLabelAgrees":True,
           "differences":{"ayanamsaArcsec":0.0}} for r in rows]}
    return science,swiss

class ReviewerPack(unittest.TestCase):
 def build(self):
    a,b=inputs()
    return build_handoff(a,b,"a"*64,"b"*64)
 def test_produces_21_nonapprovable_factpacks(self):
    records=self.build()
    self.assertEqual(len(records),21)
    self.assertEqual(len({(r["cityId"],r["localDate"]) for r in records}),21)
    for row in records:
        self.assertEqual(row["status"],"REQUIRES_OUTSIDE_EXPERT_REVIEW")
        self.assertFalse(row["scientificApproval"])
        self.assertFalse(row["modelInvocationAuthorized"])
        self.assertFalse(row["publicationAuthorized"])
        self.assertFalse(row["indexingAuthorized"])
        self.assertEqual(row["approvedClaimsForDeepSeek"],[])
        self.assertIsNone(row["unapprovedFactpackTemplate"]["approval"])
        self.assertIsNone(row["unapprovedFactpackTemplate"]["scienceReview"])
        self.assertEqual(row["unapprovedFactpackTemplate"]["cityFacts"],[])
        self.assertNotEqual(row["unapprovedFactpackTemplate"]["status"],
                            "SCIENCE_APPROVED_WITH_EVIDENCE")
 def test_wrong_swiss_city_day_hash_binding_rejected(self):
    a,b=inputs()
    b["cityDawnComparisons"][0]["sunriseUtc"]="2026-10-20T22:11:00+00:00"
    with self.assertRaises(ValueError):build_handoff(a,b,"a"*64,"b"*64)
 def test_missing_or_duplicated_swiss_day_rejected(self):
    a,b=inputs()
    b["cityDawnComparisons"][0]=copy.deepcopy(b["cityDawnComparisons"][1])
    with self.assertRaises(ValueError):build_handoff(a,b,"a"*64,"b"*64)
 def test_forged_approval_rejected(self):
    a,b=inputs();a["scientificApproval"]=True
    with self.assertRaises(ValueError):build_handoff(a,b,"a"*64,"b"*64)
    a,b=inputs();b["approvedClaimsForDeepSeek"]=["fake"]
    with self.assertRaises(ValueError):build_handoff(a,b,"a"*64,"b"*64)
 def test_sha_source_tamper_resistance(self):
    first,_=inputs()
    orig=sha(canon(first["records"][0]))
    first["records"][0]["panchangAtSunrise"]["nakshatra"]="Other"
    self.assertNotEqual(orig,sha(canon(first["records"][0])))
if __name__=="__main__":unittest.main()
