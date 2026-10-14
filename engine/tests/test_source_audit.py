import unittest
from panchavani.source_audit import audit_reference_evidence

class SourceAuditTests(unittest.TestCase):
 def base(self):
  return {'city':'delhi','date':'2026-10-13','sources':[
   {'url':'https://first.example.test/panchang','name':'First',
    'nakshatraEnd':'2026-10-14T01:43:00+05:30',
    'independentlyDocumentedUpstream':'provider-a',
    'methodology':{'ayanamsaMode':'Lahiri','ephemeris':'DE440',
     'coordinateConvention':'geocentric','timeConvention':'IST'},
    'provenanceReview':{'reviewer':'astronomer-a','evidenceUrl':'https://archive.example.test/a'},
    'precisionSeconds':60},
   {'url':'https://second.example.test/panchang','name':'Second',
    'nakshatraEnd':'2026-10-14T01:44:00+05:30',
    'independentlyDocumentedUpstream':'provider-b',
    'methodology':{'ayanamsaMode':'Lahiri','ephemeris':'DE431',
     'coordinateConvention':'geocentric','timeConvention':'IST'},
    'provenanceReview':{'reviewer':'astronomer-b','evidenceUrl':'https://archive.example.test/b'},
    'precisionSeconds':60},
   ]}
 def test_two_urls_without_provenance_not_independent(self):
  f=self.base()
  for s in f['sources']:
   s.pop('independentlyDocumentedUpstream')
   s.pop('methodology')
   s.pop('provenanceReview')
  r=audit_reference_evidence(f)
  self.assertEqual(r['sourcesSeen'],2)
  self.assertIn('unverified-upstream-provenance',r['sourceDocumentationIssues'])
  self.assertFalse(r['methodologicalIndependenceVerified'])
  self.assertFalse(r['publicationAuthorized'])
 def test_duplicate_upstream_cannot_be_independent(self):
  f=self.base()
  f['sources'][1]['independentlyDocumentedUpstream']='provider-a'
  r=audit_reference_evidence(f)
  self.assertIn('shared-upstream-family',r['sourceDocumentationIssues'])
 def test_rounding_without_absolute_timezone_is_unverified(self):
  f=self.base()
  f['sources'][0]['nakshatraEnd']='01:43'
  r=audit_reference_evidence(f)
  self.assertIn('ambiguous-clock-time-no-offset',r['sourceDocumentationIssues'])
 def test_metadata_cannot_self_certify_independence(self):
  r=audit_reference_evidence(self.base())
  self.assertFalse(r['sourceDocumentationIssues'])
  self.assertFalse(r['methodologicalIndependenceVerified'])
  self.assertFalse(r['publicationAuthorized'])
 def test_invalid_source_url(self):
  f=self.base()
  f['sources'][0]['url']='http://unsafe.example.test'
  self.assertIn('invalid-source-url',audit_reference_evidence(f)['sourceDocumentationIssues'])
if __name__=='__main__':
 unittest.main()
