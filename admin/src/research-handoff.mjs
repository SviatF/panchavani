/** Import EXACTLY one three-city JPL research bundle through existing
 * Cloudflare Access authenticated admin. Not a public API or release path.
 *
 * The GitHub service-token -> Worker hop is currently 403. This carefully
 * scoped, human-triggered ONE upload avoids weakening Access or adding secrets.
 * No model call is made by this module.
 */
import {candidateIssues} from './runner.mjs';

const FIXED_CITIES=['delhi','mumbai','chennai'];
const JPL_HASH='c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2';
const MAX_BUNDLE_BYTES=680_000;
const encoder=new TextEncoder();
const hex=a=>[...new Uint8Array(a)].map(x=>x.toString(16).padStart(2,'0')).join('');
const digest=async x=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(x)));
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 !Number.isNaN(Date.parse(x+'T12:00:00Z'))&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;

export async function parseResearchHandoff(raw){
 if(typeof raw!=='string'||encoder.encode(raw).length>MAX_BUNDLE_BYTES)
  throw new Error('Bundle exceeds the permitted size');
 let bundle;
 try{bundle=JSON.parse(raw)}catch{throw new Error('Invalid JSON bundle')}
 if(!bundle||typeof bundle!=='object'||Array.isArray(bundle)||
  bundle.artifactType!=='PANCHAVANI_PRIVATE_THREE_CITY_HANDOFF'||
  bundle.schemaVersion!==1||bundle.status!=='UNAPPROVED_RESEARCH'||
  bundle.releaseAuthorized!==false||bundle.indexingAuthorized!==false||
  bundle.modelInvocationAuthorized!==false||
  bundle.ephemerisSha256!==JPL_HASH||
  !/^[a-f0-9]{64}$/.test(bundle.catalogSha256||'')||
  !validDate(bundle.localDate)||!Array.isArray(bundle.entries)||
  bundle.entries.length!==3)throw new Error('Untrusted research handoff envelope');
 const validated=[];
 for(let i=0;i<3;i++){
  const entry=bundle.entries[i],city=FIXED_CITIES[i];
  if(!entry||entry.cityId!==city||entry.localDate!==bundle.localDate||
     typeof entry.candidateJson!=='string'||
     encoder.encode(entry.candidateJson).length>200_000||
     !/^[a-f0-9]{64}$/.test(entry.candidateSha256||'')||
     (await digest(entry.candidateJson))!==entry.candidateSha256)
    throw new Error('Candidate SHA or three-city ordering mismatch');
  let candidate;
  try{candidate=JSON.parse(entry.candidateJson)}catch{throw new Error('Candidate JSON malformed')}
  if(candidate.methodology?.ephemerisHash!==JPL_HASH||
    candidate.methodology?.ayanamsa!=='NOT_VALIDATED'||
    candidate.validation?.blockerCount<1||
    candidateIssues(candidate,{city_id:city,local_date:bundle.localDate}).length)
    throw new Error('Research candidate not eligible for private storage');
  validated.push({...entry,candidate});
 }
 const ledger=validated.map(x=>x.cityId+':'+x.localDate+':'+x.candidateSha256).join('\n');
 if(await digest(ledger)!==bundle.bundleSha256)
  throw new Error('Bundle ledger checksum mismatch');
 return {localDate:bundle.localDate,entries:validated,bundleSha256:bundle.bundleSha256};
}

/** A half-finished import remains blocked; no retry or overwriting old science.
 * Return state for the admin dashboard. Imported rows have status CANDIDATE,
 * not approved, and can be used only for PRIVATE draft generation.
 */
