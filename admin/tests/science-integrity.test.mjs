import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import worker from '../src/index.mjs';
import {CITY_META,CATALOG_VERSION} from '../src/city-catalog.mjs';
import {auditResearchCandidate} from '../src/science-integrity.mjs';
const city=CITY_META.get('delhi'),date='2026-10-16';
const s='2026-10-16T00:50:00Z',t='2026-10-16T12:20:00Z';
const mid='2026-10-16T09:45:00Z',n='2026-10-17T00:50:00Z';
const sha='a'.repeat(64);
function candidate(){
 return {schemaVersion:'1.0.0',recordId:'delhi:2026-10-16:research',
  city:{id:'delhi',name:city.name,lat:city.latitude,lon:city.longitude,
   elevationMeters:city.elevationMeters,tz:city.timezone,catalogVersion:CATALOG_VERSION},
  localDate:date,status:'calculated',approvedBy:null,releaseId:null,
  methodology:{ephemerisHash:'c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2',
   ayanamsa:'NOT_VALIDATED',rulePackId:'NONE',sunriseConvention:'research'},
  validation:{blockerCount:4,reviewStatus:'not-reviewed'},
  sun:{sunriseUtc:s,sunsetUtc:t,nextSunriseUtc:n},
  panchangAtSunrise:{tithi:'Shukla Panchami',karana:'Bava',paksha:'Shukla',
    vara:'Friday',nakshatra:null,yoga:null},
  transitions:[
   {type:'tithi',value:'Shukla Panchami',startUtc:s,endUtc:n},
   {type:'karana',value:'Bava',startUtc:s,endUtc:mid},
   {type:'karana',value:'Balava',startUtc:mid,endUtc:n}
  ]};
}
test('A coherent private sample passes INTERNAL checks, never scientific or SEO approval',()=>{
 const r=auditResearchCandidate(candidate(),sha);
 assert.equal(r.status,'INTERNAL_CONSISTENCY_PASS');
 assert.ok(r.checks.length>=10);
 assert.equal(r.issues.length,0);
 assert.equal(r.independentScienceVerified,false);
 assert.equal(r.scientificApproval,false);
 assert.equal(r.paidEditorialGenerationAuthorized,false);
 assert.equal(r.publicIndexingAuthorized,false);
 assert.deepEqual(r.approvedClaimsForDeepSeek,[]);
 assert.ok(r.externalEvidenceBlockers.length>=5);
});
test('tampered weekday, Paksha, Karana cycle, Tithi ordinal and local date are caught separately',()=>{
 for(const [tamper,issue] of [
  [r=>{r.panchangAtSunrise.vara='Monday'},'weekday-vara'],
  [r=>{r.panchangAtSunrise.paksha='Krishna'},'tithi-paksha-sunrise'],
  [r=>{r.transitions[1].value='Vishti';r.panchangAtSunrise.karana='Vishti'},'karana-ordinal-progression'],
  [r=>{r.transitions.push({type:'tithi',value:'Shukla Dashami',startUtc:mid,endUtc:n});
       r.transitions[0].endUtc=mid},'tithi-ordinal-progression'],
  [r=>{r.sun.sunriseUtc='2026-10-15T00:50:00Z';
       r.transitions[0].startUtc='2026-10-15T00:50:00Z';
       r.transitions[1].startUtc='2026-10-15T00:50:00Z'},'local-sunrise-day']
 ]){
  const obj=candidate();tamper(obj);
  const audit=auditResearchCandidate(obj,sha);
  assert.ok(audit.issues.includes(issue),issue+': '+audit.issues.join(','));
  assert.equal(audit.scientificApproval,false);
  assert.equal(audit.approvedClaimsForDeepSeek.length,0);
 }
});
test('Karana/Tithi crossing must have a matching 6-degree boundary',()=>{
 const r=candidate();
 r.transitions[0].endUtc=mid;
 r.transitions.push({type:'tithi',value:'Shukla Shashthi',startUtc:mid,endUtc:n});
 r.transitions[2].startUtc='2026-10-16T08:00:00Z';
 r.transitions[1].endUtc='2026-10-16T08:00:00Z';
 const report=auditResearchCandidate(r,sha);
 assert.ok(report.issues.includes('tithi-karana-crossings'));
});
test('Only authenticated Cloudflare Access can view exact SHA-verified real research report',async()=>{
 const raw=JSON.stringify(candidate()),hash=createHash('sha256').update(raw).digest('hex');
 let calls=0;
 const env={ALLOWED_ADMIN_EMAILS:'owner@example.test',
  DB:{prepare(sql){calls++;return{bind(cityId,localDate){
   assert.equal(cityId,'delhi');assert.equal(localDate,date);
   return{async first(){return{job_id:'job',city_id:cityId,local_date:localDate,
    content_hash:hash,r2_key:'unapproved/job/'+hash+'.json'}}};
  }}}},
  CANDIDATES:{async get(){return{text:async()=>raw}}}};
 const URL='https://admin.panchavani.com/science/day?city=delhi&date=2026-10-16';
 let out=await worker.fetch(new Request(URL),env,{});
 assert.equal(out.status,403);
 assert.equal(calls,0);
 out=await worker.fetch(new Request(URL),env,{access:{getIdentity:async()=>({email:'owner@example.test'})}});
 assert.equal(out.status,200);
 const html=await out.text();
 assert.match(html,/Scientific integrity/);
 assert.match(html,/INTERNAL_CONSISTENCY_PASS/);
 assert.match(html,/Independent scientific approval/);
 assert.match(html,/Approved DeepSeek fact claims/);
 assert.match(html,/NO/);
 assert.match(html,/pv-sidebar/);
 assert.match(html,/unverified|unapproved|No AI calls/i);
 assert.equal(out.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');
});
test('Missing date, spoofed approval or unrelated paths cannot unlock public science',async()=>{
 const env={ALLOWED_ADMIN_EMAILS:'owner@example.test'};
 const ctx={access:{getIdentity:async()=>({email:'owner@example.test'})}};
 const r=await worker.fetch(new Request('https://admin.panchavani.com/science/day'),env,ctx);
 assert.equal(r.status,400);
 const obj=candidate();obj.approvedBy='malicious-reviewer';
 const result=auditResearchCandidate(obj,sha);
 assert.equal(result.scientificApproval,false);
 assert.ok(result.issues.includes('source-structure'));
});
