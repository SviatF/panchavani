"""Synthetic provenance tests: success never means scientific release approval."""
import copy
import unittest
from panchavani.delhi_first_release_dossier import make_dossier,markdown

DRIK="https://www.drikpanchang.com/panchang/day-panchang.html?geoname-id=934657&date=21%2F10%2F2026&time-format=24plushour"
SOLAR="https://www.timeanddate.com/sun/india/new-delhi?month=10&year=2026"
def inputs():
    a="2026-10-21T00:55:00Z"
    b="2026-10-22T00:55:00Z"
    elements={"tithi":"Dashami","karana":"Garaja","nakshatra":"Dhanishtha",
              "yoga":"Ganda","vara":"Wednesday","paksha":"Shukla"}
    rec={"cityId":"delhi","localDate":"2026-10-21","status":"UNAPPROVED_RESEARCH",
         "scientificApproval":False,"independentMethodologicalAccuracyProven":False,
         "publicReleaseAllowed":False,"indexingAuthorized":False,
         "methodology":{"siderealMethodIndependentlyCalibrated":False},
         "cityReference":{"coordinatesVerified":False},
         "sun":{"sunriseUtc":a,"sunsetUtc":"2026-10-21T12:16:00Z","nextSunriseUtc":b},
         "panchangAtSunrise":elements,
         "transitions":{name:[{"name":elements[name],"startUtc":a,"endUtc":b}]
                        for name in ("tithi","karana","nakshatra","yoga")},
         "blockers":["Independent source calibration needed"]}
    kinds=("sunrise","sunset","tithi","karana","karana","nakshatra","yoga")
    refs=[{"cityId":"delhi","localDate":"2026-10-21","kind":kind,
           "sourceProvider":("Timeanddate" if kind in ("sunrise","sunset") else "Drik Panchang"),
           "sourceUrl":(SOLAR if kind in ("sunrise","sunset") else DRIK),
           "referenceUtc":"2026-10-21T08:41:00+00:00",
           "calculatedUtc":"2026-10-21T08:42:00+00:00",
           "referencePrecisionSeconds":60,"absoluteErrorSeconds":60,
           "independentlyVerified":False} for kind in kinds]
    return {
       "batch":{"artifactType":"PANCHAVANI_TEN_CITY_SIX_LIMB_RESEARCH_BATCH",
                "status":"UNAPPROVED_RESEARCH","scientificApproval":False,
                "publicationAuthorized":False,"indexingAuthorized":False,"records":[rec]},
       "benchmark":{"artifactType":"PANCHAVANI_REFERENCE_ACCURACY_BENCHMARK",
                    "status":"UNAPPROVED_COMPARISON","scientificApproval":False,
                    "publicationAuthorized":False,"indexingAuthorized":False,
                    "sampleCount":7,"comparisons":refs},
       "coverage":{"artifactType":"PANCHAVANI_REFERENCE_EVIDENCE_COVERAGE",
                   "hasAllTenCityEventGroups":False,"publicationAuthorized":False},
       "triage":{"artifactType":"PANCHAVANI_REFERENCE_DISCREPANCY_TRIAGE",
                 "sampleCount":7,"overallMethodAccuracyCertified":False,
                 "publicationAuthorized":False},
       "swiss":{"artifactType":"PANCHAVANI_SWISS_EXACT_SIDEREAL_PHASE_ROOTS",
                "status":"UNAPPROVED_REFERENCE_COMPARISON",
                "backend":"SWISS_EPHEMERIS_ONLY_NO_MOSHIER_FALLBACK",
                "checkedCityIds":["delhi"],"scientificApproval":False,
                "publicationAuthorized":False,
                "comparisons":[{"cityId":"delhi","localDate":"2026-10-21",
                                "kind":kind,"absoluteDifferenceSeconds":.7,
                                "independentTimingAgreementApproved":False}
                               for kind in ("nakshatra","yoga")]}
    }

class DelhiFirstDayReviewTests(unittest.TestCase):
    def test_complete_private_dossier(self):
        report=make_dossier(**inputs())
        self.assertTrue(report["readinessForHumanFactCheck"])
        self.assertEqual(len(report["independentPublisherMeasurements"]),7)
        self.assertEqual(report["panchang"]["tithi"],"Dashami")
        self.assertTrue(all(x["dateAndCityInUri"] for x in report["sourceIdentityChecks"]))
        self.assertFalse(report["scientificApproval"])
        self.assertFalse(report["publicationAuthorized"])
        self.assertFalse(report["indexingAuthorized"])
        self.assertEqual(report["approvedClaimsForDeepSeek"],[])
        self.assertIn("No public daily URL",markdown(report))
    def test_undated_or_wrong_city_external_page_is_rejected(self):
        for altered in (DRIK.replace("&date=21%2F10%2F2026",""),
                        DRIK.replace("934657","9999"),
                        DRIK.replace("21%2F10%2F2026","22%2F10%2F2026")):
            data=inputs()
            data["benchmark"]["comparisons"][2]["sourceUrl"]=altered
            with self.subTest(altered=altered),self.assertRaises(ValueError):
                make_dossier(**data)
    def test_forged_approval_fails_closed(self):
        for component,field in (("batch","publicationAuthorized"),
                                ("benchmark","scientificApproval"),
                                ("swiss","publicationAuthorized"),
                                ("triage","overallMethodAccuracyCertified")):
            data=inputs()
            data[component][field]=True
            with self.subTest(component=component),self.assertRaises(ValueError):
                make_dossier(**data)
    def test_missing_sixth_limb_or_swiss_phase_is_rejected(self):
        data=inputs()
        del data["batch"]["records"][0]["panchangAtSunrise"]["paksha"]
        with self.assertRaises(ValueError):make_dossier(**data)
        data=inputs()
        data["swiss"]["comparisons"][:]=data["swiss"]["comparisons"][:1]
        with self.assertRaises(ValueError):make_dossier(**data)

if __name__=="__main__":unittest.main()
