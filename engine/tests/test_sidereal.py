import unittest
from panchavani.sidereal import (
    PART_WIDTH, NAKSHATRA_NAMES, YOGA_NAMES,
    nakshatra_phase,yoga_phase,nakshatra_index,yoga_index,
    LahiriEpochAnchorResearch,
)

class SiderealTests(unittest.TestCase):
    def test_all_names_and_partitions(self):
        self.assertEqual(len(NAKSHATRA_NAMES),27)
        self.assertEqual(len(YOGA_NAMES),27)
        self.assertEqual(len(set(NAKSHATRA_NAMES)),27)
        self.assertEqual(len(set(YOGA_NAMES)),27)
        for i in range(27):
            self.assertEqual(nakshatra_index((i+.5)*PART_WIDTH),i+1)
            self.assertEqual(yoga_index((i+.5)*PART_WIDTH),i+1)
        self.assertEqual(NAKSHATRA_NAMES[15],"Vishakha")
        self.assertEqual(YOGA_NAMES[1],"Priti")

    def test_solar_lunar_subtract_and_wrap(self):
        self.assertAlmostEqual(nakshatra_phase(10,24),346)
        self.assertAlmostEqual(yoga_phase(10,20,24),342)
        self.assertAlmostEqual(nakshatra_phase(360,0),0)
        self.assertEqual(nakshatra_index(359.999),27)
        self.assertEqual(nakshatra_index(360),1)

    def test_sidereal_phase_numbers_at_boundaries(self):
        self.assertEqual(nakshatra_index(PART_WIDTH-.00001),1)
        self.assertEqual(nakshatra_index(PART_WIDTH+.00001),2)
        self.assertEqual(yoga_index(26*PART_WIDTH+.00001),27)

    def test_epoch_anchor_is_explicitly_unvalidated(self):
        self.assertAlmostEqual(LahiriEpochAnchorResearch.ANCHOR_DEGREES,
                               23+15/60+.658/3600)
        self.assertIn("UNVALIDATED",LahiriEpochAnchorResearch.METHOD_ID)
        with self.assertRaises(ValueError):
            nakshatra_phase(float("nan"),24)
        with self.assertRaises(ValueError):
            yoga_phase(30,float("inf"),24)
if __name__=="__main__":unittest.main()
