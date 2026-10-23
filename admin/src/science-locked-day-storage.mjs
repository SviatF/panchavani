/** D1/R2 durable bridge for independently approved day facts.
 * Only enabled when AUTO_FACTUAL_DAILY_EDITORIAL_ENABLED=true.
 * Secrets and signed sources must be provisioned out of band by a reviewer.
 * D1 insertion does NOT equal scientific verification: HMAC checked at usage.
 */
import {runGroundedDayBatch} from './grounded-day-runner.mjs';
import {verifySciencePack,canonical} from './grounded-day-editorial.mjs';

const CREATE_FACTS=`CREATE TABLE IF NOT EXISTS science_approved_day_sources (
  city_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('approved_for_draft','disabled')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (city_id,local_date)
)`;
const CREATE_SLOTS=`CREATE TABLE IF NOT EXISTS science_locked_editorial_once (
  city_id TEXT NOT NULL, local_date TEXT NOT NULL, language TEXT NOT NULL,
  source_hash TEXT NOT NULL, token TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('reserved','stored','failed')),
  r2_key TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(city_id,local_date,language)
)`;
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const digest=async raw=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)));
const isSha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const isDate=d=>typeof d==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(d);

export async function ensureDailySchema(env){
 if(!env?.DB?.prepare||!env?.CANDIDATES)
  throw Error('Missing private D1/R2 configuration');
 await env.DB.prepare(CREATE_FACTS).run();
 await env.DB.prepare(CREATE_SLOTS).run();
}
export async function loadReviewedDayPacks(env,secret,{limit=3}={}){
 if(!Number.isInteger(limit)||limit<1||limit>10)throw Error('Invalid science-approved import limit');
 const rows=(await env.DB.prepare(
  "SELECT s.city_id,s.local_date,s.source_hash,s.r2_key FROM science_approved_day_sources s "+
  "WHERE s.state='approved_for_draft' AND NOT EXISTS "+
  "(SELECT 1 FROM science_locked_editorial_once e "+
  "WHERE e.city_id=s.city_id AND e.local_date=s.local_date AND e.language='en') "+
  "ORDER BY s.local_date,s.city_id LIMIT ?").bind(limit).all()).results||[];
 const packs=[];
 for(const row of rows){
  if(!isSha(row.source_hash)||!isDate(row.local_date)||
     row.r2_key!==`science-reviewed/${row.city_id}/${row.local_date}/${row.source_hash}.json`)
   throw Error('Invalid independent reviewer R2 reference');
  const blob=await env.CANDIDATES.get(row.r2_key);
  if(!blob)throw Error('Signed reviewer evidence missing from R2');
  const raw=await blob.text();
  if(raw.length>100000)throw Error('Oversized scientific day evidence');
  const pack=JSON.parse(raw);
  if(pack.cityId!==row.city_id||pack.date!==row.local_date||
     pack.sourceRecordHash!==row.source_hash)
     throw Error('Scientific D1/R2 identity mismatch');
  await verifySciencePack(pack,secret);
  packs.push(pack);
 }
 return packs;
}
export function durableDayStore(env){
 if(!env?.DB?.prepare||!env?.CANDIDATES?.put)throw Error('Private D1/R2 unavailable');
 return {
  async reserve(key,sourceHash){
   const [city,day,language,hash,...extra]=key.split('/');
   if(extra.length||!isDate(day)||language!=='en'||!isSha(hash)||
      hash!==sourceHash)throw Error('Invalid paid one-shot reserve key');
   const inserted=await env.DB.prepare(
    "INSERT OR IGNORE INTO science_locked_editorial_once "+
    "(city_id,local_date,language,source_hash,token,state) "+
    "VALUES (?,?,?,?,?,'reserved')").bind(city,day,language,hash,crypto.randomUUID()).run();
   return inserted.meta?.changes===1;
  },
  async save(key,result){
   const [city,day,language,hash]=key.split('/');
   const row=await env.DB.prepare(
    "SELECT token,source_hash,state FROM science_locked_editorial_once "+
    "WHERE city_id=? AND local_date=? AND language=?").bind(city,day,language).first();
   if(!row||row.state!=='reserved'||row.source_hash!==hash)
    throw Error('One-shot reservation missing or altered');
   const raw=JSON.stringify(result);
   if(raw.length>35000)throw Error('Reject oversized AI draft');
   const sha=await digest(raw);
   const r2key=`unapproved/grounded-day/${city}/${day}/${hash}/${row.token}-${sha}.json`;
   await env.CANDIDATES.put(r2key,raw,{
    httpMetadata:{contentType:'application/json'},
    customMetadata:{status:'unapproved',policy:'scientifically-locked-city-day-editorial-v1'}
   });
   const changed=await env.DB.prepare(
    "UPDATE science_locked_editorial_once SET state=?,r2_key=? "+
    "WHERE city_id=? AND local_date=? AND language=? AND "+
    "source_hash=? AND token=? AND state='reserved'"
   ).bind(result.reviewStatus==='FAILED_ONE_SHOT_NO_RETRY'?'failed':'stored',
     r2key,city,day,language,hash,row.token).run();
   if(changed.meta?.changes!==1)throw Error('One-shot result commit conflict (slot locked)');
   return {status:result.reviewStatus};
  }
 };
}
export async function autoGroundedDaily(env,transport=fetch){
 if(env?.AUTO_FACTUAL_DAILY_EDITORIAL_ENABLED!=='true')
  return {status:'disabled-opt-in',attempted:0,publicationAuthorized:false};
 if(!env?.PANCHAVANI_SCIENCE_APPROVAL_SECRET||!env?.DEEPSEEK_API_KEY)
  return {status:'missing-independent-approval-or-model-secret',attempted:0,publicationAuthorized:false};
 await ensureDailySchema(env);
 const row=await env.DB.prepare(
   "SELECT COUNT(*) AS n FROM science_locked_editorial_once "+
   "WHERE created_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day')"
 ).first();
 const attempted=Number(row?.n||0);
 const room=Math.max(0,3-attempted);
 if(room===0)return {status:'daily-paid-attempt-cap',attempted:0,publicationAuthorized:false};
 const signed=await loadReviewedDayPacks(env,env.PANCHAVANI_SCIENCE_APPROVAL_SECRET,{limit:room});
 if(!signed.length)return {status:'no-independently-approved-day-facts',attempted:0,publicationAuthorized:false};
 const result=await runGroundedDayBatch({
  packs:signed,scientificApprovalSecret:env.PANCHAVANI_SCIENCE_APPROVAL_SECRET,
  apiKey:env.DEEPSEEK_API_KEY,maxRequests:room,
  store:durableDayStore(env),existing:[],transport
 });
 return {status:'private-draft-run',attempted:result.attempted,generated:result.generated,
  rejected:result.rejected,publicationAuthorized:false};
}
