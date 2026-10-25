import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {summarizeEditorialReadiness,handleEditorialReadiness} from '../src/editorial-readiness.mjs';
import {createEditorialReviewHandoff} from '../src/editorial-review-handoff.mjs';

const ID='e'.repeat(64),SOURCE='a'.repeat(64);
test('monthly readiness shows exact gaps, never public authorization',()=>{
 const data=summarizeEditorialReadiness('2026-10',
  [{city_id:'delhi',n:3}],
  [{city_id:'delhi',intent:'daily-panchang',state:'stored',n:2}],
  [{city_id:'delhi',intent:'festival',n:1}]);
 const delhi=data.cities.find(x=>x.cityId==='delhi');
 const mumbai=data.cities.find(x=>x.cityId==='mumbai');
 assert.equal(delhi.signedDays,3);
 assert.equal(delhi.storedDrafts,2);
 assert.equal(delhi.reviewedRuleSets,1);
 assert.equal(delhi.completeSourceDayCount,false);
 assert(delhi.blockers.includes('calendar-month-science-incomplete'));
 assert(mumbai.blockers.includes('independently-signed-science-missing'));
 assert.equal(data.summary.signedScienceDays,3);
 assert.equal(data.summary.privateDrafts,2);
 assert.equal(data.indexingAuthorized,false);
 assert.throws(()=>summarizeEditorialReadiness('2026-02',[{city_id:'delhi',n:30}],[],[]));
});
test('readiness is private GET-only and D1 failures return 503, never zero-filled success',async()=>{
 const unauth=await handleEditorialReadiness(
  new Request('https://admin.panchavani.com/editorial/readiness'),{},null);
 assert.equal(unauth.status,403);
 const method=await handleEditorialReadiness(
  new Request('https://admin.panchavani.com/editorial/readiness',{method:'POST'}),{},'operator');
 assert.equal(method.status,405);
 const bad=await handleEditorialReadiness(
  new Request('https://admin.panchavani.com/editorial/readiness.json?month=2026-13'),{},'operator');
 assert.equal(bad.status,400);
 const broken=await handleEditorialReadiness(
  new Request('https://admin.panchavani.com/editorial/readiness.json?month=2026-10'),{},'operator');
 assert.equal(broken.status,503);
 let calls=0;
 const env={DB:{prepare(){return{bind(){return{async all(){calls++;return{results:[]}}}}}}}};
 const ok=await handleEditorialReadiness(
  new Request('https://admin.panchavani.com/editorial/readiness.json?month=2026-10'),env,'operator');
 assert.equal(ok.status,200);assert.equal(calls,3);
 const report=await ok.json();
 assert.equal(report.summary.privateDrafts,0);
 assert.equal(report.summary.cityCount,10);
 assert.equal(report.publicationAuthorized,false);
 assert.equal(ok.headers.get('X-Robots-Tag'),'noindex,nofollow,noarchive');
});
async function digest(raw){
 const data=await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
 return [...new Uint8Array(data)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function fakeHandoff({tamper=false}={}){
 const document={artifactType:'PANCHAVANI_MULTIDOMAIN_PRIVATE_DRAFT',
  cityId:'delhi',intent:'daily-panchang',topic:'daily-panchang',
  month:'2026-10',date:'2026-10-25',scienceHash:SOURCE,
  qualityIssues:[],reviewStatus:'PENDING_INDEPENDENT_EDITOR_AND_SEO',
  scientificDays:[{cityId:'delhi',date:'2026-10-25',sourceRecordHash:SOURCE,
   references:[{id:'city-observer',statement:'Review a local observing point.',
     sourceUrl:'https://example.org/a'}]}],
  ruleFindings:[],draft:{factIds:['city-observer'],headline:'Delhi readers can check local dawn'},
  publicationAuthorized:false,indexingAuthorized:false,editorApproved:false,seoApproved:false};
 const raw=JSON.stringify(document);
 const hash=await digest(raw);
 const r2Key='unapproved/multidomain/'+ID+'/'+hash+'.json';
 return{env:{
  DB:{prepare(){return{bind(){return{async first(){return{
   id:ID,city_id:'delhi',intent:'daily-panchang',topic:'daily-panchang',
   local_date:'2026-10-25',month:'2026-10',language:'en',
   source_hash:SOURCE,r2_key:r2Key,state:'stored'
  }}}}}}}},
  CANDIDATES:{async get(){return{text:async()=>tamper?raw+' ':raw}}}
 },document};
}
test('hash-verified draft gives human review worksheet but no auto-approval',async()=>{
 const {env}=await fakeHandoff();
 const report=await createEditorialReviewHandoff(env,ID);
 assert.equal(report.artifactType,'PANCHAVANI_PRIVATE_HUMAN_REVIEW_HANDOFF');
 assert.equal(report.scientificDays.length,1);
 assert.equal(report.indexingAuthorized,false);
 assert.equal(report.readyForPublicManifest,false);
 assert(report.humanReviewChecklist.length>=4);
});
test('tampered R2 drafts fail closed and never become handoff data',async()=>{
 const {env}=await fakeHandoff({tamper:true});
 await assert.rejects(createEditorialReviewHandoff(env,ID),/hash check failed/);
 await assert.rejects(createEditorialReviewHandoff(env,'../secret'));
});
