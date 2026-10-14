# PANCHAVANI AI Editorial Engine — DeepSeek research drafts v1

**Status: IMPLEMENTED FOR LOCAL/PRIVATE RESEARCH. NO PRODUCTION AI PUBLISHING.**

PANCHAVANI's own JPL/Skyfield + documented regional rules are the source
of factual truth, not a language model. This module writes private
editorial DRAFTS, never html/routes, Google-indexable pages, Cloudflare
content, or approved religious guidance.

### Pipeline

1. Research-only city/day astronomy candidate already produced by the
   pinned JPL workflow. Candidate must match exact city id, coordinates,
   catalog version and date, and pass existing fail-closed research checks.
2. The prompt builder links the candidate by SHA-256, selects the requested
   language (en/hi), and the editorial intent: `daily-panchang`, `city-hub`,
   `festival`, `vrat` or `muhurat` (all research-only). The model receives
   genuinely different research requirements for each type, not randomly
   shuffled wording. It retrieves a distinct *editorial research question*
   for each expansion city. A research question is not a factual claim.
3. The request **does include the current city's local JPL research solar
   timestamps, preliminary Tithi/Karana transitions, method details and
   checksum**, explicitly isolated as `researchOnlyCandidate` with
   `DO_NOT_QUOTE_AS_SETTLED_FACT`. It supplies context for identifying
   useful day-specific editorial questions, not factual permission to publish.
   Critically, **the current candidate has 0 scientifically approved
   numerical facts and 0 approved ritual activity rules**. The prompt
   explicitly prevents the model from inventing facts or suggesting that
   a day is auspicious. Pending review, it can write only a useful
   explanatory/research framing. The final application will format
   time/date values from APPROVED structured astronomical data, not LLM prose.
4. DeepSeek API, only by explicit `--generate`, uses JSON-mode chat
   completions and an environment-secret API key. Default model is
   `deepseek-flash`, configurable via CLI. No network request occurs
   in regular tests or `--prepare` mode.
5. Output passes JSON field, citation-id, title-length, unsupported
   clock-time/auspiciousness, placeholder and duplicate-body heuristics.
   These do not certify cultural or factual accuracy. All drafts retain
   `AI_DRAFT_UNAPPROVED`, require human editorial + scientific/ritual
   review, and have `indexingAuthorized=false`.
6. No generated text is directly published, no sitemap is changed,
   and `app/layout.tsx` keeps a global `noindex` setting.

### Commands

Prepare a private prompt without a DeepSeek API key:

```bash
PYTHONPATH=engine python -m panchavani.ai_editorial \
  --candidate /path/to/2026-10-13-delhi-UNAPPROVED.json \
  --language en \
  --out /tmp/panchavani-delhi-2026-10-13-PROMPT-UNAPPROVED.json
```

Generate ONE draft, only after setting secret locally in a secure environment:

```bash
export DEEPSEEK_API_KEY="..."  # do NOT share this value in chat or commit it
PYTHONPATH=engine python -m panchavani.ai_editorial \
  --candidate /path/to/2026-10-13-delhi-UNAPPROVED.json \
  --language en --generate \
  --out /tmp/panchavani-delhi-2026-10-13-AI-UNAPPROVED.json
```

The API secret is never printed, put into GitHub source control, written
to research artifacts or passed through Next.js public environment vars.
If later run as GitHub Actions, configure it using an explicit
GitHub Actions secret and minimal permissions; impose request limits and
cost/budget controls. The system must use approved City-Day data to
generate useful daily recommendations; simply varying the title or
temperature is not a substitute for real city/date value.

### "What can I do today?"

Use a completely separate versioned and independently approved
**ActivityRuleBundle** with region/tradition applicability,
days/intervals, negative conditions, exceptions, primary sources and
human/religious expert approval. Compute activities with deterministic
rules, then let the model *explain* an allowed recommendation, never
choose one. Examples: "fasting date" requires a specific Ekadashi
tradition/parana rule and local sunrise; wedding or Griha Pravesh
requires its own separate expert reviewed Muhurat eligibility module.
If rule evidence is unavailable, show "No verified recommendation
available" rather than speculate.

### Daily indexing vs evergreen city hubs

A city/day-specific page is indexable only if it independently adds
user value: verified transition data, unique meaning of the local
sunrise day, cited regional context, and correct task-specific
activity rules when present. At first launch, prefer a small number of
individually edited evergreen city hubs and a limited date range,
instead of blindly indexing 25 cities × 365 days.
Avoid indexing outdated/empty days or machine-spun meta descriptions.

The current standalone prototype remains global `noindex`.
SEO release requires a separate, signed, page-specific
science/ritual/editorial release manifest not yet implemented.

### Official docs

DeepSeek JSON Output: https://api-docs.deepseek.com/guides/json_mode/
DeepSeek Chat Completion: https://api-docs.deepseek.com/api/create-chat-completion/
Google: https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
Google: https://developers.google.com/search/docs/essentials/spam-policies
