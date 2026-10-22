import unittest
from scripts.audit_live_indexability import audit, ORIGIN, EXPECTED, CITIES


def fake(overrides=None):
    overrides=overrides or {}
    def read(url):
        if url in overrides:return overrides[url]
        if url.endswith("/robots.txt"):
            return 200,url,{},"User-agent: *\nAllow: /\nSitemap: https://panchavani.com/sitemap.xml\n"
        if url.endswith("/sitemap.xml"):
            entries="".join(f"<url><loc>{v}</loc></url>" for v in EXPECTED)
            return 200,url,{},f"<urlset>{entries}</urlset>"
        city=url.rstrip("/").split("/")[-1]
        html=f'<html><head><link rel="canonical" href="{url}"/>' + \
             '<meta name="robots" content="index, follow"/></head>' + \
             f'<body><h1>{city} panchang guide</h1></body></html>'
        return 200,url,{},html
    return read


class LiveSeoTests(unittest.TestCase):
    def test_all_ten_pages_crawlable_is_not_google_indexation(self):
        report=audit(fake())
        self.assertEqual(report["verifiedCityGuideUrls"],10)
        self.assertEqual(report["sitemapUrlCount"],10)
        self.assertFalse(report["googleIndexingConfirmed"])
        self.assertFalse(report["googleSearchConsoleSubmitted"])

    def test_live_errors_fail_closed(self):
        url=EXPECTED[0]
        for name,value in {
            "noindex":(200,url,{},f'<link rel="canonical" href="{url}"><meta name="robots" content="noindex, nofollow"><h1>delhi</h1>'),
            "wrong_canonical":(200,url,{},'<link rel="canonical" href="https://other.example/"><meta name="robots" content="index, follow"><h1>delhi</h1>'),
            "404":(404,url,{},"not found"),
            "header_noindex":(200,url,{"X-Robots-Tag":"noindex"},f'<link rel="canonical" href="{url}"><meta name="robots" content="index, follow"><h1>delhi</h1>'),
            "wrong_redirect":(200,"https://other.example/panchang/delhi/",{},''),
        }.items():
            with self.subTest(name=name),self.assertRaises(ValueError):
                audit(fake({url:value}))

    def test_sitemap_mismatch_is_not_accepted(self):
        invalid=(200,ORIGIN+"/sitemap.xml",{},
                 "<urlset><url><loc>https://panchavani.com/panchang/delhi/</loc></url></urlset>")
        with self.assertRaises(ValueError):
            audit(fake({ORIGIN+"/sitemap.xml":invalid}))


if __name__=="__main__":
    unittest.main()
