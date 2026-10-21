import unittest
from datetime import datetime,timezone,timedelta
from panchavani.swiss_exact_phase_roots import signed_phase_error,solve

class ExactRootTests(unittest.TestCase):
    def test_wrapped_phase_error(self):
        self.assertAlmostEqual(signed_phase_error(359.9,0),-.1)
        self.assertAlmostEqual(signed_phase_error(.1,0),.1)
    def test_reject_silent_moshier_fallback(self):
        from panchavani.swiss_exact_phase_roots import swiss_phase
        t=datetime(2026,10,21,tzinfo=timezone.utc)
        class Stub:
            FLG_SWIEPH=2
            FLG_SIDEREAL=64
            FLG_MOSEPH=4
            MOON=1
            SUN=0
            def julday(self,*args):return 0
            def calc_ut(self,jd,planet,flags):return ([20.0],self.FLG_MOSEPH)
        with self.assertRaisesRegex(ValueError,'Moshier'):
            swiss_phase(Stub(),t,'nakshatra')

    def test_supported_city_scopes(self):
        from panchavani.swiss_exact_phase_roots import resolve_cities
        self.assertEqual(resolve_cities('delhi'),('delhi',))
        self.assertEqual(len(resolve_cities('ten')),10)
        with self.assertRaises(ValueError):
            resolve_cities('all')

    def test_bracketed_root_and_unbracketed_failure(self):
        start=datetime(2026,10,21,0,0,tzinfo=timezone.utc)
        class Dummy:
            pass
        # Verify solver bracketing by patching imported phase function.
        import panchavani.swiss_exact_phase_roots as m
        original=m.swiss_phase
        try:
            m.swiss_phase=lambda swe,t,kind: ((t-start).total_seconds()/3600+13.3333333333)%360
            root=solve(Dummy(),start,"nakshatra",1)
            self.assertLess(abs((root-start).total_seconds()),.125)
            with self.assertRaises(ValueError):
                solve(Dummy(),start+timedelta(days=3),"nakshatra",1)
        finally:
            m.swiss_phase=original

if __name__=="__main__":unittest.main()
