import copy
import json
import unittest
from datetime import datetime,date,timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
from panchavani.pac_limb_reference import (
    validate_fixture,pac_clock_to_ist,compare_limb_endings
)
FIXTURE=Path(__file__).resolve().parents[1]/"fixtures"/"pac-2026-09-22-central-limbs-UNREVIEWED.json"
IST=ZoneInfo("Asia/Kolkata")

class PacLimbTests(unittest.TestCase):
 def setUp(self):
    self.ref=json.loads(FIXTURE.read_text())
 def test_all_five_observations_present(self):
    validate_fixture(self.ref)
    self.assertEqual({x["type"] for x in self.ref["observations"]},
                     {"tithi","karana","nakshatra","yoga"})
    self.assertEqual(len(self.ref["observations"]),5)
 def test_pac_extended_hours(self):
    dt=pac_clock_to_ist(date(2026,9,22),"25-30")
    self.assertEqual(dt.isoformat(),"2026-09-23T01:30:00+05:30")
    self.assertEqual(pac_clock_to_ist(date(2026,9,22),"30-00").day,23)
    for bad in ("31-01","08:57","9-65","text"):
        with self.assertRaises(ValueError):pac_clock_to_ist(date(2026,9,22),bad)
 def test_unapproved_comparator_even_on_identical_times(self):
    d=date(2026,9,22)
    source={(x["type"],x["number"]):[pac_clock_to_ist(d,x["endClock"])]
            for x in self.ref["observations"]}
    report=compare_limb_endings(self.ref,source)
    self.assertEqual(report["observationCount"],5)
    self.assertEqual(report["maxAbsoluteDeltaSeconds"],0)
    self.assertFalse(report["methodologicallyIndependentValidation"])
    self.assertFalse(report["indexingAuthorized"])
    self.assertFalse(report["publicationAuthorized"])
    self.assertEqual(report["citySpecificClaims"],0)
 def test_duplicate_or_missing_central_transition_rejected(self):
    d=date(2026,9,22)
    src={(x["type"],x["number"]):[pac_clock_to_ist(d,x["endClock"])]
         for x in self.ref["observations"]}
    src.pop(("karana",22))
    with self.assertRaises(ValueError):compare_limb_endings(self.ref,src)
 def test_no_fake_approvals_or_source_swapping(self):
    for field,value in (("webSnapshotArchived",True),
                        ("transcribedIndependentlyReviewed",True),
                        ("stationScope","delhi")):
        x=copy.deepcopy(self.ref);x[field]=value
        with self.assertRaises(ValueError):validate_fixture(x)
 def test_large_difference_is_an_alert_not_approval(self):
    day=date(2026,9,22)
    src={(x["type"],x["number"]):[pac_clock_to_ist(day,x["endClock"])]
          for x in self.ref["observations"]}
    src[("yoga",6)]=[src[("yoga",6)][0]+timedelta(hours=2)]
    r=compare_limb_endings(self.ref,src)
    self.assertFalse(r["allWithinExploratoryAlert"])
    self.assertFalse(r["publicationAuthorized"])
if __name__=="__main__":
 unittest.main()
