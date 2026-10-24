/** Idempotent opt-in paid DeepSeek for separately approved city × topic pages.
 * Does NOT expose a route, cron, public page or autonomous publishing.
 * The caller must supply durable atomic one-shot storage and explicit quota.
 */
import {deepseekJson} from './grounded-day-runner.mjs';
import {compileEditorialAssignment,privateMultiIntentDraft,POLICY} from './multidomain-editorial-engine.mjs';

export const MULTI_INTENT_MAX_REQUESTS=3;
export async function runMultiIntentEditorialBatch({
  jobs=[],scienceSecret,ritualSecret,apiKey,maxRequests=0,
  store,existing=[],transport=fetch
}={}){
 if(!Array.isArray(jobs)||jobs.length>310||!Array.isArray(existing))
  throw Error('Invalid finite editorial batch inputs');
 if(!Number.isInteger(maxRequests)||maxRequests<0||
    maxRequests>MULTI_INTENT_MAX_REQUESTS)
  throw Error('Explicit bounded billable quota (0..3) required');
 if(!store||typeof store.reserve!=='function'||typeof store.save!=='function')
  throw Error('Atomic durable one-shot store adapter mandatory');
 const compiled=[];
 // Validate ENTIRE submitted batch with cryptographic science + ritual HMAC
 // before reserving one billable request.
 for(const job of jobs){
  compiled.push(await compileEditorialAssignment({
    ...job,scienceSecret,ruleSecret:ritualSecret
  }));
 }
 const ids=compiled.map(x=>x.scienceHash);
 if(new Set(ids).size!==ids.length)throw Error('Repeated paid editorial identity');
 if(maxRequests&&compiled.length&&!(typeof apiKey==='string'&&apiKey.length>=12))
  throw Error('Missing private DeepSeek API secret');
 const report={artifactType:'PANCHAVANI_MULTIDOMAIN_PRIVATE_EDITORIAL_BATCH',
   policy:POLICY,total:compiled.length,
   attempted:0,generated:0,rejected:0,skippedOneShot:0,skippedBudget:0,
   results:[],publicationAuthorized:false,indexingAuthorized:false};
 for(const task of compiled){
  if(report.attempted>=maxRequests){report.skippedBudget++;continue;}
  const id='multi-intent/'+task.intent+'/'+task.cityId+'/'+task.month+'/'+
   task.topic+'/'+task.scienceHash+'/'+task.language;
  const reserved=await store.reserve(id,task.scienceHash);
  if(!reserved){report.skippedOneShot++;continue;}
  report.attempted++;
  let data;
  try{
   const reply=await deepseekJson(task.modelMessages,apiKey,transport);
   data=privateMultiIntentDraft(task,reply.draft,existing);
   data.tokenUsage=reply.tokenUsage;data.model=reply.model;
   if(data.qualityIssues.length)report.rejected++;
   else report.generated++;
   existing.push({scienceHash:task.scienceHash,draft:reply.draft});
  }catch(error){
   report.rejected++;
   data={artifactType:'PANCHAVANI_MULTIDOMAIN_PRIVATE_DRAFT',
     cityId:task.cityId,intent:task.intent,month:task.month,
     topic:task.topic,scienceHash:task.scienceHash,
     reviewStatus:'FAILED_ONE_SHOT_NO_AUTOMATIC_RETRY',
     qualityIssues:['model-call-failed-or-unverified-output'],
     failureType:error instanceof SyntaxError?'MALFORMED_MODEL_JSON':'API_OR_CONTENT_GATE',
     publicationAuthorized:false,indexingAuthorized:false,editorApproved:false,
     seoApproved:false};
  }
  await store.save(id,data);
  report.results.push({intent:task.intent,cityId:task.cityId,
    reviewStatus:data.reviewStatus,qualityIssues:data.qualityIssues});
 }
 return report;
}
