import test from 'node:test';
import assert from 'node:assert/strict';
import {handleMuhuratWindowConsole,verifyPrivateGrid} from '../src/muhurat-window-console.mjs';

const cities=['delhi','mumbai','kolkata','chennai','bengaluru','hyderabad','ahmedabad','pune','jaipur','varanasi'];
const day='2026-10-20';
const base='https://admin.panchavani.com/research/muhurat-windows';
const name='ops/ten-city-six-limb/v1/2026-10-20/39224447314/muhurat-interval-grid-UNAPPROVED.json';
function fixture(){
 const rows=[];
 for(const date of ['2026-10-20','2026-10-21'])for(const city of cities)
  rows.push({cityId:city,localDate:date,
    modeledSunriseIST:date+'T06:00:00+05:30',
    modeledSunsetIST:date+'T18:00:00+05:30',
    windowCount:1,traditionRuleApplied:false,scientificApproval:false,indexingAuthorized:false,
    windows:[{startIST:date+'T06:00:00+05:30',endIST:date+'T06:10:00+05:30',
     durationSeconds:600,auspiciousRecommendation:false,ritualEligibilityDetermined:false,
     elements:{tithi:{name:'Test Tithi'},karana:{name:'Test Karana'},
       nakshatra:{name:'Test Star'},yoga:{name:'Test Yoga'}}}]
  });
 return {artifactType:'PANCHAVANI_TEN_CITY_FOUR_LIMB_INTERSECTION_GRID',
  status:'UNAPPROVED_RESEARCH',cityCount:10,cityDays:20,localDateFrom:day,
  scientificApproval:false,muhuratRecommendationsAuthorized:false,
  paidDeepSeekGenerationAuthorized:false,publicationAuthorized:false,
  indexingAuthorized:false,approvedClaimsForDeepSeek:[],windows:rows};
}
function env(data=fixture(),key=name){
 const reads=[];
 const writes=[];
 const e={CANDIDATES:{
  list:async({prefix,limit})=>{reads.push({type:'list',prefix,limit});return {objects:[{key}],truncated:false};},
  get:async(k)=>{reads.push({type:'get',key:k});return {text:async()=>JSON.stringify(data)};},
  put:async(...args)=>{writes.push(args);throw Error('UNEXPECTED WRITE')}
 }};
 return {env:e,reads,writes};
}
test('authenticated private JSON yields exactly selected two dates, no model or public permission',async()=>{
 const {env:e,reads,writes}=env();
 const response=await handleMuhuratWindowConsole(new Request(base+'?date='+day+'&city=mumbai&format=json'),e,'owner@private');
 assert.equal(response.status,200);
 const x=await response.json();
 assert.equal(x.days.length,2);
 assert.equal(x.cityId,'mumbai');
 assert.ok(x.days.every(y=>y.cityId==='mumbai'));
 assert.equal(x.days[0].windows[0].elements.nakshatra.name,'Test Star');
 assert.equal(x.indexingAuthorized,false);
 assert.equal(x.muhuratRecommendationsAuthorized,false);
 assert.deepEqual(x.approvedClaimsForDeepSeek,[]);
 assert.equal(writes.length,0);
 assert.equal(reads[0].prefix,'ops/ten-city-six-limb/v1/'+day+'/');
 assert.match(response.headers.get('X-Robots-Tag'),/noindex/);
});
test('private HTML page is comprehensible and never calls public Worker',async()=>{
 const {env:e}=env();
 const r=await handleMuhuratWindowConsole(new Request(base+'?date='+day+'&city=delhi'),e,'owner');
 assert.equal(r.status,200);
 const html=await r.text();
 assert.match(html,/Four-limb research intersections/);
 assert.match(html,/RESEARCH ONLY/);
 assert.match(html,/NOT.*?<|neither Wedding nor Vehicle Purchase/i);
 assert.match(html,/Test Tithi/);
 assert.match(html,/Test Yoga/);
 assert.match(html,/name="date"/);
 assert.match(html,/muhurat-interval-grid-UNAPPROVED/);
});
test('route cannot expose private R2 without Access',async()=>{
 const {env:e,reads}=env();
 const r=await handleMuhuratWindowConsole(new Request(base+'?date='+day+'&format=json'),e,null);
 assert.equal(r.status,403);
 assert.equal(reads.length,0);
 assert.equal((await r.json()).error,'Cloudflare Access required');
 assert.equal(await handleMuhuratWindowConsole(new Request('https://admin.panchavani.com/other'),e,'owner'),null);
 const w=await handleMuhuratWindowConsole(new Request(base,{method:'POST'}),e,'owner');
 assert.equal(w.status,405);
});
test('invalid and duplicate selectors never read stored science',async()=>{
 const {env:e,reads}=env();
 for(const suffix of ['?city=bad','?date=2026-02-30','?format=csv',
   '?date=2026-10-20&date=2026-10-20','?city=delhi&city=mumbai','?publish=true']){
  const r=await handleMuhuratWindowConsole(new Request(base+suffix),e,'owner');
  assert.equal(r.status,400,suffix);
 }
 assert.equal(reads.length,0);
});
test('tampered approval and incomplete city or time slice fail closed',async()=>{
 const original=fixture();
 for(const mutate of [
  d=>{d.indexingAuthorized=true},
  d=>{d.windows.pop()},
  d=>{d.windows[0].traditionRuleApplied=true},
  d=>{d.windows[0].windows[0].auspiciousRecommendation=true},
  d=>{d.approvedClaimsForDeepSeek=['fake']},
  d=>{d.windows[0].windows[0].elements.yoga.name=''}
 ]){
  const clone=structuredClone(original);
  mutate(clone);
  assert.throws(()=>verifyPrivateGrid(clone,day));
  const {env:e}=env(clone);
  const r=await handleMuhuratWindowConsole(new Request(base+'?date='+day),e,'owner');
  assert.equal(r.status,503);
  assert.equal((await r.json()).indexingAuthorized,false);
 }
});
test('missing R2 mirror explicitly returns unavailable without inventing any date recommendations',async()=>{
 const {env:e}=env();
 e.CANDIDATES.list=async()=>({objects:[],truncated:false});
 const r=await handleMuhuratWindowConsole(new Request(base+'?date='+day),e,'owner');
 assert.equal(r.status,503);
 assert.equal((await r.json()).latestResearchAvailable,false);
});
