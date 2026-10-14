"""Pure astronomical boundary mathematics; no data source or invented ephemerides.

Sun/Moon apparent geocentric longitude difference gives tithi phase. The
continuous root finder consumes values from an independent ephemeris provider.
All timestamps use timezone-aware UTC, never naive local clock values.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from math import floor, isfinite
from typing import Callable

UTC = timezone.utc
TITHI_NAMES = (
    "Pratipada", "Dvitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi",
    "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dvadashi",
    "Trayodashi", "Chaturdashi", "Purnima", "Pratipada", "Dvitiya",
    "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami",
    "Ashtami", "Navami", "Dashami", "Ekadashi", "Dvadashi",
    "Trayodashi", "Chaturdashi", "Amavasya",
)


@dataclass(frozen=True)
class Interval:
    start: datetime
    end: datetime
    number: int  # 1-indexed phase number


def utc(dt: datetime) -> datetime:
    if dt.tzinfo is None or dt.utcoffset() is None:
        raise ValueError("Naive datetime is forbidden; use an aware UTC instant")
    return dt.astimezone(UTC)


def wrap(degrees: float) -> float:
    if not isfinite(degrees):
        raise ValueError("Non-finite angle")
    return degrees % 360.0


def tithi_number(elongation_degrees: float) -> int:
    return floor(wrap(elongation_degrees) / 12.0) + 1


def tithi_title(number: int) -> str:
    if not 1 <= number <= 30:
        raise ValueError("Tithi outside 1..30")
    return ("Shukla " if number <= 15 else "Krishna ") + TITHI_NAMES[number - 1]


def _positive_motion(previous: float, current: float) -> float:
    # Unwrap a sampled cyclic angle without confusing 359° -> 1° with reversal.
    delta = (current - previous + 180) % 360 - 180
    if delta < -0.000001 or delta >= 90:
        raise ValueError("Angle provider not strictly increasing / step too large")
    return max(0.0, delta)


def _root(phase: Callable[[datetime], float], lo: datetime, hi: datetime,
          lo_angle: float, threshold: float, tolerance_seconds: float) -> datetime:
    # Root brackets must be measured against the SAME original phase anchor.
    # Updating the anchor to the moving low bound while retaining the initial
    # unwrapped offset biases arbitrary (non-midpoint) crossings.
    anchor_angle = wrap(phase(lo))
    for _ in range(80):
        if (hi - lo).total_seconds() <= tolerance_seconds:
            break
        mid = lo + (hi - lo) / 2
        unwrapped = lo_angle + _positive_motion(anchor_angle, wrap(phase(mid)))
        if unwrapped >= threshold:
            hi = mid
        else:
            lo = mid
    return lo + (hi - lo) / 2


def phase_intervals(phase: Callable[[datetime], float], start: datetime, end: datetime,
                    width: float, step_minutes: int = 30,
                    tolerance_seconds: float = 0.25) -> list[Interval]:
    """Find all advancing phase boundaries; return gap-free, ordered intervals.

    Supports 12° tithi and other fixed-width angular partitions. The astronomy
    callback must supply real ephemeris-based angles. This helper cannot
    independently establish the scientific accuracy of that callback.
    """
    start, end = utc(start), utc(end)
    if start >= end or not (0 < width <= 180) or 360.0 / width % 1 > 1e-8:
        raise ValueError("Invalid time window or angular partition")
    if not 1 <= step_minutes <= 120 or tolerance_seconds <= 0:
        raise ValueError("Invalid sampling or root tolerance")
    cursor, last = start, start
    initial = previous = wrap(phase(start))
    accumulated = initial
    number_of_parts = round(360 / width)
    current_number = floor(initial / width) % number_of_parts + 1
    result: list[Interval] = []
    while cursor < end:
        later = min(cursor + timedelta(minutes=step_minutes), end)
        raw = wrap(phase(later))
        next_angle = accumulated + _positive_motion(previous, raw)
        target_index = floor(accumulated / width) + 1
        while target_index * width <= next_angle + 1e-9:
            target = target_index * width
            boundary = _root(phase, cursor, later, accumulated, target, tolerance_seconds)
            if boundary <= last or boundary > later:
                raise ValueError("Non-increasing or out-of-range boundary")
            result.append(Interval(last, boundary, current_number))
            last = boundary
            current_number = current_number % number_of_parts + 1
            target_index += 1
        cursor, previous, accumulated = later, raw, next_angle
    if last < end:
        result.append(Interval(last, end, current_number))
    if not result or result[0].start != start or result[-1].end != end:
        raise AssertionError("Invalid segment coverage")
    if any(a.end != b.start for a, b in zip(result, result[1:])):
        raise AssertionError("Gap/overlap in segments")
    return result
