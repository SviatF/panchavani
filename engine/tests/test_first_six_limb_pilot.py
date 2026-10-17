"""Wave 7 six-limb research invariants. Synthetic fixtures are NOT real astronomy."""
import copy
import unittest
from datetime import date, datetime, timedelta, timezone
from panchavani.first_six_limb_pilot import (
    verify_six_limb_record, verify_batch, PILOT, KINDS
)


def specimen(city="delhi",day=date(2026,10,16)):
    # Two adjacent days share the exact *synthetic* sunrise by construction.
    shift={"delhi":0,"mumbai":10,"chennai":20}[city]
    sunrise=datetime(day.year,day.month,day.day,0,50,tzinfo=timezone.utc)+timedelta(minutes=shift)
    next_sunrise=sunrise+timedelta(days=1)
    sunset=sunrise+timedelta(hours=11)
    # Zero crossings per layer is legitimate in a synthetic short-verification
    # fixture, although the real 24h phase may cross certain 6°/13.33° boundaries.
    names={"tithi":"Shukla Shashthi","karana":"Kaulava",
           "nakshatra":"Jyestha","yoga":"Shobhana"}
    transitions={
        k:[{"number":n,"name":names[k],
            "startUtc":sunrise.isoformat(),"endUtc":next_sunrise.isoformat()}]
        for k,n in (("tithi",6),("karana",11),("nakshatra",18),("yoga",5))
    }
    return {
        "artifactType":"PANCHAVANI_SIX_LIMB_RESEARCH_PACKET",
        "status":"UNAPPROVED_RESEARCH","cityId":city,
        "localDate":day.isoformat(),"timezone":"Asia/Kolkata",
        "sun":{"sunriseUtc":sunrise.isoformat(),"sunsetUtc":sunset.isoformat(),
               "nextSunriseUtc":next_sunrise.isoformat()},
        "panchangAtSunrise":{**names,"vara":"Friday","paksha":"Shukla"},
        "transitions":transitions,
        "publicReleaseAllowed":False,"indexingAuthorized":False,
        "scientificApproval":False,"paidGenerationAuthorized":False,
        "approvedClaimsForDeepSeek":[],
    }


class FirstSixLimbTests(unittest.TestCase):
    def test_research_packet_has_six_panchang_facts_and_no_public_approval(self):
        report=verify_six_limb_record(specimen())
        self.assertEqual(report["checkedLayers"],4)
        self.assertEqual(report["checkedTransitions"],0)
        self.assertTrue(report["localSunriseAttributionPassed"])

    def test_all_mandatory_denials_are_enforced(self):
        for key,val in (("publicReleaseAllowed",True),
                        ("indexingAuthorized",True),
                        ("scientificApproval",True),
                        ("paidGenerationAuthorized",True),
                        ("approvedClaimsForDeepSeek",["unverified claim"]),
                        ("status","approved")):
            r=specimen();r[key]=val
            with self.subTest(field=key), self.assertRaises(ValueError):
                verify_six_limb_record(r)

    def test_missing_layer_or_bad_local_day_fails(self):
        r=specimen();del r["transitions"]["nakshatra"]
        with self.assertRaises(ValueError):verify_six_limb_record(r)
        r=specimen();r["localDate"]="2026-10-17"
        with self.assertRaises(ValueError):verify_six_limb_record(r)

    def test_sunrise_tithi_label_must_be_real_first_interval(self):
        r=specimen();r["panchangAtSunrise"]["tithi"]="Krishna Pratipada"
        with self.assertRaisesRegex(ValueError,"sunrise label"):
            verify_six_limb_record(r)

    def test_boundary_gap_and_half_tithi_disagreement_block(self):
        r=specimen()
        origin=r["transitions"]["tithi"][0]
        mid="2026-10-16T12:00:00+00:00"
        original_end=origin["endUtc"]
        origin["endUtc"]=mid
        r["transitions"]["tithi"].append({
            "number":7,"name":"Shukla Saptami","startUtc":mid,"endUtc":original_end})
        with self.assertRaisesRegex(ValueError,"Tithi/Karana"):
            verify_six_limb_record(r)
        r=specimen();r["transitions"]["karana"][0]["startUtc"]="2026-10-16T00:51:00+00:00"
        with self.assertRaisesRegex(ValueError,"gap"):
            verify_six_limb_record(r)

    def test_batch_covers_6_city_days_and_all_12_dawn_continuities(self):
        records=[specimen(city,date(2026,10,16)+timedelta(days=d))
                 for d in range(2) for city in PILOT]
        report=verify_batch(records)
        self.assertEqual(report["checkedCityDays"],6)
        self.assertEqual(report["checkedFourLimbDawnContinuities"],12)
        self.assertFalse(report["sourceScientificValidation"])

    def test_batch_rejects_duplicated_city_date_and_dawn_shift(self):
        records=[specimen(city,date(2026,10,16)+timedelta(days=d))
                 for d in range(2) for city in PILOT]
        dup=copy.deepcopy(records);dup[1]=copy.deepcopy(dup[0])
        with self.assertRaises(ValueError):verify_batch(dup)
        shifted=copy.deepcopy(records)
        # same middle sunrise but a different phase title across local dawn
        shifted[3]["transitions"]["nakshatra"][0]["name"]="Mula"
        shifted[3]["panchangAtSunrise"]["nakshatra"]="Mula"
        with self.assertRaisesRegex(ValueError,"Cross-day"):
            verify_batch(shifted)


if __name__=="__main__":
    unittest.main()
