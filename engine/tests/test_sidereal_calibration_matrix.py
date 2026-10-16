"""Pure regression checks: multi-city geocentric equivalence is NOT independent astronomy."""
import copy
from datetime import datetime,date,timedelta,timezone
import json
from pathlib import Path
import unittest

from panchavani.sidereal_calibration_matrix import verify_matrix_records
from panchavani.pac_limb_reference import validate_fixture,compare_limb_endings,pac_clock_to_ist

PAC=Path(__file__).resolve().parents[1]/"fixtures"/"pac-2026-10-16-central-limbs-UNREVIEWED.json"
IST=timezone(timedelta(hours=5,minutes=30))
CITIES=("delhi","mumbai","chennai")


def make_records():
    out=[]
    for d in (date(2026,10,16),date(2026,10,17)):
        dayoffset=(d-date(2026,10,16)).days
        for idx,city in enumerate(CITIES):
            sunrise=datetime(d.year,d.month,d.day,0,50+idx,tzinfo=timezone.utc)
            next_sunrise=sunrise+timedelta(days=1)
            crossing=datetime(d.year,d.month,d.day,12,0,tzinfo=timezone.utc)
            def segments(base,prefix):
                return [
                    dict(number=base+dayoffset,name=f"{prefix}{base+dayoffset}",
                         startUtc=sunrise.isoformat(),endUtc=crossing.isoformat()),
                    dict(number=base+dayoffset+1,name=f"{prefix}{base+dayoffset+1}",
                         startUtc=crossing.isoformat(),endUtc=next_sunrise.isoformat())
                ]
            out.append({
                "cityId":city,"date":d.isoformat(),"timezone":"Asia/Kolkata",
                "cityCoordinatesVerified":False,"status":"UNAPPROVED",
                "publicReleaseAllowed":False,"independentScientificValidation":"NOT_COMPLETED",
                "blockers":["not calibrated"],"sunriseUtc":sunrise.isoformat(),
                "nextSunriseUtc":next_sunrise.isoformat(),
                "nakshatraAtSunrise":f"N{18+dayoffset}",
                "yogaAtSunrise":f"Y{5+dayoffset}",
                "nakshatra":segments(18,"N"),"yoga":segments(5,"Y")
            })
    return out


class SiderealMatrixTests(unittest.TestCase):
    def test_two_days_three_cities_and_shared_geocentric_event(self):
        result=verify_matrix_records(make_records())
        self.assertEqual(result["checkedCityDays"],6)
        self.assertEqual(result["checkedSolarDayBoundaries"],3)
        self.assertEqual(result["checkedAstronomicalCrossings"],12)
        self.assertTrue(result["geocentricUtcConsistent"])

    def test_city_specific_drift_at_same_geocentric_crossing_fails(self):
        records=make_records()
        records[1]["nakshatra"][0]["endUtc"]="2026-10-16T12:02:00+00:00"
        records[1]["nakshatra"][1]["startUtc"]="2026-10-16T12:02:00+00:00"
        with self.assertRaisesRegex(ValueError,"Geocentric boundary"):
            verify_matrix_records(records)

    def test_dawn_gap_wrong_index_or_unapproved_status_fails(self):
        cases=[
            lambda rows: rows[3]["nakshatra"][0].update(number=1),
            lambda rows: rows[0]["yoga"][1].update(startUtc="2026-10-16T12:00:01+00:00"),
            lambda rows: rows[0].update(status="APPROVED"),
            lambda rows: rows[0].update(date="2026-10-15"),
            lambda rows: rows.append(copy.deepcopy(rows[0])),
        ]
        for alter in cases:
            records=make_records()
            alter(records)
            with self.subTest(alter=alter),self.assertRaises(ValueError):
                verify_matrix_records(records)

    def test_official_pac_16oct_five_observations_and_cross_midnight(self):
        doc=json.loads(PAC.read_text())
        validate_fixture(doc)
        self.assertEqual(doc["gregorianDate"],"2026-10-16")
        self.assertEqual({x["type"] for x in doc["observations"]},
                         {"tithi","karana","nakshatra","yoga"})
        self.assertEqual(pac_clock_to_ist(date(2026,10,16),"29-55").isoformat(),
                         "2026-10-17T05:55:00+05:30")
        computed={
            (x["type"],x["number"]):[pac_clock_to_ist(date(2026,10,16),x["endClock"])]
            for x in doc["observations"]
        }
        report=compare_limb_endings(doc,computed)
        self.assertEqual(report["observationCount"],5)
        self.assertEqual(report["citySpecificClaims"],0)
        self.assertFalse(report["methodologicallyIndependentValidation"])
        self.assertFalse(report["publicationAuthorized"])

    def test_final_karana_must_equal_current_tithi_ending(self):
        doc=json.loads(PAC.read_text())
        doc["observations"][-1]["endClock"]="29-54"
        with self.assertRaisesRegex(ValueError,"Tithi and final Karana"):
            validate_fixture(doc)

    def test_sep_and_oct_pac_use_different_tithi_karana_ordinals(self):
        sept=json.loads((PAC.parent/"pac-2026-09-22-central-limbs-UNREVIEWED.json").read_text())
        octo=json.loads(PAC.read_text())
        for document in (sept,octo):
            validate_fixture(document)
        last=lambda d:(next(x["number"] for x in d["observations"] if x["type"]=="tithi"),
                       max(x["number"] for x in d["observations"] if x["type"]=="karana"))
        self.assertEqual(last(sept),(11,22))
        self.assertEqual(last(octo),(6,12))

if __name__=="__main__":
    unittest.main()
