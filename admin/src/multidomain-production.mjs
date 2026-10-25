/** Private production bridge: reviewed signed facts -> D1/R2 -> DeepSeek -> private draft.
 * Not a publishing API. Access-gated HTTP wrapper and no public worker bindings.
 */
import {verifySciencePack,canonical} from './grounded-day-editorial.mjs';
import {verifyRitualReview,compileEditorialAssignment} from './multidomain-editorial-engine.mjs';
import {runMultiIntentEditorialBatch} from './multidomain-editorial-batch.mjs';
import {CITY_NAMES} from './grounded-day-editorial.mjs';
import {ensureDailySchema} from './science-locked-day-storage.mjs';

/** Runtime D1 bootstrap is necessary because this account's deployment
 * token can deploy Workers but direct D1 control-plane API returns 7403.
 * All DDL is additive, fixed literal SQL and executed only through the
 * already-bound private D1 Worker. Not a public migration/API endpoint.
 */
const CREATE_MULTI=`CREATE TABLE IF NOT EXISTS editorial_multi_intent_once (
 id TEXT PRIMARY KEY NOT NULL CHECK(length(id)=64),
 city_id TEXT NOT NULL,
 intent TEXT NOT NULL CHECK(intent IN ('daily-panchang','calendar-month','festival','vrat','muhurat')),
 topic TEXT NOT NULL,local_date TEXT,month TEXT NOT NULL,
 language TEXT NOT NULL CHECK(language IN ('en','hi')),
 source_hash TEXT NOT NULL CHECK(length(source_hash)=64),
 actor TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('reserved','stored','failed')),
 r2_key TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
)`;
const CREATE_RULES=`CREATE TABLE IF NOT EXISTS independently_reviewed_rule_sources (
 city_id TEXT NOT NULL,
 intent TEXT NOT NULL CHECK(intent IN ('festival','vrat','muhurat')),
 topic TEXT NOT NULL,
 science_hashes_sha TEXT NOT NULL CHECK(length(science_hashes_sha)=64),
 science_dates_json TEXT NOT NULL,
 source_sha TEXT NOT NULL CHECK(length(source_sha)=64),
 r2_key TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('approved_for_draft','disabled')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(city_id,intent,topic,science_hashes_sha)
)`;
const schemaReady=new WeakSet();
export async function ensureMultiIntentSchema(env){
 if(!env?.DB?.prepare||!env?.CANDIDATES?.get||!env?.CANDIDATES?.put)
  throw Error('Private D1/R2 bindings required for schema');
 if(schemaReady.has(env.DB))return {ready:true,mode:'private-runtime-additive'};
 // Only CREATE IF NOT EXISTS; never ALTER/DROP, never copy/approve evidence.
 await ensureDailySchema(env);
 await env.DB.prepare(CREATE_MULTI).run();
 await env.DB.prepare(CREATE_RULES).run();
 await Promise.all([
  env.DB.prepare('SELECT city_id,local_date,source_hash,r2_key,state FROM science_approved_day_sources LIMIT 0').all(),
  env.DB.prepare('SELECT city_id,local_date,source_hash,state FROM science_locked_editorial_once LIMIT 0').all(),
  env.DB.prepare('SELECT id,city_id,intent,topic,local_date,month,language,source_hash,actor,state,r2_key FROM editorial_multi_intent_once LIMIT 0').all(),
  env.DB.prepare('SELECT city_id,intent,topic,science_hashes_sha,science_dates_json,source_sha,r2_key,state FROM independently_reviewed_rule_sources LIMIT 0').all()
 ]);
 schemaReady.add(env.DB);
 return {ready:true,mode:'private-runtime-additive'};
}

