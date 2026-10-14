"""Skyfield/JPL adapter. Raises if real ephemeris inputs are unavailable.

No approximate fallback. No silent web download. A pre-fetched, independently
SHA-256-pinned JPL DE440s file is REQUIRED by the CLI.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from .cities import City

UTC = timezone.utc

# USNO/Skyfield conventional sunrise/sunset: apparent solar center
# 50 arcminutes below a *level mathematical horizon*. A physical
# topographic/sea horizon and atmospheric conditions require separate review.
STANDARD_SOLAR_HORIZON_DEGREES = -50.0 / 60.0


class SkyfieldAdapter:
    def __init__(self, ephemeris: Path):
        from skyfield.api import load, load_file  # intentionally optional until installed
        self.eph = load_file(str(ephemeris))
        self.ts = load.timescale(builtin=True)
        self.sun = self.eph["sun"]

    def _t(self, dt: datetime):
        return self.ts.from_datetime(dt.astimezone(UTC))

    def elongation(self, instant: datetime) -> float:
        from skyfield import almanac
        return float(almanac.moon_phase(self.eph, self._t(instant)).degrees)

    def _solar_event(self, city: City, date_local: date, rising: bool, *,
                     horizon_degrees: float = STANDARD_SOLAR_HORIZON_DEGREES) -> datetime:
        from skyfield import almanac
        from skyfield.api import wgs84
        from math import isfinite
        if not isinstance(horizon_degrees, (int, float)) or not isfinite(horizon_degrees):
            raise ValueError("Solar horizon altitude must be finite")
        if not -2.0 <= horizon_degrees <= 1.0:
            raise ValueError("Solar research horizon outside bounded test range")
        tz = ZoneInfo(city.timezone)
        lo = datetime(date_local.year, date_local.month, date_local.day, tzinfo=tz)
        hi_date = date_local + timedelta(days=1)
        hi = datetime(hi_date.year, hi_date.month, hi_date.day, tzinfo=tz)
        observer = self.eph["earth"] + wgs84.latlon(city.latitude, city.longitude, elevation_m=city.elevation_m)
        f = almanac.find_risings if rising else almanac.find_settings
        times, good = f(observer, self.sun, self._t(lo), self._t(hi), horizon_degrees=horizon_degrees)
        actual = [t.utc_datetime().astimezone(UTC) for t, ok in zip(times, good) if bool(ok)]
        if len(actual) != 1:
            raise ValueError(f"Ambiguous/missing local {'sunrise' if rising else 'sunset'} for {city.id} on {date_local}")
        return actual[0]

    def solar_day(self, city: City, local_date: date, *,
                  horizon_degrees: float = STANDARD_SOLAR_HORIZON_DEGREES):
        sunrise = self._solar_event(city, local_date, True, horizon_degrees=horizon_degrees)
        sunset = self._solar_event(city, local_date, False, horizon_degrees=horizon_degrees)
        following = self._solar_event(city, local_date + timedelta(days=1), True,
                                       horizon_degrees=horizon_degrees)
        if not sunrise < sunset < following:
            raise ValueError("Unexpected sunrise/sunset ordering; calculation blocked")
        return sunrise, sunset, following
