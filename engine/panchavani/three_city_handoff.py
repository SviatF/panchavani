"""Offline JPL 3-city research handoff (ONE file); no publication and no AI calls.

Produced by pinned NASA/JPL DE440s in GitHub Actions. A human can download
the exact JSON bundle and import it once through Cloudflare-Access admin,
bypassing ONLY the broken machine-to-machine Access hop, never authentication.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from .astronomy import SkyfieldAdapter
from .cities import CATALOG_SHA256, RESEARCH_CITIES
from .compute import calculate_with_verified_context, digest
from .research_batch import JPL_DE440S_SHA, inspect_candidate

CITY_IDS = ("delhi", "mumbai", "chennai")


def _digest(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def build_handoff(records: list[dict], *, source_sha: str, created_at: str) -> dict:
    if source_sha != JPL_DE440S_SHA:
        raise ValueError("Unexpected JPL kernel digest")
    if len(records) != len(CITY_IDS) or tuple(x.get("city", {}).get("id") for x in records) != CITY_IDS:
        raise ValueError("Exactly the three distinct cities in the fixed pilot order are required")
    dates = {x.get("localDate") for x in records}
    if len(dates) != 1:
        raise ValueError("Mixed local-date bundle is forbidden")
    solar_pairs = {(x.get('sun') or {}).get('sunriseUtc') for x in records}
    if len(solar_pairs) != 3:
        raise ValueError('Three locations must not share an invented sunrise')
    entries = []
    for record in records:
        if inspect_candidate(record):
            raise ValueError("Research record failed strict unapproved integrity QA")
        if record.get("approvedBy") is not None or record.get("releaseId") is not None:
            raise ValueError("Approved/published candidate passed to research handoff")
        if (record.get("methodology", {}).get("ephemerisHash") != JPL_DE440S_SHA
            or record.get("validation", {}).get("reviewStatus") != "not-reviewed"):
            raise ValueError("Unexpected scientific provenance/approval claim")
        raw = json.dumps(record, ensure_ascii=False, separators=(",", ":"))
        if len(raw.encode("utf-8")) > 200_000:
            raise ValueError("Research entry exceeds the private Worker limit")
        entries.append({
            "cityId": record["city"]["id"],
            "localDate": record["localDate"],
            "candidateSha256": _digest(raw),
            "candidateJson": raw,
        })
    ledger = "\n".join(f"{x['cityId']}:{x['localDate']}:{x['candidateSha256']}" for x in entries)
    return {
        "artifactType": "PANCHAVANI_PRIVATE_THREE_CITY_HANDOFF",
        "schemaVersion": 1,
        "status": "UNAPPROVED_RESEARCH",
        "releaseAuthorized": False,
        "indexingAuthorized": False,
        "modelInvocationAuthorized": False,
        "ephemerisSha256": JPL_DE440S_SHA,
        "catalogSha256": CATALOG_SHA256,
        "createdAtUtc": created_at,
        "localDate": next(iter(dates)),
        "bundleSha256": _digest(ledger),
        "entries": entries,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Offline 3-city research handoff; no AI or release")
    parser.add_argument("--ephemeris", type=Path, required=True)
    parser.add_argument("--date", default="", help="India local YYYY-MM-DD; default tomorrow")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    if args.out.exists():
        raise SystemExit("Cannot replace immutable handoff; choose a new path")
    if digest(args.ephemeris) != JPL_DE440S_SHA:
        raise SystemExit("Pinned NASA/JPL DE440s kernel checksum mismatch")
    from datetime import date, timezone
    local_day = (date.fromisoformat(args.date) if args.date
                 else datetime.now(ZoneInfo("Asia/Kolkata")).date()+timedelta(days=1))
    adapter = SkyfieldAdapter(args.ephemeris)
    records = [
        calculate_with_verified_context(
            city, local_day, adapter, JPL_DE440S_SHA, args.ephemeris.name
        ) for city in CITY_IDS
    ]
    bundle = build_handoff(
        records, source_sha=JPL_DE440S_SHA,
        created_at=datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
    )
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(bundle, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print("RESEARCH ONLY: 3 exact-JPL city candidates, 0 model calls, 0 releases.")
    print("Local date:",bundle["localDate"],"bundle SHA-256:",bundle["bundleSha256"])


if __name__ == "__main__":
    main()
