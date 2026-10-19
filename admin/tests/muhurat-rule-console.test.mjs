import test from 'node:test';
import assert from 'node:assert/strict';
import {handleMuhuratRulesConsole,verifyMuhuratScreening} from '../src/muhurat-rule-console.mjs';
const URL='https://admin.panchavani.com/research/muhurat-rules';
const day='2026-10-20';
const key='ops/ten-city-six-limb/v1/2026-10-20/39244566772/sourced-rule-screening-UNAPPROVED.json';

function fixture(){
 const sample={cityId:'delhi',localDate:day,startIST:day+'T09:00:00+05:30',
  endIST:day+'T10:00:00+05:30',durationSeconds:3600,
  criteriaSatisfied:'REFERENCE_INITIAL_SCREEN_ONLY',
  expertApproved:false,auspiciousRecommendation:false};
 const profile=(id)=>({policyId:id,testedCityDays:20,inputPhaseSlices:100,
  initialSurvivingWindows:1,rawInitialMatches:[sample],
  filteredReasonsBySlice:{NOT_PREFERRED_MOVABLE_NAKSHATRA:55},
  remainingIndependentChecks:[
   'Independent city geometry','Asta validation','Lagna validation',
   'Ritual tradition verification','Expert review'
  ],
  qualifyingWeddingOrPurchaseMuhuratCount:0,approvedRitualWindows:[],
  muhuratRecommendationsAuthorized:false,approvedClaimsForDeepSeek:[]});
 return {
  artifactType:'PANCHAVANI_SOURCED_MUHURAT_RESEARCH_METRICS',schemaVersion:1,
  status:'SOURCE_GROUNDED_PRELIMINARY_SCREEN_ONLY',
  localDateFrom:day,cityCount:10,rulebookSha256:'a'.repeat(64),
  sourceGridSha256:'b'.repeat(64),
  metrics:{cityDaysValidated:20,phaseSlicesValidated:100,
   fourLimbLabelsValidated:400,maximumSunriseChainErrorSeconds:0,
   maximumDurationErrorSeconds:0},
  analysis:{wedding:profile('wedding-ref-v1'),
   'vehicle-purchase':profile('vehicle-ref-v1')},
  scientificApproval:false,independentRuleApproval:false,
  muhuratRecommendationsAuthorized:false,paidDeepSeekGenerationAuthorized:false,
  publicationAuthorized:false,indexingAuthorized:false,approvedClaimsForDeepSeek:[]
 };
}
const env=(data=fixture())=>({
 CANDIDATES:{
  list:async({prefix})=>({objects:[{key}],truncated:false}),
  get:async(_key)=>({text:async()=>JSON.stringify(data)}),
  put:async()=>{throw Error('read only contract')}
 }
});
test('Access-only valid report returns 20 city/day metrics and no approved Muhurat',async()=>{
 const r=await handleMuhuratRulesConsole(new Request(URL+'?date='+day+'&format=json'),env(),'owner');
 assert.equal(r.status,200);
 const x=await r.json();
 assert.equal(x.metrics.cityDaysValidated,20);
 assert.equal(x.analysis.wedding.initialSurvivingWindows,1);
 assert.equal(x.analysis.wedding.qualifyingWeddingOrPurchaseMuhuratCount,0);
 assert.equal(x.muhuratRecommendationsAuthorized,false);
 assert.equal(x.indexingAuthorized,false);
 assert.equal(x.approvedClaimsForDeepSeek.length,0);
 assert.match(r.headers.get('X-Robots-Tag'),/noindex/);
});
test('private dashboard explains vetoes and uncovered calculations',async()=>{
 const r=await handleMuhuratRulesConsole(new Request(URL+'?date='+day),env(),'owner');
 assert.equal(r.status,200);
 const html=await r.text();
 assert.match(html,/NOT A MUHURAT CALENDAR/);
 assert.match(html,/20 city\/days validated/);
 assert.match(html,/Wedding/i);
 assert.match(html,/NOT_PREFERRED_MOVABLE_NAKSHATRA/);
 assert.match(html,/Independent city geometry/);
 assert.match(html,/Asta validation/);
 assert.match(html,/Approved auspicious results: <strong>0<\/strong>/);
});
test('denies unauthenticated, non-GET and injection selectors before R2',async()=>{
 const e=env();
 assert.equal((await handleMuhuratRulesConsole(new Request(URL+'?date='+day),e,null)).status,403);
 assert.equal((await handleMuhuratRulesConsole(new Request(URL,{method:'POST'}),e,'owner')).status,405);
 for(const query of ['?date=bad','?date=2026-02-30','?date=2026-10-20&date=2026-10-20','?city=delhi','?format=html&format=json']){
  assert.equal((await handleMuhuratRulesConsole(new Request(URL+query),e,'owner')).status,400,query);
 }
 assert.equal(await handleMuhuratRulesConsole(new Request('https://admin.panchavani.com/unrelated'),e,'owner'),null);
});
test('fail closed on forged source approvals or invented auspicious times',async()=>{
 for(const modify of [
   x=>x.publicationAuthorized=true,
   x=>x.scientificApproval=true,
   x=>x.analysis.wedding.qualifyingWeddingOrPurchaseMuhuratCount=1,
   x=>x.analysis['vehicle-purchase'].approvedClaimsForDeepSeek.push('invent'),
   x=>x.analysis.wedding.rawInitialMatches[0].expertApproved=true,
   x=>x.analysis.wedding.rawInitialMatches[0].auspiciousRecommendation=true,
   x=>x.metrics.maximumSunriseChainErrorSeconds=2.4,
   x=>x.analysis.wedding.remainingIndependentChecks=[]
 ]){
  const r=fixture();modify(r);
  assert.throws(()=>verifyMuhuratScreening(r,day));
  const response=await handleMuhuratRulesConsole(new Request(URL+'?date='+day),env(r),'owner');
  assert.equal(response.status,503);
  assert.equal((await response.json()).indexingAuthorized,false);
 }
});
test('nonexistent private archive does not pretend zero raw matches',async()=>{
 const e=env();e.CANDIDATES.list=async()=>({objects:[],truncated:false});
 const r=await handleMuhuratRulesConsole(new Request(URL+'?date='+day),e,'owner');
 assert.equal(r.status,503);
 assert.match((await r.json()).error,/No complete sourced rule screen/);
});
