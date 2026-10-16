import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ingestNightly,checkManifest} from '../src/nightly-import.mjs';
import {CITY_META,CATALOG_VERSION} from '../src/city-catalog.mjs';

const JPL='c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2';
const run='38787691998',date='2026-10-16',city='delhi';
const s='2026-10-16T00:50:00Z',t='2026-10-16T12:20:00Z',n='2026-10-17T00:50:00Z';
const where=CITY_META.get(city);
const record={
 schemaVersion:'1.0.0',recordId:'delhi:2026-10-16:research',
 status:'calculated',approvedBy:null,releaseId:null,localDate:date,
 city:{id:city,lat:where.latitude,lon:where.longitude,elevationMeters:where.elevationMeters,
  tz:where.timezone,catalogVersion:CATALOG_VERSION},
 methodology:{ephemerisHash:JPL,ayanamsa:'NOT_VALIDATED',rulePackId:'NONE'},
 validation:{blockerCount:4,reviewStatus:'not-reviewed'},
 sun:{sunriseUtc:s,sunsetUtc:t,nextSunriseUtc:n},
 panchangAtSunrise:{tithi:'Shukla Shashthi',karana:'Bava',vara:'Friday',paksha:'Shukla',nakshatra:null,yoga:null},
 transitions:[
  {type:'tithi',value:'Shukla Shashthi',startUtc:s,endUtc:n},
  {type:'karana',value:'Bava',startUtc:s,endUtc:n}
 ]
};
const hash=x=>createHash('sha256').update(x).digest('hex');
const raw=JSON.stringify(record);
const key=`inbox/records/${run}/${date}/${city}.json`;
const manifest={
 schemaVersion:1,status:'UNAPPROVED_RESEARCH',source:'panchavani-nightly-jpl-de440s',
 runId:run,ephemerisSha256:JPL,catalogSha256:'a'.repeat(64),
 publicationAuthorized:false,indexingAuthorized:false,modelInvocationAuthorized:false,
 entryCount:1,entries:[{cityId:city,localDate:date,sha256:hash(raw),key}]
};
const mfkey=`inbox/manifests/${run}.json`;
function fakeEnv(){
 let existing=null,slot=null;
 const writes=[],events=[],schemaActions=[];
 const env={
  AUTO_RESEARCH_IMPORT_ENABLED:'true',
  INGEST_INBOX:{
   async list(){return {objects:[{key:mfkey}],truncated:false}},
   async get(name){
    const data=name===mfkey?JSON.stringify(manifest):name===key?raw:null;
    return data?{size:data.length,text:async()=>data}:null;
   }
  },
  CANDIDATES:{async put(path,body){writes.push({path,body})}},
  DB:{async exec(){throw new Error('Never execute multiline DDL in importer')},
   prepare(sql){
    if(sql.startsWith('CREATE TABLE IF NOT EXISTS automated_research_import_slots')){
      return {async run(){schemaActions.push('table');return {success:true}}};
    }
    if(sql.startsWith('CREATE INDEX IF NOT EXISTS idx_auto_import_created')){
      return {async run(){schemaActions.push('index');return {success:true}}};
    }
    if(sql.includes('FROM sqlite_master')){
      return {async first(){schemaActions.push('probe');return {n:1}}};
    }
    return{
   bind(...args){return {
    async first(){
     if(sql.includes('FROM research_candidates'))return existing;
     if(sql.includes('FROM automated_research_import_slots'))return slot;
     return null;
    },
    async run(){
     if(sql.startsWith('INSERT OR IGNORE INTO automated_research_import_slots')){
      if(slot)return {meta:{changes:0}};
      slot={status:'reserved',content_hash:args[3]};
      events.push('reserve');return {meta:{changes:1}};
     }
     throw Error('unexpected isolated write: '+sql);
    }
   }}
  }},async batch(statements){
   assert.equal(statements.length,4);
   assert.equal(writes.length,1);
   existing={content_hash:hash(raw)};
   slot={status:'stored',content_hash:hash(raw)};
   events.push('batch');
   return [{meta:{changes:1}}];
  }}
 };
 return {env,writes,events,schemaActions,setExisting(value){existing=value}};
}
test('opt-in ingestion consumes private SHA-verified research once, caches R2, zero AI',async()=>{
 const f=fakeEnv();
 const result=await ingestNightly(f.env);
 assert.equal(result.status,'complete');
 assert.equal(result.stored,1);
 assert.equal(f.writes.length,1);
 assert.equal(f.writes[0].body,raw);
 assert.match(f.writes[0].path,/^unapproved\//);
 assert.deepEqual(f.events,['reserve','batch']);
 assert.deepEqual(f.schemaActions,['table','index','probe']);
 const again=await ingestNightly(f.env);
 assert.equal(again.stored,0);
 assert.equal(again.existing,1);
 assert.equal(f.writes.length,1);
});
test('preexisting manual city/date hash conflict never overwrites R2 or blocks private status reporting',async()=>{
 const f=fakeEnv();
 f.setExisting({content_hash:'0'.repeat(64)});
 const result=await ingestNightly(f.env);
 assert.equal(result.status,'conflicts-needing-review');
 assert.equal(result.conflicts,1);
 assert.deepEqual(result.conflictExamples,['delhi/2026-10-16']);
 assert.equal(result.stored,0);
 assert.equal(f.writes.length,0);
 assert.equal(f.events.length,0);
});
test('two identical 50-day manifests count a conflicting city-date only once',async()=>{
 const f=fakeEnv();
 f.setExisting({content_hash:'0'.repeat(64)});
 const anotherRun='38813000892';
 const secondKey=`inbox/manifests/${anotherRun}.json`;
 const second={...manifest,runId:anotherRun,
  entries:[{...manifest.entries[0],
   key:`inbox/records/${anotherRun}/${date}/${city}.json`}]};
 const originalGet=f.env.INGEST_INBOX.get.bind(f.env.INGEST_INBOX);
 f.env.INGEST_INBOX.list=async()=>({truncated:false,
  objects:[{key:mfkey},{key:secondKey}]});
 f.env.INGEST_INBOX.get=async key=>
  key===secondKey?
    {size:JSON.stringify(second).length,text:async()=>JSON.stringify(second)}:
    originalGet(key);
 const result=await ingestNightly(f.env);
 assert.equal(result.status,'conflicts-needing-review');
 assert.equal(result.manifests,2);
 assert.equal(result.uniqueCityDays,1);
 assert.equal(result.checked,1);
 assert.equal(result.conflicts,1);
 assert.equal(result.repeatedManifestEntries,1);
 assert.equal(result.sourceVariantConflicts,0);
 assert.deepEqual(result.conflictExamples,['delhi/2026-10-16']);
 assert.equal(f.writes.length,0);
});
test('same city/date but different nightly source checksum is flagged, not silently deduplicated',async()=>{
 const f=fakeEnv();
 f.setExisting({content_hash:hash(raw)});
 const anotherRun='38813000892';
 const secondKey=`inbox/manifests/${anotherRun}.json`;
 const second={...manifest,runId:anotherRun,
  entries:[{...manifest.entries[0],sha256:'f'.repeat(64),
   key:`inbox/records/${anotherRun}/${date}/${city}.json`}]};
 const originalGet=f.env.INGEST_INBOX.get.bind(f.env.INGEST_INBOX);
 f.env.INGEST_INBOX.list=async()=>({truncated:false,
  objects:[{key:mfkey},{key:secondKey}]});
 f.env.INGEST_INBOX.get=async key=>
  key===secondKey?
    {size:JSON.stringify(second).length,text:async()=>JSON.stringify(second)}:
    originalGet(key);
 const result=await ingestNightly(f.env);
 assert.equal(result.status,'conflicts-needing-review');
 assert.equal(result.checked,1);
 assert.equal(result.existing,1);
 assert.equal(result.conflicts,1);
 assert.equal(result.sourceVariantConflicts,1);
 assert.equal(result.repeatedManifestEntries,0);
 assert.deepEqual(result.conflictExamples,['delhi/2026-10-16']);
 assert.equal(f.writes.length,0);
});
test('D1 bootstrap executes separate fixed DDL statements, not multiline exec',async()=>{
 const f=fakeEnv();
 const output=await ingestNightly(f.env);
 assert.equal(output.stored,1);
 assert.deepEqual(f.schemaActions,['table','index','probe']);
});
test('a table-creation failure is visible as a safe code and prevents all R2 writes',async()=>{
 const f=fakeEnv();
 const prepare=f.env.DB.prepare.bind(f.env.DB);
 f.env.DB.prepare=sql=>sql.startsWith('CREATE TABLE IF NOT EXISTS')?
  {async run(){throw Error('sensitive account identifiers from D1')}}:prepare(sql);
 await assert.rejects(ingestNightly(f.env),{
  message:'private-d1-import-table-create-failed'
 });
 assert.equal(f.writes.length,0);
 assert.equal(f.events.length,0);
});
test('a D1 index-creation failure is differentiated from a table failure',async()=>{
 const f=fakeEnv();
 const prepare=f.env.DB.prepare.bind(f.env.DB);
 f.env.DB.prepare=sql=>sql.startsWith('CREATE INDEX IF NOT EXISTS')?
  {async run(){throw Error('private details must not leak')}}:prepare(sql);
 await assert.rejects(ingestNightly(f.env),{
  message:'private-d1-import-index-create-failed'
 });
 assert.equal(f.writes.length,0);
 assert.equal(f.events.length,0);
});
test('failed read-only schema verification cannot reserve research or write R2',async()=>{
 const f=fakeEnv();
 const prepare=f.env.DB.prepare.bind(f.env.DB);
 f.env.DB.prepare=sql=>sql.includes('FROM sqlite_master')?
  {async first(){return {n:0}}}:prepare(sql);
 await assert.rejects(ingestNightly(f.env),{
  message:'private-d1-import-schema-verification-failed'
 });
 assert.equal(f.writes.length,0);
 assert.equal(f.events.length,0);
});
test('without explicit opt-in, not even D1 or R2 is touched',async()=>{
 const result=await ingestNightly({DB:{list(){throw Error('unexpected')}},INGEST_INBOX:{},CANDIDATES:{}});
 assert.equal(result.status,'disabled');
 assert.equal(result.stored,0);
});
test('the manifest rejects fabricated approval, duplicate cities and invalid path',()=>{
 checkManifest(manifest,mfkey);
 assert.throws(()=>checkManifest({...manifest,publicationAuthorized:true},mfkey));
 assert.throws(()=>checkManifest({...manifest,entryCount:2,entries:[manifest.entries[0],manifest.entries[0]]},mfkey));
 assert.throws(()=>checkManifest({...manifest,entries:[{...manifest.entries[0],key:'public/release.json'}]},mfkey));
});
test('tampered science SHA is rejected before private D1 reservation',async()=>{
 const f=fakeEnv();
 f.env.INGEST_INBOX.get=async path=>{
  const data=path===mfkey?JSON.stringify(manifest):raw+'changed';
  return {size:data.length,text:async()=>data};
 };
 await assert.rejects(ingestNightly(f.env),/inbox-sha-or-object-missing/);
 assert.equal(f.writes.length,0);
 assert.equal(f.events.length,0);
});
