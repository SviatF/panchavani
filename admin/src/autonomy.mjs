/** Cloudflare Cron coordinator: private/research-only, disabled by default.
 *
 * This handler is NOT publicly routable; it only handles Cloudflare's scheduled()
 * event. Existing DeepSeek creation is reused through the same private server
 * code, never directly from frontend. No publishing or approval endpoints.
 */
import { CITY_IDS } from './city-catalog.mjs';
import { handleAi } from './ai-editorial.mjs';

export const AUTO_ACTOR='panchavani-cron@internal';
export const PILOT_CITY_IDS=Object.freeze(['delhi','mumbai','chennai']);
export const AUTO_PROMPT_VERSION='city-evergreen-grounded-v1';
const NO_CACHE='private, no-store';
const MAX_PENDING=6;        // bound unfinished JPL work
const MAX_DRAFTS_PER_DAY=3; // cost bound, server-side actor + D1
const NEXT_DAYS=1;          // prepare tomorrow's city/day research
const ONE_DAY=24*60*60*1000;

export function futureIndianDate(now, offsetDays=NEXT_DAYS) {
  const time=new Date(now);
  if(!Number.isFinite(time.getTime()))throw new Error('Invalid schedule date');
  const parts=new Intl.DateTimeFormat('en-GB',{
    timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(time);
  const d=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  const iso=d.year+'-'+d.month+'-'+d.day;
  return new Date(Date.parse(iso+'T00:00:00Z')+offsetDays*ONE_DAY)
    .toISOString().slice(0,10);
}

export function readiness(env){
  const enabled=env?.AUTO_RESEARCH_ENABLED==='true';
  const aiEnabled=env?.AUTO_EDITORIAL_ENABLED==='true';
  const db=Boolean(env?.DB),storage=Boolean(env?.CANDIDATES);
  const runner=typeof env?.RUNNER_HMAC_SECRET==='string'&&env.RUNNER_HMAC_SECRET.length>=32;
  const deepseek=typeof env?.DEEPSEEK_API_KEY==='string'&&env.DEEPSEEK_API_KEY.length>=12;
  return {
    researchEnabled:enabled, editorialEnabled:aiEnabled,
    databaseReady:db,storageReady:storage,runnerGatewayConfigured:runner,
    deepseekSecretConfigured:deepseek,
    researchOperational:enabled&&db&&storage&&runner,
    draftOperational:aiEnabled&&db&&storage&&deepseek,
    note:'Worker secret presence alone does not verify GitHub Runner credentials, provider billing or a live deployed schedule.'
  };
}

async function count(db,query,bind=[]){
  const result=await db.prepare(query).bind(...bind).first();
  return Number(result?.n||0);
}

export async function enqueuePilot(env,now){
  const localDate=futureIndianDate(now);
  const pending=await count(env.DB,
    "SELECT COUNT(*) AS n FROM job_requests WHERE requested_by=? AND status IN ('queued','running')",
    [AUTO_ACTOR]);
  if(pending>=MAX_PENDING)return {status:'pending-cap',pending,queued:0,localDate};
  let queued=0;
  for(const city of PILOT_CITY_IDS.slice(0,Math.max(0,MAX_PENDING-pending))){
    if(!CITY_IDS.has(city))throw new Error('Pilot research city missing from active catalog');
    const id=crypto.randomUUID(),auditId=crypto.randomUUID();
    // Batch creates the job before its referencing idempotency slot to keep
    // FOREIGN KEY checks valid. A duplicate date never queues twice.
    const updates=await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO job_requests(id,city_id,local_date,status,requested_by) SELECT ?,?,?,'queued',? WHERE NOT EXISTS (SELECT 1 FROM autonomous_research_slots WHERE city_id=? AND local_date=?)"
      ).bind(id,city,localDate,AUTO_ACTOR,city,localDate),
      env.DB.prepare(
        "INSERT OR IGNORE INTO autonomous_research_slots(city_id,local_date,job_id) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM job_requests WHERE id=?)"
      ).bind(city,localDate,id,id),
      env.DB.prepare(
        "INSERT INTO audit_log(id,actor,action,subject_id) SELECT ?,?,'automatic_research_queued',? WHERE EXISTS (SELECT 1 FROM autonomous_research_slots WHERE city_id=? AND local_date=? AND job_id=?)"
      ).bind(auditId,AUTO_ACTOR,id,city,localDate,id)
    ]);
    if(updates[0].meta?.changes===1)queued++;
  }
  return {status:'researched-queue',queued,localDate,pendingBefore:pending};
}

