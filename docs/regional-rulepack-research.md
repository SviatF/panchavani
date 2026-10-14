# PANCHAVANI regional rule-pack research framework

The private engine now supports only a narrow, scientifically checkable
**Tithi-at-local-sunrise** predicate for an explicitly scoped region,
tradition and city. The provided Delhi example is a deliberately
unreviewed **test fixture**, not a Vrat rule and not a religious instruction.

A correct Tithi on local sunrise is not sufficient to infer:
- Ekadashi fasting dates, Smarta/Vaishnava differences or Parana intervals;
- festival observance dates with pradosha/nishita/madhyahna requirements;
- Amanta/Purnimanta lunar-month assignments or Adhika/Kshaya Masa;
- Wedding/Griha Pravesh/Vehicle Purchase/Business Muhurat.

The evaluator returns a narrow `researchPredicateMet` (true/false/null)
and ALWAYS returns `observanceDetermined=false`,
`muhuratRecommended=false`, `publicationAuthorized=false`,
`indexingAuthorized=false`, and a nonempty set of blockers.
No function in this module can approve or publish a calendar event.

Before adding genuine region-specific rulepacks:
1. Version the chosen calendar tradition/sect and give explicit district/city scope.
2. Obtain primary original documents and interpret seasonal/sunrise-time rules.
3. Add dates that test exceptions, leap months, overlapping tithis, sunrise transitions.
4. Independently review the complete festival or vrat logic and the calendar's
   naming and regional dates; don't extrapolate from a single example.
5. Implement a separately authenticated publisher that requires reviewed
   immutable astronomical evidence AND domain expert approvals.
6. Keep candidate pages noindex until user-value and citation review.

Primary institutional reference:
- Rashtriya Panchang by Positional Astronomy Centre, India Meteorological Department:
  https://packolkata.imd.gov.in/panchang/en/preface
- Government overview of different regional systems:
  https://packolkata.imd.gov.in/panchang/en/regional-calendars

Do not copy published tables blindly or claim any of the published descriptions
alone have validated our formulas.
