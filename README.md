# PANCHAVANI — Cinematic Hindu Calendar

Next.js 15 **App Router + SSG** implementation of the approved PANCHAVANI V1 visual concept.

## Tech / render model

- Next.js App Router / React 19 / TypeScript / CSS, no component framework
- `output: 'export'`: build generates static HTML under `out/`, suitable for Cloudflare Workers Static Assets (or Cloudflare Pages)
- Every editorial/preview route is emitted at build time via `generateStaticParams` (no server-side API required)
- Only header search/mobile controls and the clickable Panchang wheel use client-side React
- **All imagery is project-owned and loaded locally.** No third-party image APIs, Unsplash, stock fetching or image hotlinking.

## Source images

The user-approved image files remain in **`imgs/`**, named:

`hero-main-bg.webp`, `festival-dussehra.webp`, `highlight-tithi.webp`, `highlight-nakshatra.webp`, `highlight-abhijit.webp`, `highlight-rahu.webp`, `card-wedding.webp`, `card-griha-pravesh.webp`, `card-vehicle-purchase.webp`, `card-start-business.webp`.

`npm run build` (and `npm run dev`) first runs `scripts/sync-assets.mjs`, validating and copying them to ignored `public/imgs/`. Never rename files or load images from the web. This avoids committing the same binaries twice.

**Regional imagery:** five newly generated cinematic architectural illustrations, stored locally as `imgs/region-{uttar-pradesh,maharashtra,tamil-nadu,karnataka,gujarat}.webp`. These images are illustrative compositions, not documentary photographs or verified depictions of specific buildings. Two Muhurat tiles (Naming Ceremony, Education) still use original CSS/vector-style artwork.

## Commands

```bash
npm install
npm run dev
npm run build
npm run typecheck
# configure Cloudflare account first, then:
npm run deploy
```

Cloudflare Workers Static Assets reads `out/` via `wrangler.jsonc`. No Next.js server runtime is needed.

## Accuracy / indexation safeguards

**This is a VISUAL DEMO**, not yet a functioning astronomical Panchang service. The approved design reference for Delhi **13 October 2026** uses illustrative Tithi/Nakshatra/Muhurat/sunrise/sunset/festival data, and planet degree values are deliberately **not fabricated**. The page explicitly marks these as examples. `robots: noindex, nofollow` is enabled throughout the preview until:

1. A licensed, validated astronomical ephemeris/rules engine is integrated.
2. Local sunrise/sunset and time zone handling are checked against trusted references for each city and date.
3. Regional festival rules and Muhurat calculations are reviewed.
4. Real data replaces illustrative fields, every interactive locator/date feature is made fully functional, and metadata is signed off for SEO.

The static routes are design/navigation scaffolding; do not index them as standalone SEO pages before publishing unique, validated substance.

## Routes

`/`, `/panchang/`, `/calendar/`, `/festivals/`, `/festivals/dussehra/`, `/muhurat/`, `/muhurat/[type]/`, `/vrat/`, `/tools/`, `/learn/`, `/regional/`, `/regional/[state]/`.
