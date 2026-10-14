import unittest
from dataclasses import replace
from panchavani.seo_review import CityPage, audit_city_pages, may_index
from panchavani.release_gate import EditorialEvidence

class SeoReviewTests(unittest.TestCase):
 def draft(self, city='delhi', date='2026-10-13'):
  body=('City-specific sunrise and sunset timings are calculated from the local '
        'city location using independently provided astronomical inputs. '
        'Regional festivals require independent rule evidence and verified timing. ')*8
  record={
   'status':'calculated','city':{'id':city,'name':city.capitalize(),'catalogVersion':'pilot-unverified-v1'},
   'localDate':date,
   'validation':{'blockerCount':4,'reviewStatus':'not-reviewed','referenceComparisons':[]},
   'methodology':{'ayanamsa':'NOT_VALIDATED','rulePackId':'NONE','tzdbVersion':'system-not-yet-pinned'},
   'panchangAtSunrise':{'tithi':'Shukla Tritiya','nakshatra':None,'yoga':None,'karana':'Bava','vara':'Tuesday','paksha':'Shukla'},
   'sun':{'sunriseUtc':'2026-10-13T01:00:00Z','sunsetUtc':'2026-10-13T12:00:00Z','nextSunriseUtc':'2026-10-14T01:00:00Z'},
   'transitions':[{'type':x} for x in ('tithi','karana','rahu-kalam','yamaganda','gulika')]
  }
  evidence=EditorialEvidence('editor',body,('source-a','source-b'),('ref-a','ref-b'),body)
  return CityPage(city,date,f'/panchang/{city}/{date}/',f'Panchang in {city.capitalize()} {date}',body,evidence,record)
 def test_no_index_draft_even_if_long_and_locally_distinct(self):
  report=audit_city_pages([self.draft()])
  self.assertFalse(may_index(report))
  errors=next(iter(report.values()))
  self.assertIn('unapproved-astronomical-record',errors)
  self.assertIn('unverified-city-coordinates',errors)
 def test_canonical_spoofing_is_blocked(self):
  p=self.draft()
  broken=replace(p,canonical_path='https://example.com/panchang/delhi/2026-10-13/')
  self.assertIn('invalid-or-duplicate-canonical',next(iter(audit_city_pages([broken]).values())))
 def test_duplicate_location_content_is_flagged(self):
  a=self.draft('delhi')
  b=self.draft('mumbai')
  report=audit_city_pages([a,b])
  self.assertTrue(all('near-duplicate-location-template' in val for val in report.values()))
 def test_missing_actual_local_evidence_is_not_indexable(self):
  p=self.draft()
  p.record['sun']={}
  self.assertIn('missing-local-solar-evidence',next(iter(audit_city_pages([p]).values())))
 def test_duplicate_city_date_is_blocked(self):
  p=self.draft()
  report=audit_city_pages([p,p])
  self.assertIn('duplicate-city-date',next(iter(report.values())))
if __name__=='__main__':unittest.main()
