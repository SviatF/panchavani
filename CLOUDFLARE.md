# PANCHAVANI — Cloudflare Workers deployment

This project uses **Next.js 15 App Router with Static Site Generation** (`output: 'export'`). It is not an SSR Worker. Cloudflare Workers Static Assets serves the prebuilt `out/` directory.

## One-time setup — Cloudflare dashboard

1. In [Cloudflare Dashboard](https://dash.cloudflare.com/), open **Workers & Pages → Create application → Import a repository**.
2. Connect GitHub and authorize **SviatF/panchavani**, if Cloudflare does not already have repository access.
3. Select **SviatF/panchavani** (production branch: `main`).
4. Use the existing `wrangler.jsonc` configuration; set the Worker name to **`panchavani`**. Cloudflare requires the Worker name in the dashboard and `wrangler.jsonc` to match.
5. Build settings:
   - Root directory: repository root (`/`)
   - Node.js: **22** (where a version selector or build variable is available)
   - Build command: **`npm run build`**
   - Deploy command: **`npx wrangler deploy`**
   - Static assets directory: **`./out`** (read automatically from `wrangler.jsonc`; do not configure an SSR framework adapter or SPA fallback).
6. Select **Save and Deploy**, and test the issued **`*.workers.dev`** URL.

Cloudflare will deploy automatically when new commits are pushed to the linked `main` branch.

## Attach the custom domain

1. Ensure the **`panchavani.com`** DNS zone is **Active** in your Cloudflare account. If the domain was purchased at another registrar, add the site to Cloudflare and complete the assigned nameserver change at the registrar first.
2. Go to **Workers & Pages → panchavani → Settings → Domains & Routes → Add → Custom Domain**.
3. Set the hostname to **`panchavani.com`** and follow Cloudflare's DNS/ownership confirmation prompts.
4. Test HTTPS, `/`, `/panchang/`, `/festivals/dussehra/`, `/muhurat/wedding/`, missing pages (should return a real HTTP 404), and the local `/imgs/*.webp` images.
5. Treat `www.panchavani.com` separately if wanted; add the `www` hostname or configure a redirect **after** DNS and SSL are functioning.

Important: Do not add a conflicting CNAME to the exact hostname used for a Workers Custom Domain. Do not move an existing active site on this hostname until the Worker has been tested on `workers.dev`.

## What the repo already does

- `npm run build` copies the 10 generated project-owned WebP files from `imgs/` to `public/imgs/`, then generates `out/`.
- `wrangler.jsonc` has `assets.directory: './out'`, `not_found_handling: '404-page'`, and `html_handling: 'force-trailing-slash'` to match Next.js `trailingSlash: true`.
- `.github/workflows/verify.yml` independently checks the static build and core assets.
- Manual publish for an authenticated local Cloudflare session: `npm install && npm run deploy`. When using **Workers Builds** through the dashboard, use **`npm run build`** and **`npx wrangler deploy`** as separate commands; `npm run deploy` also builds, so don't double-build.

## Launch safety

**This is currently a visual concept preview, not a complete live Panchang service.** Its astronomical timings and interactive planning logic have not been validated. The generated HTML intentionally includes **`noindex, nofollow`**. Keep it in place on both `workers.dev` and the custom domain until accurate astronomical calculations, location/date selection, content and SEO checks are complete.

Connecting GitHub in Cloudflare and linking the domain require a Cloudflare account owner. Do not commit API keys, tokens, account secrets, or credentials to this repository.
