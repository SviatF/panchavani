import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {canonical} from '../src/grounded-day-editorial.mjs';
import {
 compileEditorialAssignment,verifyRitualReview,auditMultiIntentProse,
 privateMultiIntentDraft
} from '../src/multidomain-editorial-engine.mjs';
import {runMultiIntentEditorialBatch} from '../src/multidomain-editorial-batch.mjs';

const SECRET='synthetic-cryptographic-science-review-fixture-secret-not-live-xxx';
const RITUAL_SECRET='synthetic-separate-ritual-review-fixture-secret-not-live-xxx';
const iso=(y,m,d)=>[y,String(m).padStart(2,'0'),String(d).padStart(2,'0')].join('-');
const tomorrow=day=>new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString().slice(0,10);
async function signature(obj,secret){
 const key=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(secret),
  {name:'HMAC',hash:'SHA-256'},false,['sign']);
 const body=canonical(obj);
 const bytes=await webcrypto.subtle.sign('HMAC',key,new TextEncoder().encode(body));
 return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function sample(cityId='delhi',date='2027-02-01',digit='a'){
 const p={tithi:'Dashami',karana:'Garaja',nakshatra:'Dhanishtha',
  yoga:'Ganda',vara:'Monday',paksha:'Krishna Paksha'};
 return {schemaVersion:1,status:'SCIENCE_APPROVED_WITH_EVIDENCE',
  cityId,date,timezone:'Asia/Kolkata',sourceRecordHash:digit.repeat(64),
  scienceReview:{scientificReviewer:'Synthetic Scientific Reviewer',
   methodVersion:'synthetic-no-astronomy-in-tests',
   approvedAt:'2027-03-01T12:00:00Z',blockerCount:0,
   independentComparisons:['synthetic-independent-one','synthetic-independent-two'],
   sourceIds:['synthetic-source-one','synthetic-source-two']},
  sun:{sunriseUtc:date+'T00:55:00Z',sunsetUtc:date+'T12:15:00Z',
   nextSunriseUtc:tomorrow(date)+'T00:55:00Z'},
  panchang:p,transitions:Object.fromEntries(['tithi','karana','nakshatra','yoga']
   .map(k=>[k,[{name:p[k],startUtc:date+'T00:55:00Z',
    endUtc:tomorrow(date)+'T00:55:00Z'}]])),
  cityFacts:[
   {id:'local-geography',cityId,
    statement:'Delhi local reference point must be disclosed so readers can compare dawn intervals with the selected city observation point and avoid substituting a regional default.',
    sourceUrl:'https://mausam.imd.gov.in/',sourceReferenceIds:['synthetic-source-one']},
   {id:'local-time-method',cityId,
    statement:'Indian Standard Time has a national civil reference even though astronomical sunrise depends on local observer coordinates, altitude and chosen optical horizon conditions.',
    sourceUrl:'https://www.nplindia.res.in/',sourceReferenceIds:['synthetic-source-two']}
  ],
  festivalApproved:false,vratApproved:false,muhuratApproved:false,
  publicationAuthorized:false,indexingAuthorized:false,
  approval:{algorithm:'HMAC-SHA256',signature:'0'.repeat(64)}};
}
async function approvedPack(city='delhi',date='2027-02-01',digit='a'){
 const p=sample(city,date,digit);
 const copy=structuredClone(p);copy.approval={algorithm:'HMAC-SHA256'};
 p.approval.signature=await signature(copy,SECRET);
 return p;
}
async function approvedMonth(){
 const out=[];
 for(let day=1;day<=28;day++){
  const chars='0123456789abcdefghijklmnopqr'.split('');
  out.push(await approvedPack('delhi',iso(2027,2,day),chars[day]));
 }
 return out;
}
async function approvedRitual(packs){
 const x={schemaVersion:1,status:'EXPERT_REVIEWED_RULE_EVALUATION',
  intent:'festival',cityId:'delhi',topic:'diwali',
  review:{approvedAt:'2027-03-02T12:00:00Z',
   reviewer:'Independent Ritual Source Researcher',blockerCount:0,
   reviewType:'independent-tradition-and-astronomy',
   sourceUrls:['https://mausam.imd.gov.in/','https://www.nplindia.res.in/']},
  scienceHashes:packs.map(x=>x.sourceRecordHash),
  verifiedRuleFindings:[{id:'rule-claimed-and-reviewed',
   statement:'This synthetically reviewed study explains which specific festival observance tradition a reader has selected.',
   sourceUrl:'https://www.nplindia.res.in/'}],
  publicationAuthorized:false,indexingAuthorized:false,
  approval:{algorithm:'HMAC-SHA256',signature:'0'.repeat(64)}
 };
 const copy=structuredClone(x);copy.approval={algorithm:'HMAC-SHA256'};
 x.approval.signature=await signature(copy,RITUAL_SECRET);
 return x;
}
const taskData=(packs,intent='daily-panchang')=>({intent,cityId:'delhi',
 packs,scienceSecret:SECRET,language:'en'});
