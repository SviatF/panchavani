import unittest
from datetime import datetime, timedelta, timezone
from panchavani.core import Interval
from panchavani.validation_matrix import (
    MATRIX_DATES, signed_circular_error, verify_partition,
    compare_samplings, cross_city_utc_invariance,
)
UTC=timezone.utc
T=datetime(2026,10,13,tzinfo=UTC)
class SeasonalValidationTests(unittest.TestCase):
    def test_seasonal_matrix_includes_leap_year_and_all_quarters(self):
        self.assertGreaterEqual(len(MATRIX_DATES),6)
        self.assertTrue(any(d.month==2 and d.day==29 for d in MATRIX_DATES))
        self.assertTrue(set(d.month for d in MATRIX_DATES).issuperset({3,6,9,12}))
    def test_exact_root_and_bad_root_detected(self):
        f=lambda dt: (10+2*(dt-T).total_seconds()/3600)%360
        true=T+timedelta(hours=1)
        end=T+timedelta(hours=2)
        good=[Interval(T,true,1),Interval(true,end,2)]
        result=verify_partition(good,f,T,end,12)
        self.assertEqual(result['boundaries'],1)
        bad=T+timedelta(seconds=30)+timedelta(hours=1)
        with self.assertRaisesRegex(ValueError,"residual"):
            verify_partition([Interval(T,bad,1),Interval(bad,end,2)],f,T,end,12)
    def test_reject_gap_and_skipped_number(self):
        f=lambda _:12
        end=T+timedelta(hours=2)
        with self.assertRaisesRegex(ValueError,"Partition gap"):
            verify_partition([Interval(T,T+timedelta(hours=1),1),
              Interval(T+timedelta(hours=1,seconds=1),end,2)],f,T,end,12)
        with self.assertRaisesRegex(ValueError,"Partition gap"):
            verify_partition([Interval(T,T+timedelta(hours=1),1),
              Interval(T+timedelta(hours=1),end,3)],f,T,end,12)
    def test_wrapping_error_and_sampling(self):
        self.assertAlmostEqual(signed_circular_error(0.0001,359.9999),0.0002,places=6)
        end=T+timedelta(hours=2)
        a=[Interval(T,T+timedelta(hours=1),1),Interval(T+timedelta(hours=1),end,2)]
        self.assertEqual(compare_samplings(a,a),0)
        shifted=T+timedelta(hours=1,seconds=2)
        b=[Interval(T,shifted,1),Interval(shifted,end,2)]
        with self.assertRaisesRegex(ValueError,"drift"):
            compare_samplings(a,b)
    def test_same_geocentric_event_cross_city(self):
        r=lambda city,seconds:{
            'city':city,'geocentricBoundariesUtc':{
              'tithi':[{'endingNumber':3,'endUtc':(T+timedelta(seconds=seconds)).isoformat()}]
            }}
        self.assertEqual(cross_city_utc_invariance([r('delhi',0),r('mumbai',0)]),1)
        with self.assertRaisesRegex(ValueError,"changed between cities"):
            cross_city_utc_invariance([r('delhi',0),r('mumbai',30)])
if __name__=="__main__":
    unittest.main()
