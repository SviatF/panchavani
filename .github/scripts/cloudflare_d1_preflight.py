#!/usr/bin/env python3
"""Fail-closed, read-only Cloudflare D1 account preflight for GitHub Actions.

Credentials are read only from environment; nothing about tokens, account IDs
or API response bodies is emitted to stdout/stderr/GITHUB_STEP_SUMMARY.
Does not apply migrations or deploy a Worker.
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request

DB_ID = "38a2e5ce-b378-48f9-8efd-cbd309a770b7"
UUID = re.compile(r"^[0-9a-f]{32}$|^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$", re.I)

def cloudflare_read(path, token, opener=urllib.request.urlopen):
    req = urllib.request.Request(
        "https://api.cloudflare.com/client/v4" + path,
        headers={"Authorization": "Bearer " + token, "Accept": "application/json"},
        method="GET",
    )
    try:
        with opener(req, timeout=20) as response:
            if response.status != 200:
                return (False, "unexpected-http-status")
            payload = json.load(response)
    except urllib.error.HTTPError as exc:
        # Never include the provider response body, account ID or token.
        return (False, "http-" + str(exc.code))
    except (urllib.error.URLError, TimeoutError, ValueError):
        return (False, "unavailable-or-invalid-json")
    if not isinstance(payload, dict) or payload.get("success") is not True:
        return (False, "cloudflare-denied-request")
    return (True, payload.get("result"))

def preflight(env, opener=urllib.request.urlopen):
    account = env.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
    token = env.get("CLOUDFLARE_API_TOKEN", "").strip()
    if not UUID.fullmatch(account) or len(token) < 20:
        return False, "Missing or malformed Cloudflare account ID/API token in GitHub Actions secrets."
    # Cloudflare has DIFFERENT verification endpoints for user-owned and
    # account-owned tokens. A real account token can return HTTP 401 against
    # /user/tokens/verify while remaining valid for Wrangler/D1.
    # New cfat_ tokens prefer account verify; legacy unprefixed tokens try both.
    account_verify = "/accounts/" + account + "/tokens/verify"
    paths = ([account_verify, "/user/tokens/verify"] if token.startswith("cfat_")
             else ["/user/tokens/verify", account_verify])
    results = []
    verified = None
    for path in paths:
        ok, detail = cloudflare_read(path, token, opener)
        if ok:
            verified = detail
            break
        results.append(detail)
    if verified is None:
        return False, ("Both Cloudflare user/account token verification endpoints denied "
                       "the configured token (" + ", ".join(results) + "). "
                       "Check type, account ownership, expiry and GitHub secret value.")
    if not isinstance(verified, dict) or verified.get("status") != "active":
        return False, "Cloudflare API token is not active."
    ok, detail = cloudflare_read("/accounts/" + account + "/d1/database/" + DB_ID, token, opener)
    if not ok:
        return False, ("D1 account/database access denied (" + detail + "). "
                       "Confirm CLOUDFLARE_ACCOUNT_ID owns panchavani-private "
                       "and the API token has D1 Read/Edit for that account.")
    if not isinstance(detail, dict) or detail.get("uuid") != DB_ID or detail.get("name") != "panchavani-private":
        return False, "Cloudflare D1 API returned a different database identity; do not migrate."
    r2_account = env.get("PANCHAVANI_R2_ACCOUNT_ID", "").strip()
    if r2_account and r2_account != account:
        return False, ("Cloudflare account and R2 account secrets do not match; "
                       "confirm intended account and storage ownership before deployment.")
    return True, "Cloudflare API token active; exactly pinned private D1 is accessible (read-only preflight)."

def main():
    good, message = preflight(os.environ)
    print(("PASS: " if good else "BLOCKED: ") + message)
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as f:
            f.write("### Cloudflare private D1 deployment preflight\n\n")
            f.write(("PASS: " if good else "BLOCKED: ") + message + "\n\n")
            f.write("No databases were modified or credentials revealed by this check.\n")
    sys.exit(0 if good else 1)

if __name__ == "__main__":
    main()
