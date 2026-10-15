/** Read-only pilot readiness in the authenticated Admin Worker.
 * Does not claim Access gateway connectivity, real DeepSeek billing or
 * scientific approval. Missing D1 schema must never trigger a model call.
 */
const REQUIRED=Object.freeze({
 jobs:'job_requests', candidates:'research_candidates',
 oneShot:'editorial_one_shot', handoff:'private_research_handoff_slots',
 audit:'audit_log'
});
export async function pilotReadiness(env){
 const db=Boolean(env?.DB);
 const storage=Boolean(env?.CANDIDATES);
 const aiSecret=typeof env?.DEEPSEEK_API_KEY==='string'&&env.DEEPSEEK_API_KEY.trim().length>=12;
 const installed=Object.fromEntries(Object.keys(REQUIRED).map(k=>[k,false]));
 if(!db)return {schemaChecked:false,installed,schemaReady:false,importReady:false,
  privateDraftReady:false,missing:Object.keys(REQUIRED),reason:'private_d1_not_bound',
  publishingAuthorized:false,indexingAuthorized:false};
 let names;
 try{
  const result=await env.DB.prepare(
   "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('job_requests','research_candidates','editorial_one_shot','private_research_handoff_slots','audit_log')"
  ).all();
  names=new Set((result?.results||[]).map(r=>r.name));
 }catch{
  return {schemaChecked:false,installed,schemaReady:false,importReady:false,
    privateDraftReady:false,missing:Object.keys(REQUIRED),reason:'private_d1_unavailable',
    publishingAuthorized:false,indexingAuthorized:false};
 }
 for(const [key,table] of Object.entries(REQUIRED))installed[key]=names.has(table);
 const missing=Object.keys(REQUIRED).filter(k=>!installed[k]);
 const schemaReady=missing.length===0;
 return {schemaChecked:true,installed,schemaReady,
   importReady:schemaReady&&storage,
   privateDraftReady:schemaReady&&storage&&aiSecret,
   missing,reason:schemaReady?'schema_present':'migration_required',
   publishingAuthorized:false,indexingAuthorized:false};
}
