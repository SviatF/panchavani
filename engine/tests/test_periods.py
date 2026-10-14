import unittest
from datetime import datetime, timedelta, timezone

from panchavani.core import phase_intervals
from panchavani.periods import karana_number, karana_title, daylight_windows, DAY_PARTS

UTC = timezone.utc
START = datetime(2026,10,13,tzinfo=UTC)

class PeriodTests(unittest.TestCase):
    def test_full_sixty_part_karana_sequence(self):
        self.assertEqual(karana_title(1), "Kimstughna")
        self.assertEqual([karana_title(i) for i in range(2,9)],
                         ["Bava","Balava","Kaulava","Taitila","Gara","Vanija","Vishti"])
        self.assertEqual(karana_title(57), "Vishti")
        self.assertEqual([karana_title(i) for i in (58,59,60)],
                         ["Shakuni","Chatushpada","Naga"])
        self.assertEqual(karana_number(359.99),60)
        self.assertEqual(karana_number(360),1)
        self.assertEqual(len(set(karana_title(i) for i in range(1,61))),11)
        with self.assertRaises(ValueError): karana_title(61)

    def test_daylight_eighths_for_all_weekdays(self):
        for weekday in range(7):
            sunrise=START+timedelta(hours=6)
            sunset=START+timedelta(hours=18)
            windows=daylight_windows(sunrise,sunset,weekday)
            self.assertEqual(len(windows),3)
            self.assertEqual([w.part for w in windows],[table[weekday] for table in DAY_PARTS.values()])
            for w in windows:
                self.assertEqual((w.end-w.start).total_seconds(),5400)
        windows=daylight_windows(START+timedelta(hours=6),START+timedelta(hours=18),1)
        self.assertEqual(windows[0].start, START+timedelta(hours=15))
        self.assertEqual(windows[0].end, START+timedelta(hours=16,minutes=30))

    def test_city_variation_and_invalid_intervals(self):
        one=daylight_windows(START+timedelta(hours=6),START+timedelta(hours=18),1)
        two=daylight_windows(START+timedelta(hours=6,minutes=21),
                             START+timedelta(hours=18,minutes=5),1)
        self.assertNotEqual(one[0].start,two[0].start)
        with self.assertRaises(ValueError): daylight_windows(START,START,1)
        with self.assertRaises(ValueError): daylight_windows(START,START+timedelta(hours=12),7)

    def test_tithi_karana_boundaries_numerically_coincide(self):
        def phase(t):
            return (5+1.8*(t-START).total_seconds()/3600)%360
        big=phase_intervals(phase,START,START+timedelta(hours=24),12)
        small=phase_intervals(phase,START,START+timedelta(hours=24),6)
        edges=[x.end for x in small[:-1]]
        for x in big[:-1]:
            self.assertTrue(any(abs((x.end-k).total_seconds())<=1 for k in edges))

if __name__=='__main__':
    unittest.main()
