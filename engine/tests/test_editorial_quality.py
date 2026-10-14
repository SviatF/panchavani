import copy
import json
import unittest
from pathlib import Path
from panchavani.editorial_quality import inspect_brief_registry,copy_review_flags,release_readiness_check
from panchavani.cities import RESEARCH_CITIES

P=Path(__file__).resolve().parents[1]/"editorial"/"expansion-17-research-briefs.v1.json"

class HumanFirstSeoTests(unittest.TestCase):
    def setUp(self):
        self.data=json.loads(P.read_text(encoding="utf-8"))
    def test_17_distinct_editorial_briefs_are_drafts_not_pages(self):
        s=inspect_brief_registry(self.data)
        self.assertEqual(s['cityBriefCount'],17)
        self.assertEqual(s['indexablePages'],0)
        self.assertFalse(s['publicationAuthorized'])
    def test_fabricated_review_or_duplicate_brief_rejected(self):
        altered=copy.deepcopy(self.data)
        altered['cityBriefs'][0]['editorialReviewer']='automated'
        with self.assertRaises(ValueError):inspect_brief_registry(altered)
        altered=copy.deepcopy(self.data)
        altered['cityBriefs'][1]['localResearchAngle']=altered['cityBriefs'][0]['localResearchAngle']
        with self.assertRaises(ValueError):inspect_brief_registry(altered)
    def test_location_swapped_template_and_stock_ai_language_flagged(self):
        first=("The local sunrise in Jaipur determines the starting calendar day. "
               "This location page lists timings but gives no additional sources or review. ")*7
        second=first.replace("Jaipur","Lucknow")
        a=copy_review_flags(first,(second,),("Jaipur","Lucknow"))
        self.assertIn("location-swap-or-near-duplicate-city-prose",a)
        self.assertIn("placeholder-or-robotic-stock-phrase",
                      copy_review_flags("Lorem ipsum [City] TODO",(),("Delhi",)))
    def test_hindi_unicode_page_shingles_can_be_seen(self):
        a="दिल्ली में सूर्योदय पर तिथि का अर्थ समझने के लिए स्थानीय खगोलीय समय देखना ज़रूरी है। "*12
        b=a.replace("दिल्ली","लखनऊ")
        a_issues=copy_review_flags(a,(b,),("दिल्ली","लखनऊ"))
        self.assertIn("location-swap-or-near-duplicate-city-prose",a_issues)
    def test_no_candidate_can_self_approve_before_city_geodata_review(self):
        issues=release_readiness_check(city_id="jaipur",body="A few numbers from a calculator.")
        self.assertIn("human-editorial-review-missing",issues)
        self.assertIn("astronomy-record-not-independently-approved",issues)
        self.assertIn("city-station-geodata-unverified",issues)
        self.assertIn("two-or-more-source-linked-local-facts-missing",issues)

if __name__=="__main__":
    unittest.main()
