import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { compareResearchVersions, handleConflictForensics } from '../src/conflict-forensics.mjs';
import { CITY_META, CATALOG_VERSION } from '../src/city-catalog.mjs';

const JPL='c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2';
const city='delhi',date='2026-10-16',run='38787691998';
const w=CITY_META.get(city);
const s='2026-10-16T00:50:00Z',t='2026-10-16T12:20:00Z',n='2026-10-17T00:50:00Z';
const original={
 schemaVersion:'1.0.0',recordId:'delhi:2026-10-16:research',
 status:'calculated',approvedBy:null,releaseId:null,localDate:date,
 city:{id:city,lat:w.latitude,lon:w.longitude,elevationMeters:w.elevationMeters,
   tz:w.timezone,catalogVersion:CATALOG_VERSION},
 methodology:{ephemerisHash:JPL,ayanamsa:'NOT_VALIDATED',rulePackId:'NONE'},
 validation:{blockerCount:4,reviewStatus:'not-reviewed'},
 sun:{sunriseUtc:s,sunsetUtc:t,nextSunriseUtc:n},
 panchangAtSunrise:{tithi:'Shukla Shashthi',karana:'Bava',
   vara:'Friday',paksha:'Shukla',nakshatra:null,yoga:null},
 transitions:[
  {type:'tithi',value:'Shukla Shashthi',startUtc:s,endUtc:n},
  {type:'karana',value:'Bava',startUtc:s,endUtc:n}
 ]
};
const checksum=raw=>createHash('sha256').update(raw).digest('hex');
const incoming={...original,sun:{...original.sun,sunsetUtc:'2026-10-16T12:21:00Z'}};
const storedRaw=JSON.stringify(original), incomingRaw=JSON.stringify(incoming);
const key=`inbox/records/${run}/${date}/${city}.json`,mfkey=`inbox/manifests/${run}.json`;
const manifest={
 schemaVersion:1,status:'UNAPPROVED_RESEARCH',source:'panchavani-nightly-jpl-de440s',
 runId:run,ephemerisSha256:JPL,catalogSha256:'a'.repeat(64),
 publicationAuthorized:false,indexingAuthorized:false,modelInvocationAuthorized:false,
 entryCount:1,entries:[{cityId:city,localDate:date,sha256:checksum(incomingRaw),key}]
};
function env({tamper=false}={}){
 let writes=0;
 return {
  writes:()=>writes,
  DB:{prepare(sql){
   assert.match(sql,/SELECT job_id,city_id,local_date,content_hash,r2_key/);
   return {bind(...args){
    assert.deepEqual(args,[city,date]);
    return {async first(){return {
     job_id:'test-job',city_id:city,local_date:date,
     content_hash:checksum(storedRaw),
     r2_key:'unapproved/test-job/'+checksum(storedRaw)+'.json'
    }}};
   }};
  }},
  CANDIDATES:{async get(){return {text:async()=>storedRaw}},async put(){writes++}},
  INGEST_INBOX:{
   async list(){return {objects:[{key:mfkey}],truncated:false}},
   async get(path){
    const raw=path===mfkey?JSON.stringify(manifest):path===key?
      (tamper?incomingRaw+' ':incomingRaw):null;
    return raw?{size:raw.length,text:async()=>raw}:null;
   },
   async put(){writes++}
  }
 };
}
const url=`https://admin.panchavani.com/research/conflicts?city=${city}&date=${date}`;
test('compare detects changed scientific field and Tithi intervals, but ignores object property ordering',()=>{
 const changes=compareResearchVersions(original,incoming);
 assert.deepEqual(changes.map(x=>x.field),['sun.sunsetUtc']);
 const edited={...incoming,transitions:incoming.transitions.map(x=>({...x}))};
 edited.transitions[0].endUtc='2026-10-16T20:00:00Z';
 assert.deepEqual(compareResearchVersions(original,edited).map(x=>x.field),
  ['sun.sunsetUtc','transitions.tithi']);
});
test('private route only, rejects invalid selectors, methods and unauthenticated access',async()=>{
 assert.equal(await handleConflictForensics(new Request('https://admin.panchavani.com/'),{},null),null);
 assert.equal((await handleConflictForensics(new Request(url),env(),null)).status,403);
 assert.equal((await handleConflictForensics(new Request(url,{method:'POST'}),env(),'owner')).status,405);
 assert.equal((await handleConflictForensics(new Request(url.replace(date,'2026-02-30')),env(),'owner')).status,400);
});
test('D1 and R2 scientific field diff is displayed, with no writes, approval, or model call',async()=>{
 const e=env();
 const response=await handleConflictForensics(new Request(url),e,'owner@example.test');
 assert.equal(response.status,200);
 const html=await response.text();
 assert.match(html,/DIFFERENT SHA/);
 assert.match(html,/sun\.sunsetUtc/);
 assert.match(html,/2026-10-16T12:21:00Z/);
 assert.match(html,/no auto overwrite/i);
 assert.match(response.headers.get('X-Robots-Tag'),/noindex/);
 assert.equal(e.writes(),0);
});
test('tampered R2 source fails closed and never shows speculative differences',async()=>{
 const e=env({tamper:true});
 const response=await handleConflictForensics(new Request(url),e,'owner');
 assert.equal(response.status,503);
 assert.doesNotMatch(await response.text(),/sun\.sunsetUtc/);
 assert.equal(e.writes(),0);
});
test('unavailable private bindings do not fetch manifests or leak source',async()=>{
 const r=await handleConflictForensics(new Request(url),{DB:{}},'owner');
 assert.equal(r.status,503);
});

test('authenticated forensic JSON export has real SHA differences but never approves/writes',async()=>{
 const e=env(),r=await handleConflictForensics(
  new Request(url+'&format=json'),e,'scientific-reviewer');
 assert.equal(r.status,200);
 assert.match(r.headers.get('Content-Type'),/application\/json/);
 assert.match(r.headers.get('Cache-Control'),/no-store/);
 assert.match(r.headers.get('X-Robots-Tag'),/noindex/);
 const report=await r.json();
 assert.equal(report.artifactType,'PANCHAVANI_PRIVATE_SHA_CONFLICT_TRIAGE');
 assert.equal(report.livePrivateD1WasActuallyRead,true);
 assert.equal(report.variantCount,1);
 assert.equal(report.variants[0].disposition,'RESEARCH_FIELDS_DIFFER');
 assert.deepEqual(report.variants[0].changedResearchFields,['sun.sunsetUtc']);
 assert.equal(report.variants[0].incomingSha256,checksum(incomingRaw));
 assert.equal(report.storedSha256,checksum(storedRaw));
 assert.equal(report.shaConflictResolved,false);
 assert.equal(report.reviewedScienceApproved,false);
 assert.equal(report.publicReleaseAllowed,false);
 assert.equal(report.indexingAuthorized,false);
 assert.equal(e.writes(),0);
});
test('JSON SHA triage requires Access, refuses unsafe selectors and tampered inputs',async()=>{
 assert.equal((await handleConflictForensics(new Request(url+'&format=json'),env(),null)).status,403);
 assert.equal((await handleConflictForensics(new Request(url+'&format=csv'),env(),'reviewer')).status,400);
 const e=env({tamper:true});
 assert.equal((await handleConflictForensics(new Request(url+'&format=json'),e,'reviewer')).status,503);
 assert.equal(e.writes(),0);
});
