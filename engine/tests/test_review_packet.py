import unittest
from panchavani.review_packet import review_packet
class ReviewPacketTests(unittest.TestCase):
    def sample(self):
        return {"status":"RESEARCH_ONLY","publicReleaseAllowed":False,
          "scientificIndependence":"NOT_VALIDATED",
          "cases":[{"status":"UNAPPROVED","city":"delhi","localDate":"2026-10-13"}],
          "blockingReasons":["unverified-methodology"]}
    def test_review_only_packet_is_not_an_approval(self):
        p=review_packet(self.sample(),"a"*64)
        self.assertFalse(p["releaseAuthorized"])
        self.assertFalse(p["indexingAuthorized"])
        self.assertEqual(p["recordCount"],1)
    def test_forged_public_release_or_missing_blockers_fails(self):
        a=self.sample();a["publicReleaseAllowed"]=True
        with self.assertRaises(ValueError):review_packet(a,"a"*64)
        a=self.sample();a["blockingReasons"]=[]
        with self.assertRaises(ValueError):review_packet(a,"a"*64)
    def test_duplicate_scope_and_forged_approval_fails(self):
        a=self.sample();a["cases"]=a["cases"]*2
        with self.assertRaises(ValueError):review_packet(a,"a"*64)
        a=self.sample();a["cases"][0]["status"]="approved"
        with self.assertRaises(ValueError):review_packet(a,"a"*64)
if __name__=="__main__":
    unittest.main()
