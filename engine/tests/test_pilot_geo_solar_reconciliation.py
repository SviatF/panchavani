"""Deterministic 3-city geo-horizon research QA. Synthetic times are NOT observation."""
import copy
import json
import unittest
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from panchavani.pilot_geo_solar_reconciliation import (
    validate_alt_sites, compare_station_assumptions, DAYS, THREE
)
from panchavani.geodata_audit import km_between

FIX=Path(__file__).resolve().parents[1]/"fixtures"
TZ=ZoneInfo("Asia/Kolkata")


class MetroGeographyTests(unittest.TestCase):
    def setUp(self):
        self.geo=json.loads((FIX/"wave7c-geonames-three-metros-UNREVIEWED.json").read_text())
        self.pac=json.loads((FIX/"pac-rashtriya-2026-four-metros-solar-UNREVIEWED.json").read_text())
    def test_gazetteer_ids_match_real_city_urls_and_no_station_claims(self):
        validate_alt_sites(self.geo)
        self.assertFalse(self.geo["scienceApproval"])
        self.assertFalse(self.geo["officialObservatoryStationForAllCities"])
    def test_place_swap_far_from_city_or_fake_verified_status_forbidden(self):
        for mutate in (
            lambda g:g["records"][0].update(geonameId=999),
            lambda g:g["records"][0].update(latitude=25.0),
            lambda g:g.update(scienceApproval=True),
            lambda g:g.update(sourceReviewedBy="fake reviewer"),
            lambda g:g["records"][1].update(sourceUrl="https://other.example/"),
        ):
            g=copy.deepcopy(self.geo)
            mutate(g)
            with self.subTest(mutate=mutate),self.assertRaises(ValueError):
                validate_alt_sites(g)
    def test_real_city_reference_point_distances_are_not_zero(self):
        from panchavani.cities import RESEARCH_CITIES
        for r in self.geo["records"]:
            c=RESEARCH_CITIES[r["cityId"]]
            self.assertGreater(km_between(c.latitude,c.longitude,r["latitude"],r["longitude"]),.1)
    def test_four_dates_three_cities_with_two_pac_references_only(self):
        def fake(city,d):
            # Deterministic static PAC value; tiny displacement when using
            # city-gazetteer point rather than the original research catalog.
            observation=next((v["cities"][city.id] for v in self.pac["rows"]
                              if v["gregorianDate"]==d.isoformat()),None)
            sunrise=observation["sunrise"] if observation else "06:00"
            sunset=observation["sunset"] if observation else "18:00"
            h,m=map(int,sunrise.split(":"))
            t0=datetime(d.year,d.month,d.day,h,m,tzinfo=TZ)
            h,m=map(int,sunset.split(":"))
            t1=datetime(d.year,d.month,d.day,h,m,tzinfo=TZ)
            # Distinguishable assumed observer point, not real astronomical values.
            from panchavani.cities import RESEARCH_CITIES
            if abs(city.latitude-RESEARCH_CITIES[city.id].latitude)>.001:
                t0+=timedelta(seconds=30)
                t1+=timedelta(seconds=20)
            return t0,t1,t0+timedelta(days=1)
        report=compare_station_assumptions(self.geo,self.pac,fake)
        self.assertEqual(report["cityCount"],3)
        self.assertEqual(report["cityDayComparisonCount"],12)
        self.assertEqual(report["officialPACClockComparisons"],12)
        self.assertEqual(len(report["records"]),3)
        self.assertFalse(report["indexingAuthorized"])
        self.assertFalse(report["sourcePublishedStationCoordinatesMatched"])
        self.assertFalse(report["geoSourceIndependentHumanReview"])
        self.assertEqual(report["maxAbsoluteCatalogOrGazetteerPACDeltaSeconds"],30)
        for city in report["records"]:
            self.assertEqual(len(city["dates"]),4)
            self.assertEqual(sum(x["externalPACReference"] is not None for x in city["dates"]),2)
    def test_missing_official_date_does_not_fall_back_to_unverified_table(self):
        bad=copy.deepcopy(self.pac)
        bad["rows"][1]["gregorianDate"]="2026-11-23"
        with self.assertRaisesRegex(ValueError,"PAC dated"):
            compare_station_assumptions(self.geo,bad,lambda c,d:(None,None,None))


if __name__=="__main__":
    unittest.main()
