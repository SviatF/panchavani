/** Paid DeepSeek execution controller for signed, independently reviewed days.
 * Idempotency is the responsibility of the caller's durable store adapter:
 * reserve MUST be atomic, source-hash keyed, and lock failed reservations.
 * This controller will NEVER automatically retry a possibly billed call.
 */
import {
 verifySciencePack,editorialPrompt,buildPrivateDraft,POLICY
} from './grounded-day-editorial.mjs';

export const DAILY_DRAFT_MODEL="deepseek-chat";
export const DAILY_DRAFT_LIMIT=10;
export const ONE_SHOT_KEY=(p,language="en")=>p.cityId+"/"+p.date+"/"+language+"/"+p.sourceRecordHash;
const isStore=s=>s&&typeof s.reserve==="function"&&typeof s.save==="function";
export async function deepseekJson(messages,apiKey,transport=fetch){
 if(typeof apiKey!=="string"||apiKey.length<12)throw Error("DeepSeek API key not configured");
 const response=await transport("https://api.deepseek.com/chat/completions",{
  method:"POST",
  headers:{"Content-Type":"application/json","Authorization":"Bearer "+apiKey},
  body:JSON.stringify({model:DAILY_DRAFT_MODEL,temperature:0.25,
   stream:false,max_tokens:950,response_format:{type:"json_object"},
   messages}),
  signal:AbortSignal.timeout(45000)
 });
 if(!response.ok)throw Error("DeepSeek returned HTTP "+response.status);
 const raw=await response.text();
 if(raw.length>28000)throw Error("DeepSeek returned oversized draft");
 const outer=JSON.parse(raw);
 const item=outer?.choices?.[0];
 if(item?.finish_reason!=="stop"||typeof item?.message?.content!=="string")
  throw Error("Truncated or invalid DeepSeek response: no retry");
 const parsed=JSON.parse(item.message.content);
 return {draft:parsed,tokenUsage:outer.usage||null,model:outer.model||DAILY_DRAFT_MODEL};
}
/** Explicit maxRequests is compulsory. Missing quota means ZERO API calls.
 * Existing is a durable previously generated editorial corpus for overlap QA.
 * Store.reserve must lock a key BEFORE a paid request. */
export async function runGroundedDayBatch({
 packs,scientificApprovalSecret,apiKey,maxRequests=0,store,
 existing=[],transport=fetch
}={}){
 if(!Array.isArray(packs)||packs.length>3660)throw Error("Unsupported factpack cohort");
 if(!isStore(store))throw Error("Durable atomic one-shot store required");
 if(!Number.isInteger(maxRequests)||maxRequests<0||maxRequests>DAILY_DRAFT_LIMIT)
  throw Error("Daily paid generation quota must be 0–"+DAILY_DRAFT_LIMIT);
 if(!Array.isArray(existing))throw Error("Existing-draft comparison corpus must be explicit");
 const identities=new Set();
 // Verify the ENTIRE batch before reserving or billing even one request.
 for(const pack of packs){
  await verifySciencePack(pack,scientificApprovalSecret);
  const id=ONE_SHOT_KEY(pack);
  if(identities.has(id))throw Error("Repeated science-approved identity");
  identities.add(id);
 }
 if(packs.length&&maxRequests&&!apiKey)throw Error("DeepSeek key missing for approved paid run");
 const report={artifactType:"PANCHAVANI_DAILY_EDITORIAL_DRAFT_BATCH",
  policy:POLICY,approvedFactPacks:packs.length,
  attempted:0,generated:0,rejected:0,
  skippedOneShot:0,skippedBudget:0,results:[],
  publicationAuthorized:false,indexingAuthorized:false};
 for(const pack of packs){
  const key=ONE_SHOT_KEY(pack);
  if(report.attempted>=maxRequests){
   report.skippedBudget++;
   continue;
  }
  // Store is REQUIRED to atomically reserve key against other scheduled runs.
  // A request may have been billed even if interrupted: no release of slot.
  const reserved=await store.reserve(key,pack.sourceRecordHash);
  if(!reserved){report.skippedOneShot++;continue;}
  report.attempted++;
  let result;
  try{
    const output=await deepseekJson(editorialPrompt(pack),apiKey,transport);
    result=buildPrivateDraft(pack,output.draft,existing);
    result.model=output.model;result.tokenUsage=output.tokenUsage;
    result.scientificReviewerSignatureVerified=true;
    if(result.qualityIssues.length)report.rejected++;
    else report.generated++;
    existing.push({cityId:pack.cityId,date:pack.date,draft:output.draft});
  }catch(error){
    report.rejected++;
    result={artifactType:"PANCHAVANI_SCIENCE_LOCKED_EDITORIAL_DRAFT",
      cityId:pack.cityId,date:pack.date,
      sourceRecordHash:pack.sourceRecordHash,
      reviewStatus:"FAILED_ONE_SHOT_NO_RETRY",
      safeFailureType:error instanceof SyntaxError?"MODEL_JSON_INVALID":"PROVIDER_OR_VALIDATION_FAILURE",
      publicationAuthorized:false,indexingAuthorized:false,
      editorApproved:false,qualityIssues:["manual-review-required-after-paid-attempt"]};
  }
  // Store.save failure also leaves the original reservation locked.
  await store.save(key,result);
  report.results.push({cityId:pack.cityId,date:pack.date,
    reviewStatus:result.reviewStatus,
    qualityIssues:result.qualityIssues});
 }
 return report;
}
