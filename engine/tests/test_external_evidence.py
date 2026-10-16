"""Tests are synthetic and offline: a numeric match is NEVER scientific approval."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from panchavani.external_evidence import (
    JPL_SHA, candidate_event, compare_external_evidence,
    instant, load_sha_pinned_candidate,
)


class TestExternalEvidence(unittest.TestCase):
    def setUp(self):
        self.candidate = {
            "status": "calculated", "approvedBy": None, "releaseId": None,
            "localDate": "2026-10-16",
            "city": {"id": "delhi", "tz": "Asia/Kolkata"},
            "methodology": {"ephemerisHash": JPL_SHA, "ayanamsa": "NOT_VALIDATED"},
            "validation": {"reviewStatus": "not-reviewed", "blockerCount": 4},
            "sun": {"sunriseUtc": "2026-10-16T00:52:00Z",
                    "sunsetUtc": "2026-10-16T12:21:00Z",
                    "nextSunriseUtc": "2026-10-17T00:52:00Z"},
            "panchangAtSunrise": {"tithi": "Shukla Shashthi",
                                 "karana": "Kaulava",
                                 "nakshatra": None, "yoga": None},
            "transitions": [
                {"type": "tithi", "value": "Shukla Shashthi",
                 "startUtc": "2026-10-16T00:52:00Z",
                 "endUtc": "2026-10-17T00:24:00Z"},
                {"type": "tithi", "value": "Shukla Saptami",
                 "startUtc": "2026-10-17T00:24:00Z",
                 "endUtc": "2026-10-17T00:52:00Z"},
                {"type": "karana", "value": "Kaulava",
                 "startUtc": "2026-10-16T00:52:00Z",
                 "endUtc": "2026-10-16T11:08:00Z"},
            ]
        }
        self.fixture = {
            "schemaVersion": 1, "city": "delhi", "date": "2026-10-16",
            "timezone": "Asia/Kolkata", "researchOnly": True,
            "sources": [
                {"id": "drik", "publisher": "Drik Panchang",
                 "url": "https://example.org/observations",
                 "methodologyComparable": False, "independenceVerified": False,
                 "observations": [
                     {"metric": "sunrise", "localIso": "2026-10-16T06:22:00+05:30",
                      "precisionSeconds": 60},
                     {"metric": "sunset", "localIso": "2026-10-16T17:51:00+05:30",
                      "precisionSeconds": 60},
                     {"metric": "tithiEnd", "label": "Shukla Shashthi",
                      "localIso": "2026-10-17T05:54:00+05:30",
                      "precisionSeconds": 60},
                     {"metric": "karanaEnd", "label": "Kaulava",
                      "localIso": "2026-10-16T16:38:00+05:30",
                      "precisionSeconds": 60},
                 ]}
            ]
        }

    def reconcile(self):
        return compare_external_evidence(self.candidate, "a"*64, self.fixture)

    def test_numerical_agreement_remains_unapproved(self):
        result = self.reconcile()
        self.assertEqual(result["sourceCount"], 1)
        self.assertEqual(len(result["observations"]), 4)
        self.assertTrue(result["allWithinResearchCeiling"])
        self.assertEqual([r["deltaSeconds"] for r in result["observations"]], [0]*4)
        self.assertFalse(result["externalMethodologyReconciled"])
        self.assertFalse(result["sourceIndependenceVerified"])
        self.assertFalse(result["scientificApproval"])
        self.assertFalse(result["publicationAuthorized"])
        self.assertFalse(result["indexingAuthorized"])
        self.assertFalse(result["paidGenerationAuthorized"])
        self.assertEqual(result["approvedClaimsForDeepSeek"], [])
        self.assertTrue(result["blockers"])

    def test_large_discrepancy_is_recorded_not_tuned_away(self):
        self.candidate["sun"]["sunriseUtc"] = "2026-10-16T01:10:00Z"
        result = self.reconcile()
        self.assertFalse(result["allWithinResearchCeiling"])
        self.assertEqual(result["observations"][0]["deltaSeconds"], 1080)
        self.assertFalse(result["scientificApproval"])

    def test_midnight_boundary_stays_on_correct_local_date(self):
        result = self.reconcile()
        self.assertEqual(result["observations"][2]["reportedLocalIso"],
                         "2026-10-17T05:54:00+05:30")
        self.assertEqual(result["observations"][2]["candidateLocalIso"],
                         "2026-10-17T05:54:00+05:30")

    def test_identity_timezones_and_source_provenance_must_match(self):
        self.fixture["city"] = "mumbai"
        with self.assertRaisesRegex(ValueError, "identity mismatch"):
            self.reconcile()
        self.fixture["city"] = "delhi"
        self.fixture["sources"][0]["observations"][0]["localIso"] = "2026-10-16T06:22:00+04:30"
        with self.assertRaisesRegex(ValueError, "Incorrect local UTC offset"):
            self.reconcile()
        self.fixture["sources"][0]["observations"][0]["localIso"] = "2026-10-16T06:22:00+05:30"
        self.fixture["sources"][0]["independenceVerified"] = True
        with self.assertRaisesRegex(ValueError, "provenance"):
            self.reconcile()

    def test_duplicate_or_unknown_observations_fail_closed(self):
        self.fixture["sources"][0]["observations"].append(
            dict(self.fixture["sources"][0]["observations"][0]))
        with self.assertRaisesRegex(ValueError, "Repeated observation"):
            self.reconcile()
        self.fixture["sources"][0]["observations"][-1]["metric"] = "moonrise"
        with self.assertRaisesRegex(ValueError, "Unsupported measured field"):
            self.reconcile()

    def test_ambiguous_segment_fails_instead_of_guessing(self):
        self.candidate["transitions"].append(dict(self.candidate["transitions"][0]))
        with self.assertRaisesRegex(ValueError, "No unique matching"):
            candidate_event(self.candidate, "tithiEnd", "Shukla Shashthi")

    def test_naive_utc_disallowed(self):
        with self.assertRaisesRegex(ValueError, "Timezone-aware"):
            instant("2026-10-16T06:22:00")

    def test_exact_file_bytes_are_sha_pinned(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "private-research.json"
            data = json.dumps(self.candidate, sort_keys=True).encode("utf-8")
            path.write_bytes(data)
            expected = hashlib.sha256(data).hexdigest()
            self.assertEqual(load_sha_pinned_candidate(path, expected), self.candidate)
            with self.assertRaisesRegex(ValueError, "SHA-256 mismatch"):
                load_sha_pinned_candidate(path, "0"*64)
            path.write_bytes(data + b" ")
            with self.assertRaisesRegex(ValueError, "SHA-256 mismatch"):
                load_sha_pinned_candidate(path, expected)


if __name__ == "__main__":
    unittest.main()
