import unittest
from dataclasses import dataclass
from datetime import date,datetime,timedelta,timezone
from panchavani.solar_sensitivity import (
    compare_solar_sensitivity,sensitivity_scenarios,SENSITIVITY_PROBES
)
from panchavani.astronomy import STANDARD_SOLAR_HORIZON_DEGREES

@dataclass(frozen=True)
class Point:
    id: str="delhi"
    name: str="Delhi"
    latitude: float=28.6139
    longitude: float=77.209
    elevation_m: float=216
    timezone: str="Asia/Kolkata"

class FakeAdapter:
    def _solar_event(self,city,date_local,rising,*,horizon_degrees):
        # Deterministic sensitivity simulator; NOT an empirical astronomy claim.
        base=datetime(date_local.year,date_local.month,date_local.day,
                      0 if rising else 12,50 if rising else 20,
                      tzinfo=timezone.utc)
        dlon=city.longitude-77.209
        dlat=city.latitude-28.6139
        height=city.elevation_m-216
        h=horizon_degrees-STANDARD_SOLAR_HORIZON_DEGREES
        return base+timedelta(seconds=dlon*200+dlat*100+height*.01+h*240)

class SolarSensitivityTests(unittest.TestCase):
 def test_all_five_explicit_perturbations_reported_with_no_false_approval(self):
    city=Point()
    report=compare_solar_sensitivity(FakeAdapter(),{"delhi":city},date(2026,10,13))
    self.assertEqual(report["cityCount"],1)
    self.assertEqual(report["scenarioCountPerCity"],5)
    self.assertEqual(set(report["cities"][0]["parameterPerturbations"]),set(SENSITIVITY_PROBES))
    self.assertFalse(report["quantifiedPhysicalUncertainty"])
    self.assertFalse(report["independentScientificValidation"])
    self.assertFalse(report["publicationAuthorized"])
    self.assertFalse(report["indexingAuthorized"])
 def test_coordinates_and_horizon_vary_without_mutating_main_city(self):
    city=Point()
    scenarios=sensitivity_scenarios(city)
    self.assertEqual(city.latitude,28.6139)
    self.assertEqual(scenarios["latitude_plus_0_02_degree"][0].latitude,28.6339)
    self.assertEqual(scenarios["longitude_plus_0_02_degree"][0].longitude,77.229)
    self.assertEqual(scenarios["horizon_minus_34_arcminutes"][1],-34/60)
    self.assertEqual(scenarios["elevation_plus_100_meters"][0].elevation_m,316)
 def test_missing_or_impossible_station_elevation_fails(self):
    with self.assertRaises(ValueError):
        sensitivity_scenarios(Point(elevation_m=9500))
 def test_wrong_timezone_or_solar_order_fails(self):
    class BadAdapter(FakeAdapter):
        def _solar_event(self,city,date_local,rising,*,horizon_degrees):
            t=super()._solar_event(city,date_local,rising,horizon_degrees=horizon_degrees)
            return t+timedelta(days=2) if rising else t
    with self.assertRaises(ValueError):
        compare_solar_sensitivity(BadAdapter(),{"delhi":Point()},date(2026,10,13))
if __name__=="__main__":
 unittest.main()
