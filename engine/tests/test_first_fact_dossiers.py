"""Wave 8: no false SEO approval from three numerically matching research sources."""
import copy
from datetime import date, datetime, timedelta, timezone
from tempfile import TemporaryDirectory
from pathlib import Path
import unittest

from test_first_six_limb_pilot import specimen
from panchavani.first_fact_dossiers import (
    build_dossier, validate_dossier, write_review_previews, _hash
)
from panchavani.first_six_limb_pilot import PILOT
from panchavani.research_batch import JPL_DE440S_SHA

def fixture():
    science={
      "artifactType":"PANCHAVANI_FIRST_SIX_LIMB_SCIENCE_BATCH",
      "status":"UNAPPROVED_RESEARCH",
      "scientificApproval":False,"publicationAuthorized":False,
      "indexingAuthorized":False,"approvedClaimsForDeepSeek":[],
      "kernelSha256":JPL_DE440S_SHA,
      "cityCatalogSha256":"a"*64,
      "records":[specimen(c,date(2026,10,16)+timedelta(days=d))
                 for d in range(2) for c in PILOT]
    }
    geo={
      "artifactType":"PANCHAVANI_WAVE7C_PILOT_GEO_SOLAR_SENSITIVITY",
      "status":"UNAPPROVED_RESEARCH","catalogSha256":"a"*64,
      "jplKernelSha256":JPL_DE440S_SHA,
      "geoSourceIndependentHumanReview":False,
      "sourcePublishedStationCoordinatesMatched":False,
      "publicReleaseAuthorized":False,"indexingAuthorized":False,
      "approvedClaimsForDeepSeek":[],"records":[]
    }
    swiss={
      "artifactType":"PANCHAVANI_EXTERNAL_LAHIRI_PROBE",
      "status":"UNAPPROVED_RESEARCH",
      "panchavaniEphemerisSha256":JPL_DE440S_SHA,
      "swissBackend":"MOSEPH_ANALYTIC",
      "methodEquivalenceConfirmed":False,"scientificApproval":False,
      "releaseAuthorized":False,"indexingAuthorized":False,
      "approvedClaimsForDeepSeek":[],
      "sampleCount":15,"independentBoundaryEventCount":8,
      "comparisons":[]
    }
    for c in PILOT:
        site={"latitude":28.1,"longitude":77.2,"elevationMeters":200}
        cases=[r for r in science["records"] if r["cityId"]==c]
        for r in cases:
            r["cityReference"]={
              "latitude":site["latitude"],"longitude":site["longitude"],
              "estimatedElevationMeters":site["elevationMeters"]
            }
            r["recomputedJplCandidateCanonicalSha256"]="b"*64
            swiss["comparisons"].append({
              "sampleCategory":c+"/"+r["localDate"]+"/SUNRISE",
              "instantUtc":r["sun"]["sunriseUtc"],
              "nakshatraNumberPanchavani":18,"yogaNumberPanchavani":5,
              "nakshatraLabelAgrees":True,"yogaLabelAgrees":True
            })
        dates=[]
        for r in cases:
            ist=lambda value:datetime.fromisoformat(value).astimezone(
                 timezone(timedelta(hours=5,minutes=30))).isoformat(timespec="seconds")
            dates.append({
                "localDate":r["localDate"],
                "catalogClockIST":{
                  "sunrise":ist(r["sun"]["sunriseUtc"]),
                  "sunset":ist(r["sun"]["sunsetUtc"])
                },
                "gazetteerClockIST":{
                  "sunrise":ist(r["sun"]["sunriseUtc"]),
                  "sunset":ist(r["sun"]["sunsetUtc"])
                },
                "gazetteerMinusCatalogSeconds":{
                  "sunriseSeconds":0.0,"sunsetSeconds":0.0
                }
            })
        for extra in ("2026-04-21","2026-10-23"):
            dates.append({"localDate":extra,
              "catalogClockIST":{"sunrise":extra+"T06:00:00+05:30",
                                 "sunset":extra+"T18:00:00+05:30"},
              "gazetteerClockIST":{"sunrise":extra+"T06:00:00+05:30",
                                   "sunset":extra+"T18:00:00+05:30"},
              "gazetteerMinusCatalogSeconds":{"sunriseSeconds":0,"sunsetSeconds":0}})
        geo["records"].append({
            "cityId":c,"researchCityPoint":site,
            "stationPointScientificallyApproved":False,
            "gazetteerPopulatedPlace":{
              "latitude":site["latitude"]+.001,
              "longitude":site["longitude"]+.001,
              "unsurveyedDigitalElevationModelMeters":202
            },
            "gazetteerSourceUrl":"https://www.geonames.org/",
            "distanceBetweenResearchPointsKm":.15,
            "elevationModelVsCatalogMeters":2,
            "dates":dates
        })
    hashes={"science":"a"*64,"geo":"b"*64,"swiss":"c"*64}
    return science,geo,swiss,hashes

