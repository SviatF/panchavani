"""Daily rolling research outputs always remain non-indexable, for any local date."""
import copy
import json
from datetime import date,timedelta
import unittest
from test_first_six_limb_pilot import specimen
from panchavani.first_six_limb_pilot import PILOT,verify_batch
from panchavani.rolling_day_previews import make_rolling_previews
from panchavani.research_batch import JPL_DE440S_SHA

def data(start=date(2027,1,1)):
    records=[]
    for days in range(2):
        for city in PILOT:
            r=specimen(city,start+timedelta(days=days))
            r['cityName']=city.capitalize()
            r['methodology']={'siderealMethodIndependentlyCalibrated':False}
            r['cityReference']={
               'latitude':18.01,'longitude':75.01,'coordinatesVerified':False
            }
            records.append(r)
    return {
      'artifactType':'PANCHAVANI_FIRST_SIX_LIMB_SCIENCE_BATCH',
      'status':'UNAPPROVED_RESEARCH','kernelSha256':JPL_DE440S_SHA,
      'scientificApproval':False,'publicationAuthorized':False,
      'indexingAuthorized':False,'approvedClaimsForDeepSeek':[],
      'records':records
    }

class RollingPreviewTests(unittest.TestCase):
    def test_arbitrary_year_two_adjacent_days_six_city_pages(self):
        raw=data()
        qa=verify_batch(raw['records'])
        self.assertEqual(qa['localDateFrom'],'2027-01-01')
        self.assertEqual(qa['localDateThrough'],'2027-01-02')
        r=make_rolling_previews(raw)
        self.assertEqual(r['cityDays'],6)
        self.assertFalse(r['publicationAuthorized'])
        self.assertFalse(r['scientificApproval'])
        self.assertEqual(len(set(x['previewName'] for x in r['records'])),6)
        self.assertEqual(len(set(x['previewSha256'] for x in r['records'])),6)
        self.assertIn('City-specific modeled solar clock',r['records'][0]['reviewMarkdown'])
        self.assertIn('no public publishing',r['records'][0]['reviewMarkdown'])
    def test_wrong_date_window_and_duplicate_city_blocks(self):
        raw=data()
        raw['records'][3]['localDate']='2027-01-04'
        with self.assertRaises(ValueError):make_rolling_previews(raw)
    def test_no_fake_approvals_or_lahiri_relabel(self):
        for tweak in [
          lambda d:d.update(indexingAuthorized=True),
          lambda d:d.update(approvedClaimsForDeepSeek=['unreviewed']),
          lambda d:d['records'][0]['methodology'].update(siderealMethodIndependentlyCalibrated=True),
          lambda d:d['records'][0]['cityReference'].update(coordinatesVerified=True)
        ]:
            with self.subTest(tweak=tweak),self.assertRaises(ValueError):
                d=data();tweak(d);make_rolling_previews(d)
if __name__=='__main__':unittest.main()
