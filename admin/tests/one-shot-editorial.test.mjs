import test from 'node:test';
import assert from 'node:assert/strict';
import {readOneShot,reserveOneShot,storeOneShot,failOneShot,ONE_SHOT_PILOT_CITIES} from '../src/one-shot-editorial.mjs';

function harness(){
 const rows=new Map(), objects=new Map();
 const db={prepare(sql){return {bind(...args){return {
  async first(){
   if(!sql.includes('SELECT job_id,source_hash,status'))throw Error('Unexpected SQL');
   return rows.get(args.slice(0,4).join('|'))||null;
  },
  async run(){
   const key=sql.includes('INSERT OR IGNORE')?args.slice(0,4).join('|'):args.slice(sql.includes("status='stored'")?2:1,sql.includes("status='stored'")?6:5).join('|');
   if(sql.includes('INSERT OR IGNORE')){
    if(rows.has(key))return {meta:{changes:0}};
    rows.set(key,{job_id:args[4],source_hash:args[5],status:'reserved'});
    return {meta:{changes:1}};
   }
   const row=rows.get(key);
   if(!row||row.status!=='reserved')return {meta:{changes:0}};
   if(sql.includes("status='stored'")){
    row.status='stored';row.r2_key=args[0];row.content_hash=args[1];
   }else if(sql.includes("status='failed'"))row.status='failed';
   else throw Error('Unexpected update');
   return {meta:{changes:1}};
  }
 };}}}};
 const env={DB:db,CANDIDATES:{
   async get(k){return objects.has(k)?{text:async()=>objects.get(k)}:null},
   async put(k,v){objects.set(k,v)}
 }};
 return {env,rows,objects};
}
const record={id:'job-1',city_id:'delhi',local_date:'2026-10-15',content_hash:'a'.repeat(64)};
const artifact={
 status:'AI_DRAFT_UNAPPROVED',cityId:'delhi',localDate:'2026-10-15',
 intent:'daily-panchang',language:'en',sourceCandidateHash:record.content_hash,
 publicationAuthorized:false,indexingAuthorized:false
};
test('one-shot pilot starts with exactly three research cities',()=>{
 assert.deepEqual(ONE_SHOT_PILOT_CITIES,['delhi','mumbai','chennai']);
});
test('first request reserves atomically; subsequent attempts cannot spend again',async()=>{
 const {env}=harness();
 assert.deepEqual(await readOneShot(env,record,'daily-panchang','en'),{state:'missing'});
 assert.equal(await reserveOneShot(env,record,'daily-panchang','en','owner','v2'),true);
 assert.equal(await reserveOneShot(env,record,'daily-panchang','en','owner','v3'),false);
 assert.equal((await readOneShot(env,record,'daily-panchang','en')).state,'locked');
 const path='unapproved/ai-editorial/job-1/draft.json';
 await storeOneShot(env,record,'daily-panchang','en',artifact,path);
 const existing=await readOneShot(env,record,'daily-panchang','en');
 assert.equal(existing.state,'cached'); assert.deepEqual(existing.artifact,artifact);
 assert.equal(await reserveOneShot(env,record,'daily-panchang','en','owner','v99'),false);
});
test('source astronomy change locks existing copy without a second provider call',async()=>{
 const {env}=harness();
 await reserveOneShot(env,record,'daily-panchang','en','owner','v2');
 await storeOneShot(env,record,'daily-panchang','en',artifact,'unapproved/ai-editorial/job-1/x.json');
 const changed={...record,content_hash:'b'.repeat(64)};
 assert.equal((await readOneShot(env,changed,'daily-panchang','en')).state,'stale');
 assert.equal(await reserveOneShot(env,changed,'daily-panchang','en','owner','v2'),false);
});
test('failed or interrupted attempt is locked, not silently retried',async()=>{
 const {env}=harness();
 await reserveOneShot(env,record,'daily-panchang','en','owner','v2');
 await failOneShot(env,record,'daily-panchang','en');
 assert.equal((await readOneShot(env,record,'daily-panchang','en')).state,'locked');
 assert.equal(await reserveOneShot(env,record,'daily-panchang','en','owner','v2'),false);
});
test('tampered cached R2 content is rejected',async()=>{
 const {env,objects}=harness();
 await reserveOneShot(env,record,'daily-panchang','en','owner','v2');
 const key='unapproved/ai-editorial/job-1/draft.json';
 await storeOneShot(env,record,'daily-panchang','en',artifact,key);
 objects.set(key,objects.get(key)+' ');
 await assert.rejects(()=>readOneShot(env,record,'daily-panchang','en'),/SHA-256/);
});
