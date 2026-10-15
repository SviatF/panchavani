/** Private, opt-in GitHub JPL research ingestion from a separate R2 inbox.
 * No public HTTP API, bypass of Cloudflare Access, DeepSeek calls or approval.
 */
import {candidateIssues} from './runner.mjs';
import {CITY_IDS} from './city-catalog.mjs';
const JPL='c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2';
const encoder=new TextEncoder();
const sha=async raw=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(raw)))]
 .map(x=>x.toString(16).padStart(2,'0')).join('');
const day=v=>typeof v==='string'&&/^20\d\d-\d\d-\d\d$/.test(v)&&
 !Number.isNaN(Date.parse(v+'T12:00:00Z'))&&
 new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const run=v=>typeof v==='string'&&/^[0-9]{6,20}$/.test(v);
const MAX_PER_RUN=20;
// First-run, additive and idempotent D1 bootstrap. Prevent a separate manual
// migration session from blocking private research ingestion. This only
// creates the table from migration 0006; it never updates public calendars,
// grants review approval, deletes an old job or alters existing D1 tables.
// Avoid passing a multiline two-statement script into D1.exec: DDL is
// instead prepared and executed one statement at a time. Each statement is
// fixed source code (no user input), additive and safe to run repeatedly.
const CREATE_IMPORT_TABLE=`CREATE TABLE IF NOT EXISTS automated_research_import_slots (
 city_id TEXT NOT NULL,
 local_date TEXT NOT NULL,
 run_id TEXT NOT NULL,
 content_hash TEXT NOT NULL CHECK(length(content_hash)=64),
 job_id TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('reserved','stored','failed')),
 error_code TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(city_id, local_date)
)`;
const CREATE_IMPORT_INDEX=`CREATE INDEX IF NOT EXISTS idx_auto_import_created
 ON automated_research_import_slots(created_at DESC)`;
export async function ensureImportSchema(db){
 if(typeof db?.prepare!=='function')
  throw new Error('private-d1-schema-interface-unavailable');
 try{
  await db.prepare(CREATE_IMPORT_TABLE).run();
 }catch{
  throw new Error('private-d1-import-table-create-failed');
 }
 try{
  await db.prepare(CREATE_IMPORT_INDEX).run();
 }catch{
  throw new Error('private-d1-import-index-create-failed');
 }
 // A successful DDL return is not a substitute for reading the real schema.
 // The probe is read-only; never delete or rewrite a table on disagreement.
 try{
  const row=await db.prepare(
    "SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name='automated_research_import_slots'"
  ).first();
  if(Number(row?.n)!==1)throw new Error('missing-import-table');
 }catch{
  throw new Error('private-d1-import-schema-verification-failed');
 }
}

