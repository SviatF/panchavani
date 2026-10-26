"""Synthetic cert tests: no science signature, no model charge, no SEO release."""
import json,hashlib,unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from panchavani.science_certification_v1 import build,sha
from panchavani.science_factpack_handoff import build_handoff
from tests.test_science_factpack_handoff import inputs

def fixture(root):
    j,s=inputs()
    j["scopeCities"]=["delhi","mumbai","chennai"]
    s["independentBoundarySampleCount"]=16
    s["uniqueOrdinaryPhaseBoundarySampling"]=True
    s["targetedPACVanijDiscrepancy"]={
     "kind":"karana","endingNumber":21,"dateLabel":"2026-10-21",
     "swissMinusJplSeconds":0.84,"swissMinusPACSeconds":567.84,
     "sourceSnapshotReviewed":False,"methodEquivalenceEstablished":False,
     "scientificApproval":False}
    j_sha="a"*64;s_sha="b"*64;p_sha="c"*64
    packs=build_handoff(j,s,j_sha,s_sha)
    manifest={"count":len(packs),"sourceJplSha256":j_sha,"sourceSwissSha256":s_sha,
        "independentScientificApproval":False,"modelInvocationAuthorized":False,"records":[]}
    for r in packs:
        fn=r["cityId"]+"-"+r["localDate"]+"-UNAPPROVED.json"
        content=json.dumps(r,sort_keys=True).encode()
        (root/fn).write_bytes(content)
        manifest["records"].append({"cityId":r["cityId"],"localDate":r["localDate"],
                                    "filename":fn,"sha256":sha(content)})
    pac={"artifactType":"PANCHAVANI_PAC_DATE_MATCHED_UNAPPROVED_GEO_LIMB_COMPARISON",
      "cohort":{"localDates":j["localDates"]},"approvedCitySunriseClaims":0,
      "scienceApproval":False,"PACDateMatchedCount":7,"officialPublishedPhenomenaReferenced":35,
      "sourceAndMethodDiscrepancyCount":1,"dates":[]}
    for d in j["localDates"]:
        pac["dates"].append({"gregorianDate":d,"status":"OFFICIAL_PAC_RESEARCH_TRANSCRIPTION_METHOD_UNCERTIFIED",
          "referenceFixtureSha256":sha(d.encode()),
          "deltas":[{"kind":"karana","number":21,"computedMinusPacSeconds":567.0,
            "requiresSourceAndMethodInvestigation":True}] if d=="2026-10-21" else []})
    return j,j_sha,s,s_sha,pac,p_sha,manifest

class CertificationTests(unittest.TestCase):
 def test_real_reviewer_is_required_even_with_all_matching_sources(self):
  with TemporaryDirectory() as t:
   src=Path(t)
   j,js,s,ss,p,ps,m=fixture(src)
   x=build(j,js,s,ss,p,ps,m,src)
   self.assertEqual(len(x["rows"]),21)
   self.assertEqual(x["eligibleForModel"],0)
   self.assertEqual(x["approvedForPublicSearch"],0)
   self.assertEqual(x["pacPhenomenaCompared"],35)
   self.assertEqual(x["pacSourceMethodOutlierCount"],1)
   self.assertFalse(x["paidDeepSeekRunAuthorized"])
   self.assertFalse(x["publicationAuthorized"])
   self.assertIsNone(x["scientificReviewer"])
 def test_packet_tamper_fails(self):
  with TemporaryDirectory() as t:
   src=Path(t);j,js,s,ss,p,ps,m=fixture(src)
   (src/m["records"][0]["filename"]).write_text("corrupted")
   with self.assertRaises(ValueError):build(j,js,s,ss,p,ps,m,src)
 def test_fake_approval_fails(self):
  with TemporaryDirectory() as t:
   src=Path(t);j,js,s,ss,p,ps,m=fixture(src)
   s["scientificApproval"]=True
   with self.assertRaises(ValueError):build(j,js,s,ss,p,ps,m,src)
 def test_missing_independent_anomaly_fails(self):
  with TemporaryDirectory() as t:
   src=Path(t);j,js,s,ss,p,ps,m=fixture(src)
   s["targetedPACVanijDiscrepancy"]=None
   with self.assertRaises(ValueError):build(j,js,s,ss,p,ps,m,src)
 def test_historical_source_provenance_cannot_be_relabelled_as_same_bytes(self):
  with TemporaryDirectory() as t:
   src=Path(t);j,js,s,ss,p,ps,m=fixture(src)
   r=m["records"][0]
   pkt=json.loads((src/r["filename"]).read_text())
   pkt["sourceIdentity"]["matchesHistoricalD1R2OriginalByteSha"]=True
   raw=json.dumps(pkt,sort_keys=True).encode()
   (src/r["filename"]).write_bytes(raw)
   r["sha256"]=sha(raw)
   with self.assertRaises(ValueError):build(j,js,s,ss,p,ps,m,src)
if __name__=="__main__":unittest.main()