export async function importResearchHandoff(env,actor,parsed){
 if(!env?.DB||!env?.CANDIDATES)throw new Error('Private D1/R2 is unavailable');
 const report={created:[],existing:[],publicationAuthorized:false};
 for(const entry of parsed.entries){
  const {cityId:city,localDate:date,candidateSha256:hash,candidateJson}=entry;
  const existing=await env.DB.prepare(
   'SELECT candidate_sha256,status FROM private_research_handoff_slots WHERE city_id=? AND local_date=?'
  ).bind(city,date).first();
  if(existing){
   if(existing.candidate_sha256!==hash || existing.status!=='stored')
    throw new Error('Research city/day import needs explicit manual review');
   report.existing.push(city);continue;
  }
  // Don't duplicate a previous candidate already created by the signed Runner.
  const prior=await env.DB.prepare(
   'SELECT id,content_hash FROM research_candidates WHERE city_id=? AND local_date=? LIMIT 1'
  ).bind(city,date).first();
  if(prior){
   if(prior.content_hash!==hash)
    throw new Error('Different private candidate already exists for this city/day');
   report.existing.push(city);continue;
  }
  const job=crypto.randomUUID(),audit=crypto.randomUUID(),record=crypto.randomUUID();
  const statements=[
   env.DB.prepare(
    "INSERT INTO job_requests(id,city_id,local_date,status,requested_by) SELECT ?,?,?,'queued',? WHERE NOT EXISTS (SELECT 1 FROM private_research_handoff_slots WHERE city_id=? AND local_date=?)"
   ).bind(job,city,date,actor,city,date),
   env.DB.prepare(
    "INSERT OR IGNORE INTO private_research_handoff_slots(city_id,local_date,job_id,candidate_sha256,status,imported_by) SELECT ?,?,?,?,'reserved',? WHERE EXISTS (SELECT 1 FROM job_requests WHERE id=?)"
   ).bind(city,date,job,hash,actor,job),
  ];
  const initial=await env.DB.batch(statements);
  if(initial[0]?.meta?.changes!==1||initial[1]?.meta?.changes!==1)
    throw new Error('Research slot was concurrently reserved; no overwrite');
  const r2Key='unapproved/'+job+'/'+hash+'.json';
  try{
   await env.CANDIDATES.put(r2Key,candidateJson,{
    httpMetadata:{contentType:'application/json'},
    customMetadata:{approval:'NONE',candidate_sha256:hash,city_id:city,import:'trusted-browser-research-only'}
   });
   const result=await env.DB.batch([
    env.DB.prepare(
     "UPDATE job_requests SET status='candidate',candidate_hash=? WHERE id=? AND status='queued'"
    ).bind(hash,job),
    env.DB.prepare(
     "INSERT INTO research_candidates(id,job_id,city_id,local_date,content_hash,r2_key,blocker_count,status) VALUES (?,?,?,?,?,?,?,'unapproved')"
    ).bind(record,job,city,date,hash,r2Key,entry.candidate.validation.blockerCount),
    env.DB.prepare(
     "UPDATE private_research_handoff_slots SET status='stored',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE city_id=? AND local_date=? AND job_id=? AND status='reserved'"
    ).bind(city,date,job),
    env.DB.prepare(
     "INSERT INTO audit_log(id,actor,action,subject_id) VALUES (?,?,'manual_private_research_import',?)"
    ).bind(audit,actor,job)
   ]);
   if(result[0]?.meta?.changes!==1||result[2]?.meta?.changes!==1)
    throw new Error('Private D1 commit was not acknowledged');
   report.created.push(city);
  }catch{
   // Never delete a reservation automatically: an incomplete upload requires
   // an operator audit rather than silent re-ingestion of potentially new data.
   try{await env.DB.prepare(
    "UPDATE private_research_handoff_slots SET status='failed' WHERE job_id=? AND status='reserved'"
   ).bind(job).run();}catch{}
   throw new Error('Private storage failed; slot locked for audit');
  }
 }
 return report;
}

export async function handleResearchImport(request,env,actor,isTrustedBrowserPost){
 const url=new URL(request.url);
 if(url.pathname!=='/research/import')return null;
 if(!actor)return new Response('Access denied',{status:403});
 if(request.method!=='POST')return new Response('Method not allowed',{status:405});
 if(!isTrustedBrowserPost(request))return new Response('Same-origin confirmation required',{status:403});
 if(!env.DB||!env.CANDIDATES)return new Response('Private bindings unavailable',{status:503});
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data'))
  return new Response('Expected multipart upload',{status:415});
 const size=Number(request.headers.get('content-length')||0);
 if(size>MAX_BUNDLE_BYTES+10000)return new Response('Oversized import',{status:413});
 let body,upload;
 try{
  body=await request.formData();
  upload=body.get('bundle');
  if(!upload||typeof upload.text!=='function'||upload.size>MAX_BUNDLE_BYTES)
   return new Response('Expected a small JSON file',{status:400});
  const parsed=await parseResearchHandoff(await upload.text());
  const result=await importResearchHandoff(env,actor,parsed);
  return new Response('RESEARCH ONLY: '+result.created.length+
    ' candidates privately stored; '+result.existing.length+
    ' unchanged. 0 DeepSeek calls, 0 approved pages. Return to /ai for review.',{
      status:200,headers:{'Content-Type':'text/plain; charset=utf-8',
        'X-Robots-Tag':'noindex, nofollow, noarchive','Cache-Control':'private, no-store'}
    });
 }catch(e){
  const isInput= /(?:bundle|candidate|envelope|sha|JSON|ordering|date|size)/i.test(String(e?.message||''));
  return new Response(isInput?'Invalid research bundle. No publication occurred.':
    'Import requires private storage review. No publication occurred.',{
      status:isInput?422:409,
      headers:{'X-Robots-Tag':'noindex, nofollow, noarchive','Cache-Control':'private, no-store'}
    });
 }
}
