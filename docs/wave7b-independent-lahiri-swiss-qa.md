# Wave 7B — independent Lahiri **diagnostic** comparison

## Objective

Move from the internal same-JPL numerical convergence checks of Wave 7 to a **second software/ephemeris family** so that a systematic sidereal reference-frame error cannot be hidden by repeated calls into one calculator.

This is a **research QA tool only**. It is not a methodological certification, ritual rule pack, signed approval, or a first indexable page.

## Two distinct computations

1. PANCHAVANI: Skyfield 1.55 + checksum-pinned NASA/JPL DE440s, geocentric true-date ecliptic apparent longitudes, experimental fixed-inertial IAE epoch anchor \`IAE-1985-Lahiri-anchor-fixed-ICRF-v0-RESEARCH-UNVALIDATED\`.
2. External diagnostic: Swiss Ephemeris Python 2.10.3.2, explicitly \`FLG_MOSEPH | FLG_SIDEREAL\`, \`SIDM_LAHIRI\`, independent *analytic Moshier* body positions. Return flags are asserted to avoid silent fallback to another ephemeris.

The second program does not use the same JPL kernel. Its default Lahiri realization is **not necessarily method-identical** to PANCHAVANI's proposed 1956 TT fixed-inertial ecliptic construction. Disagreement must be decomposed into tropical Moon/Sun, ayanamsa and sidereal differences; it must not be fixed by blindly adding a numerical offset.

### Samples

- UTC instants covering 1956 epoch, J2000, 2024 leap day, 2025 equinoxes/solstice, 16 October 2026, 2030 and 2050.
- Six exact provisional city-sunrise instants for Delhi/Mumbai/Chennai on 16–17 October 2026 from the independent SHA-pinned Wave 7 research record.
- Report differences in **arcseconds**, with signed circular angle handling at longitude 0/360.
- Compare calculated Nakshatra and Nitya Yoga 1–27 classification for each sample.

The report **always returns** \`scientificApproval=false\`, \`methodEquivalenceConfirmed=false\`, \`releaseAuthorized=false\`, \`indexingAuthorized=false\` and \`approvedClaimsForDeepSeek=[]\`. Numeric agreement is diagnostic, not a new canonical model.

### License firewall

Swiss Ephemeris is copyright Astrodienst AG under **AGPL-3.0 OR Professional License**, and \`pyswisseph\` carries AGPL-3.0. Commercial production may require selecting and complying with the appropriate license. Do not use this external reference library or its code in production, do not run it as a service, bundle it into Cloudflare, or add it to \`engine/requirements.txt\`.

This specific run is limited to an **ephemeral isolated GitHub research QA job** using a version-and-SHA-256-pinned PyPI CPython 3.11 wheel. The second program is not linked into the PANCHAVANI app or worker, and no Swiss ephemeris or code is copied into the product. Before repurposing any results or code for public service use, obtain appropriate licensing advice.

- Official Swiss dual license: https://github.com/aloistr/swisseph/blob/master/LICENSE
- PyPI package and exact wheel hash: https://pypi.org/project/pyswisseph/

### Completion status

The CI artifact named \`panchavani-wave7b-independent-lahiri-swiss-UNAPPROVED\` records the raw measurements, each instantaneous classification and maximum drift. A green CI result proves the comparator executed with explicit inputs and no release bypass. It does **not** mean differences are within a scientifically chosen tolerance.

Before first city-day indexing, we still require:

1. Scientific reviewer to reconcile **reference frame / precession-nutation / true vs mean ecliptic / UT1 vs TT** and decide a standard Lahiri reference implementation.
2. City observation points, elevation and horizon/refraction verified to authoritative sources; pin timezone DB and numerical versions.
3. Actual SHA-validated live D1/R2 conflict triage for 2026-10-16 Delhi/Mumbai/Chennai. Private \`/research/conflicts?city=...&date=2026-10-16&format=json\` exists in GitHub; production deployment and access not confirmed. **No conflicts have been resolved by this analysis.**
4. Multiple independently transcribed historical official PAC records and named science signoff.
5. Original human-verified localized reader value and per-URL SEO release approval.

**Public noindex stays in place. No paid DeepSeek calls or releases are authorized.**
