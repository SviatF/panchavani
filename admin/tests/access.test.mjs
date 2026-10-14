import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { authenticate } from '../src/index.mjs';
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
