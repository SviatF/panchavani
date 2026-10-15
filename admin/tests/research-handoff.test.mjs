import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseResearchHandoff,importResearchHandoff,handleResearchImport} from '../src/research-handoff.mjs';
import {CITY_META,CATALOG_VERSION} from '../src/city-catalog.mjs';

const cities=['delhi','mumbai','chennai'];
const jpl='c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2';
const sha=x=>createHash('sha256').update(x).digest('hex');
const localDate='2026-10-16';
function bundle(){
 const entries=cities.map((city,i)=>{
  const meta=CITY_META.get(city);
  const start=`2026-10-16T0${i}:00:00Z`;
  const end=`2026-10-16T1${i}:00:00Z`;
  const next=`2026-10-17T0${i}:00:00Z`;
  const candidate={
   schemaVersion:'1.0.0',status:'calculated',approvedBy:null,releaseId:null,
   recordId:city+':'+localDate+':'+jpl.slice(0,12),
   city:{id:city,lat:meta.latitude,lon:meta.longitude,elevationMeters:meta.elevationMeters,
     catalogVersion:CATALOG_VERSION,tz:meta.timezone},
   localDate,methodology:{ephemerisHash:jpl,ayanamsa:'NOT_VALIDATED',rulePackId:'NONE'},
   sun:{sunriseUtc:start,sunsetUtc:end,nextSunriseUtc:next},
   validation:{blockerCount:4,reviewStatus:'not-reviewed'},
   panchangAtSunrise:{nakshatra:null,yoga:null,karana:'Bava'},
   transitions:[
    {type:'tithi',value:'Shukla Dvitiya',startUtc:start,endUtc:next},
    {type:'karana',value:'Bava',startUtc:start,endUtc:next}
   ]
  };
  const candidateJson=JSON.stringify(candidate);
  return {cityId:city,localDate,candidateJson,candidateSha256:sha(candidateJson)};
 });
 return {
  artifactType:'PANCHAVANI_PRIVATE_THREE_CITY_HANDOFF',
  schemaVersion:1,status:'UNAPPROVED_RESEARCH',releaseAuthorized:false,
  indexingAuthorized:false,modelInvocationAuthorized:false,
  ephemerisSha256:jpl,catalogSha256:'b'.repeat(64),
  localDate,createdAtUtc:'2026-10-15T12:00:00Z',
  bundleSha256:sha(entries.map(x=>x.cityId+':'+x.localDate+':'+x.candidateSha256).join('\n')),
  entries
 };
}
function fakeEnvironment(){
 const slots=new Map(), jobs=new Map(), candidates=new Map(), objects=new Map();
 let saves=0;
 function prepare(sql){
  return {bind(...args){return {
   async first(){
    if(sql.includes('FROM private_research_handoff_slots')){
     return slots.get(args[0]+'/'+args[1])||null;
    }
    if(sql.includes('FROM research_candidates')){
     return candidates.get(args[0]+'/'+args[1])||null;
    }
    throw Error('Unexpected query: '+sql);
   },
   async run(){return execute(sql,args)}
  }}};
 }
 function execute(sql,args){
  if(sql.startsWith('INSERT INTO job_requests')){
   const [id,city,day,actor]=args;
   if(slots.has(city+'/'+day))return {meta:{changes:0}};
   jobs.set(id,{city,day,actor,status:'queued'});return {meta:{changes:1}};
  }
  if(sql.startsWith('INSERT OR IGNORE INTO private_research_handoff_slots')){
   const [city,day,job,hash,actor]=args;
   if(slots.has(city+'/'+day)||!jobs.has(job))return {meta:{changes:0}};
   slots.set(city+'/'+day,{candidate_sha256:hash,status:'reserved',job});
   return {meta:{changes:1}};
  }
  if(sql.includes("UPDATE job_requests SET status='candidate'")){
   const [hash,id]=args; jobs.get(id).status='candidate';jobs.get(id).hash=hash;return {meta:{changes:1}};
  }
  if(sql.includes('INSERT INTO research_candidates')){
   const [_id,job,city,date,hash]=args;
   candidates.set(city+'/'+date,{id:job,content_hash:hash});
   return {meta:{changes:1}};
  }
  if(sql.includes("UPDATE private_research_handoff_slots SET status='stored'")){
   const [city,date]=args;slots.get(city+'/'+date).status='stored';return {meta:{changes:1}};
  }
  if(sql.includes('INSERT INTO audit_log'))return {meta:{changes:1}};
  if(sql.includes("SET status='failed'"))return {meta:{changes:1}};
  throw Error('Unexpected mutation: '+sql);
 }
 return {
  env:{
   DB:{prepare,async batch(items){return Promise.all(items.map(x=>x.run()))}},
   CANDIDATES:{async put(key,value){saves++;objects.set(key,value)}}
  },
  slots,jobs,candidates,objects,get saves(){return saves}
 };
}
test('exactly three private JPL candidates accepted without publication',async()=>{
 const parsed=await parseResearchHandoff(JSON.stringify(bundle()));
 assert.deepEqual(parsed.entries.map(x=>x.cityId),cities);
 assert.equal(parsed.entries[0].candidate.status,'calculated');
});
test('tampered candidates, forged approval, duplicate cities and catalog coords fail',async()=>{
 const b=bundle();
 b.entries[0].candidateJson+=' ';
 await assert.rejects(()=>parseResearchHandoff(JSON.stringify(b)),/SHA|ordering/);
 const c=bundle(); c.releaseAuthorized=true;
 await assert.rejects(()=>parseResearchHandoff(JSON.stringify(c)),/envelope/);
 const d=bundle();d.entries[1].cityId='delhi';
 await assert.rejects(()=>parseResearchHandoff(JSON.stringify(d)),/ordering/);
 const e=bundle();const x=JSON.parse(e.entries[0].candidateJson);x.city.lat=1;
 e.entries[0].candidateJson=JSON.stringify(x);
 e.entries[0].candidateSha256=sha(e.entries[0].candidateJson);
 e.bundleSha256=sha(e.entries.map(y=>y.cityId+':'+y.localDate+':'+y.candidateSha256).join('\n'));
 await assert.rejects(()=>parseResearchHandoff(JSON.stringify(e)),/eligible/);
});
test('one import writes exactly three private candidates; duplicate upload costs nothing',async()=>{
 const p=await parseResearchHandoff(JSON.stringify(bundle()));
 const db=fakeEnvironment();
 const first=await importResearchHandoff(db.env,'owner@example.test',p);
 assert.deepEqual(first.created,cities);
 assert.equal(db.saves,3);
 assert.equal(db.candidates.size,3);
 assert.equal(db.jobs.size,3);
 const second=await importResearchHandoff(db.env,'owner@example.test',p);
 assert.deepEqual(second.existing,cities);
 assert.equal(db.saves,3);
});
test('upload path rejects missing Access identity and cross-origin requests',async()=>{
 const content=JSON.stringify(bundle()), form=new FormData();
 form.set('bundle',new Blob([content],{type:'application/json'}),'bundle.json');
 const unauthorized=new Request('https://admin.panchavani.com/research/import',{method:'POST',body:form});
 const denied=await handleResearchImport(unauthorized,{},null,()=>true);
 assert.equal(denied.status,403);
 let writes=0;
 const fake={DB:{prepare:()=>{writes++;throw Error('no')}},CANDIDATES:{}};
 const cross=await handleResearchImport(unauthorized,fake,'owner@example.test',()=>false);
 assert.equal(cross.status,403);
 assert.equal(writes,0);
});