/** Bounded auto-city SEO generation, opt-in via AUTO_EDITORIAL_ENABLED=true.
 * One attempt per city+language, not one paid request on every calendar date.
 */
export function enabledEditorialCities(env){
 const raw=env?.AUTO_EDITORIAL_CITY_IDS||PILOT_CITY_IDS.join(',');
 const names=raw.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(!names.length||names.length>10||new Set(names).size!==names.length||
    names.some(x=>!CITY_IDS.has(x)))throw new Error('Invalid allowed SEO city list');
 return names;
}
function internalPost(jobId){
 return new Request('https://admin.panchavani.com/ai/draft',{
  method:'POST',
  headers:{'Origin':'https://admin.panchavani.com','Sec-Fetch-Site':'same-origin',
    'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({jobId,intent:'city-hub',language:'en'}).toString()
 });
}
export async function autoDraftOnce(env,transport=fetch){
 const allow=enabledEditorialCities(env);
 // Count attempted *reservations*, including failures and incomplete calls.
 // Counting only successful audit writes would miscount paid requests.
 const spent=await count(env.DB,
   "SELECT COUNT(*) AS n FROM editorial_one_shot WHERE requested_by=? "+
   "AND created_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day')",
   [AUTO_ACTOR]);
 if(spent>=MAX_DRAFTS_PER_DAY)return {status:'draft-cap',attempted:0};
 // Explicit allowlist (at most 10), real private candidates already stored.
 // No astronomy candidate = no DeepSeek call and no placeholder content.
 const placeholders=allow.map(()=>'?').join(',');
 const candidate=await env.DB.prepare(
   "SELECT j.id,j.city_id FROM job_requests j "+
   "JOIN research_candidates r ON r.job_id=j.id "+
   "WHERE j.status='candidate' AND r.status='unapproved' "+
   "AND j.city_id IN ("+placeholders+") AND NOT EXISTS ("+
   " SELECT 1 FROM editorial_one_shot e WHERE e.city_id=j.city_id "+
   " AND e.intent='city-hub' AND e.language='en') "+
   "ORDER BY j.created_at ASC LIMIT 1"
 ).bind(...allow).first();
 if(!candidate)return {status:'awaiting-new-city-guide-candidates',attempted:0};
 // One-shot processor owns the atomic claim, billable cap and R2 cache.
 // Never create a second scheduler-specific reservation keyed by prompt
 // version: that would permit double billing after policy changes.
 try{
  const response=await handleAi(internalPost(candidate.id),env,AUTO_ACTOR,
    ()=>true,transport);
  if(response?.status===200)
   return {status:'stored',attempted:1,cityId:candidate.city_id};
  return {status:'private-draft-blocked',attempted:0,
   // Sanitized metadata only; never return HTML/private model response.
   httpStatus:response?.status||503,cityId:candidate.city_id};
 }catch{
  return {status:'private-draft-exception',attempted:0,
    cityId:candidate.city_id};
 }
}

export async function runAutonomy(env,now=Date.now(),transport=fetch){
  const ready=readiness(env);
  const report={status:'research-only-autonomous-pilot',indexingAuthorized:false,
    publishingAuthorized:false,ready,queue:null,draft:null};
  if(ready.researchOperational){
    report.queue=await enqueuePilot(env,now);
  }else report.queue={status:'disabled-or-missing-research-bindings',queued:0};
  if(ready.draftOperational){
    report.draft=await autoDraftOnce(env,transport);
  }else report.draft={status:'disabled-or-missing-ai-bindings',attempted:0};
  return report;
}
