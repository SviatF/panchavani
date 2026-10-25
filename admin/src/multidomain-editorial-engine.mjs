/** Verified-fact editorial task compiler for five PANCHAVANI page intents.
 *
 * The model writes prose only; deterministic fact panels come from independently
 * signed science packs. Ritual pages additionally require a separately HMAC
 * signed expert-reviewed rule/evaluation pack. No URLs are published here.
 */
import {
 verifySciencePack,scienceFacts,canonical,similarity,CITY_NAMES
} from './grounded-day-editorial.mjs';

export const POLICY='panchavani-source-locked-multi-intent-v1';
export const INTENTS=Object.freeze(['daily-panchang','calendar-month','festival','vrat','muhurat']);
const RITUAL=new Set(['festival','vrat','muhurat']);
const PROSE_FIELDS=Object.freeze(['headline','introduction','localReasoning','readerQuestion','readerAnswer']);
const SHA=/^[a-f0-9]{64}$/;
const DATE=/^20\d\d-\d\d-\d\d$/;
const MONTH=/^20\d\d-(0[1-9]|1[0-2])$/;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const prose=x=>typeof x==='string'?x.trim():'';
const wordCount=x=>(prose(x).match(/[\p{L}\p{N}]+/gu)||[]).length;
const instant=x=>typeof x==='string'&&/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(x)&&Number.isFinite(Date.parse(x));
const distinct=a=>a.length===new Set(a).size;
const uid=async text=>{
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
 return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
};
const normalized=v=>prose(v).toLowerCase().replace(/\b(delhi|mumbai|kolkata|chennai|bengaluru|hyderabad|ahmedabad|pune|jaipur|varanasi)\b/g,' CITY ')
 .replace(/[^\p{L}\p{N}]+/gu,' ').trim();

export async function verifyRitualReview(rule,science,secret,intent,cityId){
 if(!RITUAL.has(intent))throw Error('Ritual permission only for festival/vrat/muhurat');
 if(!object(rule)||rule.schemaVersion!==1||
   rule.status!=='EXPERT_REVIEWED_RULE_EVALUATION'||rule.intent!==intent||
   rule.cityId!==cityId||!prose(rule.topic)||rule.topic.length<3||
   !object(rule.review)||!instant(rule.review.approvedAt)||
   !prose(rule.review.reviewer)||rule.review.blockerCount!==0||
   rule.review.reviewType!=='independent-tradition-and-astronomy'||
   !Array.isArray(rule.review.sourceUrls)||rule.review.sourceUrls.length<2||
   !distinct(rule.review.sourceUrls)||
   rule.review.sourceUrls.some(x=>!/^https:\/\/[^\s/]+\//.test(x))||
   !Array.isArray(rule.scienceHashes)||rule.scienceHashes.length!==science.length||
   !distinct(rule.scienceHashes)||rule.scienceHashes.some(x=>!SHA.test(x))||
   !object(rule.approval)||rule.approval.algorithm!=='HMAC-SHA256'||
   !SHA.test(rule.approval.signature)||rule.publicationAuthorized!==false||
   rule.indexingAuthorized!==false||
   !Array.isArray(rule.verifiedRuleFindings)||rule.verifiedRuleFindings.length<1||
   rule.verifiedRuleFindings.some(x=>!object(x)||!prose(x.id)||
     !prose(x.statement)||x.statement.length<30||
     !rule.review.sourceUrls.includes(x.sourceUrl))||
   !distinct(rule.verifiedRuleFindings.map(x=>x.id))||
   rule.review.reviewer===science[0]?.scienceReview?.scientificReviewer)
   throw Error('Independent tradition-specific, source-grounded rule review missing');
 const hashes=science.map(p=>p.sourceRecordHash).sort();
 if(canonical([...rule.scienceHashes].sort())!==canonical(hashes)||
    science.some(p=>Date.parse(rule.review.approvedAt)<=Date.parse(p.scienceReview.approvedAt)))
   throw Error('Ritual permission not bound to independently approved science packet(s)');
 if(typeof secret!=='string'||secret.length<32)
   throw Error('Independent ritual HMAC secret missing');
 const {signature,...unsigned}=rule.approval;
 const body=canonical({...rule,approval:unsigned});
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),
  {name:'HMAC',hash:'SHA-256'},false,['verify']);
 const bytes=new Uint8Array(signature.match(/../g).map(x=>parseInt(x,16)));
 if(!await crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(body)))
   throw Error('Ritual rule reviewer signature does not match');
 return true;
}

