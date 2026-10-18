#!/usr/bin/env python3
"""Strict first TEN evergreen-page production release gate.

Exactly ten explicit educational city routes may be crawlable. Zero daily
astronomical or ritual records may be indexable. Shared with the actual
Wrangler production deploy, not just a PR-only QA workflow.
"""
from html.parser import HTMLParser
from pathlib import Path
from xml.etree import ElementTree
import json

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"out"
CITIES=("delhi","mumbai","kolkata","chennai","bengaluru","hyderabad","ahmedabad","pune","jaipur","varanasi")
EXPECTED={"https://panchavani.com/panchang/"+city+"/" for city in CITIES}

class Meta(HTMLParser):
    def __init__(self):
        super().__init__()
        self.robots=[]
        self.canonical=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=="meta" and a.get("name")=="robots":
            self.robots.append(a.get("content",""))
        if tag=="link" and a.get("rel")=="canonical":
            self.canonical.append(a.get("href",""))

def assert_release():
    assert OUT.is_dir(),"No built Next.js static output"
    guides=json.loads((ROOT/"data/city-guides.json").read_text())
    assert set(guides)==set(CITIES),"Release must contain 10 explicitly reviewed educational city texts"
    bundle=json.loads((ROOT/"data/approved-panchang.json").read_text())
    assert bundle["records"]==[],"Unreviewed astronomical dates must not be published"
    assert bundle["releaseStatus"]=="NO_APPROVED_RECORDS"
    target_pages={"panchang/"+city+"/index.html" for city in CITIES}
    all_pages=list(OUT.rglob("*.html"))
    actual_indexable=[]
    for file in all_pages:
        rel=file.relative_to(OUT).as_posix()
        html=file.read_text(encoding="utf-8")
        tags=Meta()
        tags.feed(html)
        assert tags.robots,(rel,tags.robots)
        normalized=[value.lower().replace(" ","") for value in tags.robots]
        robots=normalized[0]
        if rel in target_pages:
            assert len(normalized)==1,(rel,normalized)
            city=rel.split("/")[1]
            assert "noindex" not in robots and "index" in robots and "follow" in robots,(rel,robots)
            assert tags.canonical==["https://panchavani.com/panchang/"+city+"/"],(rel,tags.canonical)
            for text in ("Practical reader question","Source and method references",
                         "India Meteorological Department","Indian Standard Time"):
                # URLs/labels may be represented as HTML or entity-encoded.
                if text=="India Meteorological Department":
                    assert "mausam.imd.gov.in" in html or "packolkata.imd.gov.in" in html,rel
                elif text=="Indian Standard Time":
                    assert "nplindia.res.in" in html or "packolkata.imd.gov.in" in html,rel
                else:
                    assert text.lower() in html.lower(),(rel,text)
            actual_indexable.append(rel)
        else:
            assert all("noindex" in value for value in normalized),(rel,normalized)
            assert not ("panchang/" in rel and rel.count("/")>2),\
                "Accidental unapproved city-day page leaked: "+rel
    assert set(actual_indexable)==target_pages,(actual_indexable,target_pages)
    urls={n.text for n in ElementTree.parse(OUT/"sitemap.xml").getroot().iter()
          if n.tag.endswith("}loc") or n.tag=="loc"}
    assert urls==EXPECTED,(urls,EXPECTED)
    assert len(urls)==10
    assert "sitemap.xml" in (OUT/"robots.txt").read_text().lower()
    assert len({(OUT/p).read_bytes() for p in target_pages})==10,\
        "Identical generated city HTML, not distinct editorial content"
    print("PASS: 10 indexed educational city pages only; 10 sitemap entries")
    print("PASS: zero unreviewed daily/ritual pages released; all other HTML remains noindex")

if __name__=="__main__":
    assert_release()
