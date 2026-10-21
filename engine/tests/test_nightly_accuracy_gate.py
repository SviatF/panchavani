import copy
import unittest
from panchavani.nightly_accuracy_gate import summarize, TEN, KINDS

def sample():
    records=[]
    for city in TEN:
        for kind in KINDS:
            records.append({
                "cityId":city,"localDate":"2026-10-21","kind":kind,
                "endingNumber":23 if kind=="nakshatra" else 10,
                "jplResearchTransitionUtc":"2026-10-21T14:18:11+00:00",
                "swissSiderealLahiriTransitionUtc":"2026-10-21T14:18:12+00:00",
                "swissMinusResearchSeconds":1.,
                "absoluteDifferenceSeconds":1.,
                "independentTimingAgreementApproved":False
            })
    return {"artifactType":"PANCHAVANI_SWISS_EXACT_SIDEREAL_PHASE_ROOTS",
        "status":"UNAPPROVED_REFERENCE_COMPARISON",
        "backend":"SWISS_EPHEMERIS_ONLY_NO_MOSHIER_FALLBACK",
        "checkedCityIds":list(TEN),"checkedCityDays":20,
        "comparisonCount":len(records),"comparisons":records,
        "scientificApproval":False,"muhuratRecommendationsAuthorized":False,
        "publicationAuthorized":False,"indexingAuthorized":False,
        "approvedClaimsForDeepSeek":[]}

class DailyTests(unittest.TestCase):
    def test_complete_scope_is_numeric_only(self):
        result=summarize(sample())
        self.assertEqual(result["transitionCount"],20)
        self.assertTrue(result["numericAlertPassed"])
        self.assertEqual(result["checkedCities"],10)
        self.assertFalse(result["scientificApproval"])
        self.assertFalse(result["publicationAuthorized"])
    def test_large_difference_requires_investigation(self):
        source=sample()
        source["comparisons"][0].update(absoluteDifferenceSeconds=350.,
                                        swissMinusResearchSeconds=350.)
        result=summarize(source)
        self.assertFalse(result["numericAlertPassed"])
        self.assertEqual(len(result["outliers"]),1)
    def test_no_silent_scope_reduction_or_forged_science(self):
        for mutation in ("missing","fallback","falsely_approved","bad_error","duplicate"):
            data=sample()
            if mutation=="missing":
                data["comparisons"]=data["comparisons"][:-1]
                data["comparisonCount"]-=1
            if mutation=="fallback":data["backend"]="MOSHIER"
            if mutation=="falsely_approved":data["publicationAuthorized"]=True
            if mutation=="bad_error":data["comparisons"][0]["absoluteDifferenceSeconds"]=99.
            if mutation=="duplicate":
                data["comparisons"].append(copy.deepcopy(data["comparisons"][0]))
                data["comparisonCount"]+=1
            with self.subTest(mutation=mutation),self.assertRaises(ValueError):
                summarize(data)

if __name__=="__main__":
    unittest.main()