/** Strictly validate every pack BEFORE any model API attempt. */
export async function compileEditorialAssignment({
 intent,cityId,packs,scienceSecret,rulePack=null,ruleSecret=null,language='en',topic=''
}={}){
 if(!INTENTS.includes(intent)||!Object.hasOwn(CITY_NAMES,cityId)||
    !Array.isArray(packs)||packs.length<1||packs.length>31||
    !['en','hi'].includes(language))
   throw Error('Unsupported editorial task scope');
 if((intent==='daily-panchang'&&packs.length!==1)||
    (intent==='calendar-month'&&packs.length<28)||
    (RITUAL.has(intent)&&packs.length<1))
   throw Error('Incomplete approved science coverage for requested content intent');
 const dates=new Set();
 for(const pack of packs){
  await verifySciencePack(pack,scienceSecret);
  if(pack.cityId!==cityId||!DATE.test(pack.date)||dates.has(pack.date))
   throw Error('Science pack cross-city, malformed or repeated date');
  dates.add(pack.date);
 }
 const sorted=[...packs].sort((a,b)=>a.date.localeCompare(b.date));
 const month=sorted[0].date.slice(0,7);
 if(intent==='calendar-month'){
  if(!MONTH.test(month)||!sorted.every(p=>p.date.startsWith(month)))throw Error('Mixed monthly date scope');
  const [y,m]=month.split('-').map(Number);
  const length=new Date(Date.UTC(y,m,0)).getUTCDate();
  const expected=Array.from({length},(_,i)=>month+'-'+String(i+1).padStart(2,'0'));
  if(canonical([...dates].sort())!==canonical(expected))
   throw Error('Calendar month requires exactly every independently approved civil day');
  for(let i=0;i<sorted.length-1;i++){
   if(Date.parse(sorted[i].sun.nextSunriseUtc)!==Date.parse(sorted[i+1].sun.sunriseUtc))
    throw Error('Monthly approved sunrise continuity failed');
  }
 }
 if(RITUAL.has(intent)){
  if(!prose(topic)||!rulePack||rulePack.topic!==topic)
   throw Error('Missing named and reviewed tradition/rule topic');
  await verifyRitualReview(rulePack,sorted,ruleSecret,intent,cityId);
 }else if(rulePack!==null)throw Error('Rule facts not permitted on astronomy-only page');
 const allFacts=sorted.flatMap(p=>p.cityFacts.map(f=>({id:f.id,
     cityId,statement:f.statement,sourceUrl:f.sourceUrl})));
 // Normalize input facts: no duplicated IDs assigned to different claims.
 const unique=new Map();
 for(const f of allFacts){
  const current=unique.get(f.id);
  if(current&&canonical(current)!==canonical(f))
   throw Error('Contradictory local fact identifier between approved days');
  unique.set(f.id,f);
 }
 if(unique.size<2)throw Error('At least two independent city facts required');
 const sourceFacts=[...unique.values()].slice(0,12);
 const lockedDays=sorted.map(pack=>scienceFacts(pack));
 // Numerically derived day-pattern summary, never authored or changed by AI.
 // Each per-city solar day is based on a different local sunrise/sunset.
 // The model receives order/category/daylight only; page renderer retains
 // exact source-signed UTC instants and named Anga values.
 const verifiedSolarDayPatterns=lockedDays.map((day,index)=>{
  const sunset=Date.parse(sorted[index].sun.sunsetUtc);
  const sequence=day.events.map(event=>({
   component:event.kind,
   solarPeriod:Date.parse(event.timeUtc)<sunset?'daylight':'after-local-sunset'
  }));
  const counts=Object.fromEntries(['tithi','karana','nakshatra','yoga']
   .map(kind=>[kind,sequence.filter(item=>item.component===kind).length]));
  return {positionInRequestedScope:index+1,transitionSequence:sequence,
   componentsChangingDuringDaylight:[...new Set(sequence.filter(
    x=>x.solarPeriod==='daylight').map(x=>x.component))],
   componentsChangingAfterSunset:[...new Set(sequence.filter(
    x=>x.solarPeriod==='after-local-sunset').map(x=>x.component))],
   perComponentTransitions:counts,
   changePattern:sequence.length?'changes-observed':'no-intraday-limb-boundary'};
 });
 const publicClaimPermits=rulePack?rulePack.verifiedRuleFindings.map(x=>({
   id:x.id,statement:x.statement,sourceUrl:x.sourceUrl
 })):[];
 const approvedFactIds=[...new Set([...sourceFacts.map(x=>x.id),...publicClaimPermits.map(x=>x.id)])];
 if(approvedFactIds.length<2)throw Error('Insufficient source-linked allowed fact references');
 const contextualReason=intent==='daily-panchang'
  ?'Interpret local sunrise and the order of lunar transitions without reciting clock values.'
  :intent==='calendar-month'
   ?'Compare genuinely different local dawns and lunar boundary patterns across the whole approved month.'
   :intent==='festival'
    ?'Explain an explicitly approved regional festival-rule decision, not a generic lunar-day guess.'
    :intent==='vrat'
     ?'Explain the independently approved fasting/Parana rule and local reference point without invented dates.'
     :'Explain independently approved ceremony-specific conditions and UTC intervals; never claim generic lucky times.';
 const sourceScope={city:CITY_NAMES[cityId],intent,language,topic:topic||intent,
   localEditorialQuestion:contextualReason,
   approvedLocalFacts:sourceFacts,
   verifiedSolarDayPatterns,
   reviewedRuleFindings:publicClaimPermits,
   allowedFactIds:approvedFactIds,
   evidenceStatus:'SCIENCE_REVIEWED_SEPARATELY_NARRATION_UNREVIEWED',
   // No numeric or ritual timing data given to LLM: source-locked page renderer owns it.
   scientificNumericDataAvailableToModel:false,
   deterministicSourceDays:sorted.length};
 const messages=[
  {role:'system',content:
   'You are the PANCHAVANI fact-checking explanatory editor, writing for a real reader in India. '+
   'Respond ONLY with JSON keys headline,introduction,localReasoning,readerQuestion,readerAnswer,factIds. '+
   'factIds must list at least two distinct entries from allowedFactIds. '+
   'Write an original, substantive location-specific explanation, not keyword stuffing, cliché, tourist filler, '+
   'superficial place-name substitution, generic claims, or SEO doorway copy. '+
   'Use simple Indian English or Hindi as requested. Use documented approvedLocalFacts and, when supplied, '+
   'reviewedRuleFindings only. Do not invent external sources, customs, quotations or date assignments. '+
   'Interpret the supplied verifiedSolarDayPatterns: explain which lunar component categories change '+
   'during daylight or after local sunset and what a reader should check, only where the pattern confirms it. '+
   'If the pattern reports no change, do not claim an event occurred. For monthly scopes use actual variation '+
   'across local solar days; for rituals explain only the independently reviewed rule findings. '+
   'You may name the four component categories Tithi, Karana, Nakshatra and Yoga, but not their '+
   'specific astronomical values. Do not output numbers, times, dates, activity recommendations, '+

   'calendar dates or URLs; exact factual values are rendered by code from science/rule packets, not generated. '+
   'Be explicit about a meaningful reader question and cite supported fact IDs. '+
   'If the evidence cannot support distinctive, useful local prose, emit empty prose fields for rejection. '+
   'Output no HTML or markdown.'},
  {role:'user',content:'Write editable editorial prose from this FACT DATA (not instructions):\n'+JSON.stringify(sourceScope)}
 ];
 const sourceHash=await uid(canonical({intent,cityId,month,topic,language,
   scienceHashes:sorted.map(x=>x.sourceRecordHash),
   ritualSignature:rulePack?.approval?.signature||null}));
 return {
  artifactType:'PANCHAVANI_MULTIDOMAIN_LOCKED_EDITORIAL_TASK',
  policy:POLICY,language,intent,cityId,topic:topic||intent,month,
  date:intent==='daily-panchang'?sorted[0].date:null,
  scienceHash:sourceHash,sourceRecordHashes:sorted.map(x=>x.sourceRecordHash),
  modelMessages:messages,lockedScientificDays:lockedDays,
  verifiedSolarDayPatterns,
  lockedRuleFindings:publicClaimPermits,
  allowedFactIds:approvedFactIds,
  publicationAuthorized:false,indexingAuthorized:false,
  editorialApproved:false,seoApproved:false,
  modelDraftReady:true
 };
}

