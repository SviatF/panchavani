# PANCHAVANI — controlled daily Delhi research publishing pilot

**Dates (India local):** 2026-10-27 to 2026-11-02, seven dates and exactly one Delhi article per released day.

**Public trial routes:** `https://panchavani.com/research/panchang/` and `/research/panchang/delhi/YYYY-MM-DD/`. These are clearly marked **UNAPPROVED RESEARCH**, page robots `noindex,follow`, completely excluded from the approved public sitemap and the trusted day SEO manifest. Religious/ritual/festival/muhurat decisions are explicitly disclaimed. The previously restricted signed-factpanels remain unchanged.

## Actual automated schedule

1. One-time proof: pinned NASA/JPL DE440s 7-day recomputation (all 3 sites, 21 coherent city days, 72 cross-day checks). PR preparation workflow attaches the exact **seven Delhi** data rows with immutable JSON source record SHA to `data/research-panchang-pilot.json`, separately verified as unapproved.
2. Website may hold all seven source rows in Git to support reproducible builds, but its Next.js static `generateStaticParams` returns **only dates through the current India-local civil day**. No future URL is exported.
3. Daily GitHub workflow `PANCHAVANI seven-day Delhi research post and SEO QA (NOINDEX)` rebuilds/validates/deploys at 02:30 UTC (~08:00 IST) **only during 27 Oct to 2 Nov 2026**. Each day the site grows by exactly one complete date page; articles already released remain accessible.
4. Science input is numeric source-locked JPL with its method explicitly described as provisional. Explanatory paragraphs are seven different human-authored conceptual reading angles, NOT paid DeepSeek. Production DeepSeek continues to deny unreviewed scientific records; no attempts, forged credentials or publishing grants are created.
5. CI checks 7 unique editorial topics, three substantial explanatory paragraphs per date, trigram overlap, NASA kernel SHA and immutable source identities, all four lunar timelines, consistent continuous UTC and sunrise sequence. Exported HTML is also examined for the right date-specific Panchang content, unique page title, self canonical, detailed provenance and `noindex`, sitemap exclusion, and missing future-day files.

## What to check after ~48 hours (29 October India time)

- **Technical:** 2/7 daily pages served (Oct 27 and Oct 28), same expected date and JPL source SHAs in HTML, no unexpected Oct 29 page before its first scheduled publishing window.
- **Astronomical:** Compare the first two daily sunrise/method assumptions and every displayed boundary with primary same-date sources; specifically watch Nakshatra/Yoga sidereal convention, time zone, and local observer horizon. The earlier Oct 21 Vanij Karana discrepancy is not resolved by publishing these new days.
- **Editorial:** Distinct article intent and explanation, no repeated template padding, no invented festival/ritual/fasting claims, readable on mobile and desktop.
- **SEO:** Unique descriptive title/H1/description, correct canonical, internal links, crawlable noindex, clean sitemap and real 200 HTML response. Verify origin server responses; CI build by itself cannot prove Google indexed anything.
- **User metrics:** If analytics are connected, review engagement and usability. These `noindex` pages are NOT an organic SEO rankings experiment; they cannot deliver normal GSC impressions/queries from Search while excluded.

## Separate indexing decision

The pilot remains publicly inspectable but unindexed. If the site owner wants an indexed pilot after observing quality, select individual properly supported content and make a **separate, explicit SEO release decision**. The verified Panchang route `/panchang/delhi/YYYY-MM-DD/` still requires approved scientific data and independently reviewed claims; it is not unlocked by a research article or owner wish to go faster. Other evergreen educational articles can be reviewed/released under their existing separate editorial SEO permit.

## Limitations

GitHub Actions scheduled executions are best-effort, not guaranteed to start at exactly 02:30 UTC. The publishing workflow skips deploys outside the seven-day interval. A CI-runner failure, missing Cloudflare secrets or unreachable public site is not counted as successful posting. For a status audit inspect the latest GitHub Actions run and actual page HTML; do not claim a live deploy or an indexed result based solely on a green source-preparation check.
