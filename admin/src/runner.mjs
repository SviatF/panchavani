/** Private automated research queue API. Never approves or publishes candidates. */
const encoder = new TextEncoder();
const HEX = /^[a-f0-9]{64}$/;
const KARANA_NAMES=new Set(['Kimstughna','Bava','Balava','Kaulava','Taitila','Gara','Vanija','Vishti','Shakuni','Chatushpada','Naga']);
const IDS = new Set(['delhi','mumbai','kolkata','chennai','bengaluru','ahmedabad','pune','varanasi']);
function reply(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow, noarchive','X-Content-Type-Options':'nosniff'}})}
const toHex = b => [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function digest(data){return toHex(await crypto.subtle.digest('SHA-256',encoder.encode(data)))}
async function sign(secret, input){const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return toHex(await crypto.subtle.sign('HMAC',key,encoder.encode(input)))}
function equalConstantTime(a,b){if(typeof a!=='string'||typeof b!=='string')return false;let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0}
function finiteDate(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v}
function utc(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(v)&&Number.isFinite(Date.parse(v))}
export function candidateIssues(c,job){
 const e=[];if(!c||typeof c!=='object'||Array.isArray(c))return ['invalid-object'];
 if(c.status!=='calculated'||c.approvedBy!==null||c.releaseId!==null)e.push('published-or-approved-field');
 if(c.schemaVersion!=='1.0.0')e.push('unknown-schema');
 if(c.city?.id!==job.city_id||!IDS.has(c.city?.id)||c.localDate!==job.local_date||!finiteDate(c.localDate))e.push('job-mismatch');
 if(typeof c.recordId!=='string'||!c.recordId.startsWith(job.city_id+':'+job.local_date+':'))e.push('invalid-record-id');
 if(!HEX.test(c.methodology?.ephemerisHash||'')||c.methodology?.ayanamsa!=='NOT_VALIDATED'||c.methodology?.rulePackId!=='NONE'||!String(c.city?.catalogVersion||'').startsWith('pilot-unverified'))e.push('unexpected-methodology');
 if(!Number.isInteger(c.validation?.blockerCount)||c.validation.blockerCount<1||c.validation?.reviewStatus!=='not-reviewed')e.push('research-blockers-missing');
 if(c.panchangAtSunrise?.nakshatra!==null||c.panchangAtSunrise?.yoga!==null)e.push('unvalidated-limbs');
 if(c.panchangAtSunrise?.karana!==null && !KARANA_NAMES.has(c.panchangAtSunrise?.karana))e.push('invalid-research-karana');
 const {sunriseUtc:s,sunsetUtc:t,nextSunriseUtc:n}=c.sun||{};
 if(!utc(s)||!utc(t)||!utc(n)||!(Date.parse(s)<Date.parse(t)&&Date.parse(t)<Date.parse(n)))e.push('invalid-solar-order');
 if(!Array.isArray(c.transitions)||c.transitions.length<1||c.transitions.length>50){e.push('invalid-transitions');return e;}
 const ofType=kind=>c.transitions.filter(x=>x?.type===kind);
 const checkLayer=kind=>{
  const layer=ofType(kind);
  return layer.length>0&&layer.every(x=>utc(x.startUtc)&&utc(x.endUtc)&&Date.parse(x.startUtc)<Date.parse(x.endUtc))&&
   utc(s)&&utc(n)&&Math.abs(Date.parse(layer[0].startUtc)-Date.parse(s))<=1000&&
   Math.abs(Date.parse(layer.at(-1).endUtc)-Date.parse(n))<=1000&&
   layer.every((x,i)=>i===0||Math.abs(Date.parse(x.startUtc)-Date.parse(layer[i-1].endUtc))<=1000);
 };
 if(!checkLayer('tithi'))e.push('invalid-tithi-transitions');
 const karanas=ofType('karana');
 if(karanas.length){
  if(!checkLayer('karana')||karanas.some(x=>!KARANA_NAMES.has(x.value)))e.push('invalid-karana-transitions');
  if(checkLayer('tithi')&&checkLayer('karana')){
   const edges=ofType('tithi').slice(0,-1).map(x=>Date.parse(x.endUtc));
   const half=karanas.slice(0,-1).map(x=>Date.parse(x.endUtc));
   if(edges.some(x=>!half.some(y=>Math.abs(x-y)<=1000)))e.push('karana-tithi-mismatch');
  }
 }
 if(c.panchangAtSunrise?.karana && (!karanas.length||c.panchangAtSunrise.karana!==karanas[0].value))e.push('karana-sunrise-mismatch');
 for(const type of ['rahu-kalam','yamaganda','gulika']){
  const items=ofType(type);
  if(items.length!==0&&(items.length!==1||!utc(items[0].startUtc)||!utc(items[0].endUtc)||
     !utc(s)||!utc(t)||Date.parse(items[0].startUtc)<Date.parse(s)||
     Date.parse(items[0].endUtc)>Date.parse(t)||
     Date.parse(items[0].startUtc)>=Date.parse(items[0].endUtc)))e.push('invalid-'+type);
 }
 if(c.transitions.some(x=>!['tithi','karana','rahu-kalam','yamaganda','gulika'].includes(x?.type)))e.push('unsupported-transition-type');
 return e;
}
export async function authorizeRunner(request,env,body){
 const secret=env.RUNNER_HMAC_SECRET;
 if(typeof secret!=='string'||secret.length<32)return false;
 const date=request.headers.get('X-Panchavani-Timestamp');
 const nonce=request.headers.get('X-Panchavani-Nonce');
 const signature=request.headers.get('X-Panchavani-Signature');
 if(!/^\d{10,13}$/.test(date||'')||!/^[a-f0-9-]{36}$/.test(nonce||'')||!HEX.test(signature||''))return false;
 const stamp=Number(date);if(Math.abs(Date.now()-stamp)>300000)return false;
 const u=new URL(request.url);
 const raw=stamp+'\n'+nonce+'\n'+request.method+'\n'+u.pathname+'\n'+await digest(body);
 const expected=await sign(secret,raw);
 if(!equalConstantTime(expected,signature))return false;
 if(!env.DB)return false;
 try{
  const result=await env.DB.prepare("INSERT OR IGNORE INTO runner_nonces (nonce,created_at) VALUES (?,?)").bind(nonce,new Date(stamp).toISOString()).run();
  return result.meta?.changes===1;
 }catch{return false}
}
async function bodyText(req){const size=Number(req.headers.get('Content-Length')||0);if(size>240000)return null;const text=await req.text();return text.length<=240000?text:null}
function isLease(v){return typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v)}
export async function handleRunner(request,env){
 const u=new URL(request.url);
 if(!u.pathname.startsWith('/internal/runner/'))return null;
 if(request.method!=='POST'||!['/internal/runner/claim','/internal/runner/complete','/internal/runner/fail'].includes(u.pathname))return reply({error:'not_found'},404);
 if(!env.DB||!env.CANDIDATES||!env.RUNNER_HMAC_SECRET)return reply({error:'runner_not_configured'},503);
 const raw=await bodyText(request);if(raw===null)return reply({error:'payload_too_large'},413);
 if(!await authorizeRunner(request,env,raw))return reply({error:'access_denied'},403);
 let input;try{input=JSON.parse(raw)}catch{return reply({error:'invalid_json'},400)}
 try {
 if(u.pathname==='/internal/runner/claim'){
  if(Object.keys(input||{}).length!==0)return reply({error:'unexpected_claim_body'},400);
  const lease=crypto.randomUUID();
  const row=await env.DB.prepare("UPDATE job_requests SET status='running', lease_token=?, started_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=(SELECT id FROM job_requests WHERE status='queued' ORDER BY created_at,id LIMIT 1) AND status='queued' RETURNING id,city_id,local_date").bind(lease).first();
  return reply({job:row?{...row,leaseToken:lease}:null,publishing:'disabled'});
 }
 const {jobId,leaseToken}=input||{};
 if(!isLease(jobId)||!isLease(leaseToken))return reply({error:'invalid_lease'},400);
 const row=await env.DB.prepare("SELECT id,city_id,local_date,status,lease_token FROM job_requests WHERE id=?").bind(jobId).first();
 if(!row||row.status!=='running'||!equalConstantTime(row.lease_token,leaseToken))return reply({error:'lease_conflict'},409);
 if(u.pathname==='/internal/runner/fail'){
  const code=input.code;
  if(!['EPHEMERIS_UNAVAILABLE','EPHEMERIS_HASH_MISMATCH','CALCULATION_ERROR','RESULT_REJECTED','NETWORK_ERROR'].includes(code))return reply({error:'invalid_failure_code'},400);
  await env.DB.batch([
   env.DB.prepare("UPDATE job_requests SET status='failed', error_code=?, lease_token=NULL WHERE id=? AND status='running' AND lease_token=?").bind(code,jobId,leaseToken),
   env.DB.prepare("INSERT INTO audit_log (id,actor,action,subject_id) VALUES (?,'research-runner','research_job_failed',?)").bind(crypto.randomUUID(),jobId)
  ]);
  return reply({status:'failed',publishing:'disabled'});
 }
 const record=input.candidate;
 const errors=candidateIssues(record,row);
 if(errors.length)return reply({error:'candidate_rejected',issues:errors},422);
 const serial=JSON.stringify(record);
 if(serial.length>200000)return reply({error:'candidate_too_large'},413);
 const hash=await digest(serial);
 const key='unapproved/'+jobId+'/'+hash+'.json';
 await env.CANDIDATES.put(key,serial,{httpMetadata:{contentType:'application/json'},customMetadata:{candidate_sha256:hash,city_id:row.city_id,approval:'NONE'}});
 const run=await env.DB.prepare("UPDATE job_requests SET status='candidate', candidate_hash=?, error_code=NULL, lease_token=NULL WHERE id=? AND status='running' AND lease_token=?").bind(hash,jobId,leaseToken).run();
 if(run.meta?.changes!==1)return reply({error:'lease_conflict_after_store'},409);
 await env.DB.batch([
  env.DB.prepare("INSERT INTO research_candidates (id,job_id,city_id,local_date,content_hash,r2_key,blocker_count,status) VALUES (?,?,?,?,?,?,?,'unapproved')").bind(crypto.randomUUID(),jobId,row.city_id,row.local_date,hash,key,record.validation.blockerCount),
  env.DB.prepare("INSERT INTO audit_log (id,actor,action,subject_id) VALUES (?,'research-runner','candidate_stored_unapproved',?)").bind(crypto.randomUUID(),jobId)
 ]);
 return reply({status:'candidate',candidateHash:hash,publishing:'disabled'});
 }catch{return reply({error:'private_storage_unavailable'},503)}
}
