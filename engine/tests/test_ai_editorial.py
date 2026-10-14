import io
import json
import unittest
from datetime import date
from panchavani.cities import RESEARCH_CITIES
from panchavani.ai_editorial import (
    make_prompt_packet,inspect_model_reply,assemble_research_draft,
    deepseek_json
)

def test_candidate():
    from panchavani.core import tithi_title
    from panchavani.periods import karana_title
    city=RESEARCH_CITIES["delhi"]
    return {
        "city":{"id":city.id,"name":city.name,"lat":city.latitude,
                "lon":city.longitude,"tz":city.timezone,
                "catalogVersion":city.catalog_version},
        "localDate":"2026-10-13",
        "status":"calculated",
        "sun":{"sunriseUtc":"2026-10-13T00:50:00Z",
               "sunsetUtc":"2026-10-13T12:24:00Z",
               "nextSunriseUtc":"2026-10-14T00:51:00Z"},
        "approvedBy":None,"releaseId":None,
        "validation":{"blockerCount":4},
        "methodology":{"ayanamsa":"NOT_VALIDATED"},
        "panchangAtSunrise":{"tithi":tithi_title(1),
                             "nakshatra":None,"yoga":None,"karana":karana_title(1)},
        "transitions":[
            {"type":"tithi","value":tithi_title(1),
             "startUtc":"2026-10-13T00:45:00Z","endUtc":"2026-10-14T00:46:00Z"},
            {"type":"karana","value":karana_title(1),
             "startUtc":"2026-10-13T00:45:00Z","endUtc":"2026-10-14T00:46:00Z"},
            {"type":"rahu-kalam"},{"type":"yamaganda"},{"type":"gulika"},
        ],
    }

def mock_good_answer():
    return {
        "headline":"Delhi's Panchang for 13 October: how to read the local day",
        "seoTitle":"Delhi Panchang: Understanding 13 October",
        "metaDescription":"How to understand a Delhi Panchang day, what local sunrise means, and which religious recommendations still need verified evidence.",
        "introduction":"A calendar for Delhi begins with understanding the local sunrise. The published timings and cultural observances should be checked against the chosen calendar tradition before they are used for planning.",
        "localContext":"For Delhi, a local sunrise is the starting reference for interpreting day-level Panchang observations. This does not imply that practices in neighbouring cities are identical or that any particular observance has been confirmed.",
        "dailyUnderstanding":"The astronomy and regional rules for this research date have not yet been approved. The page can explain what a Tithi means, but it cannot responsibly suggest a fasting day, wedding date or auspicious period without independently verified inputs.",
        "uncertaintyNote":"This is a research draft and cannot be used as an authoritative festival or auspiciousness recommendation.",
        "faq":[{"question":"Does a computed sunrise alone establish what to do today?",
                "answer":"No. Regional observance rules and verified source evidence are required before specific recommendations can be made."}],
        "referencedFactIds":[],
    }

