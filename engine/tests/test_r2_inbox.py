import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from panchavani.r2_inbox import JPL, prepare


class R2InboxTest(unittest.TestCase):
    def _fixture(self, root):
        folder = root / "downloaded-shards" / "test" / "nightly"
        folder.mkdir(parents=True)
        record = {
            "city": {"id": "delhi"}, "localDate": "2026-10-16",
            "status": "calculated", "approvedBy": None, "releaseId": None,
            "methodology": {"ephemerisHash": JPL},
            "validation": {"blockerCount": 4}
        }
        raw = (json.dumps(record) + "\n").encode()
        file = "2026-10-16-delhi-UNAPPROVED.json"
        (folder / file).write_bytes(raw)
        digest = hashlib.sha256(raw).hexdigest()
        catalog = "f" * 64
        report = {
            "catalogSha256": catalog, "researchOnly": True,
            "publicReleaseAllowed": False,
            "candidates": [{
                "city": "delhi", "date": "2026-10-16",
                "sha256": digest, "file": file, "status": "UNAPPROVED",
                "publicationBlockers": 4
            }]
        }
        (folder / "research-report.json").write_text(json.dumps(report))
        (root / "coverage-UNAPPROVED.json").write_text(json.dumps({
            "status": "RESEARCH_ONLY", "publicReleaseAllowed": False,
            "catalogSha256": catalog, "shards": 1, "cityDays": 1
        }))
        return folder, file

    def test_complete_manifest_and_exact_raw_checksum(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            folder, filename = self._fixture(root)
            manifest, objects = prepare(root, "38787691998")
            self.assertEqual(manifest["entryCount"], 1)
            self.assertEqual(manifest["modelInvocationAuthorized"], False)
            self.assertEqual(manifest["publicationAuthorized"], False)
            self.assertEqual(manifest["entries"][0]["cityId"], "delhi")
            self.assertEqual(objects[0][1], (folder / filename).read_bytes())

    def test_sha_tampering_fails_closed(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            folder, filename = self._fixture(root)
            (folder / filename).write_bytes(b"altered")
            with self.assertRaises(ValueError):
                prepare(root, "38787691998")

    def test_missing_shard_and_unsafe_run_id_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            self._fixture(root)
            with self.assertRaises(ValueError):
                prepare(root, "../evil")
            (root / "coverage-UNAPPROVED.json").write_text(json.dumps({
                "status": "RESEARCH_ONLY", "publicReleaseAllowed": False,
                "catalogSha256": "f"*64, "shards": 2, "cityDays": 1
            }))
            with self.assertRaises(ValueError):
                prepare(root, "38787691998")


if __name__ == "__main__":
    unittest.main()
