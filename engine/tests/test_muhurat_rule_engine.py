"""Research-only rules engine regression and temporal-boundary tests."""
import copy
import unittest

from panchavani.muhurat_windows import intersection_grid
from panchavani.muhurat_rule_engine import evaluate_candidates, _day_part, _subtract
from test_ten_city_six_limb_research import ten_city_research_batch
from datetime import datetime, timezone, timedelta


def pack(kind="wedding"):
    return {
        "id": "synthetic-temporal-filter", "version": "test-v1",
        "status": "DRAFT", "kind": kind,
        "tradition": "TEST_ONLY_NOT_A_REAL_TRADITION",
        "region": "SYNTHETIC_TEST", "sourceRefs": [],
        "independentReview": {"status": "PENDING"},
        "cityIds": ["delhi"],
        "criteria": {
            "allowedLimbs": {"tithi": ["Shukla Shashthi"]},
            "excludedLimbs": {"karana": ["Vishti"]},
            "allowedWeekdays": list(range(7)),
            "excludedDayPeriods": ["rahu", "yamaganda", "gulika"],
            "daylightOnly": True, "minimumSeconds": 60
        }
    }


class RuleEngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.grid = intersection_grid(ten_city_research_batch())

    def test_wedding_and_vehicle_can_compute_but_never_release(self):
        for kind in ("wedding", "vehicle-purchase"):
            with self.subTest(kind=kind):
                output = evaluate_candidates(self.grid, pack(kind))
                self.assertEqual(output["kind"], kind)
                self.assertEqual(output["candidateCount"], len(output["candidates"]))
                self.assertFalse(output["muhuratRecommendationsAuthorized"])
                self.assertFalse(output["publicationAuthorized"])
                self.assertFalse(output["indexingAuthorized"])
                self.assertEqual(output["approvedClaimsForDeepSeek"], [])
                self.assertTrue(all(not x["muhuratRecommended"] for x in output["candidates"]))
                self.assertTrue(all(x["cityId"] == "delhi" for x in output["candidates"]))
                self.assertTrue(all(x["durationSeconds"] >= 60 for x in output["candidates"]))

    def test_temporal_day_parts_are_actual_eighths(self):
        start = datetime(2026, 10, 19, 0, 30, tzinfo=timezone.utc)
        end = start + timedelta(hours=12)
        # Monday Rahu = second eighth, not a hardcoded wall clock time.
        a, b = _day_part(start, end, 2)
        self.assertEqual(a, start + timedelta(minutes=90))
        self.assertEqual(b, start + timedelta(minutes=180))
        remainder = _subtract([(start, end)], (a, b))
        self.assertEqual(remainder, [(start, a), (b, end)])
        self.assertEqual(sum((y-x).total_seconds() for x, y in remainder), 37800)

    def test_no_matching_tithi_yields_zero_without_fake_promotion(self):
        p = pack()
        p["criteria"]["allowedLimbs"]["tithi"] = ["NEVER_OCCURS"]
        result = evaluate_candidates(self.grid, p)
        self.assertEqual(result["candidateCount"], 0)
        self.assertFalse(result["ritualRuleApproved"])

    def test_untrusted_or_tampered_inputs_refused(self):
        for key, value in [
            ("scientificApproval", True), ("publicationAuthorized", True),
            ("indexingAuthorized", True), ("muhuratRecommendationsAuthorized", True)
        ]:
            grid = copy.deepcopy(self.grid)
            grid[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                evaluate_candidates(grid, pack())
        grid = copy.deepcopy(self.grid)
        grid["windows"][0]["windows"][0]["durationSeconds"] += 2
        with self.assertRaises(ValueError):
            evaluate_candidates(grid, pack())
        grid = copy.deepcopy(self.grid)
        grid["windows"][0]["windows"][0]["auspiciousRecommendation"] = True
        with self.assertRaises(ValueError):
            evaluate_candidates(grid, pack())

    def test_partial_packs_and_unreviewed_signoff_cannot_be_promoted(self):
        for field, value in [
            ("status", "APPROVED"), ("kind", "other"),
            ("independentReview", {"status": "VERIFIED"})
        ]:
            p = pack()
            p[field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                evaluate_candidates(self.grid, p)
        for key, value in [
            ("allowedWeekdays", [7]), ("minimumSeconds", 0),
            ("excludedDayPeriods", ["unknown"]), ("daylightOnly", None)
        ]:
            p = pack()
            p["criteria"][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                evaluate_candidates(self.grid, p)


if __name__ == "__main__":
    unittest.main()
