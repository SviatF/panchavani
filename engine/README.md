# PANCHAVANI astronomical research engine (Wave 1)

This is **candidate-generation software, NOT a completed accuracy certificate or public Muhurat calculator.** No code in the public Next.js SSG application imports these modules or accesses draft data.

## What currently works

- Eight **provisional** city-centre locations with IANA timezone; source verification remains a publication blocker.
- Skyfield 1.55 + a **locally supplied, SHA-256 verified** NASA JPL DE440s SPK kernel; no auto-download or approximate fallback.
- Skyfield upper-limb sunrise/sunset for a local civil date and following sunrise; 50-arcminute convention recorded.
- Real geocentric lunar elongation, tithi number at local sunrise, and each tithi transition found numerically with subsecond solver tolerance. Output times UTC.
- Status always `calculated`, blockers always nonzero, unavailable limbs `null`. There are **no endorsed Wedding / Griha Pravesh / Vehicle Purchase** results here.
- Fast pure-Python mathematical unit tests runnable without JPL file.

## Run locally (research only)

```bash
cd engine
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m unittest discover -s tests -v
# Fetch DE440s directly from NASA/JPL under your own operational controls.
# Verify checksum from your trusted download before running.
sha256sum /path/to/de440s.bsp
python -m panchavani.compute \
  --city delhi --date 2026-10-13 \
  --ephemeris /path/to/de440s.bsp \
  --expected-sha256 <64_character_verified_sha256> \
  --out artifacts/delhi-2026-10-13-research.json
```

An empty/missing/wrong SPK, unsupported city, invalid interval, wrong checksum or missing dependency **aborts**. Never assume the numerical solver's 0.25s interval tolerance equals observational accuracy. Apparent horizon/refraction, reference frames, terrestrial coordinates and ritual methodology determine real uncertainty.

## What is intentionally missing before publication

1. Verified city gazetteer/coordinates, elevation/horizon metadata and pinned timezone database.
2. Independent real-data comparisons for hundreds of test dates/cities and adopted tolerances under matched conventions.
3. Fully validated **Lahiri Ayanamsa** (and nakshatra/yoga/karana); calculation outputs currently show `null` rather than invented values.
4. Vrat/festival regional rule packs, source review, and all Muhurat eligibility checks.
5. Signed/public release manifest, approved city content, publishing worker and SSG integration. No direct "publish" or zero-blocker override exists.

Do not copy data out of `artifacts/` onto public pages. Build private admin job processing and release gates separately.