const SHA=/^[a-f0-9]{64}$/;
const DAY=/^20\d\d-\d\d-\d\d$/;
const MONTH=/^20\d\d-(0[1-9]|1[0-2])$/;
const INTENTS=new Set(['daily-panchang','calendar-month','festival','vrat','muhurat']);
const RITUAL=new Set(['festival','vrat','muhurat']);
const MAX_SOURCE=120000;
const clean=v=>typeof v==='string'?v.trim():'';
const sha=async raw=>{
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
 return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
};
const digest=async value=>sha(canonical(value));
function requirePrivate(env){
 if(!env?.DB?.prepare||!env?.CANDIDATES?.get||!env?.CANDIDATES?.put)
  throw Error('Missing private D1 and R2 bindings');
}
function validateCity(id){if(!Object.hasOwn(CITY_NAMES,id))throw Error('Unsupported vetted SEO city');}
async function loadR2(env,key,expectedSha,max=MAX_SOURCE){
 const file=await env.CANDIDATES.get(key);
 if(!file)throw Error('Missing independent reviewer R2 object');
 const raw=await file.text();
 if(raw.length>max||await sha(raw)!==expectedSha)
  throw Error('Immutable independent source bytes missing or corrupted');
 return JSON.parse(raw);
}
/** Admin may import an already-signed reviewer artifact; cannot sign it.
 * D1 INSERT OR IGNORE prevents replacement of first science-reviewed day. */
