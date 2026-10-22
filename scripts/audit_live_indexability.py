"""Read-only live SEO smoke audit for the TEN intentionally released city guides.

This reports what public HTTPS currently serves, NOT whether Google indexed it.
No Google Search Console writes, deploy, credentials or AI requests.
"""
from __future__ import annotations
import argparse
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlsplit
from xml.etree import ElementTree

ORIGIN="https://panchavani.com"
CITIES=("delhi","mumbai","kolkata","chennai","bengaluru",
        "hyderabad","ahmedabad","pune","jaipur","varanasi")
EXPECTED=tuple(ORIGIN+"/panchang/"+city+"/" for city in CITIES)

class Head(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonicals=[]
        self.robots=[]
    def handle_starttag(self, tag, attrs):
        props=dict(attrs)
        if tag=="link" and "canonical" in (props.get("rel") or "").lower().split():
            self.canonicals.append(props.get("href"))
        if tag=="meta" and (props.get("name") or "").lower() in ("robots","googlebot"):
            self.robots.append((props.get("content") or "").lower())

def default_fetch(url: str):
    req=Request(url,headers={"User-Agent":"PANCHAVANI-live-SEO-audit/1.0",
                             "Accept":"text/html,application/xml,text/plain"})
    with urlopen(req,timeout=20) as response:
        raw=response.read(1500000+1)
        if len(raw)>1500000:raise ValueError("SEO response exceeds audit limit")
        return response.status,response.geturl(),dict(response.headers),raw.decode("utf-8")

def _assert_public_url(url):
    parsed=urlsplit(url)
    if parsed.scheme!="https" or parsed.netloc!="panchavani.com":
        raise ValueError("SEO resource redirected outside canonical origin")

def _read(url,fetch):
    _assert_public_url(url)
    status,final,headers,body=fetch(url)
    if status!=200:raise ValueError(f"SEO HTTP {status}: {url}")
    _assert_public_url(final)
    if final.rstrip("/")!=url.rstrip("/"):
        raise ValueError(f"Unexpected redirect: {url} -> {final}")
    h={str(k).lower():str(v).lower() for k,v in headers.items()}
    if "noindex" in h.get("x-robots-tag",""):
        raise ValueError(f"X-Robots-Tag noindex on {url}")
    return body

def audit(fetch=default_fetch):
    robots=_read(ORIGIN+"/robots.txt",fetch)
    if "sitemap.xml" not in robots or any(
        line.strip().lower()=="disallow: /" for line in robots.splitlines()
    ):
        raise ValueError("robots.txt has no sitemap or globally disallows crawling")
    sitemap=_read(ORIGIN+"/sitemap.xml",fetch)
    root=ElementTree.fromstring(sitemap)
    urls=[(el.text or "").strip() for el in root.iter()
          if el.tag.endswith("}loc") or el.tag=="loc"]
    if len(urls)!=len(set(urls)) or set(urls)!=set(EXPECTED):
        missing=sorted(set(EXPECTED)-set(urls))
        unexpected=sorted(set(urls)-set(EXPECTED))
        raise ValueError(f"Live sitemap differs from release allowlist: missing={missing}, unexpected={unexpected}")
    results=[]
    for city,url in zip(CITIES,EXPECTED):
        html=_read(url,fetch)
        parsed=Head()
        parsed.feed(html)
        if parsed.canonicals!=[url]:
            raise ValueError(f"Incorrect canonical for {city}: {parsed.canonicals}")
        if not parsed.robots or any(
            "noindex" in item or "nofollow" in item for item in parsed.robots
        ) or not any("index" in item and "follow" in item for item in parsed.robots):
            raise ValueError(f"HTML robots not index/follow for {city}: {parsed.robots}")
        if city not in html.lower():
            raise ValueError(f"Unexpected empty/wrong city page {city}")
        results.append({"cityId":city,"url":url,"httpStatus":200,
                        "canonicalMatches":True,"metaIndexFollow":True})
    return {
        "artifactType":"PANCHAVANI_LIVE_INDEXABILITY_SMOKE_AUDIT",
        "status":"PUBLIC_URLS_CRAWLABLE_IN_THIS_CHECK",
        "domain":ORIGIN,"sitemapUrl":ORIGIN+"/sitemap.xml",
        "sitemapUrlCount":len(urls),"verifiedCityGuideUrls":len(results),
        "pages":results,
        "actualGoogleIndexingStatusKnown":False,
        "googleIndexingConfirmed":False,
        "googleSearchConsoleSubmitted":False,
        "publicContentAutomaticallyPublished":False,
        "note":"HTTP and HTML technical check only. Actual Google indexing requires GSC evidence."
    }

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--out",type=Path,required=True)
    args=parser.parse_args()
    report=audit()
    if args.out.exists():
        raise ValueError("Refusing to overwrite live SEO evidence")
    args.out.parent.mkdir(parents=True,exist_ok=True)
    with args.out.open("x",encoding="utf-8") as f:
        json.dump(report,f,indent=2,ensure_ascii=False)
        f.write("\n")
    print("LIVE TECHNICALLY CRAWLABLE CITY URLS:",report["verifiedCityGuideUrls"])
    print("GOOGLE INDEXING PROVEN:",report["googleIndexingConfirmed"])

if __name__=="__main__":
    main()
