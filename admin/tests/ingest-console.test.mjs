import test from 'node:test';
import assert from 'node:assert/strict';
import {handleIngestConsole} from '../src/ingest-console.mjs';

const url='https://admin.panchavani.com/research/ingest-status';
function env(){
 let statements=0;
 return {
  AUTO_RESEARCH_IMPORT_ENABLED:'true',
  DB:{
   prepare(sql){statements++;return{
    async first(){return {n:sql.includes('automated_research_import_slots')?7:10}},
    async all(){return {results:[{status:'stored',n:7}]}}
   }},
   get statementCount(){return statements}
  },
  INGEST_INBOX:{async list(){return {truncated:false,objects:[
   {key:'inbox/manifests/38813000891.json'},
   {key:'inbox/unapproved/untrusted.json'}
  ]}}},
  CANDIDATES:{}
 };
}
const post=(origin='https://admin.panchavani.com')=>
 new Request(url,{method:'POST',headers:{
  Origin:origin,'Sec-Fetch-Site':'same-origin',
  'Content-Type':'application/x-www-form-urlencoded'
 },body:'run=1'});
test('authenticated GET displays actual D1/R2 counts, not just connected flags',async()=>{
 const e=env();
 const result=await handleIngestConsole(new Request(url),e,'owner',()=>true,
  ()=>{throw Error('GET must not import')});
 assert.equal(result.status,200);
 const body=await result.text();
 assert.match(body,/Stored JPL imports/);
 assert.match(body,/Completed R2 manifests/);
 assert.match(body,/1 completed manifest\(s\)/);
 assert.match(body,/7/);
 assert.equal(result.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');
});
test('POST requires Access identity and same-origin form before touching R2/D1',async()=>{
 const e=env();
 let calls=0;
 const importer=async()=>{calls++;return {status:'batch-cap',stored:20,existing:2,checked:22}};
 let response=await handleIngestConsole(post(),e,null,()=>true,importer);
 assert.equal(response.status,403);
 response=await handleIngestConsole(post('https://attacker.test'),e,'owner',()=>false,importer);
 assert.equal(response.status,403);
 response=await handleIngestConsole(post(),e,'owner',()=>true,importer);
 assert.equal(response.status,200);
 const text=await response.text();
 assert.match(text,/Import run result: batch-cap/);
 assert.match(text,/New stored: 20/);
 assert.equal(calls,1);
});
test('last replay is shown as one unique conflict and disables redundant form submit',async()=>{
 const e=env();
 const result=await handleIngestConsole(post(),e,'owner',()=>true,async()=>({
  status:'conflicts-needing-review',stored:0,existing:47,
  conflicts:3,checked:50,manifests:2,
  repeatedManifestEntries:50,sourceVariantConflicts:0,
  conflictExamples:['chennai/2026-10-16','delhi/2026-10-16','mumbai/2026-10-16']
 }));
 assert.equal(result.status,200);
 const html=await result.text();
 assert.match(html,/Existing unique records: 47/);
 assert.match(html,/Unique conflicts: 3/);
 assert.match(html,/Repeated entries skipped: 50/);
 assert.match(html,/All available unique dates were checked/);
 assert.match(html,/type="submit" disabled/);
 assert.doesNotMatch(html,/chennai\/2026-10-16.*chennai\/2026-10-16/);
});
test('reports a sanitized error code without exposing internal details',async()=>{
 const e=env();
 let result=await handleIngestConsole(post(),e,'owner',()=>true,async()=>{
  throw new Error('provider secret: TOPSECRET R2 leak');
 });
 assert.equal(result.status,503);
 const text=await result.text();
 assert.match(text,/private-import-failed-see-worker-logs/);
 assert.equal(text.includes('TOPSECRET'),false);
});
test('D1 schema failures show precise sanitized stage codes to the authenticated operator',async()=>{
 for(const code of [
  'private-d1-import-table-create-failed',
  'private-d1-import-index-create-failed',
  'private-d1-import-schema-verification-failed'
 ]){
  const e=env();
  const response=await handleIngestConsole(post(),e,'owner',()=>true,
   async()=>{throw new Error(code)});
  assert.equal(response.status,503);
  const html=await response.text();
  assert.match(html,new RegExp(code));
  assert.equal(html.includes('secret'),false);
 }
});
test('endpoint returns null to unrelated routes and disabled state blocks manual runs',async()=>{
 const e=env();e.AUTO_RESEARCH_IMPORT_ENABLED='false';
 assert.equal(await handleIngestConsole(new Request('https://admin.panchavani.com/ai'),e,'owner',()=>true),null);
 const response=await handleIngestConsole(post(),e,'owner',()=>true,async()=>{throw Error('Unexpected import')});
 assert.equal(response.status,503);
});
