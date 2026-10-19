# PANCHAVANI — real Muhurat intersection integration (research-only)

## Deliverable

The scheduled pinned-JPL ten-city science pipeline now derives **all 4 simultaneous phase labels (Tithi, Karana, Nakshatra, Yoga)** across each city's **sunrise-to-following-sunrise** time interval. Every crossing splits the local day into precise non-overlapping IST-labelled slices. This is the missing foundation for independently reviewed Wedding, Vehicle Purchase, Griha Pravesh and other rule-pack intersections.

The daily GitHub workflow archives the 20 city/day grids as `ten-city-muhurat-time-grid-UNAPPROVED.json` along with the existing JPL source in Actions artifacts. Where existing R2 credentials are configured, it also mirrors into the protected research bucket under `ops/ten-city-six-limb/v1/{start-date}/{run-id}/`.

The authenticated private Admin Worker adds `/research/muhurat-windows`. It lists the latest private R2 research grid for the selected start date, displays two full daily timing grids per city, and permits source-linked JSON. Missing mirror/failed integrity returns HTTP 503 rather than false success. Nothing is written to D1, public Next.js or approved bundles by this module.

## Important non-claims

- **0 automatically approved Muhurat dates**. A Tithi/Nakshatra window does not equal an auspicious recommendation.
- Model realization, city observer/elevation, official methodology, reference comparisons and regional ritual rule-packs remain under separate review.
- The optional `draft_rule_filter` may help experts *test* versioned **DRAFT** selectors; even matching intervals have `muhuratRecommended=false`, no DeepSeek-approved claims, no SEO publishing.
- The first 10 public evergreen pages, sitemap, and the empty approved daily calendar remain unchanged.

## Operational follow-up

Wait for one successful nightly 10-city science run **and the R2 mirror step**. Visit the protected `/research/muhurat-windows?date=YYYY-MM-DD&city=delhi`. If it returns no archive, verify the existing private R2 credentials and GitHub workflow; do not report a published Muhurat. Prepare independently sourced city/ritual rule packages before deciding any human-approved windows.