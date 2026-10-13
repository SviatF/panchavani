import unittest
from panchavani.release_gate import EditorialEvidence, release_blockers, signature


class ReleaseGateTests(unittest.TestCase):
    def test_block_research_candidate_even_with_long_page(self):
        record={
            'status':'calculated',
            'validation':{'blockerCount':4,'reviewStatus':'not-reviewed','referenceComparisons':[]},
            'methodology':{'ayanamsa':'NOT_VALIDATED','rulePackId':'NONE','tzdbVersion':'system-not-yet-pinned'},
            'city':{'catalogVersion':'pilot-unverified-v1'},
            'panchangAtSunrise':{'tithi':'Shukla Tritiya','nakshatra':None,'yoga':None,'karana':None,'vara':'Tuesday','paksha':'Shukla'},
        }
        e=EditorialEvidence('', '', (), (), '')
        blockers=release_blockers(record,e,('Delhi','Mumbai'))
        self.assertIn('not-explicitly-approved',blockers)
        self.assertIn('missing-panchang-limbs',blockers)
        self.assertIn('unverified-city-coordinates',blockers)
        self.assertIn('missing-independent-crosschecks',blockers)
        self.assertIn('thin-page',blockers)

    def test_cosmetic_city_substitution_same_signature(self):
        d='In Delhi, this morning begins with the sunrise and local calendar data for Delhi.'
        m='In Mumbai, this morning begins with the sunrise and local calendar data for Mumbai.'
        self.assertEqual(signature(d,('Delhi','Mumbai')),signature(m,('Delhi','Mumbai')))

if __name__ == '__main__':
    unittest.main()
