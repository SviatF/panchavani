# PANCHAVANI Editorial V4 · three-city pilot

## Why
A Chennai V2 draft was mainly legal/scientific boilerplate; Delhi V3 was more readable but generic, exceeded the recommended length and returned FAQ as an object. Both are already stored in immutable R2 with one-shot records and **MUST NOT be regenerated or relabeled V4**.

## Content types and paid calls
- `city-hub`: evergreen, reader-focused 100–200 English words across the three body fields and optional FAQ, one safe conceptual reader action and a city-specific *research question* rather than unsupported religious detail.
- `daily-panchang`, `muhurat`, `vrat`, `festival`: **no new paid model calls** while the only candidate records are scientifically unapproved. Previously stored drafts are retrievable from their original job and remain research-only. This is intentional: a daily SEO page repeating general sunrise concepts creates thin/duplicate content.
- V4 prompt never includes raw provisional JPL transit values or unapproved day-specific Tithi, Karana, sunrise or rituals. No prompt injection from research files.
- The intended first new pilot is **Mumbai city-hub English**, one attempt only, after the production Admin Worker reports `editorialPolicyVersion: deepseek-private-editorial-v4`.
- The one-shot slot is still keyed city+date+intent+lang. For this limited manually triggered pilot V4 checks for another existing city-hub for the same city+language across dates before reserving. This is NOT an atomic cross-date guarantee if two different research dates are submitted concurrently; before automated scaling, add a D1-enforced per-city/language unique rule.

## Structure and limits
- Exactly nine keys: headline, seoTitle, metaDescription, introduction, localContext, dailyUnderstanding, uncertaintyNote, faq and referencedFactIds.
- FAQ **must** be a JSON array with zero/one {question,answer}. Historical malformed FAQ is previewed, never modified in R2.
- English body words count excludes SEO metadata and internal verification note; 100–200 words target (prompt aims 125–170). Hindi texts get manual language-specific review.
- V4 flags: FAQ schema, suspicious citations, weak city-specific substance, dated evergreen claims, unapproved day facts, excessive English body length, long SERP fields, internal warning leakage. No automatic replacement/second paid request after bad model output.
- Cross-city lexical similarity is **only a heuristic for editorial triage**, not proof of semantic uniqueness or plagiarism; human+fact evidence check remains mandatory before any public SEO release.
- New raw model outputs are written to R2/D1 as `AI_DRAFT_UNAPPROVED` with V4 policyVersion and all scientific/ritual/human/SEO review blockers. Nothing is published or indexed.

## Operational verification
1. Green private-admin CI + git main merge.
2. Confirm actual `panchavani-admin` Cloudflare Worker deploy via authenticated `/api/status`.
3. Verify one-shot `Delhi daily-panchang` and `Chennai daily-panchang` remain cached and unchanged.
4. Confirm new `daily-panchang` without approved data fails **before** `reserveOneShot` or any DeepSeek API call.
5. Only then optionally request Mumbai **city-hub**, en, for the imported 2026-10-16 candidate, once. Inspect provider input/output tokens, quality blockers and cross-city originality.
6. Do **not** turn on cron or publish into sitemap until reviewed science, regional observance rules and unique editorial content are available.
