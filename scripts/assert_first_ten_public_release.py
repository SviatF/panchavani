#!/usr/bin/env python3
"""Fail-closed production check: 10 evergreen city guides plus ONLY independently
science/editorially reviewed and separately SEO-authorized city/day pages.

This checks static export/sitemap/robots against signed manifest *digests*.
Real scientific and human review are prerequisites, not certified here.
"""
from html.parser import HTMLParser
from html import unescape
from pathlib import Path
from xml.etree import ElementTree
import hashlib
import json
import os
import re

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"out"
CITIES=("delhi","mumbai","kolkata","chennai","bengaluru","hyderabad","ahmedabad","pune","jaipur","varanasi")
GUIDES={"https://panchavani.com/panchang/"+city+"/" for city in CITIES}
SHA=re.compile(r"^[a-f0-9]{64}$")
DATE=re.compile(r"^20\d\d-\d\d-\d\d$")

class Meta(HTMLParser):
 def __init__(self):
  super().__init__()
  self.robots=[]
  self.canonical=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=="meta" and a.get("name")=="robots":self.robots.append(a.get("content",""))
  if tag=="link" and a.get("rel")=="canonical":self.canonical.append(a.get("href",""))

def digest(value):
 return hashlib.sha256(json.dumps(value,ensure_ascii=False,separators=(",",":")).encode()).hexdigest()

def expected_daily_releases():
 bundle=json.loads((ROOT/"data/approved-panchang.json").read_text())
 seo=json.loads((ROOT/"data/approved-seo-days.json").read_text())
 assert bundle["schemaVersion"]==seo["schemaVersion"]==1
 science=bundle["records"]
 permits=seo["records"]
 assert isinstance(science,list) and isinstance(permits,list)
 if not science:
  assert bundle["releaseStatus"]=="NO_APPROVED_RECORDS"
 else:
  assert bundle["releaseStatus"]=="HUMAN_REVIEWED_WITH_EVIDENCE"
  secret=os.environ.get("PANCHAVANI_APPROVED_RELEASE_SHA256","")
  assert SHA.fullmatch(secret) and digest(bundle)==secret,"Scientific review manifest SHA absent/incorrect"
 if not permits:
  assert seo["releaseStatus"]=="NO_APPROVED_DAY_SEO_ROUTES"
 else:
  assert seo["releaseStatus"]=="HUMAN_APPROVED_DAILY_SEO_PER_URL"
  secret=os.environ.get("PANCHAVANI_APPROVED_SEO_RELEASE_SHA256","")
  assert SHA.fullmatch(secret) and digest(seo)==secret,"Independent SEO manifest SHA absent/incorrect"
 reviewed={}
 for item in science:
  key=(item.get("cityId"),item.get("date"))
  assert key[0] in CITIES and DATE.fullmatch(str(key[1])) and item.get("status")=="approved"
  assert key not in reviewed,"Duplicate reviewed day"
  assert isinstance(item.get("sourceRecordHash"),str) and SHA.fullmatch(item["sourceRecordHash"])
  evidence=item.get("releaseEvidence",{})
  assert evidence.get("reviewStatus")=="domain-reviewed" and evidence.get("blockerCount")==0
  reviewed[key]=item
 expected={}
 for permit in permits:
  city,date=permit.get("cityId"),permit.get("date")
  assert city in CITIES and isinstance(date,str) and DATE.fullmatch(date)
  key=(city,date)
  assert key not in expected,"Duplicate day SEO allowlist entry"
  record=reviewed.get(key)
  assert record and record["releaseId"]==permit.get("releaseId")
  assert record["sourceRecordHash"]==permit.get("sourceRecordHash")
  assert permit.get("indexingAuthorized") is True
  assert permit.get("editorialApproved") is True
  assert permit.get("cityCoordinatesReviewed") is True
  assert permit.get("searchIntentReviewed") is True
  assert permit.get("independentSourceReviewComplete") is True
  assert permit.get("seoReviewer") not in {
   record["releaseEvidence"]["scientificReviewer"],record["editorial"]["reviewedBy"]}
  expected[key]="https://panchavani.com/panchang/"+city+"/"+date+"/"
 return expected,reviewed


def topic_path(row):
 kind,city,slug,month=row.get("kind"),row.get("cityId"),row.get("topic"),row.get("month")
 assert city in CITIES and re.fullmatch(r"20\\d\\d-(0[1-9]|1[0-2])",str(month))
 assert re.fullmatch(r"[a-z][a-z0-9]*(?:-[a-z0-9]+)*",str(slug))
 year,month_number=month.split("-")
 mm=str(int(month_number))
 if kind=="calendar-month":
  assert slug=="calendar"
  return f"/calendar/{city}/{year}/{mm}/"
 if kind=="festival":return f"/festivals/{slug}/{year}/{city}/"
 if kind=="vrat":return f"/vrat/{slug}/{year}/{mm}/{city}/"
 assert kind=="muhurat"
 return f"/muhurat/{slug}/{year}/{mm}/{city}/"

