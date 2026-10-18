import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {handleTenCityEvidence,summarizeSnapshot} from '../src/ten-city-evidence.mjs';
const CITIES=['delhi','mumbai','kolkata','chennai','bengaluru','hyderabad',
  'ahmedabad','pune','jaipur','varanasi'];
const DAY='2026-10-20',RUN='39156519013';
const P='ops/ten-city-six-limb/v1/'+DAY+'/'+RUN+'/';
const URL='https://admin.panchavani.com/research/daily/ten-city?date='+DAY;
const nextDay=(day)=>new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString().slice(0,10);
const sha=(str)=>createHash('sha256').update(str).digest('hex');
function fixture(){
 const records=[];
 for(const d of [DAY,nextDay(DAY)]){
  for(let i=0;i<CITIES.length;i++){
   const city=CITIES[i];
   const start=new Date(Date.parse(d+'T00:00:00Z')+i*180000).toISOString().replace('.000Z','Z');
   const end=new Date(Date.parse(d+'T00:00:00Z')+i*180000+86400000).toISOString().replace('.000Z','Z');
   const sunset=new Date(Date.parse(d+'T00:00:00Z')+i*180000+39600000).toISOString().replace('.000Z','Z');
   const transitions=Object.fromEntries(['tithi','karana','nakshatra','yoga'].map(k=>
     [k,[{name:k+'-test',number:1,startUtc:start,endUtc:end}]]));
   records.push({
    artifactType:'PANCHAVANI_SIX_LIMB_RESEARCH_PACKET',
    cityId:city,localDate:d,status:'UNAPPROVED_RESEARCH',
    scientificApproval:false,publicReleaseAllowed:false,indexingAuthorized:false,
    paidGenerationAuthorized:false,approvedClaimsForDeepSeek:[],
    timezone:'Asia/Kolkata',
    sun:{sunriseUtc:start,sunsetUtc:sunset,nextSunriseUtc:end},
    panchangAtSunrise:{tithi:'tithi-test',karana:'karana-test',nakshatra:'nakshatra-test',
      yoga:'yoga-test',vara:'Friday',paksha:'Shukla'},
    transitions,
    cityReference:{latitude:10+i,longitude:75+i,coordinatesVerified:false},
    methodology:{siderealMethodIndependentlyCalibrated:false,provisionalSiderealModel:'RESEARCH'},
    recomputedJplCandidateCanonicalSha256:'b'.repeat(64)
   });
  }
 }
 const science={
  artifactType:'PANCHAVANI_TEN_CITY_SIX_LIMB_RESEARCH_BATCH',
  cityCount:10,status:'UNAPPROVED_RESEARCH',
  scienceChecks:{checkedCityDays:20,checkedFourLimbDawnContinuities:40},
  publicationAuthorized:false,scientificApproval:false,indexingAuthorized:false,
  approvedClaimsForDeepSeek:[],records
 };
 const raw=JSON.stringify(science);
 const previews={
  artifactType:'PANCHAVANI_ROLLING_CITY_DAY_RESEARCH_PREVIEWS',
  status:'UNAPPROVED_RESEARCH',
  cityCount:10,cityDays:20,fourLimbDawnChecks:40,
  scientificApproval:false,publicationAuthorized:false,indexingAuthorized:false,
  modelInvocationAuthorized:false,approvedClaimsForDeepSeek:[],
  jplResearchBatchSha256:sha(raw),
  dateFrom:DAY,dateThrough:nextDay(DAY),
  records:records.map(r=>({cityId:r.cityId,localDate:r.localDate}))
 };
 const objects=new Map([
  [P+'science-UNAPPROVED.json',raw],
  [P+'preview-index-UNAPPROVED.json',JSON.stringify(previews)]
 ]);
 const env={INGEST_INBOX:{
   list:async()=>({objects:[...objects.keys()].map(key=>({key})),truncated:false}),
   get:async key=>objects.has(key)?{text:async()=>objects.get(key)}:null,
   put:async()=>{throw Error('THIS ENDPOINT MUST NEVER WRITE SOURCE')}
 }};
 return {env,objects,science,previews,raw};
}
test('Access-only 10-city evidence returns twenty city-day factual candidates and NO release approval',async()=>{
 const {env}=fixture();
 const r=await handleTenCityEvidence(new Request(URL),env,'owner@example.org');
 assert.equal(r.status,200,await r.clone().text());
 assert.match(r.headers.get('Cache-Control'),/no-store/);
 assert.match(r.headers.get('X-Robots-Tag'),/noindex/);
 const report=await r.json();
 assert.equal(report.cityCount,10);
 assert.equal(report.cityDayCount,20);
 assert.equal(report.cityDayRecords.length,20);
 assert.equal(report.indexingAuthorized,false);
 assert.equal(report.publicReleaseAuthorized,false);
 assert.equal(report.scientificApproval,false);
 assert.deepEqual(report.approvedClaimsForDeepSeek,[]);
 assert.equal(report.cityDayRecords[0].muhuratOrFestivalEligibilityCalculated,false);
});
test('tampered astronomy bytes, missing pair and false science approvals fail closed',async()=>{
 const {env,objects,science}=fixture();
 objects.set(P+'science-UNAPPROVED.json',JSON.stringify(science)+' ');
 assert.equal((await handleTenCityEvidence(new Request(URL),env,'owner')).status,503);
 objects.delete(P+'preview-index-UNAPPROVED.json');
 assert.equal((await handleTenCityEvidence(new Request(URL),env,'owner')).status,503);
 const {env:other,objects:more,science:bad}=fixture();
 bad.records[0].scientificApproval=true;
 const b=JSON.stringify(bad);
 more.set(P+'science-UNAPPROVED.json',b);
 const existing=JSON.parse(more.get(P+'preview-index-UNAPPROVED.json'));
 existing.jplResearchBatchSha256=sha(b);
 more.set(P+'preview-index-UNAPPROVED.json',JSON.stringify(existing));
 assert.equal((await handleTenCityEvidence(new Request(URL),other,'owner')).status,503);
});
test('no Access or non-GET rejected; malformed date and duplicate selectors cannot query R2',async()=>{
 const {env}=fixture();
 assert.equal((await handleTenCityEvidence(new Request(URL),env,null)).status,403);
 assert.equal((await handleTenCityEvidence(new Request(URL,{method:'POST'}),env,'owner')).status,405);
 assert.equal((await handleTenCityEvidence(new Request(URL+'&date='+DAY),env,'owner')).status,400);
 assert.equal((await handleTenCityEvidence(new Request(URL.replace(DAY,'2026-02-30')),env,'owner')).status,400);
 assert.equal((await handleTenCityEvidence(new Request(URL+'&utm_source=chatgpt'),env,'owner')).status,200);
});
test('entire twenty-city source set is required, not an arbitrary ten-page sample',()=>{
 const {science,previews,raw}=fixture();
 assert.equal(summarizeSnapshot(science,previews,DAY,sha(raw)).length,20);
 science.records[0].cityId='delhi-copy';
 assert.throws(()=>summarizeSnapshot(science,previews,DAY,sha(raw)),/Unexpected city/);
});