export async function importSignedScientificDay(env,pack,actor){
 requirePrivate(env);validateCity(pack?.cityId);
 if(!clean(actor)||!clean(env.PANCHAVANI_SCIENCE_APPROVAL_SECRET))
  throw Error('Independent science approval secret or reviewer identity absent');
 await verifySciencePack(pack,env.PANCHAVANI_SCIENCE_APPROVAL_SECRET);
 if(pack.publicationAuthorized!==false||pack.indexingAuthorized!==false)
  throw Error('Science import is not a public release approval');
 const raw=JSON.stringify(pack);
 if(raw.length>MAX_SOURCE)throw Error('Oversized source evidence');
 const hash=pack.sourceRecordHash;
 if(!SHA.test(hash)||!DAY.test(pack.date))throw Error('Invalid immutable reviewer identity');
 const key=`science-reviewed/${pack.cityId}/${pack.date}/${hash}.json`;
 const existing=await env.DB.prepare(
  'SELECT source_hash,r2_key,state FROM science_approved_day_sources WHERE city_id=? AND local_date=?'
 ).bind(pack.cityId,pack.date).first();
 if(existing){
  if(existing.source_hash!==hash||existing.r2_key!==key)
   throw Error('Existing reviewed day cannot be silently replaced');
  return {status:'existing',cityId:pack.cityId,date:pack.date,publicRelease:false};
 }
 // Signed facts are private even after import. Write R2 BEFORE D1, never approve.
 await env.CANDIDATES.put(key,raw,{
  httpMetadata:{contentType:'application/json'},
  customMetadata:{status:'signed-review-draft-only',source_record_hash:hash}
 });
 const out=await env.DB.prepare(
  "INSERT OR IGNORE INTO science_approved_day_sources (city_id,local_date,source_hash,r2_key,state) VALUES (?,?,?,?,'approved_for_draft')"
 ).bind(pack.cityId,pack.date,hash,key).run();
 return {status:out.meta?.changes===1?'imported':'existing',
   cityId:pack.cityId,date:pack.date,publicRelease:false};
}
export async function loadSignedScience(env,cityId,dates,secret){
 requirePrivate(env);validateCity(cityId);
 if(!Array.isArray(dates)||!dates.length||dates.length>31||new Set(dates).size!==dates.length||
    dates.some(x=>typeof x!=='string'||!DAY.test(x)))
  throw Error('Invalid exact day scope');
 const packs=[];
 for(const date of [...dates].sort()){
  const row=await env.DB.prepare(
   "SELECT source_hash,r2_key FROM science_approved_day_sources WHERE city_id=? AND local_date=? AND state='approved_for_draft'"
  ).bind(cityId,date).first();
  if(!row||!SHA.test(row.source_hash)||
     row.r2_key!==`science-reviewed/${cityId}/${date}/${row.source_hash}.json`)
   throw Error('Missing independently reviewed scientific day '+cityId+'/'+date);
  const signedFile=await env.CANDIDATES.get(row.r2_key);
  if(!signedFile)throw Error('Signed science source missing from R2');
  const signedRaw=await signedFile.text();
  if(signedRaw.length>MAX_SOURCE)throw Error('Oversized reviewer-signed source file');
  const pack=JSON.parse(signedRaw);
  if(pack.cityId!==cityId||pack.date!==date||pack.sourceRecordHash!==row.source_hash)
   throw Error('Signed science file identity mismatch');
  await verifySciencePack(pack,secret);
  packs.push(pack);
 }
 return packs;
}
export async function loadScienceForJob(env,job,secret){
 const {cityId,date,month,intent}=job;
 validateCity(cityId);
 if(!INTENTS.has(intent)||!MONTH.test(month))throw Error('Unsupported editorial intent or month');
 let days;
 if(intent==='calendar-month'){
  const [year,m]=month.split('-').map(Number);
  days=Array.from({length:new Date(Date.UTC(year,m,0)).getUTCDate()},
   (_,i)=>month+'-'+String(i+1).padStart(2,'0'));
 }else{
  if(RITUAL.has(intent)&&Array.isArray(job.dates)){
   if(job.dates.length<1||job.dates.length>31||new Set(job.dates).size!==job.dates.length||
      job.dates.some(d=>!DAY.test(d)||!d.startsWith(month+'-')))
     throw Error('Ritual requires contiguous source dates within a single month');
   days=[...job.dates].sort();
   for(let i=1;i<days.length;i++){
    const prior=new Date(days[i-1]+'T12:00:00Z').getTime();
    if(new Date(days[i]+'T12:00:00Z').getTime()!==prior+86400000)
     throw Error('Ritual source day range is not continuous');
   }
  }else{
   if(!DAY.test(date||'')||!date.startsWith(month+'-'))throw Error('Exact research day required');
   days=[date];
  }
 }
 return loadSignedScience(env,cityId,days,secret);
}
export async function importSignedRitualRules(env,rule,packs,actor){
 requirePrivate(env);
 if(!clean(actor)||!clean(env.PANCHAVANI_RITUAL_APPROVAL_SECRET))
  throw Error('Separate ritual reviewer approval secret missing');
 const science=packs;
 if(!Array.isArray(science)||!science.length)throw Error('Independently approved science evidence required');
 for(const pack of science)await verifySciencePack(pack,env.PANCHAVANI_SCIENCE_APPROVAL_SECRET);
 await verifyRitualReview(rule,science,env.PANCHAVANI_RITUAL_APPROVAL_SECRET,
  rule.intent,rule.cityId);
 const hashes=await digest(science.map(x=>x.sourceRecordHash).sort());
 const raw=JSON.stringify(rule);
 if(raw.length>MAX_SOURCE)throw Error('Oversized signed rule evidence');
 const content=await sha(raw);
 const key=`reviewed-rules/${rule.cityId}/${rule.intent}/${rule.topic}/${hashes}/${content}.json`;
 const prior=await env.DB.prepare(
  'SELECT source_sha,r2_key FROM independently_reviewed_rule_sources WHERE city_id=? AND intent=? AND topic=? AND science_hashes_sha=?'
 ).bind(rule.cityId,rule.intent,rule.topic,hashes).first();
 if(prior){
  if(prior.source_sha!==content||prior.r2_key!==key)
   throw Error('Independently reviewed ritual rule cannot be overwritten');
  return {status:'existing',publicRelease:false};
 }
 await env.CANDIDATES.put(key,raw,{httpMetadata:{contentType:'application/json'},
  customMetadata:{status:'private-reviewed-ritual-draft-only'}});
 const row=await env.DB.prepare(
  "INSERT OR IGNORE INTO independently_reviewed_rule_sources (city_id,intent,topic,science_hashes_sha,science_dates_json,source_sha,r2_key,state) VALUES (?,?,?,?,?, ?,?,'approved_for_draft')"
 ).bind(rule.cityId,rule.intent,rule.topic,hashes,JSON.stringify(science.map(p=>p.date).sort()),content,key).run();
 return {status:row.meta?.changes===1?'imported':'existing',publicRelease:false};
}
export async function loadRuleForJob(env,job,packs){
 const keySha=await digest(packs.map(x=>x.sourceRecordHash).sort());
 const row=await env.DB.prepare(
  "SELECT r2_key,source_sha FROM independently_reviewed_rule_sources WHERE city_id=? AND intent=? AND topic=? AND science_hashes_sha=? AND state='approved_for_draft'"
 ).bind(job.cityId,job.intent,job.topic,keySha).first();
 if(!row||!SHA.test(row.source_sha))throw Error('No separate independently reviewed ritual rule for this day');
 const rule=await loadR2(env,row.r2_key,row.source_sha);
 await verifyRitualReview(rule,packs,env.PANCHAVANI_RITUAL_APPROVAL_SECRET,job.intent,job.cityId);
 return rule;
}
export function multiIntentDurableStore(env,actor){
 requirePrivate(env);
 return {
  async reserve(key,sourceHash,task){
   if(!key.startsWith('multi-intent/')||!SHA.test(sourceHash)||!clean(actor))
    throw Error('Invalid canonical private editorial reservation identity');
   const parts=key.split('/');
   if(parts.length!==7||parts[0]!=='multi-intent'||!INTENTS.has(parts[1])||
      !Object.hasOwn(CITY_NAMES,parts[2])||!MONTH.test(parts[3])||
      !/^[a-z0-9-]{3,70}$/.test(parts[4])||parts[5]!==sourceHash||
      !['en','hi'].includes(parts[6]))
    throw Error('Malformed source-locked editorial identity');
   if(task?.scienceHash!==sourceHash||task?.cityId!==parts[2]||
      task?.intent!==parts[1]||task?.month!==parts[3]||
      task?.topic!==parts[4]||task?.language!==parts[6]||
      (task?.date!==null&&(!DAY.test(task.date)||!task.date.startsWith(parts[3]+'-'))))
     throw Error('Private paid request does not match signed editorial task');
   const id=await sha(key);
   const payload=[id,parts[2],parts[1],parts[4],task.date,parts[3],parts[6],sourceHash,actor];
   // Single D1 INSERT atomically checks global 24-hour paid-attempt cap
   // over all three distinct DeepSeek editorial subsystems.
   const row=await env.DB.prepare(
    "INSERT OR IGNORE INTO editorial_multi_intent_once "+
    "(id,city_id,intent,topic,local_date,month,language,source_hash,actor,state) "+
    "SELECT ?,?,?,?,?,?,?,?,?,'reserved' WHERE "+
    "(SELECT COUNT(*) FROM editorial_multi_intent_once WHERE created_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day'))+"+
    "(SELECT COUNT(*) FROM science_locked_editorial_once WHERE created_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day'))+"+
    "(SELECT COUNT(*) FROM editorial_one_shot WHERE created_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day')) < 3"
   ).bind(...payload).run();
   return row.meta?.changes===1;
  },
  async save(key,result){
   const id=await sha(key);
   const row=await env.DB.prepare(
    "SELECT state,source_hash FROM editorial_multi_intent_once WHERE id=?"
   ).bind(id).first();
   if(row?.state!=='reserved'||row.source_hash!==result.scienceHash)
    throw Error('Private editor reservation lost or reused');
   const raw=JSON.stringify(result);
   if(raw.length>MAX_SOURCE)throw Error('Private editor result exceeds safe size');
   const content=await sha(raw);
   const r2Key=`unapproved/multidomain/${id}/${content}.json`;
   await env.CANDIDATES.put(r2Key,raw,{httpMetadata:{contentType:'application/json'},
    customMetadata:{status:'needs-independent-human-review',source_sha256:result.scienceHash}});
   const status=result.reviewStatus==='FAILED_ONE_SHOT_NO_AUTOMATIC_RETRY'?'failed':'stored';
   const out=await env.DB.prepare(
    "UPDATE editorial_multi_intent_once SET state=?,r2_key=? WHERE id=? AND state='reserved' AND source_hash=?"
   ).bind(status,r2Key,id,row.source_hash).run();
   if(out.meta?.changes!==1)throw Error('Editor result ledger commit conflict');
  }
 };
}
export async function storedEditorialCorpus(env){
 requirePrivate(env);
 const rows=(await env.DB.prepare(
  "SELECT id,r2_key,source_hash FROM editorial_multi_intent_once WHERE state='stored' AND r2_key IS NOT NULL ORDER BY created_at DESC LIMIT 300"
 ).all()).results||[];
 const corpus=[];
 for(const row of rows){
  if(!SHA.test(row.id)||!SHA.test(row.source_hash)||!row.r2_key?.startsWith(`unapproved/multidomain/${row.id}/`))
   throw Error('Invalid cached private editorial path');
  const filename=row.r2_key.split('/').at(-1);
  const obj=await loadR2(env,row.r2_key,filename.slice(0,-5),MAX_SOURCE);
  if(obj.scienceHash!==row.source_hash||obj.publicationAuthorized!==false||obj.indexingAuthorized!==false)
   throw Error('Stored private draft integrity failed');
  if(obj.draft)corpus.push({scienceHash:obj.scienceHash,draft:obj.draft});
 }
 return corpus;
}
export async function runApprovedEditorialJob(env,job,actor,transport=fetch){
 requirePrivate(env);
 if(env?.AUTO_MULTI_INTENT_EDITORIAL_ENABLED!=='true')
  throw Error('Multi-intent paid editorial must be explicitly enabled');
 if(!env.PANCHAVANI_SCIENCE_APPROVAL_SECRET||!env.DEEPSEEK_API_KEY)
  throw Error('Scientific reviewer HMAC or DeepSeek secret missing');
 const science=await loadScienceForJob(env,job,env.PANCHAVANI_SCIENCE_APPROVAL_SECRET);
 const rule=RITUAL.has(job.intent)?await loadRuleForJob(env,job,science):null;
 const count=await env.DB.prepare(
  "SELECT (SELECT COUNT(*) FROM editorial_multi_intent_once WHERE created_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day'))+"+
  "(SELECT COUNT(*) FROM science_locked_editorial_once WHERE created_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day'))+"+
  "(SELECT COUNT(*) FROM editorial_one_shot WHERE created_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day')) AS n"
 ).first();
 const remaining=Math.max(0,3-Number(count?.n||0));
 if(!remaining)return {status:'global-deepseek-billing-cap',attempted:0,indexingAuthorized:false};
 const result=await runMultiIntentEditorialBatch({
  jobs:[{intent:job.intent,cityId:job.cityId,topic:job.topic||'',language:'en',
    packs:science,rulePack:rule}],
  scienceSecret:env.PANCHAVANI_SCIENCE_APPROVAL_SECRET,
  ritualSecret:env.PANCHAVANI_RITUAL_APPROVAL_SECRET,
  apiKey:env.DEEPSEEK_API_KEY,maxRequests:Math.min(1,remaining),
  store:multiIntentDurableStore(env,actor),existing:await storedEditorialCorpus(env),transport
 });
 return {...result,scienceReviewed:true,editorialHumanReviewed:false,
  publicationAuthorized:false,indexingAuthorized:false};
}

