import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, createHash, randomUUID } from 'node:crypto';
import { candidateIssues, authorizeRunner, handleRunner } from '../src/runner.mjs';
const job={city_id:'delhi',local_date:'2026-10-13'};
function candidate(){
 const s='2026-10-13T00:50:00Z',t='2026-10-13T12:20:00Z',n='2026-10-14T00:50:00Z';
 return {
  schemaVersion:'1.0.0',recordId:'delhi:2026-10-13:abc123',
  status:'calculated',approvedBy:null,releaseId:null,
  city:{id:'delhi',catalogVersion:'pilot-unverified-v1'},localDate:'2026-10-13',
  methodology:{ephemerisHash:'a'.repeat(64),ayanamsa:'NOT_VALIDATED',rulePackId:'NONE'},
  validation:{blockerCount:4,reviewStatus:'not-reviewed'},
  panchangAtSunrise:{nakshatra:null,yoga:null,karana:null},
  sun:{sunriseUtc:s,sunsetUtc:t,nextSunriseUtc:n},
  transitions:[{type:'tithi',startUtc:s,endUtc:n,value:'Shukla Tritiya'}]
 };
}
test('valid separate Karana research interval passes while remaining unapproved',()=>{
 const c=candidate();
 c.panchangAtSunrise.karana='Bava';
 c.transitions.push({type:'karana',value:'Bava',startUtc:c.sun.sunriseUtc,endUtc:c.sun.nextSunriseUtc});
 assert.deepEqual(candidateIssues(c,job),[]);
});
test('fake Karana-at-sunrise is rejected',()=>{
 const c=candidate();
 c.panchangAtSunrise.karana='Fabricated';
 assert.ok(candidateIssues(c,job).includes('invalid-research-karana'));
});
test('Karana disagreement with Tithi boundary rejects candidate',()=>{
 const c=candidate(),s=c.sun.sunriseUtc,n=c.sun.nextSunriseUtc;
 c.transitions[0].endUtc='2026-10-13T12:00:00Z';
 c.transitions.push({type:'tithi',value:'Shukla Chaturthi',startUtc:'2026-10-13T12:00:00Z',endUtc:n});
 c.panchangAtSunrise.karana='Bava';
 c.transitions.push({type:'karana',value:'Bava',startUtc:s,endUtc:n});
 assert.ok(candidateIssues(c,job).includes('karana-tithi-mismatch'));
});
test('research-only candidate is permitted to STORE, never approved',()=>assert.deepEqual(candidateIssues(candidate(),job),[]));
test('fake completion with published flags is blocked',()=>{let c=candidate();c.status='approved';c.approvedBy='admin';assert.ok(candidateIssues(c,job).includes('published-or-approved-field'))});
test('candidate for the wrong city is blocked',()=>{let c=candidate();c.city.id='mumbai';assert.ok(candidateIssues(c,job).includes('job-mismatch'))});
test('missing unverified blockers is blocked',()=>{let c=candidate();c.validation.blockerCount=0;assert.ok(candidateIssues(c,job).includes('research-blockers-missing'))});
test('unvalidated Nakshatra claim is blocked',()=>{let c=candidate();c.panchangAtSunrise.nakshatra='Vishakha';assert.ok(candidateIssues(c,job).includes('unvalidated-limbs'))});
test('transition gap is blocked',()=>{let c=candidate();c.transitions[0].startUtc='2026-10-13T02:00:00Z';assert.ok(candidateIssues(c,job).includes('invalid-tithi-transitions'))});
test('wrong solar order is blocked',()=>{let c=candidate();c.sun.sunsetUtc='2026-10-12T02:00:00Z';assert.ok(candidateIssues(c,job).includes('invalid-solar-order'))});
class FakeDB {
 constructor(){this.used=new Set()}
 prepare(_sql){return {bind:(n)=>({run:async()=>({meta:{changes:this.used.has(n)?0:(this.used.add(n),1)}})})}}
}
function signed(secret,nonce,path,body='{}',timestamp=Date.now()){
 const hash=createHash('sha256').update(body).digest('hex');
 const message=timestamp+'\n'+nonce+'\nPOST\n'+path+'\n'+hash;
 const hmac=createHmac('sha256',secret).update(message).digest('hex');
 return new Request('https://admin.panchavani.com'+path,{method:'POST',headers:{'X-Panchavani-Timestamp':String(timestamp),'X-Panchavani-Nonce':nonce,'X-Panchavani-Signature':hmac},body});
}
test('valid runner HMAC accepted exactly once; replay rejected',async()=>{
 const secret='s'.repeat(50),db=new FakeDB(),env={DB:db,RUNNER_HMAC_SECRET:secret};
 const nonce=randomUUID();
 assert.equal(await authorizeRunner(signed(secret,nonce,'/internal/runner/claim'),env,'{}'),true);
 assert.equal(await authorizeRunner(signed(secret,nonce,'/internal/runner/claim'),env,'{}'),false);
});
test('runner HMAC fails closed if body differs',async()=>{
 const secret='s'.repeat(50),env={DB:new FakeDB(),RUNNER_HMAC_SECRET:secret};
 assert.equal(await authorizeRunner(signed(secret,randomUUID(),'/internal/runner/claim','{}'),env,'{"unexpected":true}'),false);
});
test('stale timestamp is rejected',async()=>{
 const secret='s'.repeat(50),env={DB:new FakeDB(),RUNNER_HMAC_SECRET:secret};
 assert.equal(await authorizeRunner(signed(secret,randomUUID(),'/internal/runner/claim','{}',Date.now()-10*60*1000),env,'{}'),false);
});
test('no bindings => runner endpoints unavailable and cannot publish',async()=>{
 const r=await handleRunner(new Request('https://admin.panchavani.com/internal/runner/claim',{method:'POST',body:'{}'}),{});
 assert.equal(r.status,503);assert.equal(r.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');
});
