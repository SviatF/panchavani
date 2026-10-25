/** Immutable private drafting handoff for a human editor.
 * Converts an existing hash-verified R2 draft to a review worksheet only.
 * Never changes science review, issues publication permits, or calls DeepSeek.
 */
const SHA=/^[a-f0-9]{64}$/;
const MAX_DRAFT_BYTES=120000;
const INTENTS=new Set(['daily-panchang','calendar-month','festival','vrat','muhurat']);
const sha256=async raw=>{
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
 return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
};
export async function createEditorialReviewHandoff(env,id){
 if(!SHA.test(id||'')||!env?.DB?.prepare||!env?.CANDIDATES?.get)
  throw Error('Invalid private editorial handoff request');
 const row=await env.DB.prepare(
  'SELECT id,city_id,intent,topic,local_date,month,language,source_hash,r2_key,state '+
  'FROM editorial_multi_intent_once WHERE id=?'
 ).bind(id).first();
 if(!row||row.id!==id||row.state!=='stored'||!SHA.test(row.source_hash))
  throw Error('No stored private draft for this identity');
 const prefix='unapproved/multidomain/'+id+'/';
 if(typeof row.r2_key!=='string'||!row.r2_key.startsWith(prefix))
  throw Error('Private draft R2 path mismatch');
 const fileHash=row.r2_key.slice(prefix.length);
 if(!/^[a-f0-9]{64}\.json$/.test(fileHash))
  throw Error('Unpinned private draft content hash');
 const file=await env.CANDIDATES.get(row.r2_key);
 if(!file)throw Error('Source-locked private draft R2 object missing');
 const raw=await file.text();
 if(raw.length>MAX_DRAFT_BYTES||await sha256(raw)!==fileHash.slice(0,64))
  throw Error('Private draft hash check failed');
 const draft=JSON.parse(raw);
 if(draft.artifactType!=='PANCHAVANI_MULTIDOMAIN_PRIVATE_DRAFT'||
   !INTENTS.has(draft.intent)||draft.intent!==row.intent||
   draft.cityId!==row.city_id||draft.month!==row.month||
   draft.topic!==row.topic||draft.scienceHash!==row.source_hash||
   !Array.isArray(draft.qualityIssues)||!Array.isArray(draft.scientificDays)||
   !draft.scientificDays.length||
   draft.scientificDays.some(x=>x.cityId!==row.city_id||!SHA.test(x.sourceRecordHash))||
   draft.publicationAuthorized!==false||draft.indexingAuthorized!==false||
   draft.editorApproved!==false||draft.seoApproved!==false)
  throw Error('Private draft identity, science or approval status is inconsistent');
 if(draft.date!==row.local_date)
  throw Error('Private draft local date differs from D1 identity');
 if(!['PENDING_INDEPENDENT_EDITOR_AND_SEO',
   'EDITORIAL_REJECTED_NEEDS_REWRITE'].includes(draft.reviewStatus))
  throw Error('Draft is not in a known human review state');
 const facts=draft.scientificDays.flatMap(day=>day.references||[]);
 const allowed=new Set([...facts.map(x=>x.id),...(draft.ruleFindings||[]).map(x=>x.id)]);
 if(!Array.isArray(draft.draft?.factIds)||
    draft.draft.factIds.some(x=>!allowed.has(x)))
  throw Error('Editorial citations do not match immutable scientific source references');
 return {
  artifactType:'PANCHAVANI_PRIVATE_HUMAN_REVIEW_HANDOFF',
  schemaVersion:1,editorialId:id,cityId:row.city_id,intent:row.intent,
  topic:row.topic,month:row.month,date:row.local_date,language:row.language,
  sourceLockedTaskHash:row.source_hash,immutableDraftSha256:fileHash.slice(0,64),
  reviewStatus:draft.reviewStatus,qualityIssues:draft.qualityIssues,
  // Private R2 cache is a writing aid, NOT an independent release artifact.
  modelNarrative:draft.draft,scientificDays:draft.scientificDays,
  expertRuleFindings:draft.ruleFindings||[],
  humanReviewChecklist:[
   'Recheck every astronomical value against independent city, method and source evidence.',
   'Verify every locally relevant assertion and selected source against original publisher material.',
   'For festivals, vrat or muhurat, separately review tradition and real UTC windows.',
   'Expand or rewrite thin AI prose to pass the public content quality policy; do not pad with templates.',
   'Obtain independent scientific, editorial and SEO reviewers and pin the public release digests.'
  ],
  readyForPublicManifest:false,publicationAuthorized:false,
  indexingAuthorized:false,editorApproved:false,seoApproved:false
 };
}
