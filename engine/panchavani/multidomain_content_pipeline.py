"""Multi-intent, city-first content inventory from immutable monthly science candidates.

This module structures PRIVATE inputs for the eventual DeepSeek editorial engine.
It DOES NOT authorize any AI calls, publish factual numbers, infer rituals,
declare geodata correct, or add thousands of doorway URLs.

Panchang/day and calendar/month receive modeled numerical FACT REGISTRIES
only for internal science review. Festival, vrat and muhurat require
separate named independently reviewed rule packs; until then they are
evidence-gathering TOPICS with no invented event date or muhurat result.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path
from .first_six_limb_pilot import TEN_CITY_IDS, KINDS
from .monthly_content_pipeline import month_days

TYPES=("daily-panchang","calendar-month","festival","vrat","muhurat")
REQUIRES_RITUAL=("festival","vrat","muhurat")
RITUAL_TOPICS={
 "festival":(("diwali","Diwali","Festival calendar convention and local observance date"),
             ("dussehra","Dussehra","Vijayadashami selection rule and locality")),
 "vrat":(("ekadashi","Ekadashi","Tithi-at-dawn rules and named fasting tradition"),
         ("pradosh","Pradosh","Evening Pradosh observance and Parana rule")),
 "muhurat":(("wedding","Wedding Muhurat","Tradition-specific Vivaha eligibility and exclusions"),
            ("griha-pravesh","Griha Pravesh","House entry observance and source-specific conditions"),
            ("vehicle-purchase","Vehicle Purchase","Activity-specific time intervals and eligibility"),
            ("start-business","Start Business","Regional rule requirements for business opening"))
}
REQUIREMENTS={
 "daily-panchang":("Independent JPL/Swiss + observer geometry review",
                   "City and date named science approval",
                   "City-specific source-grounded editorial review",
                   "Distinct per-URL SEO review"),
 "calendar-month":("Every referenced daily Panchang independently approved",
                   "Calendar conventions and regional month rules reviewed",
                   "Original month-level comparison and editorial review",
                   "Distinct per-URL SEO review"),
 "festival":("Named festival and regional observance method documented",
             "Rule and exact local observation window independently approved",
             "Independent city/date context and expert review",
             "Distinct per-URL SEO review"),
 "vrat":("Named Vrat tradition and sunrise/sunset method reviewed",
         "Sunrise Tithi and Parana/fasting rules independently approved",
         "Expert review of all displayed observance dates",
         "Distinct per-URL SEO review"),
 "muhurat":("Named ceremony and sourced tradition-specific rule pack",
            "Real eligible UTC intervals and exclusions independently reviewed",
            "Guru/Shukra Asta, Lagna and relevant additional restrictions resolved",
            "Distinct per-URL SEO review")
}
SHA=lambda value: isinstance(value,str) and len(value)==64 and all(c in "0123456789abcdef" for c in value)
BLOCKED={
 "scientificApproval":False,"ritualEligibilityApproved":False,
 "modelInvocationAuthorized":False,"paidGenerationAuthorized":False,
 "publicationAuthorized":False,"indexingAuthorized":False,
 "approvedClaimsForDeepSeek":[]
}
def _require(value,message):
 if not value:raise ValueError(message)
def _digest(data):
 return hashlib.sha256(json.dumps(data,sort_keys=True,separators=(",",":"),
  ensure_ascii=False).encode("utf-8")).hexdigest()
def _model_facts(row):
 return {
  "panchangAtSunrise":{k:row["panchang"][k] for k in
     ("tithi","karana","nakshatra","yoga","vara","paksha")},
  "sun":{k:row["sun"][k] for k in ("sunriseUtc","sunsetUtc","nextSunriseUtc")},
  "transitions":{k:[{"name":part["name"],"startUtc":part["startUtc"],
     "endUtc":part["endUtc"]} for part in row["transitions"][k]]
     for k in KINDS},
  "cityReference":row["cityReference"],
  "methodology":row["methodology"]
 }
def build_content_inventory(queue):
 _require(isinstance(queue,dict) and
   queue.get("artifactType")=="PANCHAVANI_MONTHLY_PRIVATE_RELEASE_REVIEW_QUEUE" and
   queue.get("status")=="UNAPPROVED_RESEARCH_ONLY" and
   queue.get("publicationAuthorized") is False and
   queue.get("indexingAuthorized") is False and
   queue.get("modelInvocationAuthorized") is False and
   queue.get("scientificApproval") is False and
   queue.get("eligibilityForPublicRelease")==0 and
   queue.get("publicManifestGenerated") is False and
   queue.get("deepseekReady") is False, "Not an unapproved immutable city-month queue")
 month=queue.get("month")
 days=[d.isoformat() for d in month_days(month)]
 source=queue.get("reviewCandidates")
 expected={(city,date) for city in TEN_CITY_IDS for date in days}
 _require(isinstance(source,list) and len(source)==len(expected),"Incomplete source calendar")
 lookup={}
 for row in source:
  _require(isinstance(row,dict) and row.get("status")=="REQUIRES_INDEPENDENT_SCIENCE_AND_EDITORIAL_REVIEW" and
           row.get("humanApproved") is False and row.get("publicApprovedRecord") is False and
           row.get("scientificApproval") is False and
           row.get("indexingAuthorized") is False and
           row.get("modelInvocationAuthorized") is False and
           row.get("paidGenerationAuthorized") is False and
           row.get("approvedClaimsForDeepSeek")==[] and
           row.get("editorialStatus")=="NOT_GENERATED_PENDING_FACT_REVIEW" and
           row.get("scientificReviewer") is None and
           row.get("editorialReviewer") is None and
           row.get("cityReference",{}).get("coordinatesVerified") is False and
           row.get("methodology",{}).get("siderealMethodIndependentlyCalibrated") is False and
           isinstance(row.get("blockers"),list) and len(row["blockers"])>0 and
           SHA(row.get("sourceRecordHash")) and SHA(row.get("sourceBatchSha256")) and
           SHA(row.get("independentNumericalQaArtifactSha256")),
           "Unapproved source incorrectly claims validation or lacks provenance")
  key=(row.get("cityId"),row.get("date"))
  _require(key in expected and key not in lookup,"Duplicate or out-of-scope research city/date")
  _require(set(row["transitions"])==set(KINDS),"Four-limb transitions required")
  _require(all(isinstance(row["transitions"][k],list) and row["transitions"][k] for k in KINDS),
           "Incomplete lunar intervals")
  lookup[key]=row
 _require(set(lookup)==expected,"City-date source coverage incomplete")
 jobs=[]
 def append(item):
  item={**item,**BLOCKED,"status":"RESEARCH_REQUIRES_INDEPENDENT_EVIDENCE"}
  item["reviewRequirements"]=list(REQUIREMENTS[item["pageType"]])
  item["factBundleSha256"]=_digest(item.get("privateModeledFacts",{}))
  item["editorialTaskSha256"]=_digest({
   "cityId":item["cityId"],"pageType":item["pageType"],"topic":item["topic"],
   "date":item.get("date"),"month":item["month"],
   "sourceHashes":item["sourceHashes"],"factBundleSha256":item["factBundleSha256"]})
  jobs.append(item)
 for city in TEN_CITY_IDS:
  city_rows=[lookup[city,date] for date in days]
  for i,row in enumerate(city_rows):
   model=_model_facts(row)
   prev=city_rows[i-1] if i else None
   changed=([k for k in KINDS if prev["panchang"][k]!=row["panchang"][k]]
            if prev is not None else [])
   boundaries=[{"kind":kind,"endingAtUtc":a["endUtc"],
      "from":a["name"],"to":b["name"]} for kind in KINDS
      for a,b in zip(row["transitions"][kind],row["transitions"][kind][1:])]
   boundaries.sort(key=lambda v:(v["endingAtUtc"],v["kind"]))
   model["dawnChangesVsPreviousDay"]=changed if prev else None
   model["lunarBoundarySequence"]=boundaries
   append({"pageType":"daily-panchang","cityId":city,"topic":"daily-panchang",
      "date":row["date"],"month":month,
      "proposedPath":f"/panchang/{city}/{row['date']}/",
      "readerIntent":"What are the local sunrise Panchang values and when do they change?",
      "readerSpecificQuestions":[
         f"Which elements change after sunrise in {city} on {row['date']}?",
         "Which crossings occur before this city's sunset?",
         "What is different from the preceding local sunrise?"],
      "sourceHashes":[row["sourceRecordHash"],row["sourceBatchSha256"]],
      "privateModeledFacts":model,
      "mustNotInfer":["festival observance","fasting dates","auspicious windows"],
      "independentRulePackRequired":False})
  components=Counter()
  for row in city_rows:
   for kind in KINDS:
    components[kind]+=len(row["transitions"][kind])-1
  append({"pageType":"calendar-month","cityId":city,"topic":"calendar",
    "month":month,"date":None,
    "proposedPath":f"/calendar/{city}/{month[:4]}/{int(month[5:])}/",
    "readerIntent":"Browse a full city-specific month by solar days and verified Panchang changes",
    "readerSpecificQuestions":[
      f"How do sunrise Panchang values change through {month} in {city}?",
      "Which lunar phases cross between two local sunrises?",
      "How does this month's city sunrise pattern differ across dates?"],
    "sourceHashes":[x["sourceRecordHash"] for x in city_rows],
    "privateModeledFacts":{"dayCount":len(days),"cityId":city,
      "monthlyBoundaryCounts":dict(components),
      "dayHashes":[{"date":row["date"],"sha":row["sourceRecordHash"]} for row in city_rows],
      "firstDaySunriseUtc":city_rows[0]["sun"]["sunriseUtc"],
      "lastDaySunriseUtc":city_rows[-1]["sun"]["sunriseUtc"]},
    "mustNotInfer":["festival dates","ritual interpretation","calendar month naming without region rule"],
    "independentRulePackRequired":True})
  for kind in REQUIRES_RITUAL:
   for slug,name,question in RITUAL_TOPICS[kind]:
    append({"pageType":kind,"cityId":city,"topic":slug,
      "month":month,"date":None,
      "proposedPath":None,
      "readerIntent":question,
      "readerSpecificQuestions":[
        f"Which tradition's {name} rules apply in {city}?",
        "What published primary sources support the date assignment?",
        "Which local astronomical intervals must be independently reviewed?"],
      "sourceHashes":[r["sourceRecordHash"] for r in city_rows],
      "privateModeledFacts":{"cityId":city,"month":month,
        "sourceDayCount":len(city_rows),"sciencePacketHashes":[r["sourceRecordHash"] for r in city_rows]},
      "mustNotInfer":["event date","fasting date","Parana times","muhurat recommendation",
         "regional tradition without independent documented source"],
      "requiredRulePackId":None,"independentRulePackRequired":True})
 identities=[(j["cityId"],j["pageType"],j["topic"],j.get("date"),j["month"]) for j in jobs]
 _require(len(set(identities))==len(identities),"Duplicate editorial topic identity")
 return {"artifactType":"PANCHAVANI_CITY_MULTIDOMAIN_EDITORIAL_INVENTORY",
  "schemaVersion":1,"status":"UNAPPROVED_NO_PAID_GENERATION",
  "month":month,"cityCount":len(TEN_CITY_IDS),
  "dailyJobs":len(expected),"monthlyJobs":len(TEN_CITY_IDS),
  "ritualResearchTopics":len(TEN_CITY_IDS)*sum(map(len,RITUAL_TOPICS.values())),
  "totalTopics":len(jobs),
  "jobs":jobs,"unverifiedSourceCount":len(source),
  "sourceQueueSha256":_digest(queue),
  "billableDeepSeekRequests":0,"publicPagesCreated":0,
  "seoRoutesAdded":0,**BLOCKED}
def main():
 p=argparse.ArgumentParser(description="Private city × page-intent editorial inventory")
 p.add_argument("--queue",required=True,type=Path)
 p.add_argument("--out",required=True,type=Path)
 args=p.parse_args()
 source=json.loads(args.queue.read_text())
 report=build_content_inventory(source)
 if args.out.exists():raise ValueError("Refusing to overwrite existing audit")
 args.out.parent.mkdir(parents=True,exist_ok=True)
 with args.out.open("x",encoding="utf-8") as stream:
  json.dump(report,stream,indent=2,ensure_ascii=False)
  stream.write("\n")
 print("MULTI-INTENT CONTENT INVENTORY:",report["totalTopics"],"jobs")
 print("PRIVATE DAILY/MONTH:",report["dailyJobs"],report["monthlyJobs"])
 print("RITUAL TOPICS REQUIRE INDEPENDENT RULES:",report["ritualResearchTopics"])
 print("AI CALLS / INDEXED PAGES:",report["billableDeepSeekRequests"],report["publicPagesCreated"])
if __name__=="__main__":main()
