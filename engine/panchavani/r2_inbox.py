"""GitHub Actions -> isolated private R2 INBOX without Cloudflare Access bypass.

Upload the manifest LAST; the Cloudflare private Worker pulls/validates data.
No production publication, scientific approval or model generation.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from pathlib import Path

JPL = "c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2"
BUCKET = "panchavani-jpl-research-inbox"


def sha(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def prepare(root: Path, run_id: str) -> tuple[dict, list[tuple[str, bytes]]]:
    if not re.fullmatch(r"[0-9]{6,20}", run_id):
        raise ValueError("GitHub Actions numeric run identifier required")
    coverage = json.loads((root / "coverage-UNAPPROVED.json").read_text())
    if coverage.get("status") != "RESEARCH_ONLY" or coverage.get("publicReleaseAllowed") is not False:
        raise ValueError("Cannot export anything resembling approved science")
    files = sorted(root.glob("downloaded-shards/*/nightly/research-report.json"))
    if len(files) != coverage["shards"]:
        raise ValueError("One or more research shards are absent")
    entries, objects, seen = [], [], set()
    for report_path in files:
        report = json.loads(report_path.read_text())
        if (report["catalogSha256"] != coverage["catalogSha256"]
            or report.get("researchOnly") is not True
            or report.get("publicReleaseAllowed") is not False):
            raise ValueError("Research report integrity violation")
        for item in report["candidates"]:
            city, day = item["city"], item["date"]
            if not re.fullmatch(r"[a-z][a-z0-9-]*", city) or not re.fullmatch(
                r"20\d\d-\d\d-\d\d", day):
                raise ValueError("Invalid city/day")
            identity = (city, day)
            if identity in seen:
                raise ValueError("Overlapping source shard city-day")
            seen.add(identity)
            source = (report_path.parent / item["file"]).resolve()
            if not source.is_relative_to(report_path.parent.resolve()):
                raise ValueError("Unsafe research artifact path")
            raw = source.read_bytes()
            if (len(raw) > 200_000 or sha(raw) != item["sha256"]
                or item["status"] != "UNAPPROVED" or item["publicationBlockers"] < 1):
                raise ValueError("Unapproved candidate checksum/status violation")
            content = json.loads(raw)
            if (content["city"]["id"] != city or content["localDate"] != day
                or content["status"] != "calculated"
                or content["approvedBy"] is not None or content["releaseId"] is not None
                or content["methodology"]["ephemerisHash"] != JPL
                or content["validation"]["blockerCount"] < 1):
                raise ValueError("Research content is not an eligible private candidate")
            key = f"inbox/records/{run_id}/{day}/{city}.json"
            entries.append({"cityId": city, "localDate": day,
                            "sha256": sha(raw), "key": key})
            objects.append((key, raw))
    if len(entries) != coverage["cityDays"]:
        raise ValueError("Incomplete city/day coverage")
    entries.sort(key=lambda x: (x["localDate"], x["cityId"]))
    return ({
        "schemaVersion": 1, "status": "UNAPPROVED_RESEARCH",
        "source": "panchavani-nightly-jpl-de440s", "runId": run_id,
        "ephemerisSha256": JPL,
        "catalogSha256": coverage["catalogSha256"],
        "publicationAuthorized": False, "indexingAuthorized": False,
        "modelInvocationAuthorized": False, "entryCount": len(entries),
        "entries": entries,
    }, objects)


def upload(manifest: dict, objects: list[tuple[str, bytes]]):
    import boto3
    from botocore.exceptions import ClientError
    account = os.environ["PANCHAVANI_R2_ACCOUNT_ID"]
    access_id = os.environ["PANCHAVANI_R2_ACCESS_KEY_ID"]
    secret = os.environ["PANCHAVANI_R2_SECRET_ACCESS_KEY"]
    if not re.fullmatch(r"[a-f0-9]{32}", account):
        raise ValueError("Invalid account identifier")
    client = boto3.client(
        "s3", endpoint_url=f"https://{account}.r2.cloudflarestorage.com",
        aws_access_key_id=access_id, aws_secret_access_key=secret,
        region_name="auto"
    )
    for key, raw in objects:
        try:
            found = client.head_object(Bucket=BUCKET, Key=key)
        except ClientError as exc:
            if exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode") != 404:
                raise
        else:
            if (found.get("Metadata", {}).get("sha256") != sha(raw)
                or found.get("ContentLength") != len(raw)):
                raise ValueError("Refusing to replace different staged science")
            continue
        client.put_object(Bucket=BUCKET, Key=key, Body=raw,
                          ContentType="application/json",
                          Metadata={"sha256": sha(raw), "approval": "none"})
    encoded = json.dumps(manifest, ensure_ascii=False, separators=(",", ":")).encode()
    key = f"inbox/manifests/{manifest['runId']}.json"
    # Completion manifest goes LAST, after all candidate objects are uploaded.
    client.put_object(Bucket=BUCKET, Key=key, Body=encoded,
                      ContentType="application/json",
                      Metadata={"sha256": sha(encoded), "approval": "none"})
    print(f"STAGED ONLY: {len(objects)} unapproved city-days, 0 published, 0 AI calls")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--root", type=Path, default=Path("."))
    p.add_argument("--run-id", required=True)
    p.add_argument("--upload", action="store_true")
    p.add_argument("--out", type=Path, default=Path("inbox-manifest-UNAPPROVED.json"))
    args = p.parse_args()
    manifest, objects = prepare(args.root, args.run_id)
    args.out.write_text(json.dumps(manifest, indent=2) + "\n")
    if args.upload:
        upload(manifest, objects)
    else:
        print(f"DRY RUN: {len(objects)} source-verified research records; no upload")


if __name__ == "__main__":
    main()