def expected_topic_releases(science):
 pages=json.loads((ROOT/"data/approved-topic-pages.json").read_text())
 seo=json.loads((ROOT/"data/approved-topic-seo.json").read_text())
 assert pages["schemaVersion"]==seo["schemaVersion"]==1
 articles=pages["records"];permits=seo["records"]
 assert isinstance(articles,list) and isinstance(permits,list)
 if not articles:
  assert pages["releaseStatus"]=="NO_APPROVED_TOPIC_PAGES"
 else:
  assert pages["releaseStatus"]=="HUMAN_APPROVED_CITY_TOPIC_CONTENT"
  secret=os.environ.get("PANCHAVANI_APPROVED_TOPIC_RELEASE_SHA256","")
  assert SHA.fullmatch(secret) and digest(pages)==secret,"Review topic SHA missing or invalid"
 if not permits:
  assert seo["releaseStatus"]=="NO_APPROVED_TOPIC_SEO_ROUTES"
 else:
  assert seo["releaseStatus"]=="HUMAN_APPROVED_CITY_TOPIC_SEO"
  secret=os.environ.get("PANCHAVANI_APPROVED_TOPIC_SEO_SHA256","")
  assert SHA.fullmatch(secret) and digest(seo)==secret,"Separate topic SEO SHA missing or invalid"
 by_path={}
 for a in articles:
  p=topic_path(a)
  assert p not in by_path and a["status"]=="human-approved" and a["publicationApproved"] is True
  assert a["editorialReviewer"]!=a["scientificReviewer"]
  assert isinstance(a["sourceDays"],list) and a["sourceDays"]
  for source in a["sourceDays"]:
   science_row=science.get((a["cityId"],source["date"]))
   assert science_row and science_row["sourceRecordHash"]==source["sourceRecordHash"],"Unbacked topic day"
  assert len(a["editorial"]["sections"])>=3
  by_path[p]=a
 expected={}
 for row in permits:
  p=row.get("path")
  assert p in by_path and p not in expected,"Duplicate or unbacked topic SEO permit"
  a=by_path[p]
  assert row["releaseId"]==a["releaseId"]
  assert row["indexingAuthorized"] is True and row["searchIntentReviewed"] is True
  assert row["citySpecificValueReviewed"] is True and row["scientificSourcesReviewed"] is True
  assert row["seoReviewer"] not in {a["scientificReviewer"],a["editorialReviewer"],(a.get("ritualReview") or {}).get("expertReviewer")}
  assert row["sourceHashesSha256"]==digest(a["sourceDays"])
  expected[p]=a
 return expected

def assert_release():
 assert OUT.is_dir(),"Static Next build missing"
 guides=json.loads((ROOT/"data/city-guides.json").read_text())
 assert set(guides)==set(CITIES),"Exactly ten original reviewed city guides required"
 approved,science=expected_daily_releases()
 topical=expected_topic_releases(science)
 target={"panchang/"+city+"/index.html" for city in CITIES}
 target.update("panchang/"+city+"/"+date+"/index.html" for city,date in approved)
 target.update(p[1:]+"index.html" for p in topical)
 expected_urls=GUIDES|set(approved.values())|{"https://panchavani.com"+p for p in topical}
 actual=set()
 for file in OUT.rglob("*.html"):
  rel=file.relative_to(OUT).as_posix()
  markup=file.read_text(encoding="utf-8")
  tags=Meta();tags.feed(markup)
  assert tags.robots,(rel,tags.robots)
  normalized=[x.lower().replace(" ","") for x in tags.robots]
  if rel in target:
   assert len(normalized)==1,(rel,normalized)
   assert "noindex" not in normalized[0] and "index" in normalized[0] and "follow" in normalized[0],(rel,normalized)
   parts=rel.split("/")
   uri="https://panchavani.com/"+"/".join(parts[:-1])+"/"
   assert tags.canonical==[uri],(rel,tags.canonical)
   if len(parts)==3:
    for text in ("Practical reader question","Source and method references"):
     assert text.lower() in markup.lower(),(rel,text)
    assert "mausam.imd.gov.in" in markup or "packolkata.imd.gov.in" in markup,rel
    assert "nplindia.res.in" in markup or "packolkata.imd.gov.in" in markup,rel
   elif rel.startswith("panchang/"):
    assert len(parts)==4
    record=science[(parts[1],parts[2])]
    rendered=unescape(markup)
    assert (
     record["editorial"]["body"][:80] in rendered or
     record["editorial"]["readerQuestion"] in rendered
    ),"Science-reviewed day content must actually be rendered: "+rel
   else:
    p="/"+"/".join(parts[:-1])+"/"
    assert p in topical,"Missing independently approved topical reference"
    article=topical[p]
    assert article["editorial"]["headline"] in unescape(markup),(
     "Human-approved city/topic title was not actually rendered: "+rel)
    assert article["editorial"]["sections"][0]["body"][:65] in unescape(markup),(
     "Reviewed topic article lacks actual approved prose: "+rel)
   actual.add(rel)
  else:
   assert all("noindex" in value for value in normalized),(rel,normalized)
   if rel.startswith("panchang/") and rel.count("/")>2:
    raise AssertionError("Unapproved day page emitted into static HTML: "+rel)
 assert actual==target,(actual,target)
 urls={n.text for n in ElementTree.parse(OUT/"sitemap.xml").getroot().iter()
       if n.tag.endswith("}loc") or n.tag=="loc"}
 assert urls==expected_urls,(urls,expected_urls)
 assert "sitemap.xml" in (OUT/"robots.txt").read_text().lower()
 assert len({(OUT/p).read_bytes() for p in target})==len(target),"Duplicated static HTML"
 print("PASS:",len(GUIDES),"city guides +",len(approved),"approved daily +",len(topical),"independent topic SEO URLs")
 print("PASS: all other pages noindex; approved science/SEO digests must match build")
if __name__=="__main__":assert_release()
