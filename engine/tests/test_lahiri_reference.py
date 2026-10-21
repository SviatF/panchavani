import unittest
from panchavani.lahiri_reference import circular_arcseconds, DATES

class LahiriComparisonTests(unittest.TestCase):
    def test_circular_angle_wrapping(self):
        self.assertAlmostEqual(circular_arcseconds(359.99,0.01),72)
        self.assertAlmostEqual(circular_arcseconds(24.0,24.0),0)
        self.assertEqual(len(DATES),len(set(DATES)))
    def test_reference_cannot_prove_science_from_one_instant(self):
        self.assertGreaterEqual(len(DATES),4)

if __name__=="__main__":
    unittest.main()
