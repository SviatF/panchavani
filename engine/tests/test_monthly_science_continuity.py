"""Synthetic all-month structure tests; passing does not certify Lahiri."""
import copy
import unittest
from panchavani.monthly_science_continuity import audit_full_month,audit_from_batches
from panchavani.monthly_content_pipeline import batch_starts
from test_monthly_release_candidates import cohort_data,MONTH

class WholeMonthInvariantsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        _,source=cohort_data()
        cls.original=[row[1] for row in source]
        cls.rows=[item for batch in cls.original for item in batch["records"]
                  if item["localDate"].startswith(MONTH+"-")]
    def test_every_neighboring_city_day_cross_batch_integrity(self):
        result=audit_from_batches(MONTH,self.original)
        self.assertEqual(result["checkedCityDays"],280)
        self.assertEqual(result["checkedNeighboringSolarDays"],270)
        self.assertEqual(result["checkedAdjacentFourLimbBoundaries"],1080)
        self.assertEqual(result["checkedCrossCohortDayBoundaries"],130)
        self.assertEqual(result["checkedUnchangedCityMethodRecords"],280)
        self.assertFalse(result["scientificApproval"])
        self.assertFalse(result["publicationAuthorized"])
        self.assertFalse(result["indexingAuthorized"])
        # Identical lunar names across consecutive dates may be scientifically
        # valid; fake forced 'unique numbers for SEO' must never occur.
        self.assertTrue(result["localDayUniquenessIsCityAndDateNotArtificialLunarVariation"])
    def test_cross_cohort_next_sunrise_drift_blocks_the_month(self):
        data=copy.deepcopy(self.rows)
        edge=next(x for x in data if x["cityId"]=="delhi" and x["localDate"]=="2027-02-03")
        edge["sun"]["sunriseUtc"]="2027-02-03T00:51:00+00:00"
        # 1-minute tampering independently breaks origin sunrise.
        with self.assertRaises(ValueError):
            audit_full_month(MONTH,data)
        data=copy.deepcopy(self.rows)
        before=next(x for x in data if x["cityId"]=="delhi" and x["localDate"]=="2027-02-02")
        before["sun"]["nextSunriseUtc"]="2027-02-03T00:53:00+00:00"
        # Even when the record is internally coherent, a changed next sunrise
        # cannot agree with the following independently generated batch.
        for kind in ("tithi","karana","nakshatra","yoga"):
            before["transitions"][kind][-1]["endUtc"]=before["sun"]["nextSunriseUtc"]
        with self.assertRaisesRegex(ValueError,"Cross-day local sunrise discontinuity"):
            audit_full_month(MONTH,data)
    def test_renamed_lunar_phase_at_cohort_boundary_fails(self):
        data=copy.deepcopy(self.rows)
        selected=next(x for x in data if x["cityId"]=="delhi" and x["localDate"]=="2027-02-03")
        selected["panchangAtSunrise"]["nakshatra"]="Unverified Altered Star"
        selected["transitions"]["nakshatra"][0]["name"]="Unverified Altered Star"
        with self.assertRaisesRegex(ValueError,"Cross-cohort phase discontinuity"):
            audit_full_month(MONTH,data)
    def test_unchanged_city_coordinates_and_methods_required(self):
        data=copy.deepcopy(self.rows)
        edge=next(x for x in data if x["cityId"]=="mumbai" and x["localDate"]=="2027-02-18")
        edge["cityReference"]["longitude"]=999
        with self.assertRaisesRegex(ValueError,"coordinate/methodology"):
            audit_full_month(MONTH,data)
    def test_geocentric_timeline_identity_cannot_mutate(self):
        data=copy.deepcopy(self.rows)
        record=data[0]
        record["geocentricBoundariesUtc"]["tithi"]=[{
            "endingNumber":6,"endUtc":"2027-02-01T10:00:00+00:00"
        }]
        with self.assertRaisesRegex(ValueError,"geocentric crossing data"):
            audit_full_month(MONTH,data)
    def test_missing_duplicated_or_forged_published_cohort_rejected(self):
        for kind in ("missing","duplicate","published","reversed"):
            batches=copy.deepcopy(self.original)
            if kind=="missing":batches.pop()
            elif kind=="duplicate":batches[0]["records"][1]=copy.deepcopy(batches[0]["records"][0])
            elif kind=="published":batches[0]["publicationAuthorized"]=True
            elif kind=="reversed":batches[0],batches[1]=batches[1],batches[0]
            with self.subTest(kind=kind),self.assertRaises(ValueError):
                audit_from_batches(MONTH,batches)
if __name__=="__main__":unittest.main()