class DossiersTest(unittest.TestCase):
    def test_generate_six_distinct_sha_bound_editorial_review_cases_never_approve(self):
        s,g,w,h=fixture()
        r=build_dossier(s,g,w,h)
        self.assertEqual(r["cityDayCount"],6)
        self.assertEqual(r["productionForensicsStatus"],"PRODUCTION_FORENSICS_NOT_FETCHED")
        self.assertFalse(r["publicReleaseAuthorized"])
        self.assertFalse(r["scientificReviewSigned"])
        self.assertFalse(r["indexingAuthorized"])
        self.assertEqual(r["approvedClaimsForDeepSeek"],[])
        self.assertEqual(len(r["records"]),6)
        for row in r["records"]:
            self.assertEqual(len(row["facts"]),8)
            self.assertTrue(row["proposedCanonical"].endswith("/"))
            self.assertEqual(len(set(f["factId"] for f in row["facts"])),8)
            self.assertFalse(row["humanReview"]["canApprove"])
        with TemporaryDirectory() as tmp:
            write_review_previews(r,Path(tmp)/"review")
            md=list((Path(tmp)/"review").glob("*.md"))
            self.assertEqual(len(md),6)
            content=md[0].read_text()
            self.assertIn("NOT A PUBLIC PANCHANG",content)
            self.assertIn("Sunrise",content)
            self.assertIn("Yoga",content)

    def test_provenance_crossrun_chronology_mismatch_blocks(self):
        for mutate in (
            lambda s,g,w: g["records"][0]["researchCityPoint"].update(latitude=10),
            lambda s,g,w: g.update(catalogSha256="f"*64),
            lambda s,g,w: w["comparisons"][0].update(instantUtc="2026-10-18T00:00:00Z"),
            lambda s,g,w: w.update(methodEquivalenceConfirmed=True),
            lambda s,g,w: w["comparisons"][0].update(nakshatraNumberPanchavani=19),
            lambda s,g,w: g["records"][0]["dates"].pop(),
            lambda s,g,w: s["records"][0]["sun"].update(
                     sunsetUtc="2026-10-16T18:00:00+00:00"),
        ):
            s,g,w,h=fixture()
            mutate(s,g,w)
            with self.subTest(mutate=mutate),self.assertRaises(ValueError):
                build_dossier(s,g,w,h)

    def test_external_forensics_import_is_not_a_signed_science_decision(self):
        s,g,w,h=fixture()
        f={
            "artifactType":"PANCHAVANI_PRIVATE_THREE_CITY_SHA_CONFLICT_AUDIT",
            "status":"UNAPPROVED_RESEARCH","localDate":"2026-10-16",
            "realProductionD1ReadForAllCities":True,
            "historicalConflictsScientificallyResolved":False,
            "scientificApproval":False,"indexingAuthorized":False,
            "releaseAuthorized":False,"approvedClaimsForDeepSeek":[],
            "caseCount":3,
            "cases":[{"cityId":c} for c in PILOT]
        }
        packet=build_dossier(s,g,w,h,f,"d"*64)
        self.assertEqual(packet["productionForensicsStatus"],
                         "PRODUCTION_FORENSICS_IMPORTED_UNREVIEWED")
        self.assertFalse(packet["indexingAuthorized"])
        tamper=copy.deepcopy(f)
        tamper["historicalConflictsScientificallyResolved"]=True
        with self.assertRaises(ValueError):build_dossier(s,g,w,h,tamper,"d"*64)

    def test_forensic_digest_cannot_be_supplied_without_source_bytes(self):
        s,g,w,h=fixture()
        with self.assertRaises(ValueError):build_dossier(s,g,w,h,None,"d"*64)

    def test_dossier_forged_approval_and_missing_records_rejected(self):
        s,g,w,h=fixture()
        original=build_dossier(s,g,w,h)
        for key,spoof in (
            ("publicReleaseAuthorized",True),
            ("indexingAuthorized",True),
            ("modelInvocationAuthorized",True),
            ("scientificReviewSigned",True),
        ):
            r=copy.deepcopy(original);r[key]=spoof
            with self.subTest(key=key),self.assertRaises(ValueError):
                validate_dossier(r)
        r=copy.deepcopy(original);r["records"].pop()
        with self.assertRaises(ValueError):validate_dossier(r)

if __name__=="__main__":
    unittest.main()
