# Wave 9 — automated research, protected SHA forensics and human release gate

**Research automation is not equivalent to scientific certification or public indexing.**

## Existing automations (retained)

- GitHub overnight 25-city JPL research runs daily at 02:17 UTC; sharded, checksum-pinned, uploads to private R2 only when existing repository secrets work.
- Private Cloudflare Worker Cron every hour at minute 05 imports research and optionally queues tomorrow's work when AUTO_RESEARCH_ENABLED=true and runner credentials are provisioned.
- Private GitHub signed research consumer uses its opt-in variable and actual Access/HMAC secrets. Optional cost-capped DeepSeek drafts stay private.

## Added: rolling six-limb previews

The new GitHub workflow `.github/workflows/rolling-six-limb-research.yml` runs daily at 04:41 UTC, and can be triggered with a manually selected start date. It calculates Delhi, Mumbai and Chennai for two consecutive India-local dates, defaulting to tomorrow and the following day. Historical Wave 7/8 tests remain anchored at Oct 16–17.

Each of the six research previews contains a distinct modeled sunrise, sunset, location point, six dawn Panchang elements, Tithi/Karana/Nakshatra/Yoga intervals and all local solar-day transitions. It archives research-only Markdown and SHA-pinned JSON for an editor, not generated public SEO pages. Two-day and cross-city coherence, 12 layer-continuity checks, JPL kernel hash and anti-release assertions must pass.

## Added: once-daily production D1/R2 conflict evidence

The existing Admin Worker Cron also attempts a live, read-only SHA comparison of historical Oct 16 Delhi, Mumbai and Chennai D1 candidate rows against immutable private R2 nightly source manifests once per UTC day after 03:00. The new env flag AUTO_PRIVATE_FORENSICS_ENABLED=true enables this **when the Admin Worker deploys**.

A complete report or a BLOCKED missing/tampered-source marker is stored in an isolated private R2 operations prefix under CANDIDATES, once per UTC day. The archive does not overwrite candidates, issue approval, change D1, or call paid AI. A blocked run retries the next day, not every hour. The protected Admin GET `/research/conflicts/automation?date=YYYY-MM-DD` returns 200 for a complete verified source scan, 503 for blocked or missing, and rejects unauthenticated requests.

## Remaining essential human steps

1. Deploy the updated private Admin Worker with valid D1/R2 bindings, Cloudflare Access and env variable; GitHub merge alone cannot establish a live Cron run. Confirm a real saved daily private forensic JSON.
2. Independently reconcile source method, Lahiri, city observatory coordinates/elevations and refraction/official PAC assumptions. Resolve original D1 conflict cases through documented reviewer decisions rather than automatic hash winner-selection.
3. Promote only independently approved fact IDs into future DeepSeek drafts. Human-edit local reader value and city-specific differences. Implement a separately signed per-URL publication whitelist, then only reviewed pages may leave global noindex.
4. Verify the live Cloudflare HTML, sitemap, canonical and GSC indexing. Scheduled research passing does not authorize any public release.

The project still has zero scientifically approved city/day records in the public bundle, and Google indexing is intentionally blocked.