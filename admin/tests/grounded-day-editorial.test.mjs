import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {
 canonical,verifySciencePack,factpackIssues,scienceFacts,editorialPrompt,
 auditProse,buildPrivateDraft,similarity
} from '../src/grounded-day-editorial.mjs';

const SECRET='synthetic-only-approval-key-do-not-use-in-production-12345678';
function sample(cityId='delhi',date='2026-10-21'){
 const start=date+'T00:55:00Z';
 const end='2026-10-22T00:55:00Z';
 const p={tithi:'Dashami',karana:'Garaja',nakshatra:'Dhanishtha',
   yoga:'Ganda',vara:'Wednesday',paksha:'Krishna Paksha'};
 return {schemaVersion:1,status:'SCIENCE_APPROVED_WITH_EVIDENCE',
   cityId,date,timezone:'Asia/Kolkata',sourceRecordHash:'a'.repeat(64),
   scienceReview:{scientificReviewer:'Synthetic Test Scientist',
     methodVersion:'synthetic-method-for-tests-only',
     approvedAt:'2026-10-22T10:00:00Z',blockerCount:0,
     independentComparisons:['fixture-study-1','fixture-study-2'],
     sourceIds:['synthetic-source-1','synthetic-source-2']},
   sun:{sunriseUtc:start,sunsetUtc:date+'T12:15:00Z',nextSunriseUtc:end},
   panchang:p,transitions:Object.fromEntries(
     ['tithi','karana','nakshatra','yoga'].map(kind=>[kind,
      [{name:p[kind],startUtc:start,endUtc:end}]])),
   cityFacts:[
     {id:'city-geo-source',cityId,statement:'The selected reference location is the observer point for the local sunrise used on this specific calendar day, with geodata supplied by an independent geographic source.',
      sourceUrl:'https://example.org/geographic-reference',sourceReferenceIds:['synthetic-source-1']},
     {id:'city-method-source',cityId,statement:'This city date must be read using the stated sunrise convention and an accurately converted India Standard Time clock, with separate civil and solar-day boundaries.',
      sourceUrl:'https://example.org/calendar-method',sourceReferenceIds:['synthetic-source-2']}
   ],festivalApproved:false,vratApproved:false,muhuratApproved:false,
   publicationAuthorized:false,indexingAuthorized:false,
   approval:{algorithm:'HMAC-SHA256',signature:'0'.repeat(64)}};
}
async function sign(pack){
 const {signature,...rest}=pack.approval;
 const canon=canonical({...pack,approval:rest});
 const key=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(SECRET),
  {name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await webcrypto.subtle.sign('HMAC',key,new TextEncoder().encode(canon)));
 pack.approval.signature=[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
 return pack;
}
function prose(city='Delhi'){
 return {
  headline:'Reading the local Panchang with care',
  opening:'Readers who compare different Panchang sources should first identify the location used for the local sunrise. This provides the correct reference for understanding a sunrise based date rather than treating a civil clock boundary as equivalent to dawn.',
  localExplanation:'For '+city+', the city reference point defines the solar day while the lunar component boundaries follow a separate astronomical process. Comparing the stated observation location and conversion method helps explain why summaries can differ without assuming that the lunar event itself changes location.',
  readerQuestion:'How should a reader compare a solar day against an astronomical transition?',
  readerAnswer:'Start with the location given by each source and check the method used to describe sunrise. Then distinguish the clock time of an astronomical transition from the rule that connects it with a particular calendar day. This allows a careful comparison without guessing any religious observance.',
  factIds:['city-geo-source','city-method-source']
 };
}
test('cryptographic independent scientific permission is necessary and immutable',async()=>{
 const a=await sign(sample());
 assert.deepEqual(factpackIssues(a),[]);
 await assert.doesNotReject(()=>verifySciencePack(a,SECRET));
 await assert.rejects(()=>verifySciencePack(a,'wrong-secret-which-is-long-but-cannot-pass-signature'),/signature mismatch/);
 a.sun.sunriseUtc='2026-10-21T00:56:00Z';
 await assert.rejects(()=>verifySciencePack(a,SECRET),/signature mismatch/);
});
test('rejects fake astronomical release, missing origin and broken phases',()=>{
 for(const change of ['unreviewed','coordinates','missing-facts','broken-phase','missing-k','ritual','wrong-day']){
  const p=sample();
  if(change==='unreviewed')p.status='UNAPPROVED_RESEARCH';
  if(change==='coordinates')p.cityId='unknown';
  if(change==='missing-facts')p.cityFacts.pop();
  if(change==='broken-phase')p.transitions.yoga[0].endUtc='2026-10-21T12:00:00Z';
  if(change==='missing-k')delete p.panchang.karana;
  if(change==='ritual')p.muhuratApproved=true;
  if(change==='wrong-day')p.sun.sunriseUtc='2026-10-22T00:55:00Z';
  assert.ok(factpackIssues(p).length>0,change);
 }
});
test('DeepSeek prompt excludes six numeric values, times and every lunar phase name',()=>{
 const p=sample(),m=editorialPrompt(p);
 assert.equal(m.length,2);
 const full=JSON.stringify(m);
 for(const value of ['00:55','12:15','Dashami','Garaja','Dhanishtha','Ganda','2026-10-21']){
  assert.ok(!full.includes(value),'Leaking scientific input to prose model: '+value);
 }
 assert.match(full,/city-geo-source/);
 assert.match(full,/editor/);
 const facts=scienceFacts(p);
 assert.equal(facts.panchang.tithi,'Dashami');
 assert.equal(facts.sun.sunrise,'06:25 IST');
});
test('draft with true source IDs remains private and needs a human editor',()=>{
 const p=sample();
 const candidate=prose();
 assert.deepEqual(auditProse(candidate,p),[]);
 const result=buildPrivateDraft(p,candidate);
 assert.equal(result.reviewStatus,'NEEDS_HUMAN_EDITOR_REVIEW');
 assert.equal(result.publicationAuthorized,false);
 assert.equal(result.indexingAuthorized,false);
 assert.equal(result.factualDisplay.panchang.karana,'Garaja');
 assert.equal(result.scientificReviewerSignatureVerified,false);
});
test('AI hallucinated timestamps, other city, rituals or unsupported citations fail',()=>{
 const list=[
  ['clock',x=>{x.opening+=' Sunrise is at 06:25 IST.'}],
  ['wrongCity',x=>{x.localExplanation+=' In Mumbai the result differs.'}],
  ['ritual',x=>{x.readerAnswer+=' This is an auspicious day.'}],
  ['source',x=>{x.factIds=['fake-source','city-method-source']}],
  ['junk',x=>{x.opening+=' Cosmic harmony guarantees luck.'}],
  ['markup',x=>{x.readerQuestion='<script>Alert</script>'}],
  ['model-fields',x=>{x.calendarDate='2026-10-21'}]
 ];
 for(const [name,change] of list){
   const draft=prose();change(draft);
   assert.ok(auditProse(draft,sample()).length>0,name);
 }
});
test('recognizes city-swapped articles and identical city/date duplicate',()=>{
 const p=sample();
 const draft=prose();
 assert.equal(similarity('In Delhi check solar day carefully',
                          'In Mumbai check solar day carefully'),1);
 assert.ok(auditProse(draft,p,[{cityId:'mumbai',date:'2026-10-21',
    draft:prose('Mumbai')}]).includes('near-duplicate-narration-across-city-days'));
 assert.ok(auditProse(draft,p,[{cityId:'delhi',date:'2026-10-21',
    draft:prose()}]).includes('duplicate-city-day-generation'));
});
