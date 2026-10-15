import copy
import hashlib
import unittest
from datetime import datetime, timezone

from panchavani.three_city_handoff import CITY_IDS, build_handoff
from panchavani.research_batch import JPL_DE440S_SHA


def mock_records():
    result = []
    for i, city in enumerate(CITY_IDS):
        result.append({
            "city": {"id": city, "catalogVersion": "pilot-unverified-v1"},
            "localDate": "2026-10-16",
            "recordId": f"{city}:2026-10-16:{JPL_DE440S_SHA[:12]}",
            "status": "calculated",
            "approvedBy": None, "releaseId": None,
            "methodology": {
                "ephemerisHash": JPL_DE440S_SHA, "ayanamsa": "NOT_VALIDATED",
                "rulePackId": "NONE"
            },
            "validation": {"blockerCount": 4, "reviewStatus": "not-reviewed"},
            "sun": {
                "sunriseUtc": f"2026-10-16T0{i}:10:00Z",
                "sunsetUtc": f"2026-10-16T1{i}:10:00Z"
            },
            "panchangAtSunrise": {
                "nakshatra": None, "yoga": None, "karana": "Bava"
            },
            "transitions": [
                {"type": "tithi", "value": "Shukla Dvitiya", "startUtc": "x", "endUtc": "y"},
                {"type": "karana", "value": "Bava", "startUtc": "x", "endUtc": "y"},
                {"type": "rahu-kalam"}, {"type": "yamaganda"}, {"type": "gulika"},
            ]
        })
    return result


class ThreeCityHandoffTests(unittest.TestCase):
    def bundle(self, records):
        return build_handoff(
            records, source_sha=JPL_DE440S_SHA,
            created_at="2026-10-15T12:00:00Z"
        )

    def test_only_three_distinct_unapproved_city_day_records(self):
        result = self.bundle(mock_records())
        self.assertEqual([x["cityId"] for x in result["entries"]], list(CITY_IDS))
        self.assertFalse(result["releaseAuthorized"])
        self.assertFalse(result["indexingAuthorized"])
        self.assertFalse(result["modelInvocationAuthorized"])
        self.assertEqual(result["status"], "UNAPPROVED_RESEARCH")
        for item in result["entries"]:
            self.assertEqual(
                hashlib.sha256(item["candidateJson"].encode()).hexdigest(),
                item["candidateSha256"]
            )

    def test_wrong_jpl_hash_wrong_order_or_mixed_date_blocked(self):
        record = mock_records()
        with self.assertRaises(ValueError):
            build_handoff(record, source_sha="0" * 64,
                          created_at="2026-10-15T12:00:00Z")
        with self.assertRaises(ValueError):
            self.bundle(list(reversed(record)))
        record[0]["localDate"] = "2026-10-17"
        with self.assertRaises(ValueError):
            self.bundle(record)

    def test_approved_data_must_never_enter_research_import(self):
        record = mock_records()
        record[0]["status"] = "approved"
        with self.assertRaises(ValueError):
            self.bundle(record)

    def test_geographic_solar_clone_and_invalid_karana_are_rejected(self):
        record = mock_records()
        record[2]["sun"]["sunriseUtc"] = record[0]["sun"]["sunriseUtc"]
        with self.assertRaises(ValueError):
            self.bundle(record)
        record = mock_records()
        record[1]["panchangAtSunrise"]["karana"] = "False Karana"
        with self.assertRaises(ValueError):
            self.bundle(record)


if __name__ == "__main__":
    unittest.main()