/** Cloudflare scheduled runner: one real fact-supported DeepSeek draft per tick.
 * No verified D1/R2 facts = no paid requests. Daily -> calendar -> expert ritual.
 * All reservations are globally capped with the other editorial workflows.
 */
export async function autoMultiIntentEditorial(env,transport=fetch){
 if(env?.AUTO_MULTI_INTENT_EDITORIAL_ENABLED!=='true')
  return {status:'explicitly-disabled',attempted:0,publicationAuthorized:false};
 if(!env.DB||!env.CANDIDATES||
    !env.PANCHAVANI_SCIENCE_APPROVAL_SECRET||!env.DEEPSEEK_API_KEY)
  return {status:'waiting-for-independent-science-and-api-credentials',
   attempted:0,publicationAuthorized:false};
 await ensureMultiIntentSchema(env);
 // Daily task: source must be independently signed in D1/R2, not JPL research.
 const pending=(await env.DB.prepare(
  "SELECT s.city_id,s.local_date FROM science_approved_day_sources s "+
  "WHERE s.state='approved_for_draft' AND NOT EXISTS ("+
  "SELECT 1 FROM editorial_multi_intent_once m WHERE m.city_id=s.city_id "+
  "AND m.local_date=s.local_date AND m.intent='daily-panchang') "+
  "ORDER BY s.local_date,s.city_id LIMIT 1"
 ).all()).results||[];
 if(pending.length){
  const item=pending[0];
  const result=await runApprovedEditorialJob(env,{cityId:item.city_id,
   intent:'daily-panchang',month:item.local_date.slice(0,7),
   date:item.local_date,topic:''},'panchavani-cron@internal',transport);
  return {status:'source-locked-daily',attempted:result.attempted||0,
   qualityPassed:result.generated||0,publicationAuthorized:false};
 }
 // Month is not treated as complete because a research bundle exists:
 // require every calendar day to have an independent signed review in D1.
 const cityMonths=(await env.DB.prepare(
  "SELECT city_id,substr(local_date,1,7) AS month,COUNT(*) AS n "+
  "FROM science_approved_day_sources WHERE state='approved_for_draft' "+
  "GROUP BY city_id,substr(local_date,1,7) ORDER BY month,city_id LIMIT 120"
 ).all()).results||[];
 for(const item of cityMonths){
  const [year,m]=item.month.split('-').map(Number);
  if(!MONTH.test(item.month)||Number(item.n)!==
     new Date(Date.UTC(year,m,0)).getUTCDate())continue;
  const existing=await env.DB.prepare(
   "SELECT 1 AS exists_record FROM editorial_multi_intent_once "+
   "WHERE city_id=? AND month=? AND intent='calendar-month' LIMIT 1"
  ).bind(item.city_id,item.month).first();
  if(existing)continue;
  const result=await runApprovedEditorialJob(env,{cityId:item.city_id,
   intent:'calendar-month',month:item.month,date:null,topic:''},
   'panchavani-cron@internal',transport);
  return {status:'source-locked-monthly',attempted:result.attempted||0,
   qualityPassed:result.generated||0,publicationAuthorized:false};
 }
 const rules=(await env.DB.prepare(
  "SELECT city_id,intent,topic,science_dates_json FROM independently_reviewed_rule_sources "+
  "WHERE state='approved_for_draft' ORDER BY created_at LIMIT 120"
 ).all()).results||[];
 for(const row of rules){
  const dates=JSON.parse(row.science_dates_json);
  if(!Array.isArray(dates)||!dates.length||dates.length>31)
   throw Error('Invalid archived reviewed ritual day scope');
  const localDate=dates[0],monthId=localDate.slice(0,7);
  if(!dates.every(x=>DAY.test(x)&&x.startsWith(monthId+'-')))
   throw Error('Reviewed ritual source crossed an unsupported month');
  const existing=await env.DB.prepare(
   "SELECT 1 AS exists_record FROM editorial_multi_intent_once "+
   "WHERE city_id=? AND intent=? AND topic=? AND local_date=? AND month=? LIMIT 1"
  ).bind(row.city_id,row.intent,row.topic,localDate,monthId).first();
  if(existing)continue;
  const result=await runApprovedEditorialJob(env,{cityId:row.city_id,
   intent:row.intent,topic:row.topic,month:monthId,date:localDate,dates},
   'panchavani-cron@internal',transport);
  return {status:'source-locked-ritual',attempted:result.attempted||0,
   qualityPassed:result.generated||0,publicationAuthorized:false};
 }
 return {status:'awaiting-independently-approved-content',
  attempted:0,publicationAuthorized:false};
}
