import test from 'node:test';
import assert from 'node:assert/strict';
import {runAutonomy} from '../src/autonomy.mjs';
import {
 autoGroundedDaily,durableDayStore,ensureDailySchema,recentGroundedDayCorpus,
 loadReviewedDayPacks
} from '../src/science-locked-day-storage.mjs';

test('new signed-day scheduler is disabled by default without D1 reads or paid calls',async()=>{
 let used=0;
 const env={DB:{prepare(){used++;throw Error('Should not open SQL')}},DEEPSEEK_API_KEY:'test-key-present'};
 const transport=()=>{throw Error('Never bill with flag off')};
 const result=await autoGroundedDaily(env,transport);
 assert.equal(result.status,'disabled-opt-in');
 assert.equal(result.attempted,0);
 assert.equal(used,0);
 const cron=await runAutonomy(env,Date.parse('2026-10-23T02:00:00Z'),transport);
 assert.equal(cron.daily.status,'disabled-opt-in');
 assert.equal(cron.draft.attempted,0);
 assert.equal(used,0);
 assert.equal(cron.indexingAuthorized,false);
 assert.equal(cron.publishingAuthorized,false);
});
test('explicit opt-in cannot bill without independent signed science secret',async()=>{
 let used=0;
 const env={
  AUTO_FACTUAL_DAILY_EDITORIAL_ENABLED:'true',
  DEEPSEEK_API_KEY:'test-provider-key-only',
  DB:{prepare(){used++;throw Error('No DB read permitted without approval key')}}
 };
 const output=await autoGroundedDaily(env,()=>{throw Error('Unreachable paid call')});
 assert.equal(output.status,'missing-independent-approval-or-model-secret');
 assert.equal(used,0);
});
test('D1 paid reservation claims one of three daily credits with an atomic INSERT',async()=>{
 const sqls=[],bindings=[];
 const env={
  DB:{prepare(sql){sqls.push(sql);return {bind(...args){
   bindings.push(args);return {async run(){return {meta:{changes:1}}}};};
  }}},
  CANDIDATES:{put:async()=>{throw Error('Not used in reserve')}}
 };
 const store=durableDayStore(env);
 assert.equal(await store.reserve('delhi/2026-10-21/en/'+ 'a'.repeat(64),'a'.repeat(64)),true);
 assert.match(sqls[0],/INSERT OR IGNORE INTO science_locked_editorial_once/);
 assert.match(sqls[0],/SELECT \?,\?,\?,\?,\?,'reserved' WHERE/);
 assert.match(sqls[0],/COUNT\(\*\) FROM science_locked_editorial_once/);
 assert.match(sqls[0],/COUNT\(\*\) FROM editorial_one_shot/);
 assert.match(sqls[0],/< 3/);
 assert.deepEqual(bindings[0].slice(0,4),['delhi','2026-10-21','en','a'.repeat(64)]);
 assert.equal(bindings[0][5],'panchavani-cron@internal');
});
test('private source retrieval is impossible for arbitrary R2 path',async()=>{
 let reads=0;
 const env={DB:{prepare(){return {bind(){return {async all(){return {
  results:[{city_id:'delhi',local_date:'2026-10-21',source_hash:'a'.repeat(64),r2_key:'unapproved/evil.json'}]
 }}}}}}},CANDIDATES:{get(){reads++;throw Error('Must never fetch unapproved object')}}};
 await assert.rejects(loadReviewedDayPacks(env,'x'.repeat(35)),/Invalid independent reviewer R2 reference/);
 assert.equal(reads,0);
});
test('private previous editorials are evidence integrity checked before new generation',async()=>{
 const rows=[{city_id:'delhi',local_date:'2026-10-21',
   r2_key:'unapproved/grounded-day/delhi/2026-10-21/test.json'}];
 const env={DB:{prepare(){return {all:async()=>({results:rows})}}},
  CANDIDATES:{get:async()=>({text:async()=>JSON.stringify({
   cityId:'delhi',date:'2026-10-21',reviewStatus:'NEEDS_HUMAN_EDITOR_REVIEW',
   publicationAuthorized:false,indexingAuthorized:false,editorial:{headline:'Test'}
  })})}};
 const result=await recentGroundedDayCorpus(env);
 assert.equal(result.length,1);
 assert.equal(result[0].cityId,'delhi');
 env.CANDIDATES.get=async()=>({text:async()=>JSON.stringify({
  cityId:'mumbai',date:'2026-10-21',reviewStatus:'NEEDS_HUMAN_EDITOR_REVIEW',
  publicationAuthorized:false,indexingAuthorized:false
 })});
 await assert.rejects(recentGroundedDayCorpus(env),/identity invalid/);
});
