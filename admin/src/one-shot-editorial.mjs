/** One paid generation maximum for (city, Indian local date, intent, language).
 * A failed, interrupted or stale reservation is NEVER retried automatically:
 * the provider may already have billed. This module cannot publish pages.
 */
const SLOT_TABLE='editorial_one_shot';
const encoder=new TextEncoder();
const hex=value=>[...new Uint8Array(value)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha256=async raw=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(raw)));
const keyArgs=(record,intent,language)=>[record.city_id,record.local_date,intent,language];
export const ONE_SHOT_PILOT_CITIES=Object.freeze(['delhi','mumbai','chennai']);

export async function readOneShot(env,record,intent,language){
  // Missing D1 migration MUST fail closed, before any billable API request.
  const row=await env.DB.prepare(
    'SELECT job_id,source_hash,status,r2_key,content_hash FROM '+SLOT_TABLE+
    ' WHERE city_id=? AND local_date=? AND intent=? AND language=?'
  ).bind(...keyArgs(record,intent,language)).first();
  if(!row)return {state:'missing'};
  if(row.source_hash!==record.content_hash)return {state:'stale'};
  if(row.status!=='stored')return {state:'locked'};
  if(typeof row.r2_key!=='string'||
     !row.r2_key.startsWith('unapproved/ai-editorial/'+row.job_id+'/')||
     !/^[a-f0-9]{64}$/.test(row.content_hash||''))
    throw new Error('Stored one-shot reference integrity failure');
  const object=await env.CANDIDATES.get(row.r2_key);
  if(!object)throw new Error('Stored one-shot object missing');
  const raw=await object.text();
  if(raw.length>30000||(await sha256(raw))!==row.content_hash)
    throw new Error('Stored one-shot SHA-256 verification failed');
  const artifact=JSON.parse(raw);
  if(artifact.status!=='AI_DRAFT_UNAPPROVED'||
     artifact.cityId!==record.city_id||artifact.localDate!==record.local_date||
     artifact.language!==language||artifact.intent!==intent||
     artifact.sourceCandidateHash!==record.content_hash||
     artifact.publicationAuthorized!==false||artifact.indexingAuthorized!==false)
    throw new Error('Stored one-shot content integrity failure');
  return {state:'cached',artifact};
}

export async function reserveOneShot(env,record,intent,language,actor,policyVersion){
  const fields=" (city_id,local_date,intent,language,job_id,source_hash,policy_version,requested_by,status)";
  const args=[...keyArgs(record,intent,language),record.id,record.content_hash,policyVersion,actor];
  // A city hub is evergreen. Reserve at most ONE paid attempt per city and
  // language, regardless of candidate date or the number of concurrent Cron
  // workers. The NOT EXISTS check and INSERT happen in one D1 statement.
  const cityHub=intent==='city-hub';
  const sql=cityHub
    ? "INSERT OR IGNORE INTO "+SLOT_TABLE+fields+
      " SELECT ?,?,?,?,?,?,?,?,'reserved' WHERE NOT EXISTS ("+
      " SELECT 1 FROM "+SLOT_TABLE+
      " WHERE city_id=? AND intent='city-hub' AND language=?)"
    : "INSERT OR IGNORE INTO "+SLOT_TABLE+fields+
      " VALUES (?,?,?,?,?,?,?,?,'reserved')";
  const result=await env.DB.prepare(sql).bind(...args,...(cityHub?[record.city_id,language]:[])).run();
  return result.meta?.changes===1;
}

export async function storeOneShot(env,record,intent,language,artifact,r2Key){
  // R2 is written first; failure of the D1 commit locks the slot rather than
  // making a second API call. No automatic retries of a possibly billed call.
  const serialized=JSON.stringify(artifact);
  if(serialized.length>30000)throw new Error('One-shot draft too large');
  const hash=await sha256(serialized);
  await env.CANDIDATES.put(r2Key,serialized,{
    httpMetadata:{contentType:'application/json'},
    customMetadata:{approval:'NONE',source_sha256:record.content_hash,artifact_sha256:hash}
  });
  const result=await env.DB.prepare(
    "UPDATE "+SLOT_TABLE+" SET status='stored',r2_key=?,content_hash=?,"+
    " updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')"+
    " WHERE city_id=? AND local_date=? AND intent=? AND language=?"+
    " AND job_id=? AND source_hash=? AND status='reserved'"
  ).bind(r2Key,hash,...keyArgs(record,intent,language),record.id,record.content_hash).run();
  if(result.meta?.changes!==1)throw new Error('One-shot reservation lost');
  return hash;
}

export async function failOneShot(env,record,intent,language,code='provider-or-storage-error'){
  // No retry route: an unsuccessful response may still have consumed tokens.
  await env.DB.prepare(
    "UPDATE "+SLOT_TABLE+" SET status='failed',error_code=?,"+
    " updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')"+
    " WHERE city_id=? AND local_date=? AND intent=? AND language=?"+
    " AND job_id=? AND status='reserved'"
  ).bind(code,...keyArgs(record,intent,language),record.id).run();
}
