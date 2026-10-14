import copy
import json
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
from panchavani.pac_solar_reference import (
    pac_local_instant, validate_pac_dataset, numerical_comparison, compare_pac_solar
)

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT/"fixtures"/"pac-rashtriya-2026-four-metros-solar-UNREVIEWED.json"
IST=ZoneInfo("Asia/Kolkata")

class PACSolarReferenceTests(unittest.TestCase):
    def setUp(self):
        self.bundle=json.loads(FIXTURE.read_text(encoding="utf-8"))
    def test_fixture_integrity_and_scope(self):
        validate_pac_dataset(self.bundle)
        self.assertEqual(len(self.bundle["rows"]),2)
        self.assertEqual({r["gregorianDate"] for r in self.bundle["rows"]},
                         {"2026-04-21","2026-10-23"})
        self.assertEqual(self.bundle["rows"][0]["cities"]["delhi"]["sunrise"],"05:50")
        self.assertEqual(self.bundle["rows"][1]["cities"]["mumbai"]["sunset"],"18:10")
    def test_civil_time_interpretation(self):
        t=pac_local_instant("2026-10-23","06:27")
        self.assertEqual(t.isoformat(),"2026-10-23T06:27:00+05:30")
        self.assertEqual(t.astimezone(ZoneInfo("UTC")).isoformat(),
                         "2026-10-23T00:57:00+00:00")
        with self.assertRaises(ValueError):pac_local_instant("2026-10-23","25:70")
        t2=t+timedelta(seconds=45)
        self.assertEqual(numerical_comparison(t2,t)["deltaSeconds"],45.0)
    def test_entire_four_city_two_date_comparison_never_approves(self):
        def simulated(city,day):
            value=next(row["cities"][city.id] for row in self.bundle["rows"]
                       if row["gregorianDate"]==day.isoformat())
            sunrise=pac_local_instant(day.isoformat(),value["sunrise"])
            sunset=pac_local_instant(day.isoformat(),value["sunset"])
            return sunrise,sunset,sunrise+timedelta(days=1)
        report=compare_pac_solar(self.bundle,simulated)
        self.assertEqual(report["cityDayCount"],8)
        self.assertEqual(report["observationCount"],16)
        self.assertEqual(report["maxAbsoluteClockDeltaSeconds"],0)
        self.assertTrue(report["withinExploratoryAlertThreshold"])
        self.assertFalse(report["methodologicallyIndependentValidation"])
        self.assertFalse(report["publicationAuthorized"])
        self.assertFalse(report["indexingAuthorized"])
        self.assertGreater(len(report["blockers"]),3)
    def test_duplicate_or_fabricated_source_fails_closed(self):
        b=copy.deepcopy(self.bundle);b["rows"].append(b["rows"][0])
        with self.assertRaises(ValueError):validate_pac_dataset(b)
        b=copy.deepcopy(self.bundle);b["sourceUrl"]="https://unknown-site.example/"
        with self.assertRaises(ValueError):validate_pac_dataset(b)
        b=copy.deepcopy(self.bundle);b["transcriptionIndependentlyReviewed"]=True
        with self.assertRaises(ValueError):validate_pac_dataset(b)
    def test_unknown_or_swapped_city_fails_closed(self):
        b=copy.deepcopy(self.bundle);b["rows"][0]["cities"].pop("kolkata")
        with self.assertRaises(ValueError):validate_pac_dataset(b)
        b=copy.deepcopy(self.bundle);b["rows"][0]["cities"]["chennai"]["sunset"]="unknown"
        with self.assertRaises(ValueError):validate_pac_dataset(b)
    def test_five_minute_exploratory_alert_is_not_accuracy_certification(self):
        base=pac_local_instant("2026-10-23","06:27")
        r=numerical_comparison(base+timedelta(seconds=301),base)
        self.assertFalse(r["withinResearchDriftAlertThreshold"])

if __name__=="__main__":
    unittest.main()
