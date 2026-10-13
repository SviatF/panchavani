import json
import unittest
from datetime import datetime, timezone
from pathlib import Path
from panchavani.compare import compare

FIXTURE=json.loads((Path(__file__).parent.parent / 'fixtures/delhi-2026-10-13.references.json').read_text())


class ComparatorTests(unittest.TestCase):
    def test_comparison_math(self):
        sample={
          'city':{'id':'delhi','tz':'Asia/Kolkata'},'localDate':'2026-10-13',
          'sun':{'sunriseUtc':'2026-10-13T00:50:37Z','sunsetUtc':'2026-10-13T12:23:53Z'},
          'transitions':[{'type':'tithi','value':'Shukla Tritiya','endUtc':'2026-10-13T17:58:13Z'}],
        }
        r=compare(sample,FIXTURE)
        self.assertEqual(len(r),6)
        self.assertTrue(all(x['withinResearchTolerance'] for x in r))

    def test_reject_hour_deviation(self):
        sample={
          'city':{'id':'delhi','tz':'Asia/Kolkata'},'localDate':'2026-10-13',
          'sun':{'sunriseUtc':'2026-10-13T01:50:37Z','sunsetUtc':'2026-10-13T12:23:53Z'},
          'transitions':[{'type':'tithi','value':'Shukla Tritiya','endUtc':'2026-10-13T17:58:13Z'}],
        }
        r=compare(sample,FIXTURE)
        self.assertFalse(all(x['withinResearchTolerance'] for x in r))

if __name__ == '__main__':
    unittest.main()
