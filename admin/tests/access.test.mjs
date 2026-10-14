import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { authenticate, isTrustedBrowserPost } from '../src/index.mjs';
const env = { ALLOWED_ADMIN_EMAILS: 'owner@example.test' };
const identity = email => ({ access: { getIdentity: async () => ({ email }) } });
test('Cloudflare-native identity permits the allowlisted account', async () => {
 assert.equal(await authenticate(identity('OWNER@example.test'), env), 'owner@example.test');
 const response = await worker.fetch(new Request('https://admin.panchavani.com/api/status'), env, identity('owner@example.test'));
 assert.equal(response.status, 200);
 assert.equal((await response.json()).privacy, 'authenticated');
});
test('missing Cloudflare Access identity fails closed even if client spoofs email and JWT headers', async () => {
 const req = new Request('https://admin.panchavani.com/api/status', {headers:{
  'Cf-Access-Authenticated-User-Email':'owner@example.test',
  'Cf-Access-Jwt-Assertion':'fake.jwt.token'
 }});
 const res = await worker.fetch(req, env, {});
 assert.equal(res.status, 403);
 assert.equal(await res.text(), 'Access denied');
});
test('a different authenticated email is blocked',async()=>{
 assert.equal(await authenticate(identity('outsider@example.test'),env),null);
 const res=await worker.fetch(new Request('https://admin.panchavani.com/'), env, identity('outsider@example.test'));
 assert.equal(res.status,403);
});
test('missing allowlist blocks any identity',async()=>{
 assert.equal(await authenticate(identity('owner@example.test'),{}),null);
});
test('invalid or errored Cloudflare Access identity fails closed',async()=>{
 assert.equal(await authenticate({access:{getIdentity:async()=>{throw new Error('unavailable')}}},env),null);
 assert.equal(await authenticate({access:{getIdentity:async()=>({})}},env),null);
 assert.equal(await authenticate({access:{}},env),null);
});

test('same-origin form with Origin but no fetch metadata passes the CSRF gate', () => {
 const req = new Request('https://admin.panchavani.com/jobs', {method:'POST',headers:{Origin:'https://admin.panchavani.com'},body:'city=delhi&date=2026-10-13'});
 assert.equal(isTrustedBrowserPost(req), true);
});
test('same-origin browser form with null/missing Origin is allowed only with trustworthy fetch metadata', () => {
 const make = headers => new Request('https://admin.panchavani.com/jobs',{method:'POST',headers,body:'city=delhi&date=2026-10-13'});
 assert.equal(isTrustedBrowserPost(make({'Origin':'null','Sec-Fetch-Site':'same-origin'})),true);
 assert.equal(isTrustedBrowserPost(make({'Sec-Fetch-Site':'same-origin'})),true);
 assert.equal(isTrustedBrowserPost(make({'Origin':'null'})),false);
 assert.equal(isTrustedBrowserPost(make({})),false);
});
test('cross-site and sibling-subdomain POSTs stay blocked even with a forged origin', () => {
 const make = headers => new Request('https://admin.panchavani.com/jobs',{method:'POST',headers,body:'city=delhi&date=2026-10-13'});
 assert.equal(isTrustedBrowserPost(make({'Origin':'https://evil.example','Sec-Fetch-Site':'cross-site'})),false);
 assert.equal(isTrustedBrowserPost(make({'Origin':'https://admin.panchavani.com','Sec-Fetch-Site':'same-site'})),false);
 assert.equal(isTrustedBrowserPost(make({'Origin':'https://evil.example','Sec-Fetch-Site':'same-origin'})),false);
 assert.equal(isTrustedBrowserPost(make({'Origin':'null','Sec-Fetch-Site':'none'})),false);
});
test('queue submit by allowed Access identity + same-origin form saves in D1 and redirects to dashboard', async () => {
 let batches=0;
 const fakeDb={batch:async(statements)=>{batches++; assert.equal(statements.length,2);return [{success:true},{success:true}]} ,prepare:sql=>({bind:(...args)=>({sql,args})})};
 const req=new Request('https://admin.panchavani.com/jobs',{method:'POST',
  headers:{'Origin':'null','Sec-Fetch-Site':'same-origin','Content-Type':'application/x-www-form-urlencoded'},
  body:'city=delhi&date=2026-10-13'});
 const res=await worker.fetch(req,{...env,DB:fakeDb},identity('owner@example.test'));
 assert.equal(res.status,303);
 assert.equal(res.headers.get('Location'),'/');
 assert.equal(batches,1);
});
test('malicious browser cross-site form cannot enqueue even for authenticated identity', async () => {
 let touched=false;
 const req=new Request('https://admin.panchavani.com/jobs',{method:'POST',
  headers:{'Origin':'https://malicious.example','Sec-Fetch-Site':'cross-site','Content-Type':'application/x-www-form-urlencoded'},
  body:'city=delhi&date=2026-10-13'});
 const res=await worker.fetch(req,{...env,DB:{batch:async()=>{touched=true}}},identity('owner@example.test'));
 assert.equal(res.status,403);
 assert.match(await res.text(),/same-origin security check/);
 assert.equal(touched,false);
});
