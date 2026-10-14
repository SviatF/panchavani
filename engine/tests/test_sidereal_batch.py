import unittest
from datetime import date
from panchavani.sidereal_batch import ensure_cross_city_consistency

class SiderealBatchTests(unittest.TestCase):
    def test_geocentric_transition_cannot_vary_by_city(self):
        def r(city, t):
            return {'cityId':city,'nakshatra':[
                {'number':16,'endUtc':t}, {'number':17,'endUtc':'2026-10-15T05:30:00+00:00'}],
                'yoga':[{'number':2,'endUtc':'2026-10-13T14:54:00+00:00'},
                        {'number':3,'endUtc':'2026-10-14T15:00:00+00:00'}]}
        a=r('delhi','2026-10-13T20:13:00+00:00')
        b=r('mumbai','2026-10-13T20:13:00+00:00')
        ensure_cross_city_consistency([a,b])
        b['nakshatra'][0]['endUtc']='2026-10-13T20:16:00+00:00'
        with self.assertRaises(ValueError):
            ensure_cross_city_consistency([a,b])
    def test_distinct_window_clipping_not_equal_events(self):
        a={'nakshatra':[{'number':16,'endUtc':'2026-10-13T20:13:00+00:00'},
                         {'number':17,'endUtc':'2026-10-14T20:13:00+00:00'}],
           'yoga':[{'number':2,'endUtc':'2026-10-13T14:54:00+00:00'}]}
        b={'nakshatra':[{'number':16,'endUtc':'2026-10-13T20:13:00+00:00'}],
           'yoga':[{'number':2,'endUtc':'2026-10-13T14:54:00+00:00'}]}
        ensure_cross_city_consistency([a,b])

if __name__=='__main__':unittest.main()
