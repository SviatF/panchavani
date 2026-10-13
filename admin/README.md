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

It displays current private infrastructure state and optional D1 research job queue. It **can queue requests if D1 has been provisioned**, but the Skyfield Python compute worker is deliberately NOT yet connected: queueing is NOT running a calculation. There are no fake readiness figures, no invented festival recommendations, and no button that publishes results.

## Cloudflare account owner setup (NOT already performed)

- In Zero Trust: create an Access self-hosted application for `admin.panchavani.com`; require strong MFA, identity restrict to authorized people. Enable Worker Access coverage so alternate routes cannot bypass authentication.
- Create D1 database `panchavani-private` and execute `admin/migrations/0001_private_jobs.sql` against it.
- Add to **panchavani-admin Worker**, not the public Worker, a D1 binding named `DB`. Bindings can be configured via dashboard or an uncommitted local Wrangler environment-specific config. NEVER commit real credentials or sensitive IDs.
- Configure `TEAM_DOMAIN` (e.g. `https://your-team.cloudflareaccess.com`), `POLICY_AUD` (Access application audience) and `ALLOWED_ADMIN_EMAILS` (comma-separated lowercased allowlist) via Worker settings. The Worker fails closed without them.
- From `admin/`: `npm install`, `npm run check`, then after all account controls are configured `npm run deploy`.
- Attach `admin.panchavani.com` only to the **private** Worker after verifying Access is enforced. Do not put private endpoints in Next.js SSG or on `panchavani.com`.
- `workers_dev:false` hides the normal workers.dev URL; do not assume it alone secures any preview deployment or other custom routing.

References: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/ ; https://developers.cloudflare.com/workers/platform/environment-variables/ ; https://developers.cloudflare.com/d1/

## Next iteration

Implement the trusted queue consumer to execute reproducible Python calculations with independently hashed JPL SPK files and attach signed candidate artifacts (not public). Add review/checkpoint UI, versioned rule packs, release manifests, D1/R2 RBAC. None is presented as already live.
