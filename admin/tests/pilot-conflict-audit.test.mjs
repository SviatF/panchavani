import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {aggregatePilotConflicts,handlePilotConflictAudit} from '../src/pilot-conflict-audit.mjs';
import {runDailyForensics,handleDailyForensicStatus,validateSnapshot,snapshotKey,SNAPSHOT_PREFIX} from '../src/daily-forensic-automation.mjs';
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
const plainUrl='https://admin.panchavani.com/research/conflicts/pilot';
test('historical pilot audit opens directly without query string and also accepts only format=json',async()=>{
  for(const u of [plainUrl,plainUrl+'?format=json',plainUrl+'?date=2026-10-16',url]){
    const env=mock();
    const result=await handlePilotConflictAudit(new Request(u),env,'authorized-owner');
    assert.equal(result.status,200,await result.clone().text());
    const report=await result.json();
    assert.equal(report.localDate,'2026-10-16');
    assert.equal(report.caseCount,3);
    assert.equal(report.historicalConflictsScientificallyResolved,false);
    assert.equal(env.writes(),0);
  }
});
test('URL tracking, HTML-escaped ampersand and unknown decorative params cannot break fixed-scope read-only audit',async()=>{
  for(const suffix of [
    '?utm_source=chatgpt.com',
    '?utm_source=chatgpt.com&utm_medium=assistant',
    '?date=2026-10-16&amp;format=json',
    '?city=delhi',
    '?source=mobile&ref=chat',
    '?foo=bar&random=123',
    '?date=2026-10-16&format=json&utm_campaign=test'
  ]){
    const e=mock();
    const result=await handlePilotConflictAudit(new Request(plainUrl+suffix),e,'owner');
    assert.equal(result.status,200,suffix+': '+await result.clone().text());
    const report=await result.json();
    assert.equal(report.localDate,'2026-10-16');
    assert.deepEqual(report.pilotCities,['delhi','mumbai','chennai']);
    assert.equal(report.realProductionD1ReadForAllCities,true);
    assert.equal(report.historicalConflictsScientificallyResolved,false);
    assert.equal(report.indexingAuthorized,false);
    assert.equal(e.writes(),0);
  }
});
test('explicit conflicting date, format and duplicated selectors remain rejected',async()=>{
  for(const suffix of [
    '?date=2026-10-16&date=2026-10-16',
    '?format=json&format=json',
    '?date=2026-10-17',
    '?format=csv',
    '?date=2026-10-17&utm_source=chatgpt.com'
  ]){
    const result=await handlePilotConflictAudit(new Request(plainUrl+suffix),mock(),'owner');
    assert.equal(result.status,400,suffix);
    const report=await result.json();
    assert.equal(report.error,'invalid-historical-audit-selector');
    assert.equal(report.expectedPath,'/research/conflicts/pilot');
    assert.equal(report.indexingAuthorized,false);
  }
});

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
 assert.deepEqual(report.unresolved.map(c=>c.fullJsonDifferenceCounts[0].changedPathCount),[1,1,1]);
 assert.deepEqual(report.unresolved.map(c=>c.jsonSerializationOnly),[false,false,false]);
 assert.deepEqual(report.unresolved.map(c=>c.hasOtherJsonFieldDifferences),[false,false,false]);
 for(const item of report.cases){
   assert.equal(item.variants[0].completeJsonComparison.allChangedPathCount,1);
   assert.equal(item.variants[0].completeJsonComparison.wholeJsonStructureEqual,false);
   assert.equal(item.variants[1].disposition,'DUPLICATE_INCOMING_SHA');
   assert.equal(item.variants[1].completeJsonComparison.allChangedPathCount,1);
 }
 assert.equal(e.writes(),0);
});
test('one tampered source or missing D1 blocks whole audit with a safe city diagnosis',async()=>{
 for(const [options,city,reason] of [
   [{tamperCity:'mumbai'},'mumbai','D1_R2_OR_MANIFEST_VALIDATION_FAILED'],
   [{missCity:'chennai'},'chennai','HISTORICAL_D1_CANDIDATE_NOT_AVAILABLE']
 ]){
   const e=mock(options);
   const r=await handlePilotConflictAudit(new Request(plainUrl),e,'owner');
   assert.equal(r.status,503,await r.clone().text());
   const report=await r.json();
   assert.equal(report.blockedCityId,city);
   assert.equal(report.reason,reason);
   assert.equal(report.unresolved,true);
   assert.equal(report.indexingAuthorized,false);
   assert.ok(!('storedSha256' in report));
   assert.equal(e.writes(),0);
 }
});
test('no Access, POST, invalid date or query is denied',async()=>{
 for(const [request,actor,status] of [
  [new Request(url),null,403],
  [new Request(url,{method:'POST'}),'owner',405],
  [new Request(url.replace('2026-10-16','2026-10-17')),'owner',400],
  [new Request(url.replace('2026-10-16','2026-10-17')+'&allowPublishing=1'),'owner',400],
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

function cronMock(opts={}){
 const env=mock(opts),store=new Map();
 const original=env.CANDIDATES.get.bind(env.CANDIDATES);
 env.AUTO_PRIVATE_FORENSICS_ENABLED='true';
 env.CANDIDATES.get=async key=>{
  if(key.startsWith(SNAPSHOT_PREFIX)){
   const data=store.get(key);
   return data===undefined?null:{text:async()=>data};
  }
  return original(key);
 };
 env.CANDIDATES.put=async (key,payload)=>{
  assert.ok(key.startsWith(SNAPSHOT_PREFIX));
  store.set(key,payload);
 };
 return {env,store};
}
const cronTime=Date.parse('2026-10-17T03:05:00Z');
test('hourly Cron archives exactly one private 3-city report per day, never approves',async()=>{
 const {env,store}=cronMock();
 assert.equal((await runDailyForensics(env,cronTime-3600000)).status,'before-audit-window');
 assert.equal(store.size,0);
 const report=await runDailyForensics(env,cronTime);
 assert.equal(report.status,'RESEARCH_EVIDENCE_CAPTURED');
 assert.equal(report.unresolvedCityCount,3);
 assert.equal(store.size,1);
 const saved=validateSnapshot(JSON.parse(store.get(snapshotKey(cronTime))),'2026-10-17');
 assert.equal(saved.report.caseCount,3);
 assert.equal(saved.report.historicalConflictsScientificallyResolved,false);
 assert.equal(saved.indexingAuthorized,false);
 assert.equal(saved.scientificApproval,false);
 assert.equal((await runDailyForensics(env,cronTime+3600000)).status,'already-archived');
 assert.equal(store.size,1);
 const request=new Request('https://admin.panchavani.com/research/conflicts/automation?date=2026-10-17');
 const res=await handleDailyForensicStatus(request,env,'verified-owner');
 assert.equal(res.status,200);
 assert.match(res.headers.get('Cache-Control'),/no-store/);
 assert.equal((await res.json()).report.unresolvedCityCount,3);
});
test('tampered production candidate archives BLOCKED, not an automatic resolution',async()=>{
 const {env,store}=cronMock({tamperCity:'mumbai'});
 const first=await runDailyForensics(env,cronTime);
 assert.equal(first.status,'BLOCKED_MISSING_OR_UNTRUSTED_SOURCE');
 const data=JSON.parse(store.get(snapshotKey(cronTime)));
 assert.equal(data.report,null);
 assert.equal(data.indexingAuthorized,false);
 const url='https://admin.panchavani.com/research/conflicts/automation?date=2026-10-17';
 assert.equal((await handleDailyForensicStatus(new Request(url),env,'owner')).status,503);
 assert.equal((await runDailyForensics(env,cronTime+3600000)).status,'already-archived');
});
test('private archived report endpoint rejects unauthenticated readers and illegal writes',async()=>{
 const {env}=cronMock();
 const url='https://admin.panchavani.com/research/conflicts/automation';
 assert.equal((await handleDailyForensicStatus(new Request(url),env,null)).status,403);
 assert.equal((await handleDailyForensicStatus(new Request(url,{method:'POST'}),env,'actor')).status,405);
 assert.equal((await handleDailyForensicStatus(new Request(url+'?date=2026-02-30'),env,'actor')).status,400);
 assert.equal((await handleDailyForensicStatus(new Request(url+'?publish=1'),env,'actor')).status,400);
 env.AUTO_PRIVATE_FORENSICS_ENABLED='false';
 assert.equal((await runDailyForensics(env,cronTime)).status,'disabled');
});
test('daily archive rejects forged grant and corrupted archive source',()=>{
 const sample={
  artifactType:'PANCHAVANI_DAILY_PRIVATE_SOURCE_TRIAGE',schemaVersion:1,
  utcDate:'2026-10-17',status:'BLOCKED_MISSING_OR_UNTRUSTED_SOURCE',
  scientificApproval:false,releaseAuthorized:false,indexingAuthorized:false,
  sourceConflictResolved:false,approvedClaimsForDeepSeek:[],report:null,
  errorCode:'PRIVATE_SOURCE_VALIDATION_INCOMPLETE'
 };
 validateSnapshot(sample,'2026-10-17');
 assert.throws(()=>validateSnapshot({...sample,indexingAuthorized:true},'2026-10-17'));
 assert.throws(()=>validateSnapshot({...sample,report:{cityCount:3}},'2026-10-17'));
});
