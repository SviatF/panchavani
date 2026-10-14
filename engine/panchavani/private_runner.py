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
        raise RunnerError(f'Private admin rejected request: HTTP {exc.code}') from exc
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
    args=parser.parse_args()
    if not args.ephemeris.is_file():
        raise SystemExit('Pinned JPL ephemeris file missing')
    run_once(args.ephemeris)

if __name__=='__main__':
    main()