export function ingestReadiness(env){
 return {enabled:env?.AUTO_RESEARCH_IMPORT_ENABLED==='true',
   inbox:!!env?.INGEST_INBOX,database:!!env?.DB,privateStorage:!!env?.CANDIDATES};
}
export function checkManifest(m,key){
 if(!m||typeof m!=='object'||Array.isArray(m)||m.schemaVersion!==1||
    m.status!=='UNAPPROVED_RESEARCH'||m.source!=='panchavani-nightly-jpl-de440s'||
    m.publicationAuthorized!==false||m.indexingAuthorized!==false||
    m.modelInvocationAuthorized!==false||m.ephemerisSha256!==JPL||
    !hex(m.catalogSha256)||!run(m.runId)||
    key!==`inbox/manifests/${m.runId}.json`||
    !Array.isArray(m.entries)||m.entries.length<1||m.entries.length>60||
    m.entryCount!==m.entries.length)throw new Error('invalid-manifest');
 const seen=new Set();
 for(const x of m.entries){
  if(!CITY_IDS.has(x?.cityId)||!day(x.localDate)||!hex(x.sha256)||
     x.key!==`inbox/records/${m.runId}/${x.localDate}/${x.cityId}.json`)
   throw new Error('invalid-manifest-entry');
  const identity=x.cityId+'/'+x.localDate;
  if(seen.has(identity))throw new Error('duplicate-city-day');
  seen.add(identity);
 }
 return m;
}
async function fetchRaw(bucket,key,max=200000){
 const object=await bucket.get(key);
 if(!object)return null;
 if((object.size||0)>max)return null;
 const content=await object.text();
 if(encoder.encode(content).length>max)return null;
 return content;
}
async function importOne(env,m,entry){
 const {cityId,localDate,sha256}=entry;
 const prior=await env.DB.prepare(
  'SELECT content_hash FROM research_candidates WHERE city_id=? AND local_date=? LIMIT 1'
 ).bind(cityId,localDate).first();
 if(prior){
  if(prior.content_hash!==sha256)throw new Error('existing-candidate-hash-conflict');
  return 'existing';
 }
 const existing=await env.DB.prepare(
  'SELECT status,content_hash FROM automated_research_import_slots WHERE city_id=? AND local_date=?'
 ).bind(cityId,localDate).first();
 if(existing){
  if(existing.status!=='stored'||existing.content_hash!==sha256)
    throw new Error('reserved-or-conflicting-import');
  return 'existing';
 }
 const raw=await fetchRaw(env.INGEST_INBOX,entry.key);
 if(!raw||(await sha(raw))!==sha256)throw new Error('inbox-sha-or-object-missing');
 let candidate;
 try{candidate=JSON.parse(raw)}catch{throw new Error('invalid-candidate-json')}
 if(candidate.methodology?.ephemerisHash!==JPL||
    candidateIssues(candidate,{city_id:cityId,local_date:localDate}).length)
  throw new Error('candidate-science-contract-invalid');
 const id=crypto.randomUUID();
 const reserved=await env.DB.prepare(
  "INSERT OR IGNORE INTO automated_research_import_slots"+
  " (city_id,local_date,run_id,content_hash,job_id,status)"+
  " VALUES (?,?,?,?,?,'reserved')"
 ).bind(cityId,localDate,m.runId,sha256,id).run();
 if(reserved.meta?.changes!==1)return 'reserved';
 const key='unapproved/'+id+'/'+sha256+'.json';
 try{
  await env.CANDIDATES.put(key,raw,{
   httpMetadata:{contentType:'application/json'},
   customMetadata:{candidate_sha256:sha256,approval:'NONE',source:'r2-nightly-ingest'}
  });
  // The D1 batch is atomic. A failed batch leaves a locked slot, not a
  // silently retried write or conflicting second science candidate.
  await env.DB.batch([
   env.DB.prepare(
    "INSERT INTO job_requests(id,city_id,local_date,status,requested_by,candidate_hash)"+
    " VALUES (?,?,?,'candidate','nightly-r2-import',?)"
   ).bind(id,cityId,localDate,sha256),
   env.DB.prepare(
    "INSERT INTO research_candidates"+
    "(id,job_id,city_id,local_date,content_hash,r2_key,blocker_count,status)"+
    " VALUES (?,?,?,?,?,?,?,'unapproved')"
   ).bind(crypto.randomUUID(),id,cityId,localDate,sha256,key,candidate.validation.blockerCount),
   env.DB.prepare(
    "UPDATE automated_research_import_slots SET status='stored',"+
    "updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')"+
    " WHERE city_id=? AND local_date=? AND status='reserved' AND job_id=?"
   ).bind(cityId,localDate,id),
   env.DB.prepare(
    "INSERT INTO audit_log(id,actor,action,subject_id)"+
    " VALUES (?,'nightly-r2-import','candidate_imported_unapproved',?)"
   ).bind(crypto.randomUUID(),id)
  ]);
  return 'stored';
 }catch{
  try{await env.DB.prepare(
    "UPDATE automated_research_import_slots SET status='failed',"+
    "error_code='private-store-failed' WHERE city_id=? AND local_date=? AND status='reserved'"
  ).bind(cityId,localDate).run()}catch{}
  throw new Error('private-store-failed');
 }
}
export async function ingestNightly(env){
 const readiness=ingestReadiness(env);
 if(!readiness.enabled)return {status:'disabled',stored:0,checked:0};
 if(!readiness.inbox||!readiness.database||!readiness.privateStorage)
  return {status:'missing-private-bindings',stored:0,checked:0};
 await ensureImportSchema(env.DB);
 // List ONLY completion manifests, never arbitrary objects. Fail closed
 // if backlog outgrows bounded pagination; do not silently skip oldest work.
 let cursor=undefined;
 const manifests=[];
 for(let page=0;page<10;page++){
  const listing=await env.INGEST_INBOX.list({prefix:'inbox/manifests/',limit:1000,cursor});
  manifests.push(...listing.objects.filter(x=>/^inbox\/manifests\/[0-9]{6,20}\.json$/.test(x.key))
    .map(x=>x.key));
  if(!listing.truncated){cursor=undefined;break;}
  cursor=listing.cursor;
  if(page===9)return {status:'manifest-backlog-limit',checked:0,stored:0};
 }
 manifests.sort();
 let stored=0,checked=0,existing=0,conflicts=0;
 const conflictExamples=[];
 for(const key of manifests){
  const raw=await fetchRaw(env.INGEST_INBOX,key,100000);
  if(!raw)throw new Error('unreadable-private-manifest');
  const m=checkManifest(JSON.parse(raw),key);
  for(const entry of m.entries){
   if(stored>=MAX_PER_RUN)return {status:'batch-cap',stored,existing,checked,conflicts,conflictExamples};
   let state;
   try{state=await importOne(env,m,entry)}
   catch(error){
    // A preexisting *different* city/day must NEVER overwrite the original.
    // Report and move to other legitimate cities, rather than starving the
    // remaining 24 cities behind one conflicting manual-imported Delhi.
    if(['existing-candidate-hash-conflict','reserved-or-conflicting-import']
       .includes(error?.message)){
      conflicts++;
      if(conflictExamples.length<5)conflictExamples.push(entry.cityId+'/'+entry.localDate);
      checked++;
      continue;
    }
    throw error;
   }
   checked++;
   if(state==='stored')stored++;
   if(state==='existing')existing++;
  }
 }
 return {status:conflicts?'conflicts-needing-review':'complete',
   stored,existing,checked,conflicts,conflictExamples};
}
