import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {aggregatePilotConflicts,handlePilotConflictAudit} from '../src/pilot-conflict-audit.mjs';
import {CITY_META,CATALOG_VERSION} from '../src/city-catalog.mjs';

const names=['delhi','mumbai','chennai'], date='2026-10-16',run='38973526416';
const JPL='c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2';
const sha=raw=>createHash('sha256').update(raw).digest('hex');
function datum(city){
 const w=CITY_META.get(city),start='2026-10-16T00:50:00Z',end='2026-10-17T00:50:00Z';
 return {
  schemaVersion:'1.0.0',recordId:city+':2026-10-16:research',
  status:'calculated',approvedBy:null,releaseId:null,localDate:date,
  city:{id:city,lat:w.latitude,lon:w.longitude,elevationMeters:w.elevationMeters,
    tz:w.timezone,catalogVersion:CATALOG_VERSION},
  methodology:{ephemerisHash:JPL,ayanamsa:'NOT_VALIDATED',rulePackId:'NONE'},
  validation:{blockerCount:4,reviewStatus:'not-reviewed'},
  sun:{sunriseUtc:start,sunsetUtc:'2026-10-16T12:20:00Z',nextSunriseUtc:end},
  panchangAtSunrise:{tithi:'Shukla Shashthi',karana:'Bava',
    vara:'Friday',paksha:'Shukla',nakshatra:null,yoga:null},
  transitions:[
    {type:'tithi',value:'Shukla Shashthi',startUtc:start,endUtc:end},
    {type:'karana',value:'Bava',startUtc:start,endUtc:end}
  ]
 };
}
function mock({tamperCity=null,missCity=null}={}){
 let writes=0;
 const raws=new Map(names.map(c=>[c,JSON.stringify(datum(c))]));
 const modified=new Map(names.map(c=>[c,JSON.stringify({
    ...datum(c),sun:{...datum(c).sun,sunsetUtc:'2026-10-16T12:21:00Z'}
 })]));
 const entries=names.map(c=>({cityId:c,localDate:date,
    sha256:sha(modified.get(c)),key:'inbox/records/'+run+'/'+date+'/'+c+'.json'}));
 const manifest={
  schemaVersion:1,status:'UNAPPROVED_RESEARCH',source:'panchavani-nightly-jpl-de440s',
  runId:run,ephemerisSha256:JPL,catalogSha256:'a'.repeat(64),
  publicationAuthorized:false,indexingAuthorized:false,modelInvocationAuthorized:false,
  entryCount:3,entries
 };
 const mfKey='inbox/manifests/'+run+'.json';
 return {
  writes:()=>writes,
  DB:{prepare(query){
    assert.match(query,/SELECT job_id,city_id,local_date,content_hash,r2_key/);
    return {bind(city,day){
      assert.equal(day,date);
      return {async first(){
        if(city===missCity)return null;
        return {job_id:'test-'+city,city_id:city,local_date:day,
          content_hash:sha(raws.get(city)),
          r2_key:'unapproved/test-'+city+'/'+sha(raws.get(city))+'.json'};
      }};
    }};
  }},
  CANDIDATES:{
    async get(key){
      const city=names.find(c=>key.includes('test-'+c+'/'));
      return {text:async()=>raws.get(city)};
    },async put(){writes++}
  },
  INGEST_INBOX:{
    async list(){return {objects:[{key:mfKey}],truncated:false}},
    async get(key){
      if(key===mfKey){const raw=JSON.stringify(manifest);return {size:raw.length,text:async()=>raw}}
      const city=names.find(c=>key.endsWith('/'+c+'.json'));
      if(!city)return null;
      let raw=modified.get(city);
      if(city===tamperCity)raw+=' ';
      return {size:raw.length,text:async()=>raw};
    },async put(){writes++}
  }
 };
}
const url='https://admin.panchavani.com/research/conflicts/pilot?date=2026-10-16&format=json';
test('all 3 private D1 mock source hashes inspected through one Access route',async()=>{
 const e=mock();
 const r=await handlePilotConflictAudit(new Request(url),e,'owner@example.org');
 assert.equal(r.status,200,await r.clone().text());
 assert.match(r.headers.get('Cache-Control'),/no-store/);
 assert.match(r.headers.get('X-Robots-Tag'),/noindex/);
 const report=await r.json();
 assert.equal(report.cityCount,3);
 assert.equal(report.caseCount,3);
 assert.equal(report.unresolvedCityCount,3);
 assert.equal(report.cases.length,3);
 assert.equal(report.historicalConflictsScientificallyResolved,false);
 assert.equal(report.indexingAuthorized,false);
 assert.equal(report.scientificApproval,false);
 assert.deepEqual(report.unresolved.map(c=>c.changedResearchFields),[
  ['sun.sunsetUtc'],['sun.sunsetUtc'],['sun.sunsetUtc']
 ]);
 assert.equal(e.writes(),0);
});
test('one tampered source or missing D1 blocks whole audit',async()=>{
 for(const options of [{tamperCity:'mumbai'},{missCity:'chennai'}]){
   const e=mock(options);
   const r=await handlePilotConflictAudit(new Request(url),e,'owner');
   assert.equal(r.status,503,await r.clone().text());
   const report=await r.json();
   assert.equal(report.unresolved,true);
   assert.equal(report.indexingAuthorized,false);
   assert.equal(e.writes(),0);
 }
});
test('no Access, POST, invalid date or query is denied',async()=>{
 for(const [request,actor,status] of [
  [new Request(url),null,403],
  [new Request(url,{method:'POST'}),'owner',405],
  [new Request(url.replace('2026-10-16','2026-10-17')),'owner',400],
  [new Request(url+'&allowPublishing=1'),'owner',400],
 ]){
  const r=await handlePilotConflictAudit(request,mock(),actor);
  assert.equal(r.status,status);
 }
});
test('aggregator rejects forged scope, statuses, and unknown private cases',()=>{
 const caseFor=c=>({
  artifactType:'PANCHAVANI_PRIVATE_SHA_CONFLICT_TRIAGE',
  cityId:c,localDate:date,livePrivateD1WasActuallyRead:true,
  publicReleaseAllowed:false,indexingAuthorized:false,
  shaConflictResolved:false,storedSha256:'a'.repeat(64),variants:[]
 });
 assert.throws(()=>aggregatePilotConflicts([caseFor('delhi')]),/missing-or-duplicate/);
 const rows=names.map(caseFor);
 assert.equal(aggregatePilotConflicts(rows).unresolvedCityCount,3);
 rows[1].shaConflictResolved=true;
 assert.throws(()=>aggregatePilotConflicts(rows),/invalid-or-unavailable/);
});