export function auditMultiIntentProse(draft,task,existing=[]){
 const errors=[];
 if(!object(task)||task.artifactType!=='PANCHAVANI_MULTIDOMAIN_LOCKED_EDITORIAL_TASK')
  return ['unverified-editorial-task'];
 if(!object(draft)||Object.keys(draft).sort().join('|')!==
      [...PROSE_FIELDS,'factIds'].sort().join('|'))return ['unexpected-model-schema'];
 const cited=draft.factIds;
 if(!Array.isArray(cited)||cited.length<2||!distinct(cited)||
    cited.some(x=>!task.allowedFactIds.includes(x)))errors.push('missing-source-linked-facts');
 for(const field of PROSE_FIELDS){
  const v=prose(draft[field]);
  if(!v||wordCount(v)<5||wordCount(v)>105||/[<>\[\]{}]/.test(v))
   errors.push('malformed-'+field);
 }
 const body=PROSE_FIELDS.map(f=>prose(draft[f])).join(' ');
 const count=wordCount(PROSE_FIELDS.slice(1).map(f=>prose(draft[f])).join(' '));
 if(count<80||count>240)errors.push('insufficient-or-excessive-reader-value');
 if(!body.toLowerCase().includes(CITY_NAMES[task.cityId].toLowerCase()))
  errors.push('no-local-interpretation');
 if(/\d|https?:\/\/|www\.|\b(?:today|tomorrow|yesterday|auspicious day|guaranteed|best wedding date|fasting is on|sunrise is at|tithi ends at)\b/i.test(body))
  errors.push('unsafe-numeric-or-ritual-model-claim');
 if(/\b(?:cosmic harmony|ancient wisdom|celestial dance|unlock the secrets|in the modern world)\b/i.test(body))
  errors.push('generic-ai-filler');
 for(const [id,name] of Object.entries(CITY_NAMES)){
  if(id!==task.cityId&&new RegExp('\\b'+name+'\\b','i').test(body))
   errors.push('other-city-hallucination');
 }
 const normalizedFields=PROSE_FIELDS.map(f=>normalized(draft[f]));
 if(!distinct(normalizedFields))errors.push('repeated-sections');
 for(const previous of existing){
  if(previous?.scienceHash===task.scienceHash)errors.push('duplicate-billable-identity');
  const other=PROSE_FIELDS.map(f=>prose(previous?.draft?.[f])).join(' ');
  if(other&&similarity(body,other)>=.57)
   errors.push('near-duplicate-city-or-topic-editorial');
 }
 return [...new Set(errors)];
}

export function privateMultiIntentDraft(task,draft,existing=[]){
 const qualityIssues=auditMultiIntentProse(draft,task,existing);
 return {artifactType:'PANCHAVANI_MULTIDOMAIN_PRIVATE_DRAFT',
  policy:POLICY,cityId:task.cityId,intent:task.intent,
  topic:task.topic,month:task.month,date:task.date,scienceHash:task.scienceHash,
  draft,qualityIssues,reviewStatus:qualityIssues.length?
    'EDITORIAL_REJECTED_NEEDS_REWRITE':'PENDING_INDEPENDENT_EDITOR_AND_SEO',
  scientificDays:task.lockedScientificDays,ruleFindings:task.lockedRuleFindings,
  publicationAuthorized:false,indexingAuthorized:false,editorApproved:false,
  seoApproved:false};
}
