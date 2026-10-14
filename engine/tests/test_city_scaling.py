import copy
import json
import tempfile
import unittest
from pathlib import Path
from panchavani.cities import (
    CITY_REGISTRY, RESEARCH_CITIES, PILOT_CITIES, CATALOG_SHA256,
    DEFAULT_CATALOG, load_catalog
)
from panchavani.city_shards import select_city_ids, describe_research_plan

class ResearchCityCatalogTests(unittest.TestCase):
    def test_baseline_is_stable_and_never_auto_approved(self):
        self.assertEqual(len(PILOT_CITIES),8)
        self.assertEqual(set(PILOT_CITIES),set(RESEARCH_CITIES))
        self.assertEqual(len(CATALOG_SHA256),64)
        self.assertTrue(all(not c.coordinates_verified and not c.publishing_approved for c in RESEARCH_CITIES.values()))
    def test_catalog_extension_needs_only_new_data_not_new_python(self):
        content=json.loads(DEFAULT_CATALOG.read_text())
        next_city=copy.deepcopy(content["cities"][0])
        next_city.update({"id":"jaipur","name":"Jaipur","latitude":26.9124,
                          "longitude":75.7873,"elevationMeters":431,
                          "cohort":"expansion","researchEnabled":True})
        content["cities"].append(next_city)
        with tempfile.TemporaryDirectory() as temp:
            p=Path(temp)/"cities.v1.json"
            p.write_text(json.dumps(content))
            all_cities,digest=load_catalog(p)
        self.assertEqual(len(all_cities),9)
        self.assertEqual(all_cities["jaipur"].cohort,"expansion")
        self.assertFalse(all_cities["jaipur"].coordinates_verified)
    def test_reject_duplicate_or_unreviewed_approval(self):
        base=json.loads(DEFAULT_CATALOG.read_text())
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/"cities.json"
            bad=copy.deepcopy(base);bad["cities"].append(bad["cities"][0])
            p.write_text(json.dumps(bad))
            with self.assertRaises(ValueError):load_catalog(p)
            bad=copy.deepcopy(base);bad["cities"][0]["publishingApproved"]=True
            p.write_text(json.dumps(bad))
            with self.assertRaises(ValueError):load_catalog(p)
            bad=copy.deepcopy(base);bad["cities"][0]["timezone"]="Invalid/Timezone"
            p.write_text(json.dumps(bad))
            with self.assertRaises(Exception):load_catalog(p)
    def test_shard_cover_exactly_once(self):
        all_ids=set(RESEARCH_CITIES)
        # Do not assert each shard populated: small pilot groups can map unevenly.
        shards=[]
        for n in range(1,5):
            for i in range(n):
                try: ids=select_city_ids(shard_index=i,shard_count=n)
                except ValueError: continue
                shards.extend(ids)
            self.assertEqual(len(set(shards)),len(all_ids))
            self.assertEqual(len(shards),len(all_ids))
            shards=[]
    def test_cohort_selection_and_unauthorized_slug(self):
        self.assertEqual(select_city_ids(cohort="pilot"),tuple(sorted(RESEARCH_CITIES)))
        with self.assertRaises(ValueError):select_city_ids(requested=("delhi","fake"))
        with self.assertRaises(ValueError):select_city_ids(shard_index=3,shard_count=3)
        with self.assertRaises(ValueError):select_city_ids(shard_count=0)
        self.assertFalse(describe_research_plan()["publicationAuthorized"])
        self.assertEqual(describe_research_plan()["expectedCityDays"],16)

if __name__=="__main__":
    unittest.main()
