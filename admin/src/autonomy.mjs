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
export const AUTO_PROMPT_VERSION='deepseek-private-research-draft-v1';
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

function internalPost(jobId){
  return new Request('https://admin.panchavani.com/ai/draft',{
    method:'POST',
    headers:{
      'Origin':'https://admin.panchavani.com',
      'Sec-Fetch-Site':'same-origin',
      'Content-Type':'application/x-www-form-urlencoded'
    },
    body:new URLSearchParams({jobId,intent:'daily-panchang',language:'en'}).toString()
  });
}
export async function autoDraftOnce(env,transport=fetch){
  const spent=await count(env.DB,
    "SELECT COUNT(*) AS n FROM autonomous_ai_slots WHERE created_at >= strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day')");
  if(spent>=MAX_DRAFTS_PER_DAY)return {status:'draft-cap',attempted:0};
  const candidate=await env.DB.prepare(
    "SELECT j.id FROM job_requests j INNER JOIN research_candidates r ON r.job_id=j.id LEFT JOIN autonomous_ai_slots a ON a.job_id=j.id AND a.intent='daily-panchang' AND a.language='en' AND a.prompt_version=? WHERE j.requested_by=? AND j.status='candidate' AND r.status='unapproved' AND a.job_id IS NULL ORDER BY j.created_at ASC LIMIT 1"
  ).bind(AUTO_PROMPT_VERSION,AUTO_ACTOR).first();
  if(!candidate)return {status:'awaiting-research-candidates',attempted:0};
  // INSERT OR IGNORE is atomic: retries and concurrent scheduled invocations
  // never spend twice on the same job / prompt version.
  const reserved=await env.DB.prepare(
    "INSERT OR IGNORE INTO autonomous_ai_slots(job_id,intent,language,prompt_version,status) VALUES (?,'daily-panchang','en',?,'processing')"
  ).bind(candidate.id,AUTO_PROMPT_VERSION).run();
  if(reserved.meta?.changes!==1)return {status:'already-reserved',attempted:0};
  let state='failed',reason='private-draft-failed';
  try{
    const response=await handleAi(internalPost(candidate.id),env,AUTO_ACTOR,
      ()=>true,transport);
    // This is an INTERNAL event. No route or form can supply AUTO_ACTOR.
    if(response?.status===200){state='stored';reason=null;}
    else reason='private-draft-status-'+(response?.status||'missing');
  }catch{
    reason='private-draft-exception';
  }finally{
    await env.DB.prepare(
      "UPDATE autonomous_ai_slots SET status=?,last_error=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE job_id=? AND intent='daily-panchang' AND language='en' AND prompt_version=? AND status='processing'"
    ).bind(state,reason,candidate.id,AUTO_PROMPT_VERSION).run();
  }
  return {status:state,attempted:1,jobId:candidate.id};
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