function draft(){
 return {headline:'How Delhi readers should compare a local Panchang',
  introduction:'Readers in Delhi benefit from beginning with the observer location, rather than comparing calendar headings without checking the astronomical reference used. The chosen reference point determines which sunrise a source is actually describing.',
  localReasoning:'Delhi has a civil time convention shared with the country, but local dawn remains a property of the specified observing point. A useful explanation distinguishes an astronomical transition from the separate calendar rule that assigns an event to a particular sunrise. Checking that method is more informative than repeating stock calendar descriptions.',
  readerQuestion:'How can a local reader evaluate apparently different calendar reports from independent publishers?',
  readerAnswer:'First inspect the source geography and the clock convention, then separate the timing of the astronomical event from the observance rule. When the source cannot establish its observer point or selected method, treat any proposed conclusion as unresolved rather than choosing the more convenient claim.',
  factIds:['local-geography','local-time-method']};
}
test('one authenticated day can produce prose task but NO auto-approved page',async()=>{
 const p=await approvedPack();
 const task=await compileEditorialAssignment(taskData([p]));
 assert.equal(task.intent,'daily-panchang');
 assert.equal(task.lockedScientificDays.length,1);
 assert.equal(task.date,'2027-02-01');
 assert.equal(task.publicationAuthorized,false);
 assert.equal(task.indexingAuthorized,false);
 assert.equal(task.editorialApproved,false);
 assert(!task.modelMessages[1].content.includes('Dashami'));
 assert(!task.modelMessages[1].content.includes('2027-02-01'));
 assert.equal(task.allowedFactIds.length,2);
 const result=privateMultiIntentDraft(task,draft());
 assert.deepEqual(result.qualityIssues,[]);
 assert.equal(result.reviewStatus,'PENDING_INDEPENDENT_EDITOR_AND_SEO');
 assert.equal(result.publicationAuthorized,false);
});
test('complete February month requires signed day-by-day science and sun continuity',async()=>{
 const packs=await approvedMonth();
 const task=await compileEditorialAssignment(taskData(packs,'calendar-month'));
 assert.equal(task.lockedScientificDays.length,28);
 assert.equal(task.month,'2027-02');
 await assert.rejects(()=>compileEditorialAssignment(taskData(packs.slice(1),'calendar-month')),/every independently approved/);
 const altered=structuredClone(packs);altered[12].sun.sunriseUtc='2027-02-13T00:56:00Z';
 await assert.rejects(()=>compileEditorialAssignment(taskData(altered,'calendar-month')),/authenticity|signature/i);
});
test('festival rule must be separately reviewed and signed, cannot borrow science alone',async()=>{
 const pack=await approvedPack();
 await assert.rejects(()=>compileEditorialAssignment({...taskData([pack],'festival'),topic:'diwali'}),/reviewed tradition/);
 const rule=await approvedRitual([pack]);
 const task=await compileEditorialAssignment({...taskData([pack],'festival'),topic:'diwali',rulePack:rule,ruleSecret:RITUAL_SECRET});
 assert.equal(task.lockedRuleFindings.length,1);
 assert.equal(task.publicationAuthorized,false);
 assert(!task.modelMessages[1].content.includes('2027-02-01'));
 const broken=structuredClone(rule);broken.verifiedRuleFindings[0].statement='Fabricated different event';
 await assert.rejects(()=>compileEditorialAssignment({...taskData([pack],'festival'),topic:'diwali',rulePack:broken,ruleSecret:RITUAL_SECRET}),/signature/);
 const wrong=structuredClone(rule);wrong.scienceHashes=['b'.repeat(64)];
 await assert.rejects(()=>compileEditorialAssignment({...taskData([pack],'festival'),topic:'diwali',rulePack:wrong,ruleSecret:RITUAL_SECRET}));
});
test('bad AI drafts are rejected: fabricated digits, wrong city and city-swap filler',async()=>{
 const task=await compileEditorialAssignment(taskData([await approvedPack()]));
 assert.deepEqual(auditMultiIntentProse(draft(),task),[]);
 const v=draft();v.localReasoning+=' On 5 May 2027 at 14:20 the lucky timing is guaranteed.';
 assert(auditMultiIntentProse(v,task).includes('unsafe-numeric-or-ritual-model-claim'));
 const other=draft();other.localReasoning=other.localReasoning.replace('Delhi','Mumbai');
 assert(auditMultiIntentProse(other,task).includes('other-city-hallucination'));
 const copied=auditMultiIntentProse(draft(),task,[{scienceHash:'b'.repeat(64),draft:draft()}]);
 assert(copied.includes('near-duplicate-city-or-topic-editorial'));
});
test('billable batch defaults to ZERO and never publishes even valid drafted prose',async()=>{
 const pack=await approvedPack();
 const jobs=[taskData([pack])];
 const saved=[],store={reserve:async()=>{throw Error('not permitted without quota')},save:async(k,v)=>saved.push(v)};
 const result=await runMultiIntentEditorialBatch({jobs,scienceSecret:SECRET,store});
 assert.equal(result.attempted,0);assert.equal(saved.length,0);
 assert.equal(result.skippedBudget,1);
 assert.equal(result.publicationAuthorized,false);
 await assert.rejects(()=>runMultiIntentEditorialBatch({jobs,scienceSecret:SECRET,store,maxRequests:4}),/quota/);
});
