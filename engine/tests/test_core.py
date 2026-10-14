import math
import unittest
from datetime import datetime, timedelta, timezone

from panchavani.core import phase_intervals, tithi_number, tithi_title
from panchavani.cities import PILOT_CITIES, City

UTC = timezone.utc
T0 = datetime(2026, 10, 13, 0, 0, tzinfo=UTC)


class CoreTests(unittest.TestCase):
    def test_tithi_naming_and_wrap(self):
        self.assertEqual(tithi_number(0.0), 1)
        self.assertEqual(tithi_number(359.99), 30)
        self.assertEqual(tithi_number(360), 1)
        self.assertEqual(tithi_title(3), "Shukla Tritiya")
        self.assertEqual(tithi_title(30), "Krishna Amavasya")

    def test_real_boundary_solver_math(self):
        def phase(t):
            return (10.0 + 2.0 * (t - T0).total_seconds() / 3600.0) % 360.0
        segments = phase_intervals(phase, T0, T0 + timedelta(hours=6), 12.0)
        self.assertEqual([s.number for s in segments], [1, 2])
        self.assertLess(abs((segments[0].end - (T0 + timedelta(hours=1))).total_seconds()), 0.5)
        self.assertEqual(segments[0].end, segments[1].start)

    def test_wrap_359_to_1(self):
        def phase(t):
            return (359.0 + 2.0 * (t - T0).total_seconds() / 3600.0) % 360
        result = phase_intervals(phase, T0, T0 + timedelta(hours=2), 12)
        self.assertEqual([x.number for x in result], [30, 1])
        self.assertLess(abs((result[0].end - T0).total_seconds() - 1800), .5)

    def test_non_midpoint_root_and_precise_crossing(self):
        # The old solver incorrectly kept lo_angle fixed but moved its base.
        # A crossing at 17 minutes (not 15) must be recovered within 0.5 s.
        def phase(t):
            return (11.0 + (t-T0).total_seconds()/1020.0) % 360.0
        sections=phase_intervals(phase,T0,T0+timedelta(hours=1),12)
        self.assertLess(abs((sections[0].end-(T0+timedelta(minutes=17))).total_seconds()),.5)
        self.assertEqual([s.number for s in sections],[1,2])

    def test_non_midpoint_wrap_crossing_and_multiple_steps(self):
        # 359 to 360°/0 at 11 min; then the same constant rate across 4h.
        def phase(t):
            return (359.0 + (t-T0).total_seconds()/660.0) % 360.0
        sections=phase_intervals(phase,T0,T0+timedelta(hours=4),12,step_minutes=37)
        self.assertLess(abs((sections[0].end-(T0+timedelta(minutes=11))).total_seconds()),.5)
        self.assertEqual(sections[0].number,30)
        self.assertEqual(sections[1].number,1)
        self.assertEqual(sections[0].end,sections[1].start)

    def test_tithi_and_karana_edges_agree_off_midpoint(self):
        from panchavani.periods import karana_title
        def phase(t):
            return (5.0 + 2.0*(t-T0).total_seconds()/3600) % 360
        big=phase_intervals(phase,T0,T0+timedelta(hours=14),12,step_minutes=47)
        half=phase_intervals(phase,T0,T0+timedelta(hours=14),6,step_minutes=31)
        for x in big[:-1]:
            self.assertTrue(any(abs((x.end-y.end).total_seconds())<.5 for y in half[:-1]))
        self.assertEqual(karana_title(1),"Kimstughna")

    def test_two_transitions(self):
        def phase(t):
            return (10 + 1.2 * (t - T0).total_seconds() / 3600) % 360
        result = phase_intervals(phase, T0, T0 + timedelta(hours=24), 12)
        self.assertEqual([x.number for x in result], [1, 2, 3, 4])
        self.assertEqual(result[-1].end, T0 + timedelta(hours=24))

    def test_refuse_naive_datetime(self):
        with self.assertRaises(ValueError):
            phase_intervals(lambda _: 1, datetime(2026, 1, 1), T0, 12)

    def test_refuse_non_monotonic_provider(self):
        with self.assertRaises(ValueError):
            phase_intervals(lambda t: 30 - (t - T0).total_seconds()/3600, T0, T0+timedelta(hours=2), 12)

    def test_city_catalog_provisional(self):
        self.assertEqual(len(PILOT_CITIES), 8)
        self.assertTrue(all(not c.coordinates_verified for c in PILOT_CITIES.values()))
        self.assertTrue(all(c.timezone == 'Asia/Kolkata' for c in PILOT_CITIES.values()))
        with self.assertRaises(ValueError):
            City('invalid', 'invalid', 200, 0, 0)


if __name__ == '__main__':
    unittest.main()
