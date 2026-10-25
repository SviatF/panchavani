import importlib.util
import json
from pathlib import Path
import unittest
import urllib.error

spec = importlib.util.spec_from_file_location(
    "cloudflare_preflight", Path(__file__).with_name("cloudflare_d1_preflight.py"))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

ACCOUNT = "11111111-1111-1111-1111-111111111111"
ENV = {"CLOUDFLARE_ACCOUNT_ID":ACCOUNT,
       "CLOUDFLARE_API_TOKEN":"x"*32,
       "PANCHAVANI_R2_ACCOUNT_ID":ACCOUNT}

class FakeResponse:
    status = 200
    def __init__(self, data): self.data = json.dumps(data).encode()
    def read(self, *_): return self.data
    def __enter__(self): return self
    def __exit__(self, *_): pass

def fake_open(request,timeout=20):
    path = request.full_url
    if path.endswith("/user/tokens/verify"):
        return FakeResponse({"success":True,"result":{"status":"active"}})
    if path.endswith("/d1/database/" + mod.DB_ID):
        return FakeResponse({"success":True,"result":{
            "uuid":mod.DB_ID,"name":"panchavani-private"}})
    raise AssertionError("Unexpected Cloudflare path")

class PreflightTests(unittest.TestCase):
    def test_exact_database_confirmed(self):
        self.assertTrue(mod.preflight(ENV,fake_open)[0])
    def test_no_secrets_or_account_id_in_our_diagnostics(self):
        def denied(req,timeout=20):
            raise urllib.error.HTTPError(req.full_url,7403,"denied",{},None)
        success, reason=mod.preflight(ENV,denied)
        self.assertFalse(success)
        self.assertIn("http-7403",reason)
        self.assertNotIn(ACCOUNT,reason)
        self.assertNotIn(ENV["CLOUDFLARE_API_TOKEN"],reason)
    def test_mismatched_account_refused(self):
        env={**ENV,"PANCHAVANI_R2_ACCOUNT_ID":"22222222-2222-2222-2222-222222222222"}
        self.assertFalse(mod.preflight(env,fake_open)[0])
    def test_wrong_database_identity_refused(self):
        def wrong(req,timeout=20):
            if req.full_url.endswith("/verify"): return fake_open(req,timeout)
            return FakeResponse({"success":True,"result":{"uuid":mod.DB_ID,"name":"another"}})
        self.assertFalse(mod.preflight(ENV,wrong)[0])
    def test_inactive_token_refused(self):
        def inactive(req,timeout=20):
            return FakeResponse({"success":True,"result":{"status":"disabled"}})
        self.assertFalse(mod.preflight(ENV,inactive)[0])
    def test_missing_keys_refused_without_api_call(self):
        self.assertFalse(mod.preflight({},lambda *_:self.fail("No requests"))[0])

if __name__=="__main__":
    unittest.main()