class EditorialPipelineTests(unittest.TestCase):
    def test_prompt_serializes_no_unapproved_fact_claims(self):
        packet=make_prompt_packet(test_candidate())
        self.assertFalse(packet["publicReleaseAllowed"])
        self.assertFalse(packet["indexingAuthorized"])
        self.assertEqual(packet["evidence"]["validatedAstronomicalFacts"],[])
        self.assertEqual(packet["evidence"]["verifiedActivityRules"],[])
        activities=packet["evidence"]["dailyActivityDecisions"]
        self.assertEqual(len(activities),6)
        self.assertTrue(all(x["decision"]=="NOT_EVALUATED" and
                            x["recommendedAction"] is None for x in activities))
        research=packet["evidence"]["researchOnlyCandidate"]
        self.assertEqual(research["status"],"DO_NOT_QUOTE_AS_SETTLED_FACT")
        self.assertEqual(research["researchLocalSolarTimes"]["sunrise"],
                         "2026-10-13T06:20:00+05:30")
        self.assertEqual(research["unreviewedPanchangAtSunrise"]["tithi"],"Shukla Pratipada")
        self.assertEqual(packet["evidence"]["city"]["name"],"Delhi")
        self.assertEqual(packet["date"],"2026-10-13")
        self.assertEqual(len(packet["sourceCandidateSha256"]),64)
        self.assertEqual(packet["messages"][0]["role"],"system")
    def test_distinct_editorial_intents_stay_nonfactual_until_rules_are_reviewed(self):
        for intent in ("daily-panchang","city-hub","festival","vrat","muhurat"):
            p=make_prompt_packet(test_candidate(),intent=intent)
            self.assertEqual(p["evidence"]["pageIntent"],intent)
            self.assertFalse(p["activityRulesApproved"])
            self.assertEqual(p["evidence"]["verifiedActivityRules"],[])
            self.assertFalse(p["publicReleaseAllowed"])
        with self.assertRaises(ValueError):
            make_prompt_packet(test_candidate(),intent="invented-category")

    def test_reject_bad_geo_and_unverified_self_certified_fact_bundle(self):
        c=test_candidate()
        c["city"]["lat"]=19.076
        with self.assertRaises(ValueError):make_prompt_packet(c)
        with self.assertRaises(ValueError):
            make_prompt_packet(test_candidate(), verified_facts=[{"foo":"self approved"}])
        with self.assertRaises(ValueError):
            make_prompt_packet(test_candidate(),language="ru")
    def test_missing_or_wrong_day_solar_data_is_blocked(self):
        c=test_candidate()
        c["sun"].pop("sunriseUtc")
        with self.assertRaises(ValueError):make_prompt_packet(c)
        c=test_candidate()
        c["sun"]["sunriseUtc"]="2026-10-12T00:50:00Z"
        with self.assertRaises(ValueError):make_prompt_packet(c)

    def test_machine_generated_page_always_blocked(self):
        packet=make_prompt_packet(test_candidate())
        report=assemble_research_draft(packet,mock_good_answer())
        self.assertEqual(report["status"],"AI_DRAFT_UNAPPROVED")
        self.assertFalse(report["indexingAuthorized"])
        self.assertFalse(report["publicReleaseAllowed"])
        self.assertIn("human-editorial-and-originality-review-required",
                      report["qualityFlags"])
    def test_lie_about_auspicious_time_is_flagged(self):
        packet=make_prompt_packet(test_candidate())
        out=mock_good_answer()
        out["localContext"]="The best time to marry is 10:25 in Delhi."
        problems=inspect_model_reply(out,packet)
        self.assertIn("llm-generated-clock-times-not-grounded-in-verified-science",problems)
        self.assertIn("unsupported-ritual-or-auspiciousness-recommendation",problems)
    def test_fake_citations_and_extra_unexpected_public_release_field_are_flagged(self):
        packet=make_prompt_packet(test_candidate())
        out=mock_good_answer()
        out["referencedFactIds"]=["source-a"]
        out["publicationAuthorized"]=True
        flags=inspect_model_reply(out,packet)
        self.assertIn("unverified-factual-citations-or-hallucinated-source-ids",flags)
        self.assertIn("unexpected-or-missing-schema-fields",flags)
    def test_api_uses_json_mode_secret_and_does_not_publish(self):
        pkt=make_prompt_packet(test_candidate())
        class Response:
            def __enter__(self):return self
            def __exit__(self,*args):return False
            def read(self,amount):
                return json.dumps({"choices":[{"finish_reason":"stop",
                    "message":{"content":json.dumps(mock_good_answer())}}]}).encode()
        def fake_open(request,timeout):
            self.assertEqual(request.full_url,"https://api.deepseek.com/chat/completions")
            self.assertEqual(timeout,65)
            body=json.loads(request.data)
            self.assertEqual(body["response_format"],{"type":"json_object"})
            self.assertFalse(body["stream"])
            self.assertTrue(request.get_header("Authorization").startswith("Bearer "))
            return Response()
        draft=deepseek_json(pkt,api_key="unit-test-long-secret",opener=fake_open)
        self.assertEqual(draft["referencedFactIds"],[])
    def test_no_live_api_without_key(self):
        with self.assertRaises(ValueError):
            deepseek_json(make_prompt_packet(test_candidate()),api_key="")
    def test_missing_required_elements_are_detected(self):
        out=mock_good_answer()
        out.pop("uncertaintyNote")
        self.assertIn("unexpected-or-missing-schema-fields",
                      inspect_model_reply(out,make_prompt_packet(test_candidate())))

if __name__=="__main__":
    unittest.main()
