# PANCHAVANI Private Calculation Console — pre-deployment code

A **separate Cloudflare Worker**, never deployed as "/admin" in the public assets-only SSG website. The dashboard is private by design and **locked by default**.

## Security gates implemented

1. Validates Cloudflare Access RS256 JWT cryptographically with the team's JWKS, *exact* issuer and application audience.
2. Requires verified email membership in `ALLOWED_ADMIN_EMAILS`; service tokens with no email do not grant admin role.
3. Returns `403` unless all three environment values exist and validation succeeds. Protect Access policy at BOTH hostname and Worker route/preview exposures; config has `workers_dev:false`.
4. Sets `X-Robots-Tag: noindex, nofollow, noarchive`, `Cache-Control: private, no-store`, CSP, anti-framing and no-referrer on every response. No public sitemap references.
5. Browser POST requires same-origin `Origin` and a valid authenticated identity. All queries use prepared statements; request values validated server-side.
6. Audit log stores the actor for all queued jobs.
7. No publishing/approval endpoint exists. Research jobs cannot become public records through this interface.

## What the admin actually does in V1

It displays current private infrastructure state, protected D1 research job queue, and status / artifact SHA of completed internal candidates. Queueing alone does not compute anything. An external Skyfield/JPL research runner can consume **one job** only after a private D1 database, private R2 bucket, Cloudflare Access service credentials, HMAC secret and GitHub Actions secrets have all been configured. This connection has **not** been provisioned or deployed. Completed candidates remain **unapproved research** with required publication blockers; the interface has no approval or release endpoint.

## Cloudflare account owner setup (NOT already performed)

- In Zero Trust: create an Access self-hosted application for `admin.panchavani.com`; require strong MFA, identity restrict to authorized people. Enable Worker Access coverage so alternate routes cannot bypass authentication.
- Create D1 database `panchavani-private` and execute `admin/migrations/0001_private_jobs.sql` against it.
- Add to **panchavani-admin Worker**, not the public Worker, a D1 binding named `DB`. Bindings can be configured via dashboard or an uncommitted local Wrangler environment-specific config. NEVER commit real credentials or sensitive IDs.
- Configure `TEAM_DOMAIN` (e.g. `https://your-team.cloudflareaccess.com`), `POLICY_AUD` (Access application audience) and `ALLOWED_ADMIN_EMAILS` (comma-separated lowercased allowlist) via Worker settings. The Worker fails closed without them.
- From `admin/`: `npm install`, `npm run check`, then after all account controls are configured `npm run deploy`.
- Attach `admin.panchavani.com` only to the **private** Worker after verifying Access is enforced. Do not put private endpoints in Next.js SSG or on `panchavani.com`.
- `workers_dev:false` hides the normal workers.dev URL; do not assume it alone secures any preview deployment or other custom routing.

References: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/ ; https://developers.cloudflare.com/workers/platform/environment-variables/ ; https://developers.cloudflare.com/d1/


## Exact private runner configuration — required before real use

1. Create a **separate** Worker named `panchavani-admin`; configure a **Worker-level Cloudflare Access policy protecting production and previews**, not only the custom hostname. Include only explicitly approved admin emails with MFA and a dedicated Access **service-token policy** for the runner. Bind `admin.panchavani.com` only after access is tested. `workers_dev:false` is additional defense, not authorization.
2. Create a private Cloudflare D1 database named `panchavani-private`; bind it as `DB` in the admin Worker only. Supply the actual `database_id` in the admin Worker configuration/Dashboard. Apply migrations **in order**, `0001_private_jobs.sql` followed by `0002_private_runner.sql`. `0002` adds leases, replay nonces and private research candidate metadata.
3. Create a **PRIVATE** R2 bucket (suggested name `panchavani-research-private`, no public/custom bucket URL). Bind as `CANDIDATES` to the admin Worker; **never** bind it to the public SSG Worker. Use bucket access audit/retention policies consistent with private research data.
4. Set admin Worker variables `TEAM_DOMAIN=https://<team>.cloudflareaccess.com`, `POLICY_AUD=<exact self-hosted Access application AUD>`, `ALLOWED_ADMIN_EMAILS=<comma-separated admin emails>`. Set a strong random 32+ character secret `RUNNER_HMAC_SECRET` via encrypted Cloudflare secret settings (not repository source or Wrangler vars). Access must validate human JWTs and also allow the dedicated runner **service token** at its perimeter.
5. In GitHub Actions repository **Secrets**, add `PANCHAVANI_RUNNER_HMAC_SECRET` (same random HMAC secret), `PANCHAVANI_ACCESS_CLIENT_ID`, and `PANCHAVANI_ACCESS_CLIENT_SECRET` (Cloudflare Access service token credentials). These are NOT the human JWT. Never paste or commit values into GitHub files.
6. Deploy from `admin/` after provisioning with `npm install && npm run check && npm run deploy`. Check HTTPS and ensure unauthorized browser sessions are blocked at the Cloudflare edge and the Worker. Test `/api/status` while authenticated.
7. In GitHub Actions, manually run **Private PANCHAVANI research queue runner** once; this tests claiming one queued D1 job, downloading the pinned JPL `de440s.bsp`, checksum validation, computing a candidate, signed upload to private R2 and candidate SHA in D1. Do **not** enable recurrence until this workflow and audit logs have been reviewed. The GitHub runner requires a working `https://admin.panchavani.com`; it fails closed if secrets are missing.

Runner request signing: `HMAC-SHA256(secret, timestamp_ms + "\\n" + nonce + "\\n" + method + "\\n" + path + "\\n" + sha256(raw_json_body))`, one unique nonce per request, five-minute timestamp tolerance. Separately require Access service token at the perimeter. HMAC does not replace Access.

The candidate store accepts ONLY `status=calculated`, `blockerCount >= 1`, `ayanamsa=NOT_VALIDATED`, unverified city catalog and `approvedBy=releaseId=null`. No endpoints change these into published data. No applicant/family-specific ritual recommendation is generated. Job error states require explicit review before retry.

The admin Worker currently depends on **externally provisioned bindings**; `wrangler deploy --dry-run` can validate code but cannot prove access configuration, D1/R2 bindings, DNS, secret validity or live runtime correctness.

## Next iteration

A manual GitHub Actions research runner and signed candidate ingestion endpoint are now **implemented in code**, but not deployed or connected to your Cloudflare resources. Next: verified coordinates and Lahiri methodology, human ritual review interface, publication manifests, and fail-closed release gate. The public website continues to use preview-only values and `noindex`.
