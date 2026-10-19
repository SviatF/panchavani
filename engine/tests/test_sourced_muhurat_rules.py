"""Wave 11 deterministic screening tests. NO religious or scientific certification."""
import copy
import json
import unittest
from pathlib import Path
from datetime import datetime,timedelta,timezone,date

from test_ten_city_six_limb_research import ten_city_research_batch
from panchavani.muhurat_windows import intersection_grid
from panchavani.sourced_muhurat_rules import (
    score_reference_grid,validate_research_grid,check_reference_profiles,
    _rahu_interval,_minus,_merge,_s
)

RULES_PATH=Path(__file__).resolve().parents[1]/"fixtures"/"muhurat-reference-rulebook-DRAFT.json"

def rulebook():
    return json.loads(RULES_PATH.read_text())

def grid():
    return intersection_grid(ten_city_research_batch(start=date(2027,1,1)))

class SourcedMuhuratRulesTests(unittest.TestCase):
    def test_documented_source_contract_and_zero_review_guarantee(self):
        g=grid()
        report=score_reference_grid(g,rulebook())
        self.assertEqual(report["cityCount"],10)
        self.assertEqual(report["localDateFrom"],"2027-01-01")
        self.assertEqual(report["localDateThrough"],"2027-01-02")
        self.assertEqual(report["metrics"]["cityDaysValidated"],20)
        self.assertEqual(report["metrics"]["phaseSlicesValidated"],20)
        self.assertEqual(report["metrics"]["fourLimbLabelsValidated"],80)
        self.assertEqual(report["metrics"]["maximumDurationErrorSeconds"],0)
        self.assertEqual(report["metrics"]["maximumSunriseChainErrorSeconds"],0)
        self.assertFalse(report["scientificApproval"])
        self.assertFalse(report["publicationAuthorized"])
        self.assertFalse(report["indexingAuthorized"])
        self.assertFalse(report["muhuratRecommendationsAuthorized"])
        self.assertEqual(report["approvedClaimsForDeepSeek"],[])
        self.assertEqual(report["analysis"]["wedding"]["initialSurvivingWindows"],0)
        self.assertEqual(report["analysis"]["vehicle-purchase"]["initialSurvivingWindows"],0)
        self.assertEqual(report["analysis"]["wedding"]["filteredReasonsBySlice"]["NAKSHATRA_NOT_IN_SOURCE_LIST"],20)
        self.assertEqual(report["analysis"]["vehicle-purchase"]["filteredReasonsBySlice"]["NOT_PREFERRED_MOVABLE_NAKSHATRA"],20)

    def test_wedding_can_be_preliminarily_screened_but_not_certified(self):
        g=grid()
        for r in g["windows"]:
            for w in r["windows"]:
                w["elements"]["nakshatra"]={"name":"Rohini","number":4}
        data=score_reference_grid(g,rulebook())
        wedding=data["analysis"]["wedding"]
        self.assertEqual(wedding["initialSurvivingWindows"],20)
        self.assertEqual(wedding["qualifyingWeddingOrPurchaseMuhuratCount"],0)
        self.assertEqual(wedding["approvedRitualWindows"],[])
        self.assertTrue(all(not x["auspiciousRecommendation"] for x in wedding["rawInitialMatches"]))
        self.assertIn("solar Rashi / permitted solar months",wedding["remainingIndependentChecks"])

    def test_nakshatra_pada_without_exact_event_is_not_silently_accepted(self):
        g=grid()
        for r in g["windows"]:
            for w in r["windows"]:
                w["elements"]["nakshatra"]={"name":"Magha","number":10}
        d=score_reference_grid(g,rulebook())["analysis"]["wedding"]
        self.assertEqual(d["initialSurvivingWindows"],0)
        self.assertEqual(d["filteredReasonsBySlice"]["NAKSHATRA_PADA_NOT_COMPUTED"],20)

    def test_prohibited_marriage_karana_or_yoga_blocks_even_when_star_accepted(self):
        g=grid()
        for r in g["windows"]:
            for w in r["windows"]:
                w["elements"]["nakshatra"]={"name":"Hasta","number":13}
                w["elements"]["karana"]={"name":"Vishti","number":14}
                w["elements"]["yoga"]={"name":"Atiganda","number":6}
        d=score_reference_grid(g,rulebook())["analysis"]["wedding"]
        self.assertEqual(d["initialSurvivingWindows"],0)
        self.assertEqual(d["filteredReasonsBySlice"]["KARANA_PROHIBITED"],20)
        self.assertEqual(d["filteredReasonsBySlice"]["YOGA_PROHIBITED_CONSERVATIVE_WHOLE_INTERVAL"],20)

    def test_vehicle_city_specific_rahu_sunset_eighths_and_2100_clipping(self):
        g=grid()
        for r in g["windows"]:
            for w in r["windows"]:
                w["elements"]["nakshatra"]={"name":"Punarvasu","number":7}
        data=score_reference_grid(g,rulebook())["analysis"]["vehicle-purchase"]
        self.assertGreater(data["initialSurvivingWindows"],0)
        self.assertGreater(data["rahuExclusionOperations"],0)
        self.assertGreater(data["filteredReasonsBySlice"]["SOURCE_PROHIBITED_WEEKDAY"],0)
        self.assertEqual(data["qualifyingWeddingOrPurchaseMuhuratCount"],0)
        self.assertTrue(all(datetime.fromisoformat(x["endIST"]).hour<=21 for x in data["rawInitialMatches"]))
        self.assertTrue(all(x["durationSeconds"]>=300 for x in data["rawInitialMatches"]))
        self.assertEqual(data["approvedClaimsForDeepSeek"],[])

    def test_rahu_partition_weekday_mapping_and_half_open_subtraction(self):
        start=datetime(2027,1,3,1,tzinfo=timezone.utc) # 06:30 IST, Sunday
        end=start+timedelta(hours=12)
        # Sunday eighth segment = 10.5h after dawn, to 12h: 17:00-18:30 IST.
        a,b,num=_rahu_interval(date(2027,1,3),start,end)
        self.assertEqual(num,8)
        self.assertEqual(_s(start,a),10*3600+30*60)
        self.assertEqual(_s(a,b),90*60)
        self.assertEqual(_minus(start,end,a,b),[(start,a)])
        # Monday is second eighth; Saturday is third eighth.
        self.assertEqual(_rahu_interval(date(2027,1,4),start,end)[2],2)
        self.assertEqual(_rahu_interval(date(2027,1,9),start,end)[2],3)
        monday_a,monday_b,_=_rahu_interval(date(2027,1,4),start,end)
        portions=_minus(start,end,monday_a,monday_b)
        self.assertEqual(len(portions),2)
        self.assertAlmostEqual(sum(_s(x,y) for x,y in portions),10.5*3600)

    def test_short_slices_merge_before_five_minute_filter(self):
        t=datetime(2027,1,1,0,tzinfo=timezone.utc)
        chunks=[
            {"cityId":"delhi","localDate":"2027-01-01","_a":t,"_b":t+timedelta(seconds=160),"sourceSliceIndices":[0]},
            {"cityId":"delhi","localDate":"2027-01-01","_a":t+timedelta(seconds=160),
             "_b":t+timedelta(seconds=320),"sourceSliceIndices":[1]}
        ]
        out=_merge(chunks)
        self.assertEqual(len(out),1)
        self.assertEqual(_s(out[0]["_a"],out[0]["_b"]),320)
        self.assertEqual(out[0]["sourceSliceIndices"],[0,1])

    def test_reject_approval_spoofing_method_list_mutations_and_non_contiguous_grid(self):
        book=rulebook()
        for field,modified in (
            ("status","APPROVED"),
            ("independentExpertReview","VERIFIED"),
        ):
            other=copy.deepcopy(book);other[field]=modified
            with self.subTest(field=field),self.assertRaises(ValueError):
                check_reference_profiles(other)
        other=copy.deepcopy(book)
        other["profiles"]["wedding"]["allowedNakshatraNumbers"].append(8)
        with self.assertRaises(ValueError):check_reference_profiles(other)
        other=copy.deepcopy(book)
        other["profiles"]["vehicle-purchase"]["rahuSegmentNumberSundayFirst"]=[8]*7
        with self.assertRaises(ValueError):check_reference_profiles(other)
        g=grid()
        for key in ("scientificApproval","muhuratRecommendationsAuthorized","publicationAuthorized","indexingAuthorized"):
            bad=copy.deepcopy(g);bad[key]=True
            with self.subTest(key=key),self.assertRaises(ValueError):
                validate_research_grid(bad)
        bad=copy.deepcopy(g);bad["windows"][0]["windows"][0]["durationSeconds"]=20
        with self.assertRaises(ValueError):validate_research_grid(bad)
        bad=copy.deepcopy(g);bad["windows"][0]["windows"][0]["endUtc"]="2027-01-01T06:30:00Z"
        with self.assertRaises(ValueError):validate_research_grid(bad)
        bad=copy.deepcopy(g);bad["windows"][2]["cityId"]="delhi"
        with self.assertRaises(ValueError):validate_research_grid(bad)

if __name__=="__main__":
    unittest.main()
