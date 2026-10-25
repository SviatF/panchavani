# PANCHAVANI — operational unblock for automated city × date × intent content

## What is already scheduled

- `.github/workflows/rolling-six-limb-research.yml`: **daily**, 10-city/2-day NASA JPL research and numerical QA. Its source artifacts are never approved fact packets.
- `.github/workflows/monthly-content-research.yml`: **15th of each month**, next-month 10-city JPL/Swiss cohorts, per-day research, structural continuity checks, and city × date × intent inventory. This change mirrors the complete research-review queue into the **private** `panchavani-research-private` R2 bucket after all QA checks succeed.
- `admin/src/autonomy.mjs` + `admin/src/multidomain-production.mjs`: **hourly private Cron**, scans independently signed scientific source packs, then consumes daily, full-month calendar, and separately reviewed festival/vrat/muhurat inputs. One new source-locked DeepSeek draft per tick, at most 3 total model attempts per 24 hours across editorial subsystems; never grants publication automatically.
- `scripts/generate-reviewed-pages.mjs`, `scripts/generate-topic-pages.mjs`: **public build only**. No public daily/topic routes without independent editorial and SEO manifest permits and matching SHA digests.

## Why production is still blocked

1. Private Admin deploy failed at Cloudflare D1 remote migrations with code **7403**. This is not missing GitHub secret *names*; it is invalid account/database ownership or insufficient API-token privileges. Historical run: https://github.com/SviatF/panchavani/actions/runs/40202450344
2. Daily R2 delivery failed because the workflow expects **different scoped credentials** (`PANCHAVANI_PRIVATE_R2_ACCESS_KEY_ID`, `PANCHAVANI_PRIVATE_R2_SECRET_ACCESS_KEY`) not present in GitHub's secrets list. Historical run: https://github.com/SviatF/panchavani/actions/runs/40180385046 . The present `PANCHAVANI_R2_ACCESS_KEY_ID` / `PANCHAVANI_R2_SECRET_ACCESS_KEY` are reserved for `panchavani-jpl-research-inbox`. Do **not** overwrite or silently alias them without confirming the bucket scope.
3. Independently signed scientific day packs, reviewed tradition-specific rules, and separate approved-publication manifests are not created by passing numerical JPL/Swiss QA alone. The public approved manifests in the repository remain empty until actual expert review. Model-written unique prose cannot certify astronomical correctness.

## Cloudflare account owner fixes — no secrets in code or chat

In the Cloudflare Dashboard select the account containing `panchavani-private` (the pinned D1 database id is in `admin/wrangler.jsonc`) and the existing private Worker `panchavani-admin`. Obtain this exact **account ID**. Check that it matches the GitHub Actions repository secrets `CLOUDFLARE_ACCOUNT_ID` and `PANCHAVANI_R2_ACCOUNT_ID`. Because GitHub never reveals saved secret values, **edit/replace** mismatched entries rather than attempting to read them back.

Create/adjust a scope-limited deployment **Cloudflare API token** for the exact account with **D1 Read/Edit** (remote schema migrations) and **Workers Scripts Edit** (existing Admin Worker deployment), plus any additional minimally necessary R2/route permissions if operations require them. Replace only `CLOUDFLARE_API_TOKEN` in GitHub Actions repository secrets. `.github/scripts/cloudflare_d1_preflight.py` now validates the active token and exact D1 identity with a *read-only API request* before remote schema mutations. It never prints identifiers/credentials.

In Cloudflare **R2 → API Tokens** create a dedicated **S3 compatible** Object Read/Write credential scoped to `panchavani-research-private` and add the pair to GitHub **Actions secrets** under these **exact** new names:

- `PANCHAVANI_PRIVATE_R2_ACCESS_KEY_ID`
- `PANCHAVANI_PRIVATE_R2_SECRET_ACCESS_KEY`

Keep the older `PANCHAVANI_R2_*` credentials for the ingestion inbox; do not copy any token to prompts, logs, screenshots or repository source.

Re-run `PANCHAVANI private Admin Worker safe auto-deploy` from `main`. Confirm passing API preflight, D1 migrations and Wrangler deploy. Next run the existing daily ten-city research and next-month content research actions once and check private R2 mirrors. Finally check `https://admin.panchavani.com/editorial/readiness?month=2026-11` behind Cloudflare Access.

## Content engine integrity

After independent scientific source packs have entered D1/R2, the private Cron **automatically** selects Daily Panchang first, then full Calendar months, then independently rule-reviewed Festivals/Vrat/Muhurat. The editorial compiler now supplies verified city-specific local solar-day patterns (four limb transition order and daylight/after-sunset context) rather than only general city facts. The language model cannot invent timestamps, dates, named Tithi values, astronomical phases, or ritual windows; those are rendered from source-locked deterministic calculations.

When quality is inadequate, drafts are quarantined with a recorded reason. They require independent editorial judgement before passing to the separate SEO whitelists and signed static release manifests. Mass publishing without this gate would be high risk for both information accuracy and Google scaled-content policies.

**This workflow does not auto-sign research as scientific approval, does not post AI prose as factual content, and does not deploy any unreviewed pages.** Finishing Cloudflare credentials starts the *research transport* and enables Admin to consume genuinely independently reviewed source records. The separate scientific signoff and editorial release process is still required.
