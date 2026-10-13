"""Check candidates against externally cited research values, without approving.

These tolerance checks are NOT sufficient evidence of trusted methodology,
ritual/calendar correctness, SEO uniqueness or publication suitability.
"""
from __future__ import annotations

import argparse
from datetime import datetime, date, time
import json
from pathlib import Path
from zoneinfo import ZoneInfo


def to_local(utc_time: str, timezone: str) -> datetime:
    return datetime.fromisoformat(utc_time.replace('Z', '+00:00')).astimezone(ZoneInfo(timezone))


def local_at(local_date: str, value: str, tz: ZoneInfo) -> datetime:
    if len(value) not in (5, 8):
        raise ValueError(f'Invalid reference time: {value!r}')
    h, minute, *seconds = (int(v) for v in value.split(':'))
    return datetime.combine(date.fromisoformat(local_date), time(h, minute, seconds[0] if seconds else 0), tzinfo=tz)


def compare(record: dict, fixture: dict) -> list[dict]:
    if record['city']['id'] != fixture['city'] or record['localDate'] != fixture['date']:
        raise ValueError('Fixture does not match candidate city/date')
    if record['city']['tz'] != fixture['timezone']:
        raise ValueError('Fixture timezone differs from candidate')
    if not fixture.get('sources') or len(fixture['sources']) < 2:
        raise ValueError('At least two cited comparative research sources required')
    segments = record['transitions']
    if not segments or segments[0]['type'] != 'tithi' or 'Tritiya' not in segments[0]['value']:
        raise ValueError('Unexpected source record or tithi transition')
    tz=ZoneInfo(fixture['timezone'])
    readings = {
        'sunrise': to_local(record['sun']['sunriseUtc'], fixture['timezone']),
        'sunset': to_local(record['sun']['sunsetUtc'], fixture['timezone']),
        'tithi_end': to_local(segments[0]['endUtc'], fixture['timezone']),
    }
    out=[]
    for reference in fixture['sources']:
        if not reference.get('url', '').startswith('https://'):
            raise ValueError('Source URL must be documented')
        for key, observed in readings.items():
            expected = local_at(fixture['date'], reference[key], tz)
            error_seconds = round((observed - expected).total_seconds(), 3)
            out.append({'source': reference['name'], 'metric': key, 'deltaSeconds': error_seconds,
                        'limitSeconds': fixture['tolerance_seconds'],
                        'withinResearchTolerance': abs(error_seconds) <= fixture['tolerance_seconds']})
    return out


def main() -> None:
    p=argparse.ArgumentParser(description='External consistency check ONLY, never publication')
    p.add_argument('--candidate', required=True, type=Path)
    p.add_argument('--fixture', required=True, type=Path)
    args=p.parse_args()
    results=compare(json.loads(args.candidate.read_text()), json.loads(args.fixture.read_text()))
    for r in results:
        print(f"{r['source']} {r['metric']} delta={r['deltaSeconds']}s within-research-tolerance={r['withinResearchTolerance']}")
    if not all(r['withinResearchTolerance'] for r in results):
        raise SystemExit('Research comparison FAILED; no approval')
    print('Research comparators within tolerance. Candidate remains UNAPPROVED. Methods and sources need independent review.')


if __name__ == '__main__':
    main()
