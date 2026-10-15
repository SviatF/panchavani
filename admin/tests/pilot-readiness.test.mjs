import test from 'node:test';
import assert from 'node:assert/strict';
import {pilotReadiness} from '../src/pilot-readiness.mjs';

const required=['job_requests','research_candidates','editorial_one_shot',
                'private_research_handoff_slots','audit_log'];
const db=(names=required)=>({
 prepare(query){
  assert.match(query,/sqlite_master/);
  return {all:async()=>({results:names.map(name=>({name}))})};
 }
});
test('unbound D1 and missing migrations never falsely signal readiness',async()=>{
 const absent=await pilotReadiness({CANDIDATES:{},DEEPSEEK_API_KEY:'x'.repeat(40)});
 assert.equal(absent.schemaReady,false);
 assert.equal(absent.importReady,false);
 assert.equal(absent.privateDraftReady,false);
 assert.equal(absent.missing.length,5);
 const partial=await pilotReadiness({DB:db(required.slice(0,3)),CANDIDATES:{},
   DEEPSEEK_API_KEY:'x'.repeat(40)});
 assert.equal(partial.schemaChecked,true);
 assert.equal(partial.importReady,false);
 assert.deepEqual(partial.missing,['handoff','audit']);
});
test('private pilot has separate import and DeepSeek preparedness flags',async()=>{
 const noR2=await pilotReadiness({DB:db(),DEEPSEEK_API_KEY:'x'.repeat(40)});
 assert.equal(noR2.schemaReady,true);
 assert.equal(noR2.importReady,false);
 assert.equal(noR2.privateDraftReady,false);
 const importOnly=await pilotReadiness({DB:db(),CANDIDATES:{}});
 assert.equal(importOnly.importReady,true);
 assert.equal(importOnly.privateDraftReady,false);
 const full=await pilotReadiness({DB:db(),CANDIDATES:{},DEEPSEEK_API_KEY:'x'.repeat(40)});
 assert.equal(full.schemaReady,true);
 assert.equal(full.importReady,true);
 assert.equal(full.privateDraftReady,true);
 assert.equal(full.publishingAuthorized,false);
 assert.equal(full.indexingAuthorized,false);
});
test('storage error fails closed without exposing database errors',async()=>{
 const result=await pilotReadiness({DB:{prepare(){throw new Error('do-not-leak')}},CANDIDATES:{}});
 assert.equal(result.schemaReady,false);
 assert.equal(result.reason,'private_d1_unavailable');
 assert.equal(JSON.stringify(result).includes('do-not-leak'),false);
});
