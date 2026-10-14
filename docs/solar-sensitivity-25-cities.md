# PANCHAVANI solar-model sensitivity QA — stage 2B

The current JPL/Skyfield solar method uses the United States Naval Observatory
standard solar-centre horizon of **−50 arcminutes**, the simplified sum of
about −34 arcminutes of standard refraction and −16 arcminutes of apparent
solar radius. Skyfield's `horizon_degrees` controls this mathematical
altitude crossing. This is **not** measured topography, atmospheric pressure,
observer horizon dip or expert-approved religious methodology.

Sources:
https://rhodesmill.org/skyfield/almanac.html
https://rhodesmill.org/skyfield/api-almanac.html

The solar event adapter now accepts an explicitly bounded research
`horizon_degrees` override. Existing production candidates keep the exact
original −50 arcmin default and are unchanged. No astronomy publishing
gate is relaxed.

`engine/panchavani/solar_sensitivity.py` tests each of 25 cities
for **13 October 2026** against five *hypothetical* perturbations:
- adopted latitude +0.02°;
- adopted longitude +0.02°;
- adopted elevation +100 metres while maintaining a mathematical level horizon;
- solar altitude cutoff −34′ rather than −50′;
- solar altitude cutoff −66′ rather than −50′.

Reports give both sunrise/sunset shifts in seconds and precise inputs. These
probes are **not statistical error bars**: 0.02° and 100m are deliberately
chosen stress-test magnitudes, not measured geodata errors, and different
physical models should not be treated as equally valid. Differences are
scientific diagnostics to guide what needs independent confirmation first.

Operational requirements for making any location indexable:
1. Choose a geographically reproducible adopted observation point (not
   implicitly the location of every visitor).
2. Verify its latitude/longitude/height with authoritative sources and
   record provenance; GeoNames populated-place matching is not enough.
3. Specify whether a **level mathematical horizon** is intended for the
   published calendar. Measure or source physical skyline/refraction
   separately if claims require visible sunrise at the observer point.
4. Match source publication methodologies and seasonal independent
   sunrise/sunset fixtures; preserve unresolved differences.
5. Independently verify the five Panchang limbs and local sunrise
   attribution; publish only on explicit science + human editorial
   approval and a signed, reversible indexable release manifest.

No normal city candidate automatically adopts alternative horizon models.
All sensitivity artifacts remain RESEARCH ONLY with `publicationAuthorized=false`.
