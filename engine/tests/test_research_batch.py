import unittest
from unittest.mock import patch
from pathlib import Path
from tempfile import TemporaryDirectory
from datetime import date
from panchavani.research_batch import inspect_candidate, run_batch

class BatchTests(unittest.TestCase):
    def sample(self):
        return {
            "status":"calculated","approvedBy":None,"releaseId":None,
            "validation":{"blockerCount":4},"city":{"catalogVersion":"pilot-unverified-v1"},
            "methodology":{"ayanamsa":"NOT_VALIDATED"},
            "panchangAtSunrise":{"karana":"Bava","nakshatra":None,"yoga":None},
            "sun":{"sunriseUtc":"2026-10-13T01:00:00Z","sunsetUtc":"2026-10-13T12:00:00Z"},
            "transitions":[
                {"type":"tithi","value":"Shukla Pratipada","startUtc":"x","endUtc":"y"},
                {"type":"karana","value":"Bava","startUtc":"x","endUtc":"y"},
                {"type":"rahu-kalam"}, {"type":"yamaganda"},{"type":"gulika"}]
        }

    def test_research_status_cannot_be_marked_approved(self):
        r=self.sample()
        self.assertEqual(inspect_candidate(r),[])
        r["status"]="approved"
        self.assertIn("unsafe-research-status",inspect_candidate(r))

    def test_unvalidated_nakshatra_is_rejected(self):
        r=self.sample();r["panchangAtSunrise"]["nakshatra"]="Vishakha"
        self.assertIn("unvalidated-nakshatra",inspect_candidate(r))

    def test_missing_local_timing_rejected(self):
        r=self.sample();r["transitions"]=[x for x in r["transitions"] if x["type"]!="rahu-kalam"]
        self.assertIn("missing-required-research-events",inspect_candidate(r))

    def test_out_dir_must_be_fresh(self):
        with TemporaryDirectory() as d:
            p=Path(d); (p/"old.json").write_text("{}")
            with self.assertRaises(ValueError):
                run_batch(Path("nonexistent-ephemeris.bsp"),p,date(2026,10,13))

if __name__=='__main__':
    unittest.main()
