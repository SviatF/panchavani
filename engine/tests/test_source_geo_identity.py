import json
import unittest
from pathlib import Path

from panchavani.source_geo_identity import (
    classify_external_source,audit_reference_fixture,
    DELHI_GEONAMES_IDS,WRONG_LEGACY_ID
)

ROOT=Path(__file__).resolve().parents[1]
FIXTURE=ROOT/"fixtures"/"delhi-2026-10-21-independent-timings-UNAPPROVED.json"
CORRECT="https://www.drikpanchang.com/panchang/day-panchang.html?geoname-id=1273294&date=21%2F10%2F2026&time-format=24plushour"
WRONG=CORRECT.replace("1273294","934657")

class SourceGeographyTests(unittest.TestCase):
    def test_actual_reference_fixture_reveals_5_wrong_city_sources(self):
        fixture=json.loads(FIXTURE.read_text())
        result=audit_reference_fixture(fixture)
        self.assertEqual(result["status"],"QUARANTINED")
        self.assertEqual(result["totalObservations"],7)
        self.assertEqual(result["qualifiedObserverIdCount"],2)
        self.assertEqual(result["quarantinedObserverIdCount"],5)
        self.assertFalse(result["publicationAuthorized"])
        self.assertTrue(all(x["status"]=="QUARANTINED_NON_DELHI_GEONAME"
                            for x in result["sourceObservations"][2:]))
    def test_no_wrong_mauritius_identifier_ever_counts_for_delhi(self):
        self.assertNotIn(WRONG_LEGACY_ID,DELHI_GEONAMES_IDS)
        self.assertFalse(classify_external_source("Drik Panchang",WRONG,"delhi","2026-10-21")["sourceLocationQualifiedForDelhi"])
        for valid in ("1273294","1261481"):
            match=CORRECT.replace("1273294",valid)
            status=classify_external_source("Drik Panchang",match,"delhi","2026-10-21")
            self.assertTrue(status["sourceLocationQualifiedForDelhi"])
            self.assertFalse(status["sourceCityVerifiedByPublisher"])
            self.assertFalse(status["independentScientificApproval"])
    def test_wrong_date_and_wrong_hostname_rejected(self):
        for bad in (WRONG.replace("21%2F10%2F2026","22%2F10%2F2026"),
                    WRONG.replace("www.drikpanchang.com","evil.example.com"),
                    WRONG.replace("&time-format=24plushour","")):
            with self.subTest(url=bad),self.assertRaises(ValueError):
                classify_external_source("Drik Panchang",bad,"delhi","2026-10-21")
    def test_timeanddate_still_requires_independent_solar_method_review(self):
        p="https://www.timeanddate.com/sun/india/new-delhi?month=10&year=2026"
        result=classify_external_source("Timeanddate",p,"delhi","2026-10-21")
        self.assertTrue(result["sourceLocationQualifiedForDelhi"])
        self.assertFalse(result["independentScientificApproval"])

if __name__=="__main__":unittest.main()
