import unittest
from datetime import datetime,timezone
from panchavani.lahiri_transition_sensitivity import _signed_arcsec,_speed

class LahiriSensitivityTests(unittest.TestCase):
    def test_wrapped_signed_angular_error(self):
        self.assertAlmostEqual(_signed_arcsec(359.999,0.001),-7.2,places=4)
        self.assertEqual(_signed_arcsec(23,23),0)
    def test_phase_velocity_measured_in_arcseconds_per_second(self):
        t=datetime(2026,10,21,tzinfo=timezone.utc)
        def phase(at):
            return 20+(at-t).total_seconds()*.5/3600
        self.assertAlmostEqual(_speed(phase,t),.5,places=7)

if __name__=="__main__":unittest.main()
