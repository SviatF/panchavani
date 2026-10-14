"""Sidereal Panchang mathematics and an explicitly UNVERIFIED research ayanamsa.

27 Nakshatra and 27 Nitya Yoga partitions are mathematically defined using
sidereal apparent geocentric Moon/Sun ecliptic longitudes. A sidereal ZERO
point (ayanamsa) requires independent validation; the proposed 1956 Lahiri
epoch anchor below is NOT claimed identical to the modern Rashtriya Panchang
or Swiss Ephemeris Lahiri implementation.
"""
from __future__ import annotations
from datetime import datetime, timezone
from math import atan2, cos, degrees, isfinite, radians, sin

from .core import wrap, utc

PART_WIDTH = 360.0 / 27.0
NAKSHATRA_NAMES = (
    "Ashwini","Bharani","Krittika","Rohini","Mrigashirsha","Ardra",
    "Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni",
    "Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha",
    "Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana",
    "Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"
)
YOGA_NAMES = (
    "Vishkambha","Priti","Ayushman","Saubhagya","Shobhana","Atiganda",
    "Sukarman","Dhriti","Shula","Ganda","Vriddhi","Dhruva","Vyaghata",
    "Harshana","Vajra","Siddhi","Vyatipata","Variyana","Parigha",
    "Shiva","Siddha","Sadhya","Shubha","Shukla","Brahma","Indra","Vaidhriti"
)

def _angle(value: float) -> float:
    if not isfinite(value):
        raise ValueError("Non-finite lunar/solar/ayanamsa input")
    return wrap(value)

def nakshatra_phase(moon_tropical: float, ayanamsa: float) -> float:
    return _angle(_angle(moon_tropical) - _angle(ayanamsa))

def yoga_phase(moon_tropical: float, sun_tropical: float, ayanamsa: float) -> float:
    return _angle(_angle(moon_tropical) + _angle(sun_tropical) - 2.0 * _angle(ayanamsa))

def nakshatra_index(sidereal_moon: float) -> int:
    return int(_angle(sidereal_moon) // PART_WIDTH) + 1

def yoga_index(sidereal_sum: float) -> int:
    return int(_angle(sidereal_sum) // PART_WIDTH) + 1

class LahiriEpochAnchorResearch:
    """JPL/Skyfield date-ecliptic projection using the IAE 1985-era anchor.

    A fixed inertial reference point is seeded at the *true ecliptic/equinox*
    of TT 1956-03-21 00:00 with 23°15'00.658". Subsequent ecliptic projection
    uses Skyfield IAU precession/nutation. This is only a candidate model; an
    independently calibrated Lahiri implementation is still REQUIRED before
    any public Nakshatra/Yoga values. Source: Swiss Ephemeris sidereal docs
    §2.8.5 (IAE 1985 anchor), NOT Swiss Ephemeris executable code.
    """
    ANCHOR_DEGREES = 23 + 15/60 + .658/3600
    METHOD_ID = "IAE-1985-Lahiri-anchor-fixed-ICRF-v0-RESEARCH-UNVALIDATED"

    def __init__(self, adapter):
        import numpy as np
        from skyfield.framelib import ecliptic_frame
        self.adapter = adapter
        self._frame = ecliptic_frame
        self._np = np
        anchor_time = adapter.ts.tt(1956,3,21,0,0,0)
        theta = radians(self.ANCHOR_DEGREES)
        self.reference_icrf = (ecliptic_frame.rotation_at(anchor_time).T @
                               np.array([cos(theta), sin(theta), 0.0]))

    def ayanamsa(self, instant: datetime) -> float:
        t = self.adapter._t(utc(instant))
        x, y, _ = self._frame.rotation_at(t) @ self.reference_icrf
        return wrap(degrees(atan2(y,x)))

    def longitudes(self, instant: datetime) -> tuple[float, float]:
        from skyfield.framelib import ecliptic_frame
        t = self.adapter._t(utc(instant))
        origin=self.adapter.eph["earth"].at(t)
        _,sun_lon,_=origin.observe(self.adapter.sun).apparent().frame_latlon(ecliptic_frame)
        _,moon_lon,_=origin.observe(self.adapter.eph["moon"]).apparent().frame_latlon(ecliptic_frame)
        return moon_lon.degrees, sun_lon.degrees

    def nakshatra_phase(self, instant: datetime) -> float:
        m, _ = self.longitudes(instant)
        return nakshatra_phase(m, self.ayanamsa(instant))

    def yoga_phase(self, instant: datetime) -> float:
        m, s = self.longitudes(instant)
        return yoga_phase(m, s, self.ayanamsa(instant))
