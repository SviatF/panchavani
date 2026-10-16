import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {CITY_META,CATALOG_VERSION} from '../src/city-catalog.mjs';
import {buildDailyResearchBrief,DAILY_BRIEF_VERSION} from '../src/daily-brief.mjs';
import {handleDailyBrief} from '../src/daily-brief-route.mjs';

const city=CITY_META.get('delhi');
const s='2026-10-16T00:50:00Z',mid='2026-10-16T07:00:00Z';
const t='2026-10-16T12:20:00Z',n='2026-10-17T00:50:00Z';
const sha=x=>createHash('sha256').update(x).digest('hex');
const base={
 schemaVersion:'1.0.0',recordId:'delhi:2026-10-16:research',
 city:{id:city.id,lat:city.latitude,lon:city.longitude,
  elevationMeters:city.elevationMeters,tz:city.timezone,catalogVersion:CATALOG_VERSION},
 status:'calculated',approvedBy:null,releaseId:null,localDate:'2026-10-16',
 validation:{blockerCount:4,reviewStatus:'not-reviewed'},
 methodology:{ephemerisHash:'c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2',
  ayanamsa:'NOT_VALIDATED',rulePackId:'NONE'},
 sun:{sunriseUtc:s,sunsetUtc:t,nextSunriseUtc:n},
 panchangAtSunrise:{tithi:'Shukla Panchami',karana:'Bava',
  nakshatra:null,yoga:null,paksha:'Shukla',vara:'Friday'},
 transitions:[
  {type:'tithi',value:'Shukla Panchami',startUtc:s,endUtc:mid},
  {type:'tithi',value:'Shukla Shashthi',startUtc:mid,endUtc:n},
  {type:'karana',value:'Bava',startUtc:s,endUtc:mid},
  {type:'karana',value:'Balava',startUtc:mid,endUtc:n}
 ]
};
test('one research candidate creates distinctive reader questions from real transitions and no paid claims',()=>{
 const source=JSON.parse(JSON.stringify(base));
 const orig=JSON.stringify(source);
 const brief=buildDailyResearchBrief(source,'a'.repeat(64));
 assert.equal(brief.version,DAILY_BRIEF_VERSION);
 assert.equal(brief.location.name,'Delhi');
 assert.equal(brief.suggestedCanonical,'/panchang/delhi/2026-10-16/');
 assert.equal(brief.transitions.tithi.length,1);
 assert.equal(brief.transitions.tithi[0].to,'Shukla Shashthi');
 assert.equal(brief.transitions.tithi[0].daylight,true);
 assert.match(brief.readerQuestions[1],/When does Tithi change/);
 assert.match(brief.searchIntent,/Delhi Panchang 2026-10-16/);
 assert.ok(brief.privateCandidateFacts.some(x=>x.type==='sunrise'));
 assert.deepEqual(brief.uncalculated,['Nakshatra','Yoga']);
 assert.deepEqual(brief.safeModelInputs.approvedClaims,[]);
 assert.equal(brief.safeModelInputs.paidGenerationAllowed,false);
 assert.equal(brief.indexingAuthorized,false);
 assert.equal(brief.publicationAuthorized,false);
 assert.equal(JSON.stringify(source),orig);
});
test('date-specific planner changes focus when there is no Tithi boundary before next sunrise',()=>{
 const candidate=structuredClone(base);
 candidate.transitions=candidate.transitions.filter(x=>x.type!=='tithi');
 candidate.transitions.push({type:'tithi',value:'Shukla Panchami',startUtc:s,endUtc:n});
 const brief=buildDailyResearchBrief(candidate,'b'.repeat(64));
 assert.match(brief.readerQuestions[1],/Does Tithi remain the same/);
 assert.equal(brief.transitions.tithi.length,0);
});
test('rejects false approval and invented sidereal fields; never sends those as confirmed facts',()=>{
 for(const mutation of [
  x=>{x.approvedBy='editor'},
  x=>{x.validation.reviewStatus='approved'},
  x=>{x.panchangAtSunrise.nakshatra='Rohini'},
  x=>{x.methodology.ayanamsa='LAHIRI_APPROVED'},
  x=>{x.validation.blockerCount=0}
 ]){
  const record=structuredClone(base);mutation(record);
  assert.throws(()=>buildDailyResearchBrief(record,'c'.repeat(64)),/unapproved-source-contract-required/);
 }
});
function privateEnv(record=base){
 const raw=JSON.stringify(record),hash=sha(raw),id='private-job';
 const env={
  DB:{prepare(sql){return{
   bind(a,b){assert.equal(a,'delhi');assert.equal(b,'2026-10-16');return{
    async first(){return{job_id:id,city_id:a,local_date:b,content_hash:hash,
     r2_key:'unapproved/'+id+'/'+hash+'.json'}}
   }}
  }}},
  CANDIDATES:{async get(){return{text:async()=>raw}}}
 };
 return env;
}
test('private SEO brief is only accessible to authenticated actor with SHA-matching research source',async()=>{
 const url='https://admin.panchavani.com/research/daily-brief?city=delhi&date=2026-10-16';
 let result=await handleDailyBrief(new Request(url),privateEnv(),null);
 assert.equal(result.status,403);
 result=await handleDailyBrief(new Request(url,{method:'POST'}),privateEnv(),'owner');
 assert.equal(result.status,405);
 result=await handleDailyBrief(new Request(url),privateEnv(),'owner');
 assert.equal(result.status,200);
 assert.equal(result.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');
 const html=await result.text();
 assert.match(html,/RESEARCH-ONLY SEO INPUT/);
 assert.match(html,/Shukla Panchami/);
 assert.match(html,/When does Tithi change/);
 assert.match(html,/Allowed approved truth claims: <strong>0<\/strong>/);
 assert.doesNotMatch(html,/api\.deepseek\.com/);
});
test('public path cannot access private preview and source with published status is refused',async()=>{
 const invalid=structuredClone(base);invalid.status='approved';
 const url='https://admin.panchavani.com/research/daily-brief?city=delhi&date=2026-10-16';
 const response=await handleDailyBrief(new Request(url),privateEnv(invalid),'owner');
 assert.equal(response.status,503);
 const html=await response.text();
 assert.doesNotMatch(html,/Shukla Panchami/);
});
