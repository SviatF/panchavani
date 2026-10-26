# PANCHAVANI — science truth matrix and first editorial learning library

## Production research pipeline

The existing authenticated `/science/pilot-week?start=2026-10-20` endpoint inspects the *original historical D1/R2 objects* with SHA-256 integrity verification. The separate weekly JPL + isolated Swiss research workflow recomputes 21 city-days; these are **not** byte-identical to the historical production candidates.

New `engine/panchavani/science_truth_matrix.py` deterministically joins:
- 21 freshly recomputed full JPL six-limb city-day candidates, SHA-pinned;
- 21 method-independent Swiss Moshier sampled solar dawns, with six signed angular residuals each;
- 16 Swiss phase boundary samples, balanced by Tithi, Karana, Nakshatra and Yoga, with actual signed seconds or unresolved status.

The report is an immutable private GitHub Actions artifact alongside reviewer handoff packets. It explicitly does **not** claim method equivalence or science approval. Comparison to old D1/R2 SHA identities **cannot occur in an isolated public GitHub Actions runner**; the report flags it as a separate review task and points to the Access-protected Admin live source audit. The official PAC/IMD Rashtriya Panchang describes a central observation station for parts of its calendar; its central-station readings cannot be silently treated as Delhi/Mumbai/Chennai local sunrise.

Actual PAC same-date central-station numerical reconciliation remains a follow-on controlled task, requiring archived and independently checked dated data for each comparison. Never interpret a missing publisher entry as numeric zero or successful match.

## Three new evergreen research-explainer previews

- `/learn/what-is-tithi/`
- `/learn/what-is-nakshatra/`
- `/learn/sunrise-and-city-panchang/`

All three have their own user intent, source-linked methodology, step-by-step teaching example, conceptual pitfalls and FAQs. Their examples are **explicitly fictional, not 2026 calendar data**. They are available in the site navigation but **robots noindex, follow=false**, absent from the sitemap; no claim of qualified third-party editorial review is fabricated. Before search release, independently check the astronomical and cultural wording, add any corrections and authorize specific URLs through the existing editorial SEO release policy. The broader nightly JPL/Swiss pipeline will never turn these explanations into indexable date-specific predictions automatically.

## Required approval still outstanding

1. Reconcile exact geolocation, solar horizon/refraction, ephemeris/ayanamsa/UTC–TT conventions and PAC source methodology.
2. Resolve historical D1/R2 SHA identities for each approved day and obtain genuine source-backed scientific signatures.
3. Produce limited private DeepSeek drafts using these **signed day factpacks only**; run citation, usefulness, duplicate and human-edit gates.
4. Separately authorize selected public route(s) in an auditable reviewed SEO manifest. Do not expand sitemap via content count alone.

Official method documents: [PAC explanations](https://packolkata.imd.gov.in/panchang/en/explanation), [IMD Rashtriya Panchang](https://mausam.imd.gov.in/responsive/rashtriyPanchang.php). The references establish published conventions, **not** independent accuracy certification for PANCHAVANI's actual research records.
