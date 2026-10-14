import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PILOT_CITY_IDS, readiness, futureIndianDate,
  enqueuePilot, autoDraftOnce, runAutonomy
} from '../src/autonomy.mjs';

test('DeepSeek key alone does NOT enable automated research or paid drafts',async()=>{
 const env={DEEPSEEK_API_KEY:'test-only-123456789'};
 let calls=0;
 const output=await runAutonomy({
  ...env,DB:{prepare(){calls++;throw Error('Should never use D1')}}
 },Date.parse('2026-10-14T08:00:00Z'),()=>{throw Error('Never call DeepSeek')});
 assert.equal(output.ready.researchEnabled,false);
 assert.equal(output.ready.editorialEnabled,false);
 assert.equal(output.queue.queued,0);
 assert.equal(output.draft.attempted,0);
 assert.equal(calls,0);
 assert.equal(output.indexingAuthorized,false);
});

test('scheduled tomorrow is based on the INDIA civil day, not UTC date',()=>{
 assert.equal(futureIndianDate(Date.parse('2026-10-13T20:00:00Z')),'2026-10-15');
 assert.equal(futureIndianDate(Date.parse('2026-10-13T05:00:00Z')),'2026-10-14');
 assert.deepEqual(PILOT_CITY_IDS,['delhi','mumbai','chennai']);
});

test('status distinguishes Cron flags, secret presence and Runner readiness',()=>{
 const env={DB:{},CANDIDATES:{},DEEPSEEK_API_KEY:'x'.repeat(40),
            AUTO_RESEARCH_ENABLED:'true',AUTO_EDITORIAL_ENABLED:'true'};
 assert.equal(readiness(env).draftOperational,true);
 assert.equal(readiness(env).researchOperational,false);
 env.RUNNER_HMAC_SECRET='x'.repeat(35);
 assert.equal(readiness(env).researchOperational,true);
 assert.equal(readiness(env).note.includes('does not verify'),true);
});

test('enqueue creates only three pilot cities once for the same local date, no requeue on overlap',async()=>{
 const slotIds=new Set(),rows=[];
 const db={
  prepare(sql){
   return {bind(...args){
    return {async first(){assert.ok(sql.includes('COUNT(*)'));return {n:0}}};
   }};
  },
  async batch(stmts){
   assert.equal(stmts.length,3);
   assert.match(stmts[0].sql,/INSERT INTO job_requests/);
   assert.match(stmts[1].sql,/autonomous_research_slots/);
   const [id,city,day]=stmts[0].args;
   const key=city+'/'+day;
   if(slotIds.has(key))return [{meta:{changes:0}},{meta:{changes:0}},{meta:{changes:0}}];
   slotIds.add(key);rows.push({id,city,day});
   return [{meta:{changes:1}},{meta:{changes:1}},{meta:{changes:1}}];
  },
 };
 // D1 fake statements expose sql/args like prepared statements.
 db.prepare=sql=>({
  bind(...args){
   return {
    sql,args,
    async first(){if(sql.includes('COUNT(*)'))return {n:0};throw Error('Wrong SQL')}
   };
  }
 });
 const env={DB:db};
 const date=Date.parse('2026-10-14T01:00:00Z');
 assert.equal((await enqueuePilot(env,date)).queued,3);
 assert.equal((await enqueuePilot(env,date)).queued,0);
 assert.equal(rows.length,3);
 assert.deepEqual(new Set(rows.map(x=>x.city)),new Set(PILOT_CITY_IDS));
 assert.ok(rows.every(x=>x.day==='2026-10-15'));
});

test('automatic drafting refuses to spend DeepSeek credits if there are no candidates',async()=>{
 let reads=0;
 const db={prepare(sql){return {bind(){return {async first(){
   reads++;
   if(sql.includes('COUNT(*)'))return {n:0};
   return null;
  }}}}}};
 const report=await autoDraftOnce({DB:db},()=>{throw Error('No DeepSeek API call')});
 assert.equal(report.status,'awaiting-research-candidates');
 assert.equal(report.attempted,0);
 assert.equal(reads,2);
});
test('provider cost capped before attempting a new draft',async()=>{
 let reads=0;
 const db={prepare(sql){return {bind(){return {async first(){
   reads++;assert.ok(sql.includes('COUNT(*)'));return {n:3};
  }}}}}};
 const report=await autoDraftOnce({DB:db},()=>{throw Error('No DeepSeek API call')});
 assert.equal(report.status,'draft-cap');
 assert.equal(reads,1);
});
test('a previously reserved draft slot prevents duplicate calls from overlapping schedules',async()=>{
 let queryIndex=0;
 const db={prepare(sql){return {bind(){return {
   async first(){queryIndex++;return sql.includes('COUNT(*)')?{n:0}:{id:'job-test'}},
   async run(){assert.ok(sql.includes('INSERT OR IGNORE'));return {meta:{changes:0}}}
  }}}}};
 const result=await autoDraftOnce({DB:db},()=>{throw Error('No DeepSeek API call')});
 assert.equal(result.status,'already-reserved');
 assert.equal(result.attempted,0);
 assert.equal(queryIndex,2);
});
