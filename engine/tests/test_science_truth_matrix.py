"""Synthetic-only science matrix fixtures cannot mint scientific permission."""
import copy,unittest
from panchavani.science_truth_matrix import compute_truth_matrix
from tests.test_science_factpack_handoff import inputs

def pair():
 j,s=inputs()
 for dawn in s["cityDawnComparisons"]:
  dawn["differences"]={k:0.0 for k in (
   "ayanamsaArcsec","moonTropicalArcsec","sunTropicalArcsec",
   "moonSiderealArcsec","sunSiderealArcsec","yogaPhaseArcsec")}
 s["boundaryComparisons"]=[{
   "kind":kind,"endingNumber":i+1,"jplUtc":"2026-10-20T12:00:00Z",
   "swissMinusJplSeconds":float(i+1),"status":"independently-solved"
 } for kind in ("tithi","karana","nakshatra","yoga") for i in range(4)]
 return j,s

class ScientificTruthTests(unittest.TestCase):
 def test_21_distinct_days_and_sixteen_unapproved_comparisons(self):
  j,s=pair()
  r=compute_truth_matrix(j,s,"a"*64,"b"*64)
  self.assertEqual(r["comparisons"]["dailyCityDawns"],21)
  self.assertEqual(r["comparisons"]["boundaries"],16)
  self.assertFalse(r["scientificApproval"])
  self.assertFalse(r["modelInvocationAuthorized"])
  self.assertFalse(r["indexingAuthorized"])
  self.assertFalse(r["methodEquivalenceEstablished"])
  self.assertTrue(all(not x["historicalCandidateReconciled"] for x in r["cityDayRows"]))
 def test_excluded_swiss_day_blocks(self):
  j,s=pair();s["cityDawnComparisons"].pop()
  with self.assertRaises(ValueError):compute_truth_matrix(j,s,"a"*64,"b"*64)
 def test_swiss_misassigned_day_blocks(self):
  j,s=pair();s["cityDawnComparisons"][0]["cityId"]="jaipur"
  with self.assertRaises(ValueError):compute_truth_matrix(j,s,"a"*64,"b"*64)
 def test_incomplete_numeric_independent_measurement_blocks(self):
  j,s=pair();s["cityDawnComparisons"][0]["differences"]={"ayanamsaArcsec":0.0}
  with self.assertRaises(ValueError):compute_truth_matrix(j,s,"a"*64,"b"*64)
 def test_no_fake_solved_boundary(self):
  j,s=pair();s["boundaryComparisons"][0]["swissMinusJplSeconds"]=None
  with self.assertRaises(ValueError):compute_truth_matrix(j,s,"a"*64,"b"*64)
 def test_missing_solver_is_review_only(self):
  j,s=pair();s["boundaryComparisons"][0].update(
   status="independent-crossing-not-bracketed-NEEDS_EXPERT_REVIEW",
   swissMinusJplSeconds=None)
  r=compute_truth_matrix(j,s,"a"*64,"b"*64)
  self.assertEqual(r["comparisons"]["unresolvedBoundaries"],1)
  self.assertFalse(r["scientificApproval"])
 def test_even_perfect_label_agreement_does_not_prove_method(self):
  j,s=pair()
  r=compute_truth_matrix(j,s,"a"*64,"b"*64)
  self.assertEqual(r["comparisons"]["nakshatraLabelDisagreements"],0)
  self.assertFalse(r["methodEquivalenceEstablished"])
  self.assertFalse(r["pacDailyReferenceComparedAgainstExactMatchingDate"])
if __name__=="__main__":unittest.main()
