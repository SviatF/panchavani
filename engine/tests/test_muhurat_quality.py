import copy
import json
import unittest
from pathlib import Path
from datetime import date

from panchavani.muhurat_windows import intersection_grid
from panchavani.sourced_muhurat_rules import score_reference_grid
from panchavani.muhurat_quality import quality_metrics
from test_ten_city_six_limb_research import ten_city_research_batch

RULES=Path(__file__).resolve().parents[1]/"fixtures"/"muhurat-reference-rulebook-DRAFT.json"

def report():
    g=intersection_grid(ten_city_research_batch(start=date(2027,1,1)))
    return score_reference_grid(g,json.loads(RULES.read_text()))

class QualityTests(unittest.TestCase):
    def test_numeric_metrics_and_scientific_nonapproval_both_true(self):
        r=report()
        q=r["quantitativeQuality"]
        self.assertEqual(q,quality_metrics(r))
        self.assertEqual(q["cityDays"],20)
        self.assertEqual(q["sourcePhaseSlices"],20)
        self.assertEqual(q["fourLimbLabelsChecked"],80)
        self.assertTrue(q["arithmeticContinuityPassed"])
        self.assertEqual(q["maxSunriseContinuityErrorSeconds"],0)
        self.assertFalse(q["astronomicalEphemerisIndependentlyVerified"])
        self.assertFalse(q["muhuratRecommendationsAuthorized"])
        self.assertEqual(q["approvedClaimsForDeepSeek"],[])
        for kind in ("wedding","vehicle-purchase"):
            k=q["weddingAndVehicle"][kind]
            self.assertEqual(k["candidateWindowCount"],0)
            self.assertGreaterEqual(k["independentRuleCheckCountRemaining"],4)
            self.assertEqual(k["scientificallyCertifiedRecommendedWindowCount"],0)
    def test_falsified_continuity_or_invented_scientific_approval_fails(self):
        sample=report()
        changes=[
          lambda x:x["metrics"].update(maximumDurationErrorSeconds=5),
          lambda x:x["metrics"].update(maximumSunriseChainErrorSeconds=8),
          lambda x:x.update(indexingAuthorized=True),
          lambda x:x.update(muhuratRecommendationsAuthorized=True),
          lambda x:x["analysis"]["wedding"].update(allCriticalChecksComplete=True),
          lambda x:x["analysis"]["vehicle-purchase"].update(qualifyingWeddingOrPurchaseMuhuratCount=1),
          lambda x:x["analysis"]["wedding"].update(inputPhaseSlices=200),
          lambda x:x["analysis"]["wedding"].update(remainingIndependentChecks=[]),
        ]
        for transform in changes:
            x=copy.deepcopy(sample)
            transform(x)
            with self.subTest(transform=transform),self.assertRaises(ValueError):
                quality_metrics(x)
    def test_duplicate_or_overlapping_previews_cannot_inflate_quality(self):
        r=report()
        first=r["analysis"]["wedding"]
        valid={
          "cityId":"delhi","localDate":"2027-01-01",
          "startUtc":"2027-01-01T00:00:00Z","endUtc":"2027-01-01T00:10:00Z",
          "durationSeconds":600,"expertApproved":False,
          "auspiciousRecommendation":False,
          "criteriaSatisfied":"REFERENCE_INITIAL_SCREEN_ONLY",
          "notYetChecked":first["remainingIndependentChecks"]
        }
        first["rawInitialMatches"]=[valid,copy.deepcopy(valid)]
        first["initialSurvivingWindows"]=2
        first["initialSurvivingSeconds"]=1200
        with self.assertRaisesRegex(ValueError,"Overlapping"):
            quality_metrics(r)
        first["rawInitialMatches"]=first["rawInitialMatches"][:1]
        first["initialSurvivingWindows"]=1
        first["initialSurvivingSeconds"]=600
        q=quality_metrics(r)
        self.assertEqual(q["weddingAndVehicle"]["wedding"]["candidateWindowCount"],1)
        self.assertEqual(q["weddingAndVehicle"]["wedding"]["daysWithAtLeastOnePreview"],1)
        self.assertFalse(q["weddingAndVehicle"]["wedding"]["methodComplete"])

if __name__=="__main__":
    unittest.main()
