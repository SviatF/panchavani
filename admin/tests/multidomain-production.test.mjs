import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {canonical} from '../src/grounded-day-editorial.mjs';
import {handleMultiIntentConsole,validateTaskInput} from '../src/multidomain-route.mjs';
import {autoMultiIntentEditorial,loadSignedScience} from '../src/multidomain-production.mjs';

const SECRET='integration-fixture-independent-scientist-HMAC-not-a-live-key-xxxx';
const RITUAL='integration-fixture-separate-ritual-review-HMAC-not-a-live-key';
const NEXT='2026-10-25';
async function sign(pack){
 const unsigned=structuredClone(pack);unsigned.approval={algorithm:'HMAC-SHA256'};
 const secret=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(SECRET),
  {name:'HMAC',hash:'SHA-256'},false,['sign']);
 const sig=await webcrypto.subtle.sign('HMAC',secret,new TextEncoder().encode(canonical(unsigned)));
 pack.approval.signature=[...new Uint8Array(sig)].map(v=>v.toString(16).padStart(2,'0')).join('');
 return pack;
}
function science(){
 const date='2026-10-24';
 const labels={tithi:'Navami',karana:'Garaja',nakshatra:'Dhanishtha',
  yoga:'Ganda',vara:'Saturday',paksha:'Shukla Paksha'};
 return {schemaVersion:1,status:'SCIENCE_APPROVED_WITH_EVIDENCE',
   cityId:'delhi',date,timezone:'Asia/Kolkata',
   sourceRecordHash:'a'.repeat(64),
   scienceReview:{scientificReviewer:'Synthetic Independent Astronomer',
    methodVersion:'SYNTHETIC-ONLY-NOT-LIVE',approvedAt:'2026-10-24T15:00:00Z',
    independentComparisons:['synthetic-crosscheck-A','synthetic-crosscheck-B'],
    blockerCount:0,sourceIds:['synthetic-source-A','synthetic-source-B']},
   sun:{sunriseUtc:date+'T00:55:00Z',sunsetUtc:date+'T12:15:00Z',
    nextSunriseUtc:NEXT+'T00:55:00Z'},
   panchang:labels,
   transitions:Object.fromEntries(['tithi','karana','nakshatra','yoga']
    .map(kind=>[kind,[{name:labels[kind],startUtc:date+'T00:55:00Z',
      endUtc:NEXT+'T00:55:00Z'}]])),
   cityFacts:[
    {id:'city-observer',cityId:'delhi',
     statement:'The observing site used for the city is a selected reference point; locally modeled dawn must not be substituted by a nearby default city without disclosing its coordinates.',
     sourceUrl:'https://mausam.imd.gov.in/',sourceReferenceIds:['synthetic-source-A']},
    {id:'city-time-clock',cityId:'delhi',
     statement:'India Standard Time is a national civil-time clock whereas the astronomical sunrise is calculated for a precise geographic location and an agreed optical horizon model.',
     sourceUrl:'https://www.nplindia.res.in/',sourceReferenceIds:['synthetic-source-B']}
   ],festivalApproved:false,vratApproved:false,muhuratApproved:false,
   publicationAuthorized:false,indexingAuthorized:false,
   approval:{algorithm:'HMAC-SHA256',signature:'0'.repeat(64)}};
}
function prose(){
 return {headline:'How to read Delhi Panchang without losing the local context',
  introduction:'Readers in Delhi benefit from checking the reference place used by an almanac before comparing its headings against another source. The observer location determines how a particular calendar describes sunrise, so the geographic reference should be clear rather than silently borrowed from a different city.',
  localReasoning:'Delhi follows India Standard Time for civil clocks, but dawn is tied to the selected observation site and astronomical method. Reading a lunar phase transition alongside the local solar day involves different definitions. This distinction is most useful when two sources appear to disagree despite using the same national time convention.',
  readerQuestion:'Which checks can help a reader distinguish calendar convention differences from an actual astronomical disagreement?',
  readerAnswer:'Begin with the source location and stated sunrise definition. Next inspect whether the lunar event is displayed as a moment on the shared civil clock or assigned to a solar day according to a named observation rule. Where either reference is missing, treat the comparison as uncertain.',
  factIds:['city-observer','city-time-clock']};
}
class FakeR2 {
 map=new Map();
 async put(key,value){this.map.set(key,String(value))}
 async get(key){const x=this.map.get(key);return x===undefined?null:{text:async()=>x}}
}
class FakeD1 {
 science=new Map();slots=new Map();
 prepare(query){
  const self=this;const sql=query.replace(/\s+/g,' ').trim();
  const mk=args=>({
   async first(){
    if(sql.startsWith('SELECT source_hash,r2_key,state FROM science_approved_day_sources')){
      return self.science.get(args[0]+'/'+args[1])||null;
    }
    if(sql.startsWith('SELECT source_hash,r2_key FROM science_approved_day_sources')){
      return self.science.get(args[0]+'/'+args[1])||null;
    }
    if(sql.includes('FROM editorial_multi_intent_once WHERE id=?')){
      const row=self.slots.get(args[0]);return row||null;
    }
    if(sql.startsWith('SELECT (SELECT COUNT(*) FROM editorial_multi_intent_once')){
      return {n:self.slots.size};
    }
    throw Error('Unexpected fake D1 first: '+sql);
   },
   async all(){
    if(sql.includes('FROM editorial_multi_intent_once WHERE state=')){
      return {results:[...self.slots.values()].filter(x=>x.state==='stored')};
    }
    if(sql.includes('SELECT s.city_id,s.local_date FROM science_approved_day_sources'))
      return {results:[...self.science.values()].filter(row=>
        ![...self.slots.values()].some(x=>x.local_date===row.local_date&&x.city_id===row.city_id))
        .map(row=>({city_id:row.city_id,local_date:row.local_date}))};
    if(sql.includes('FROM science_approved_day_sources WHERE state='))return {results:[]};
    if(sql.includes('FROM independently_reviewed_rule_sources'))return {results:[]};
    throw Error('Unexpected fake D1 all: '+sql);
   },
   async run(){
    if(sql.startsWith('INSERT OR IGNORE INTO science_approved_day_sources')){
      const [city,day,hash,key]=args,k=city+'/'+day;
      if(self.science.has(k))return {meta:{changes:0}};
      self.science.set(k,{city_id:city,local_date:day,source_hash:hash,r2_key:key,state:'approved_for_draft'});
      return {meta:{changes:1}};
    }
    if(sql.startsWith('INSERT OR IGNORE INTO editorial_multi_intent_once')){
      const [id,city,intent,topic,day,month,language,sourceHash,actor]=args;
      if(self.slots.has(id)||self.slots.size>=3)return {meta:{changes:0}};
      self.slots.set(id,{id,city_id:city,intent,topic,local_date:day,month,language,
       source_hash:sourceHash,actor,state:'reserved',r2_key:null});
      return {meta:{changes:1}};
    }
    if(sql.startsWith('UPDATE editorial_multi_intent_once')){
      const [state,key,id,sha]=args,row=self.slots.get(id);
      if(!row||row.state!=='reserved'||row.source_hash!==sha)return {meta:{changes:0}};
      row.state=state;row.r2_key=key;return {meta:{changes:1}};
    }
    throw Error('Unexpected fake D1 run: '+sql);
   }
  });
  return {bind(...a){return mk(a)},first:async()=>mk([]).first(),all:async()=>mk([]).all(),run:async()=>mk([]).run()};
 }
}
function environment(){
 return {DB:new FakeD1(),CANDIDATES:new FakeR2(),
  PANCHAVANI_SCIENCE_APPROVAL_SECRET:SECRET,
  PANCHAVANI_RITUAL_APPROVAL_SECRET:RITUAL,
  DEEPSEEK_API_KEY:'private-test-deepseek-key',
  AUTO_MULTI_INTENT_EDITORIAL_ENABLED:'true'};
}
const form=values=>new Request('https://admin.panchavani.com/editorial/multi/'+values.path,{
 method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',
  'Origin':'https://admin.panchavani.com','Sec-Fetch-Site':'same-origin'},
 body:new URLSearchParams(values.fields)
});
const trusted=()=>true;
test('inputs reject malformed city, noncanonical dates, and rituals without topic',()=>{
 assert.throws(()=>validateTaskInput({intent:'festival',cityId:'delhi',month:'2026-10',
  date:'2026-10-24',topic:''}));
 assert.throws(()=>validateTaskInput({intent:'daily-panchang',cityId:'../delhi',
  month:'2026-10',date:'2026-10-24',topic:''}));
 assert.throws(()=>validateTaskInput({intent:'vrat',cityId:'delhi',month:'2026-10',
  date:'2026-10-24',topic:'ekadashi',dates:'2026-10-24,2026-10-24'}));
 const checked=validateTaskInput({intent:'vrat',cityId:'delhi',month:'2026-10',
  date:'2026-10-24',topic:'ekadashi',dates:'2026-10-24,2026-10-25'});
 assert.deepEqual(checked.dates,['2026-10-24','2026-10-25']);
});
test('forged evidence cannot enter research DB, and cross-site submits cannot bill model',async()=>{
 const env=environment();
 const f=science();const r=form({path:'science',fields:{pack:JSON.stringify(f)}});
 assert.equal((await handleMultiIntentConsole(r,env,'editor@internal',trusted)).status,409);
 assert.equal(env.DB.science.size,0);assert.equal(env.CANDIDATES.map.size,0);
 const denied=await handleMultiIntentConsole(form({path:'run',fields:{
  cityId:'delhi',intent:'daily-panchang',date:'2026-10-24',month:'2026-10',topic:''
 }}),env,'editor@internal',()=>false);
 assert.equal(denied.status,403);assert.equal(env.DB.slots.size,0);
});
test('signed day import -> verified science -> one private model draft -> no public permission',async()=>{
 const env=environment();
 const pack=await sign(science());
 const upload=await handleMultiIntentConsole(form({path:'science',fields:{
  pack:JSON.stringify(pack)}}),env,'editor@internal',trusted);
 assert.equal(upload.status,200);
 assert.equal((await upload.json()).status,'imported');
 const signed=await loadSignedScience(env,'delhi',['2026-10-24'],SECRET);
 assert.equal(signed.length,1);assert.equal(signed[0].sourceRecordHash,pack.sourceRecordHash);
 let calls=0;
 const provider=async()=>{
  calls++;
  return new Response(JSON.stringify({model:'deepseek-chat',usage:{total_tokens:345},
   choices:[{finish_reason:'stop',message:{content:JSON.stringify(prose())}}]}),{status:200});
 };
 const data={path:'run',fields:{cityId:'delhi',intent:'daily-panchang',
  month:'2026-10',date:'2026-10-24',topic:''}};
 const done=await handleMultiIntentConsole(form(data),env,'editor@internal',trusted,provider);
 const result=await done.json();
 assert.equal(done.status,200);
 assert.equal(result.attempted,1);
 assert.equal(calls,1);assert.equal(result.publicationAuthorized,false);
 assert.equal(result.indexingAuthorized,false);
 assert.equal(env.DB.slots.size,1);
 const first=[...env.DB.slots.values()][0];
 assert.equal(first.state,'stored');
 const prior=await handleMultiIntentConsole(form(data),env,'editor@internal',trusted,provider);
 assert.equal(prior.status,200);assert.equal((await prior.json()).attempted,0);
 assert.equal(calls,1,'one-shot paid retry must never happen');
 const obj=await env.CANDIDATES.get(first.r2_key);
 const stored=JSON.parse(await obj.text());
 assert.equal(stored.reviewStatus,'PENDING_INDEPENDENT_EDITOR_AND_SEO');
 assert.equal(stored.editorApproved,false);
 assert.equal(stored.seoApproved,false);
 assert.equal(stored.publicationAuthorized,false);
 const cron=await autoMultiIntentEditorial(env,provider);
 assert.equal(cron.attempted,0);assert.equal(calls,1);
});
test('new automated draft cycle is strictly dormant with no independently approved science',async()=>{
 const env=environment();let calls=0;
 const result=await autoMultiIntentEditorial(env,async()=>{calls++;throw Error('should not call')});
 assert.equal(result.attempted,0);assert.equal(calls,0);
 assert.equal(result.publicationAuthorized,false);
 env.AUTO_MULTI_INTENT_EDITORIAL_ENABLED='false';
 assert.equal((await autoMultiIntentEditorial(env)).status,'explicitly-disabled');
});
