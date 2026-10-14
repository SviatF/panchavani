"""Deterministic Karana cycle and city-specific daylight windows.

Research only: accurate inputs and independently reviewed ritual conventions
are required before these intervals become trusted public data.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from .core import utc, wrap

REPEATING_KARANAS = ("Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti")
FIXED_KARANAS = {1: "Kimstughna", 58: "Shakuni", 59: "Chatushpada", 60: "Naga"}

# Monday=0 ... Sunday=6; 1-indexed eighth of daylight.
DAY_PARTS = {
    "rahu-kalam": (2, 7, 5, 6, 4, 3, 8),
    "yamaganda": (4, 3, 2, 1, 7, 6, 5),
    "gulika": (6, 5, 4, 3, 2, 1, 7),
}
WINDOW_LABELS = {
    "rahu-kalam": "Rahu Kalam",
    "yamaganda": "Yamaganda",
    "gulika": "Gulika",
}

@dataclass(frozen=True)
class DayWindow:
    kind: str
    start: datetime
    end: datetime
    part: int

def karana_number(elongation_deg: float) -> int:
    """1..60 karana index, based on Sun–Moon elongation."""
    return int(wrap(elongation_deg) // 6.0) + 1

def karana_title(number: int) -> str:
    if not isinstance(number, int) or not 1 <= number <= 60:
        raise ValueError("Karana index outside 1..60")
    return FIXED_KARANAS.get(number, REPEATING_KARANAS[(number - 2) % 7])

def daylight_windows(sunrise: datetime, sunset: datetime, weekday: int) -> list[DayWindow]:
    """Take independently calculated sunrise/sunset; divide the day into eighths."""
    sunrise, sunset = utc(sunrise), utc(sunset)
    if not isinstance(weekday, int) or weekday not in range(7):
        raise ValueError("Weekday must be Monday=0..Sunday=6")
    seconds = (sunset - sunrise).total_seconds()
    if not 0 < seconds <= 86400:
        raise ValueError("Impossible daylight interval")
    return [
        DayWindow(name,
                  sunrise + timedelta(seconds=seconds * (parts[weekday] - 1) / 8),
                  sunrise + timedelta(seconds=seconds * parts[weekday] / 8),
                  parts[weekday])
        for name, parts in DAY_PARTS.items()
    ]
