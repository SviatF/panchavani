"""One-job-at-a-time private research runner. Never approves, recommends or publishes.

Runs only from an authenticated research environment with Cloudflare Access service
credentials and a *separate* HMAC key. All candidate outputs remain unapproved.
"""
from __future__ import annotations
import argparse
import hashlib
import hmac
import json
import os
import sys
import time
import uuid
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError, URLError
from .compute import calculate
from .cities import RESEARCH_CITIES

PINNED_JPL_SHA256 = 'c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2'

class RunnerError(RuntimeError):
    pass

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RunnerError('Unexpected redirect while sending private credentials')

def _signed_headers(secret: str, method: str, path: str, data: bytes) -> dict[str,str]:
    timestamp = str(int(time.time()*1000))
    nonce = str(uuid.uuid4())
    digest = hashlib.sha256(data).hexdigest()
    signing = '\n'.join((timestamp,nonce,method,path,digest)).encode()
    signature = hmac.new(secret.encode(),signing,hashlib.sha256).hexdigest()
    return {
        'X-Panchavani-Timestamp':timestamp,
        'X-Panchavani-Nonce':nonce,
        'X-Panchavani-Signature':signature,
    }

def post(base: str, path: str, data: dict, *, hmac_key: str, access_id: str, access_secret: str) -> dict:
    parsed = urlsplit(base)
    if (parsed.scheme!='https' or parsed.hostname!='admin.panchavani.com'
        or parsed.username or parsed.password or parsed.path not in ('','/')
        or parsed.query or parsed.fragment):
        raise RunnerError('Runner requires exact protected https://admin.panchavani.com origin')
    raw = json.dumps(data, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    headers = _signed_headers(hmac_key,'POST',path,raw)
    headers.update({
        'Content-Type':'application/json',
        'CF-Access-Client-Id':access_id,
        'CF-Access-Client-Secret':access_secret,
    })
    req=Request(base.rstrip('/')+path,data=raw,headers=headers,method='POST')
    try:
        with build_opener(NoRedirect).open(req,timeout=45) as res:
            result=json.loads(res.read(512_000))
            if not isinstance(result,dict):
                raise RunnerError('Invalid API response')
            return result
    except HTTPError as exc:
        # Do not log response bodies or headers: they may contain private data.
        # The Worker returns an application/json error with a small fixed code;
        # Cloudflare Access (or another edge rule) generally returns non-JSON.
        media_type = (exc.headers.get('Content-Type', '') or '').split(';', 1)[0].strip().lower()
        if media_type != 'application/json':
            reason = 'non_json_rejection_check_Cloudflare_Access_or_edge'
        else:
            try:
                payload = json.loads(exc.read(4096))
            except (ValueError, UnicodeError):
                payload = None
            allowed_codes = {
                'access_denied', 'runner_not_configured', 'not_found',
                'payload_too_large', 'invalid_json', 'unexpected_claim_body',
                'invalid_lease', 'lease_conflict', 'invalid_failure_code',
                'candidate_rejected', 'candidate_too_large',
                'lease_conflict_after_store', 'private_storage_unavailable',
            }
            candidate = payload.get('error') if isinstance(payload, dict) else None
            reason = candidate if candidate in allowed_codes else 'unknown_private_api_error'
        raise RunnerError(f'Private admin rejected request: HTTP {exc.code}; diagnostic={reason}') from None
    except URLError as exc:
        raise RunnerError('Private admin unavailable') from exc

def run_once(ephemeris: Path) -> bool:
    required=('PANCHAVANI_ADMIN_URL','PANCHAVANI_RUNNER_HMAC_SECRET','CF_ACCESS_CLIENT_ID','CF_ACCESS_CLIENT_SECRET')
    if any(not os.environ.get(k) for k in required):
        raise RunnerError('Private runner credentials are missing; do not execute')
    if len(os.environ['PANCHAVANI_RUNNER_HMAC_SECRET']) < 32:
        raise RunnerError('Research HMAC key too short')
    kwargs={
        'base':os.environ['PANCHAVANI_ADMIN_URL'],
        'hmac_key':os.environ['PANCHAVANI_RUNNER_HMAC_SECRET'],
        'access_id':os.environ['CF_ACCESS_CLIENT_ID'],
        'access_secret':os.environ['CF_ACCESS_CLIENT_SECRET'],
    }
    claim=post(path='/internal/runner/claim',data={},**kwargs)
    job=claim.get('job')
    if not job:
        print('Private runner: no queued jobs')
        return False
    job_id=job['id']
    lease=job['leaseToken']
    try:
        city=job['city_id']
        if city not in RESEARCH_CITIES:
            raise ValueError('Unsupported QA city')
        record=calculate(city,date.fromisoformat(job['local_date']),ephemeris,PINNED_JPL_SHA256)
        if record['status']!='calculated' or record['validation']['blockerCount']<1:
            raise ValueError('Research-only candidate assertion failed')
        response=post(path='/internal/runner/complete',data={'jobId':job_id,'leaseToken':lease,'candidate':record},**kwargs)
        if response.get('status')!='candidate' or response.get('publishing')!='disabled':
            raise RunnerError('Candidate not confirmed as private research artifact')
        print('Private runner stored an unapproved SHA-256 candidate for',city,job['local_date'])
        return True
    except Exception as exc:
        code='CALCULATION_ERROR'
        if 'SHA-256' in str(exc):
            code='EPHEMERIS_HASH_MISMATCH'
        elif isinstance(exc,RunnerError):
            code='RESULT_REJECTED'
        print('Research task failed safely:',type(exc).__name__,file=sys.stderr)
        try:
            post(path='/internal/runner/fail',data={'jobId':job_id,'leaseToken':lease,'code':code},**kwargs)
        except Exception:
            print('Failed to update job status; manual review of stale running lease required.',file=sys.stderr)
        raise

def main():
    parser=argparse.ArgumentParser(description='Private research candidate worker — never publish results')
    parser.add_argument('--ephemeris',type=Path,required=True)
    parser.add_argument('--max-jobs',type=int,default=1,
                        help='At most three private queued records per invocation')
    args=parser.parse_args()
    if not 1 <= args.max_jobs <= 3:
        raise SystemExit('Research runner maximum job count must be 1..3')
    if not args.ephemeris.is_file():
        raise SystemExit('Pinned JPL ephemeris file missing')
    processed=0
    for _ in range(args.max_jobs):
        if not run_once(args.ephemeris):
            break
        processed+=1
    print('Private research jobs processed:',processed,'/ approved releases: 0')

if __name__=='__main__':
    main()
