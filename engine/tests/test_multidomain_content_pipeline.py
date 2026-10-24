"""Synthetic research cohorts exercise structure, never certify lunar astronomy."""
import copy
import unittest
from panchavani.multidomain_content_pipeline import (
 build_content_inventory,REQUIRES_RITUAL,RITUAL_TOPICS
)
from test_monthly_release_candidates import cohort_data
from panchavani.monthly_release_candidates import build_review_queue

class MultiIntentInventoryTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  report,inputs=cohort_data()
  cls.queue=build_review_queue(report,inputs)
 def test_realistic_full_month_generates_no_public_or_deepseek_calls(self):
  result=build_content_inventory(self.queue)
  self.assertEqual(result["month"],"2027-02")
  self.assertEqual(result["cityCount"],10)
  self.assertEqual(result["dailyJobs"],280)
  self.assertEqual(result["monthlyJobs"],10)
  self.assertEqual(result["ritualResearchTopics"],80)
  self.assertEqual(result["totalTopics"],370)
  self.assertEqual(len(result["jobs"]),370)
  self.assertEqual(result["billableDeepSeekRequests"],0)
  self.assertEqual(result["seoRoutesAdded"],0)
  self.assertFalse(result["modelInvocationAuthorized"])
  self.assertFalse(result["publicationAuthorized"])
  self.assertTrue(all(not item["indexingAuthorized"] and
      not item["modelInvocationAuthorized"] and
      not item["paidGenerationAuthorized"] and
      item["approvedClaimsForDeepSeek"]==[]
      for item in result["jobs"]))
 def test_every_daily_city_date_has_own_source_hash_and_transitions(self):
  result=build_content_inventory(self.queue)
  days=[x for x in result["jobs"] if x["pageType"]=="daily-panchang"]
  self.assertEqual(len({(x["cityId"],x["date"]) for x in days}),len(days))
  self.assertEqual(len({x["editorialTaskSha256"] for x in days}),len(days))
  self.assertEqual(len({x["sourceHashes"][0] for x in days}),len(days))
  self.assertTrue(all(x["privateModeledFacts"]["cityReference"]["coordinatesVerified"] is False
     and len(x["privateModeledFacts"]["panchangAtSunrise"])==6
     and len(x["privateModeledFacts"]["transitions"])==4 for x in days))
  self.assertTrue(all(x["proposedPath"]==f'/panchang/{x["cityId"]}/{x["date"]}/' for x in days))
  monthly=[x for x in result["jobs"] if x["pageType"]=="calendar-month"]
  self.assertTrue(all(len(x["privateModeledFacts"]["dayHashes"])==28 for x in monthly))
 def test_festival_vrat_muhurat_without_sourced_rule_are_never_date_routes(self):
  result=build_content_inventory(self.queue)
  rituals=[x for x in result["jobs"] if x["pageType"] in REQUIRES_RITUAL]
  self.assertEqual(len(rituals),80)
  self.assertTrue(all(x["proposedPath"] is None and
     x["requiredRulePackId"] is None and
     x["independentRulePackRequired"] and
     len(x["reviewRequirements"])>=4 and x["privateModeledFacts"]["sourceDayCount"]==28
     for x in rituals))
  self.assertEqual(set(x["pageType"] for x in rituals),set(RITUAL_TOPICS))
 def test_forged_approvals_coordinates_and_missing_days_fail_closed(self):
  for case in ("approve","deepseek","geo","lahiri","duplicate","missing",
               "bad-hash","wrong-city","fake-review"):
   q=copy.deepcopy(self.queue)
   first=q["reviewCandidates"][0]
   if case=="approve":q["publicationAuthorized"]=True
   if case=="deepseek":first["modelInvocationAuthorized"]=True
   if case=="geo":first["cityReference"]["coordinatesVerified"]=True
   if case=="lahiri":first["methodology"]["siderealMethodIndependentlyCalibrated"]=True
   if case=="duplicate":q["reviewCandidates"][1]=copy.deepcopy(first)
   if case=="missing":q["reviewCandidates"].pop()
   if case=="bad-hash":first["sourceRecordHash"]="invalid"
   if case=="wrong-city":first["cityId"]="bogus"
   if case=="fake-review":first["humanApproved"]=True
   with self.subTest(case=case),self.assertRaises(ValueError):
    build_content_inventory(q)
 def test_stable_deterministic_inventory_and_fact_digests(self):
  one=build_content_inventory(self.queue)
  two=build_content_inventory(copy.deepcopy(self.queue))
  self.assertEqual(one,two)
  self.assertNotEqual(one["jobs"][0]["editorialTaskSha256"],one["jobs"][1]["editorialTaskSha256"])
if __name__=="__main__":unittest.main()
