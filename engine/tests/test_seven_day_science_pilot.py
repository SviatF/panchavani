"""Seven-day pilot invariants on SYNTHETIC, never publishable records."""
import copy,unittest
from datetime import date,timedelta
from panchavani.seven_day_science_pilot import validate_week,PILOT
from tests.test_first_six_limb_pilot import specimen

START=date(2026,10,20)
def week():
    records=[]
    for d in range(7):
        for city in PILOT:
            row=specimen(city,START+timedelta(days=d))
            row["cityReference"]={"model":"SYNTHETIC", "cityId":city}
            row["methodology"]={"mode":"NOT_A_REAL_SCIENCE_METHOD"}
            row["panchangAtSunrise"]["vara"]=(START+timedelta(days=d)).strftime("%A")
            records.append(row)
    return records

class SevenDayPilot(unittest.TestCase):
    def test_every_city_day_has_distinct_private_research_identity(self):
        data=validate_week(week(),START)
        self.assertEqual(data["checkedCityDays"],21)
        self.assertEqual(data["adjacentFourLimbChecks"],72)
        self.assertFalse(data["scientificApproval"])
        self.assertFalse(data["indexingAuthorized"])
    def test_duplicate_or_missing_cell_rejected(self):
        rows=week()
        rows[1]=copy.deepcopy(rows[0])
        with self.assertRaises(ValueError):validate_week(rows,START)
    def test_cross_day_sunrise_change_rejected(self):
        rows=week()
        row=next(x for x in rows if x["cityId"]=="delhi" and x["localDate"]=="2026-10-21")
        row["sun"]["sunriseUtc"]="2026-10-21T00:51:00+00:00"
        row["transitions"]["tithi"][0]["startUtc"]=row["sun"]["sunriseUtc"]
        row["transitions"]["karana"][0]["startUtc"]=row["sun"]["sunriseUtc"]
        row["transitions"]["nakshatra"][0]["startUtc"]=row["sun"]["sunriseUtc"]
        row["transitions"]["yoga"][0]["startUtc"]=row["sun"]["sunriseUtc"]
        with self.assertRaises(ValueError):validate_week(rows,START)
    def test_unapproved_record_cannot_masquerade_as_science_approved(self):
        rows=week();rows[0]["scientificApproval"]=True
        with self.assertRaises(ValueError):validate_week(rows,START)
    def test_cross_city_cloned_sunrise_rejected(self):
        rows=week()
        first=next(x for x in rows if x["cityId"]=="delhi" and x["localDate"]=="2026-10-20")
        second=next(x for x in rows if x["cityId"]=="mumbai" and x["localDate"]=="2026-10-20")
        second["sun"]["sunriseUtc"]=first["sun"]["sunriseUtc"]
        for k in ("tithi","karana","nakshatra","yoga"):
            second["transitions"][k][0]["startUtc"]=first["sun"]["sunriseUtc"]
        with self.assertRaises(ValueError):validate_week(rows,START)
if __name__=="__main__":unittest.main()
