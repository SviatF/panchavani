/** Read-only, Access-only forensic comparison of D1 research and nightly R2 candidates.
 * Never overwrites an old SHA, generates editorial claims or approves publication.
 */
import { CITY_IDS } from './city-catalog.mjs';
import { checkManifest } from './nightly-import.mjs';
import { readCityResearchDay } from './research-daily.mjs';
import { candidateIssues } from './runner.mjs';

const JPL='c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2';
const enc=new TextEncoder();
const esc=s=>String(s??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isoDay=s=>typeof s==='string'&&/^20\d\d-\d\d-\d\d$/.test(s)&&
 !Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const hex=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
async function hash(raw){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(raw)))]
 .map(x=>x.toString(16).padStart(2,'0')).join('');}
function at(obj,path){return path.split('.').reduce((v,key)=>v?.[key],obj);}
const FIELD_PATHS=[
 'city.lat','city.lon','city.elevationMeters','city.tz','city.catalogVersion',
 'methodology.ephemerisId','methodology.ephemerisHash','methodology.ayanamsa',
 'methodology.sunriseConvention','methodology.tzdbVersion',
 'sun.sunriseUtc','sun.sunsetUtc','sun.nextSunriseUtc',
 'panchangAtSunrise.tithi','panchangAtSunrise.karana',
 'panchangAtSunrise.vara','panchangAtSunrise.paksha'
];
function relevantSegments(record,kind){
 return (record.transitions||[]).filter(x=>x.type===kind)
  .map(x=>[x.value,x.startUtc,x.endUtc]);
}
/** Compare actual fields, not just hashes; absent fields are explicit. */
export function compareResearchVersions(stored,incoming){
 const changed=FIELD_PATHS.filter(path=>JSON.stringify(at(stored,path)??null)!==
  JSON.stringify(at(incoming,path)??null)).map(path=>({
   field:path,stored:at(stored,path)??null,incoming:at(incoming,path)??null
  }));
 for(const kind of ['tithi','karana']){
  const a=relevantSegments(stored,kind),b=relevantSegments(incoming,kind);
  if(JSON.stringify(a)!==JSON.stringify(b))
   changed.push({field:'transitions.'+kind,stored:a,incoming:b});
 }
 return changed;
}
async function loadRaw(bucket,key,max=220000){
 const obj=await bucket.get(key);
 if(!obj||obj.size>max)throw Error('source-object-missing-or-oversized');
 const raw=await obj.text();
 if(enc.encode(raw).length>max)throw Error('source-object-oversized');
 return raw;
}
/** Rechecks SHA, identity, JPL and UNAPPROVED candidate contract. */
async function checkedVariant(env,m,entry){
 const raw=await loadRaw(env.INGEST_INBOX,entry.key);
 if(await hash(raw)!==entry.sha256)throw Error('source-hash-mismatch');
 let record;
 try{record=JSON.parse(raw);}catch{throw Error('source-not-json')}
 if(record.methodology?.ephemerisHash!==JPL||
   candidateIssues(record,{city_id:entry.cityId,local_date:entry.localDate}).length)
  throw Error('source-contract-invalid');
 return {record,sha256:entry.sha256,runId:m.runId,key:entry.key};
}
const H={
 'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store',
 'X-Robots-Tag':'noindex, nofollow, noarchive','X-Frame-Options':'DENY',
 'X-Content-Type-Options':'nosniff',
 'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"
};
const page=(markup,status=200)=>new Response('<!doctype html><html lang="en"><head>'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<meta name="robots" content="noindex,nofollow,noarchive">'+
 '<title>PANCHAVANI · Conflict Forensics</title></head><body>'+
 '<h1>JPL source conflict forensics</h1>'+
 '<p class="warning">Private research only. Read-only SHA and field comparisons; no auto overwrite, scientific approval, AI billing or public release.</p>'+
 markup+'</body></html>',{status,headers:H});
const printed=v=>esc(typeof v==='object'&&v!==null?JSON.stringify(v):v);
/** The original field allowlist is deliberately NOT complete: it omits, for
 * example, Nakshatra/Yoga, many source provenance fields, and validation
 * details. Perform a complete JSON VALUE comparison without echoing arbitrary
 * private values to the audit output. Object key ordering does not matter;
 * array ordering, omitted keys, nulls and actual numbers do matter.
 */
const ASTRO_ROOTS=new Set(['city','methodology','sun','panchangAtSunrise','transitions',
  'localDate','recordId']);
const QUALITY_ROOTS=new Set(['validation','status','approvedBy','releaseId','schemaVersion']);
const pathCategory=path=>{
 const root=path.replace(/^\$/, '').split(/[.\[]/).filter(Boolean)[0];
 return ASTRO_ROOTS.has(root)?'ASTRONOMY_OR_PROVENANCE':
  QUALITY_ROOTS.has(root)?'VALIDATION_OR_RELEASE_METADATA':
  'OTHER_RECORD_CONTENT_REVIEW_REQUIRED';
};
const safeJsonPath=(path,key)=>path+'.'+String(key).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,64);
function structurallyEqual(a,b){
 if(Object.is(a,b))return true;
 if(a===null||b===null||typeof a!==typeof b)return false;
 if(typeof a!=='object')return false;
 const arrA=Array.isArray(a),arrB=Array.isArray(b);
 if(arrA!==arrB)return false;
 if(arrA){
  if(a.length!==b.length)return false;
  return a.every((value,i)=>structurallyEqual(value,b[i]));
 }
 const ak=Object.keys(a).sort(),bk=Object.keys(b).sort();
 return ak.length===bk.length&&ak.every((key,i)=>
    key===bk[i]&&structurallyEqual(a[key],b[key]));
}
/** Safe full-object semantic difference summary; no raw values leaked.
 * JSON candidates max 220 kB and independent SHA checks apply at read time.
 */
export function compareCompleteRecordStructure(stored,incoming){
 const counters={
  ASTRONOMY_OR_PROVENANCE:0,
  VALIDATION_OR_RELEASE_METADATA:0,
  OTHER_RECORD_CONTENT_REVIEW_REQUIRED:0
 };
 const changedPaths=[],LIMIT=60;
 let changedCount=0;
 const note=(path,kind)=>{
  const category=pathCategory(path);counters[category]++;
  changedCount++;
  if(changedPaths.length<LIMIT)changedPaths.push({path,category,changeKind:kind});
 };
 function walk(a,b,path,depth=0){
  if(Object.is(a,b))return;
  if(depth>32){note(path,'MAX_DEPTH_REACHED');return;}
  if(a===null||b===null||typeof a!==typeof b||
     typeof a!=='object'||Array.isArray(a)!==Array.isArray(b)){
   note(path,'VALUE_OR_TYPE_DIFFERENCE');return;
  }
  if(Array.isArray(a)){
   if(a.length!==b.length)note(path+'.length','ARRAY_LENGTH_DIFFERENCE');
   const common=Math.min(a.length,b.length);
   for(let i=0;i<common;i++)walk(a[i],b[i],path+'['+i+']',depth+1);
   return;
  }
  const keys=new Set([...Object.keys(a),...Object.keys(b)]);
  for(const key of [...keys].sort()){
   const sub=safeJsonPath(path,key);
   if(!Object.hasOwn(a,key)){note(sub,'ONLY_IN_INCOMING');continue;}
   if(!Object.hasOwn(b,key)){note(sub,'ONLY_IN_STORED');continue;}
   walk(a[key],b[key],sub,depth+1);
  }
 }
 walk(stored,incoming,'(city,date,stored,variants,scanned){
 const first=stored.state==='research'?stored.record:null;
 const seen=new Set();
 const results=variants.map(variant=>{
  const changes=first?compareResearchVersions(first,variant.record):[];
  const full=first?compareCompleteRecordStructure(first,variant.record):null;
  const repeated=seen.has(variant.sha256);
  seen.add(variant.sha256);
  const shaMatches=first&&variant.sha256===stored.sha256;
  return {
   runId:variant.runId,sourceObjectKey:variant.key,
   incomingSha256:variant.sha256,
   disposition:!first?'D1_CANDIDATE_MISSING':
    shaMatches?'IDENTICAL_SHA':
    repeated?'DUPLICATE_INCOMING_SHA':
    changes.length?'RESEARCH_FIELDS_DIFFER':
    full?.wholeJsonStructureEqual?'JSON_SERIALIZATION_ONLY_DIFFERENCE':
                   'OTHER_JSON_RECORD_FIELDS_DIFFER',
   // The legacy allowlist is intentionally preserved for comparisons
   // across older reports; it does NOT include every scientific field.
   changedResearchFields:changes.map(x=>x.field),
   differences:changes,
   completeJsonComparison:full,
   independentlyValidated:false
  };
 });
 return {
  artifactType:'PANCHAVANI_PRIVATE_SHA_CONFLICT_TRIAGE',
  schemaVersion:1,cityId:city,localDate:date,
  storedState:stored.state,storedSha256:stored.sha256??null,
  scannedManifests:scanned,variantCount:results.length,
  variants:results,
  livePrivateD1WasActuallyRead:stored.state==='research',
  reviewedScienceApproved:false,shaConflictResolved:false,
  approvedClaimsForDeepSeek:[],publicReleaseAllowed:false,
  indexingAuthorized:false,
  nextAction:'An authorized scientific reviewer must inspect full source provenance and independently decide the disposition; do not auto-overwrite D1.'
 };
}

function renderCase(city,date,stored,variants,scanned){
 const origin=stored.state==='research'?stored.record:null;
 const base='<section><h2>Existing D1 candidate</h2><p>Status: '+esc(stored.state)+
 ' · SHA: <code>'+esc(stored.sha256??'unavailable')+'</code></p></section>';
 const seen=new Set();
 let out=base+'<section><h2>Nightly source variants</h2><p>Scanned '+scanned+
 ' validated completed manifests; all candidate source objects SHA checked.</p>';
 for(const v of variants){
  const isStored=v.sha256===stored.sha256;
  const changes=origin?compareResearchVersions(origin,v.record):[];
  const duplicate=seen.has(v.sha256);seen.add(v.sha256);
  out+='<article><h3>Run '+esc(v.runId)+'</h3><p>Inbox SHA: <code>'+
   esc(v.sha256)+'</code> · '+(isStored?'Same SHA as D1':
   duplicate?'Same SHA as another nightly version':'DIFFERENT SHA')+'</p>';
  if(!origin)out+='<p>Stored D1 candidate unavailable; field comparison blocked.</p>';
  else if(isStored)out+='<p>Identical source bytes by verified SHA.</p>';
  else if(!changes.length){
   const full=compareCompleteRecordStructure(origin,v.record);
   if(full.wholeJsonStructureEqual)
    out+='<p>All parsed JSON values are identical; differing SHA is serialization-only, not an observed astronomical field change. Human source review still required.</p>';
   else out+='<p>Different SHA and '+full.allChangedPathCount+' FULL JSON differences (not in original limited science field list). Use ?format=json for paths; do not automatically approve.</p>';
  }
  else{
   out+='<p>Changed scientific/metadata fields: '+changes.length+'. No automatic authority or winner selected.</p>'+
    '<div style="overflow:auto"><table><thead><tr><th>Field</th><th>Saved D1</th><th>Nightly R2</th></tr></thead><tbody>';
   for(const d of changes)out+='<tr><td>'+esc(d.field)+'</td><td><code>'+
    printed(d.stored)+'</code></td><td><code>'+printed(d.incoming)+'</code></td></tr>';
   out+='</tbody></table></div>';
  }
  out+='</article>';
 }
 out+='</section><p>For '+esc(city)+' / '+esc(date)+
 ': investigate source/coordinate/method changes before any separately reviewed replacement. Existing records were not modified.</p>';
 return out;
}
/** Reusable authenticated read-only D1/R2 inspection; never choose the winner. */
export async function inspectConflictCase(env,city,date){
if(!CITY_IDS.has(city)||!isoDay(date))throw Error('bad-case-scope');
if(!env?.DB||!env?.CANDIDATES||!env?.INGEST_INBOX)
 throw Error('private-bindings-missing');
const stored=await readCityResearchDay(env,city,date);
if(!['research','missing'].includes(stored.state))
 throw Error('stored-source-not-verified');
let cursor=undefined,scanned=0,complete=false;
const matches=[];
for(let pg=0;pg<10;pg++){
 const list=await env.INGEST_INBOX.list({prefix:'inbox/manifests/',limit:1000,cursor});
 for(const item of list.objects){
  if(!/^inbox\/manifests\/[0-9]{6,20}\.json$/.test(item.key))continue;
  const raw=await loadRaw(env.INGEST_INBOX,item.key,100000);
  let manifest;
  try{manifest=checkManifest(JSON.parse(raw),item.key);}catch{throw Error('manifest-contract-invalid');}
  scanned++;
  for(const entry of manifest.entries){
   if(entry.cityId!==city||entry.localDate!==date)continue;
   if(matches.length>=20)throw Error('variant-limit-exceeded');
   matches.push(await checkedVariant(env,manifest,entry));
  }
 }
 if(!list.truncated){complete=true;break;}
 if(!list.cursor||list.cursor===cursor)throw Error('manifest-pagination-stalled');
 cursor=list.cursor;
}
if(!complete)throw Error('manifest-backlog-incomplete');
return {stored,matches,scanned,report:conflictTriage(city,date,stored,matches,scanned)};
}

export async function handleConflictForensics(request,env,actor){
 const url=new URL(request.url);
 if(url.pathname!=='/research/conflicts')return null;
 if(!actor)return page('<p>Access denied</p>',403);
 if(request.method!=='GET')return page('<p>Read-only GET required</p>',405);
 const city=url.searchParams.get('city'),date=url.searchParams.get('date');
 if(city===null&&date===null)return page(
  '<p>Inspect historical 16 October source conflicts:</p><ul>'+
  ['delhi','mumbai','chennai'].map(x=>'<li><a href="/research/conflicts?city='+
   x+'&date=2026-10-16">'+x+'</a></li>').join('')+'</ul>');
 if(!CITY_IDS.has(city)||!isoDay(date))return page('<p>Invalid city/date</p>',400);
 const format=url.searchParams.get('format');
 if(format!==null&&format!=='json')return page('<p>Invalid forensic format</p>',400);
 if(!env?.DB||!env?.CANDIDATES||!env?.INGEST_INBOX)
  return page('<p>Private D1 / candidate R2 / incoming R2 not available</p>',503);
 try{
  const {stored,matches,scanned,report}=await inspectConflictCase(env,city,date);
  if(format==='json'){
   return new Response(JSON.stringify(report,null,2)+'\n',{
    status:200,headers:{...H,'Content-Type':'application/json; charset=utf-8'}
   });
  }
  return page(renderCase(city,date,stored,matches,scanned)+
   '<p><a href="/research/conflicts?city='+esc(city)+'&date='+esc(date)+
   '&format=json">Download private machine-readable SHA triage (read-only)</a></p>');
 }catch{
  return page('<p>Source inspection incomplete or integrity check failed. Nothing modified; review private Worker logs and source provenance.</p>',503);
 }
}
);
 return {
   wholeJsonStructureEqual:changedCount===0,
   allChangedPathCount:changedCount,
   categoryCounts:counters,
   changedPaths,
   pathSamplesTruncated:changedCount>changedPaths.length,
   // Semantic equality is calculated over ALL parsed values, not the
   // 60-path listing or the earlier selected scientific fields.
   note:changedCount===0?
    'Every parsed JSON value matches; differing raw source SHA is due to JSON serialization differences (for example key order, whitespace or number representation). No scientific approval.' :
    'At least one JSON value, array element, or key-presence differs beyond the original limited science-field comparison. No automatic source winner.'
 };
}

/** Downloadable forensic metadata for one authenticated city/date. No database writes. */
export function conflictTriage(city,date,stored,variants,scanned){
 const first=stored.state==='research'?stored.record:null;
 const seen=new Set();
 const results=variants.map(variant=>{
  const changes=first?compareResearchVersions(first,variant.record):[];
  const repeated=seen.has(variant.sha256);
  seen.add(variant.sha256);
  const shaMatches=first&&variant.sha256===stored.sha256;
  return {
   runId:variant.runId,sourceObjectKey:variant.key,
   incomingSha256:variant.sha256,
   disposition:!first?'D1_CANDIDATE_MISSING':
    shaMatches?'IDENTICAL_SHA':
    repeated?'DUPLICATE_INCOMING_SHA':
    changes.length?'RESEARCH_FIELDS_DIFFER':
                   'DIFFERENT_BYTES_FIELDS_NOT_YET_EXPLAINED',
   changedResearchFields:changes.map(x=>x.field),
   differences:changes,independentlyValidated:false
  };
 });
 return {
  artifactType:'PANCHAVANI_PRIVATE_SHA_CONFLICT_TRIAGE',
  schemaVersion:1,cityId:city,localDate:date,
  storedState:stored.state,storedSha256:stored.sha256??null,
  scannedManifests:scanned,variantCount:results.length,
  variants:results,
  livePrivateD1WasActuallyRead:stored.state==='research',
  reviewedScienceApproved:false,shaConflictResolved:false,
  approvedClaimsForDeepSeek:[],publicReleaseAllowed:false,
  indexingAuthorized:false,
  nextAction:'An authorized scientific reviewer must inspect full source provenance and independently decide the disposition; do not auto-overwrite D1.'
 };
}

function renderCase(city,date,stored,variants,scanned){
 const origin=stored.state==='research'?stored.record:null;
 const base='<section><h2>Existing D1 candidate</h2><p>Status: '+esc(stored.state)+
 ' · SHA: <code>'+esc(stored.sha256??'unavailable')+'</code></p></section>';
 const seen=new Set();
 let out=base+'<section><h2>Nightly source variants</h2><p>Scanned '+scanned+
 ' validated completed manifests; all candidate source objects SHA checked.</p>';
 for(const v of variants){
  const isStored=v.sha256===stored.sha256;
  const changes=origin?compareResearchVersions(origin,v.record):[];
  const duplicate=seen.has(v.sha256);seen.add(v.sha256);
  out+='<article><h3>Run '+esc(v.runId)+'</h3><p>Inbox SHA: <code>'+
   esc(v.sha256)+'</code> · '+(isStored?'Same SHA as D1':
   duplicate?'Same SHA as another nightly version':'DIFFERENT SHA')+'</p>';
  if(!origin)out+='<p>Stored D1 candidate unavailable; field comparison blocked.</p>';
  else if(isStored)out+='<p>Identical source bytes by verified SHA.</p>';
  else if(!changes.length)out+='<p>Different SHA, but selected scientific fields match. Other bytes/fields may still differ; manual investigation required.</p>';
  else{
   out+='<p>Changed scientific/metadata fields: '+changes.length+'. No automatic authority or winner selected.</p>'+
    '<div style="overflow:auto"><table><thead><tr><th>Field</th><th>Saved D1</th><th>Nightly R2</th></tr></thead><tbody>';
   for(const d of changes)out+='<tr><td>'+esc(d.field)+'</td><td><code>'+
    printed(d.stored)+'</code></td><td><code>'+printed(d.incoming)+'</code></td></tr>';
   out+='</tbody></table></div>';
  }
  out+='</article>';
 }
 out+='</section><p>For '+esc(city)+' / '+esc(date)+
 ': investigate source/coordinate/method changes before any separately reviewed replacement. Existing records were not modified.</p>';
 return out;
}
/** Reusable authenticated read-only D1/R2 inspection; never choose the winner. */
export async function inspectConflictCase(env,city,date){
if(!CITY_IDS.has(city)||!isoDay(date))throw Error('bad-case-scope');
if(!env?.DB||!env?.CANDIDATES||!env?.INGEST_INBOX)
 throw Error('private-bindings-missing');
const stored=await readCityResearchDay(env,city,date);
if(!['research','missing'].includes(stored.state))
 throw Error('stored-source-not-verified');
let cursor=undefined,scanned=0,complete=false;
const matches=[];
for(let pg=0;pg<10;pg++){
 const list=await env.INGEST_INBOX.list({prefix:'inbox/manifests/',limit:1000,cursor});
 for(const item of list.objects){
  if(!/^inbox\/manifests\/[0-9]{6,20}\.json$/.test(item.key))continue;
  const raw=await loadRaw(env.INGEST_INBOX,item.key,100000);
  let manifest;
  try{manifest=checkManifest(JSON.parse(raw),item.key);}catch{throw Error('manifest-contract-invalid');}
  scanned++;
  for(const entry of manifest.entries){
   if(entry.cityId!==city||entry.localDate!==date)continue;
   if(matches.length>=20)throw Error('variant-limit-exceeded');
   matches.push(await checkedVariant(env,manifest,entry));
  }
 }
 if(!list.truncated){complete=true;break;}
 if(!list.cursor||list.cursor===cursor)throw Error('manifest-pagination-stalled');
 cursor=list.cursor;
}
if(!complete)throw Error('manifest-backlog-incomplete');
return {stored,matches,scanned,report:conflictTriage(city,date,stored,matches,scanned)};
}

export async function handleConflictForensics(request,env,actor){
 const url=new URL(request.url);
 if(url.pathname!=='/research/conflicts')return null;
 if(!actor)return page('<p>Access denied</p>',403);
 if(request.method!=='GET')return page('<p>Read-only GET required</p>',405);
 const city=url.searchParams.get('city'),date=url.searchParams.get('date');
 if(city===null&&date===null)return page(
  '<p>Inspect historical 16 October source conflicts:</p><ul>'+
  ['delhi','mumbai','chennai'].map(x=>'<li><a href="/research/conflicts?city='+
   x+'&date=2026-10-16">'+x+'</a></li>').join('')+'</ul>');
 if(!CITY_IDS.has(city)||!isoDay(date))return page('<p>Invalid city/date</p>',400);
 const format=url.searchParams.get('format');
 if(format!==null&&format!=='json')return page('<p>Invalid forensic format</p>',400);
 if(!env?.DB||!env?.CANDIDATES||!env?.INGEST_INBOX)
  return page('<p>Private D1 / candidate R2 / incoming R2 not available</p>',503);
 try{
  const {stored,matches,scanned,report}=await inspectConflictCase(env,city,date);
  if(format==='json'){
   return new Response(JSON.stringify(report,null,2)+'\n',{
    status:200,headers:{...H,'Content-Type':'application/json; charset=utf-8'}
   });
  }
  return page(renderCase(city,date,stored,matches,scanned)+
   '<p><a href="/research/conflicts?city='+esc(city)+'&date='+esc(date)+
   '&format=json">Download private machine-readable SHA triage (read-only)</a></p>');
 }catch{
  return page('<p>Source inspection incomplete or integrity check failed. Nothing modified; review private Worker logs and source provenance.</p>',503);
 }
}
);
 const equal=structurallyEqual(stored,incoming);
 if(equal!==(changedCount===0))throw Error('full-json-diff-invariant-failed');
 return {
  wholeJsonStructureEqual:equal,
  allChangedPathCount:changedCount,
  categoryCounts:counters,
  changedPaths,
  pathSamplesTruncated:changedCount>changedPaths.length,
  note:equal?
   'All parsed JSON values match, but verified raw bytes have different SHA; serialization-only, no scientific approval.' :
   'Some JSON values, array entries or key presence differ outside the previous narrow field list. No source winner.'
 };
}

/** Downloadable forensic metadata, Access protected; NO D1/R2 writes. */
export function conflictTriage(city,date,stored,variants,scanned){
 const first=stored.state==='research'?stored.record:null;
 const seen=new Set();
 const results=variants.map(variant=>{
  const changes=first?compareResearchVersions(first,variant.record):[];
  const full=first?compareCompleteRecordStructure(first,variant.record):null;
  const repeated=seen.has(variant.sha256);
  seen.add(variant.sha256);
  const shaMatches=first&&variant.sha256===stored.sha256;
  return {
   runId:variant.runId,sourceObjectKey:variant.key,
   incomingSha256:variant.sha256,
   disposition:!first?'D1_CANDIDATE_MISSING':
    shaMatches?'IDENTICAL_SHA':
    repeated?'DUPLICATE_INCOMING_SHA':
    changes.length?'RESEARCH_FIELDS_DIFFER':
    full?.wholeJsonStructureEqual?'JSON_SERIALIZATION_ONLY_DIFFERENCE':
                   'OTHER_JSON_RECORD_FIELDS_DIFFER',
   // The legacy allowlist is intentionally preserved for comparisons
   // across older reports; it does NOT include every scientific field.
   changedResearchFields:changes.map(x=>x.field),
   differences:changes,
   completeJsonComparison:full,
   independentlyValidated:false
  };
 });
 return {
  artifactType:'PANCHAVANI_PRIVATE_SHA_CONFLICT_TRIAGE',
  schemaVersion:1,cityId:city,localDate:date,
  storedState:stored.state,storedSha256:stored.sha256??null,
  scannedManifests:scanned,variantCount:results.length,
  variants:results,
  livePrivateD1WasActuallyRead:stored.state==='research',
  reviewedScienceApproved:false,shaConflictResolved:false,
  approvedClaimsForDeepSeek:[],publicReleaseAllowed:false,
  indexingAuthorized:false,
  nextAction:'An authorized scientific reviewer must inspect full source provenance and independently decide the disposition; do not auto-overwrite D1.'
 };
}

function renderCase(city,date,stored,variants,scanned){
 const origin=stored.state==='research'?stored.record:null;
 const base='<section><h2>Existing D1 candidate</h2><p>Status: '+esc(stored.state)+
 ' · SHA: <code>'+esc(stored.sha256??'unavailable')+'</code></p></section>';
 const seen=new Set();
 let out=base+'<section><h2>Nightly source variants</h2><p>Scanned '+scanned+
 ' validated completed manifests; all candidate source objects SHA checked.</p>';
 for(const v of variants){
  const isStored=v.sha256===stored.sha256;
  const changes=origin?compareResearchVersions(origin,v.record):[];
  const duplicate=seen.has(v.sha256);seen.add(v.sha256);
  out+='<article><h3>Run '+esc(v.runId)+'</h3><p>Inbox SHA: <code>'+
   esc(v.sha256)+'</code> · '+(isStored?'Same SHA as D1':
   duplicate?'Same SHA as another nightly version':'DIFFERENT SHA')+'</p>';
  if(!origin)out+='<p>Stored D1 candidate unavailable; field comparison blocked.</p>';
  else if(isStored)out+='<p>Identical source bytes by verified SHA.</p>';
  else if(!changes.length){
   const full=compareCompleteRecordStructure(origin,v.record);
   if(full.wholeJsonStructureEqual)
    out+='<p>All parsed JSON values are identical; differing SHA is serialization-only, not an observed astronomical field change. Human source review still required.</p>';
   else out+='<p>Different SHA and '+full.allChangedPathCount+' FULL JSON differences (not in original limited science field list). Use ?format=json for paths; do not automatically approve.</p>';
  }
  else{
   out+='<p>Changed scientific/metadata fields: '+changes.length+'. No automatic authority or winner selected.</p>'+
    '<div style="overflow:auto"><table><thead><tr><th>Field</th><th>Saved D1</th><th>Nightly R2</th></tr></thead><tbody>';
   for(const d of changes)out+='<tr><td>'+esc(d.field)+'</td><td><code>'+
    printed(d.stored)+'</code></td><td><code>'+printed(d.incoming)+'</code></td></tr>';
   out+='</tbody></table></div>';
  }
  out+='</article>';
 }
 out+='</section><p>For '+esc(city)+' / '+esc(date)+
 ': investigate source/coordinate/method changes before any separately reviewed replacement. Existing records were not modified.</p>';
 return out;
}
/** Reusable authenticated read-only D1/R2 inspection; never choose the winner. */
export async function inspectConflictCase(env,city,date){
if(!CITY_IDS.has(city)||!isoDay(date))throw Error('bad-case-scope');
if(!env?.DB||!env?.CANDIDATES||!env?.INGEST_INBOX)
 throw Error('private-bindings-missing');
const stored=await readCityResearchDay(env,city,date);
if(!['research','missing'].includes(stored.state))
 throw Error('stored-source-not-verified');
let cursor=undefined,scanned=0,complete=false;
const matches=[];
for(let pg=0;pg<10;pg++){
 const list=await env.INGEST_INBOX.list({prefix:'inbox/manifests/',limit:1000,cursor});
 for(const item of list.objects){
  if(!/^inbox\/manifests\/[0-9]{6,20}\.json$/.test(item.key))continue;
  const raw=await loadRaw(env.INGEST_INBOX,item.key,100000);
  let manifest;
  try{manifest=checkManifest(JSON.parse(raw),item.key);}catch{throw Error('manifest-contract-invalid');}
  scanned++;
  for(const entry of manifest.entries){
   if(entry.cityId!==city||entry.localDate!==date)continue;
   if(matches.length>=20)throw Error('variant-limit-exceeded');
   matches.push(await checkedVariant(env,manifest,entry));
  }
 }
 if(!list.truncated){complete=true;break;}
 if(!list.cursor||list.cursor===cursor)throw Error('manifest-pagination-stalled');
 cursor=list.cursor;
}
if(!complete)throw Error('manifest-backlog-incomplete');
return {stored,matches,scanned,report:conflictTriage(city,date,stored,matches,scanned)};
}

export async function handleConflictForensics(request,env,actor){
 const url=new URL(request.url);
 if(url.pathname!=='/research/conflicts')return null;
 if(!actor)return page('<p>Access denied</p>',403);
 if(request.method!=='GET')return page('<p>Read-only GET required</p>',405);
 const city=url.searchParams.get('city'),date=url.searchParams.get('date');
 if(city===null&&date===null)return page(
  '<p>Inspect historical 16 October source conflicts:</p><ul>'+
  ['delhi','mumbai','chennai'].map(x=>'<li><a href="/research/conflicts?city='+
   x+'&date=2026-10-16">'+x+'</a></li>').join('')+'</ul>');
 if(!CITY_IDS.has(city)||!isoDay(date))return page('<p>Invalid city/date</p>',400);
 const format=url.searchParams.get('format');
 if(format!==null&&format!=='json')return page('<p>Invalid forensic format</p>',400);
 if(!env?.DB||!env?.CANDIDATES||!env?.INGEST_INBOX)
  return page('<p>Private D1 / candidate R2 / incoming R2 not available</p>',503);
 try{
  const {stored,matches,scanned,report}=await inspectConflictCase(env,city,date);
  if(format==='json'){
   return new Response(JSON.stringify(report,null,2)+'\n',{
    status:200,headers:{...H,'Content-Type':'application/json; charset=utf-8'}
   });
  }
  return page(renderCase(city,date,stored,matches,scanned)+
   '<p><a href="/research/conflicts?city='+esc(city)+'&date='+esc(date)+
   '&format=json">Download private machine-readable SHA triage (read-only)</a></p>');
 }catch{
  return page('<p>Source inspection incomplete or integrity check failed. Nothing modified; review private Worker logs and source provenance.</p>',503);
 }
}
);
 return {
   wholeJsonStructureEqual:changedCount===0,
   allChangedPathCount:changedCount,
   categoryCounts:counters,
   changedPaths,
   pathSamplesTruncated:changedCount>changedPaths.length,
   // Semantic equality is calculated over ALL parsed values, not the
   // 60-path listing or the earlier selected scientific fields.
   note:changedCount===0?
    'Every parsed JSON value matches; differing raw source SHA is due to JSON serialization differences (for example key order, whitespace or number representation). No scientific approval.' :
    'At least one JSON value, array element, or key-presence differs beyond the original limited science-field comparison. No automatic source winner.'
 };
}

/** Downloadable forensic metadata for one authenticated city/date. No database writes. */
export function conflictTriage(city,date,stored,variants,scanned){
 const first=stored.state==='research'?stored.record:null;
 const seen=new Set();
 const results=variants.map(variant=>{
  const changes=first?compareResearchVersions(first,variant.record):[];
  const repeated=seen.has(variant.sha256);
  seen.add(variant.sha256);
  const shaMatches=first&&variant.sha256===stored.sha256;
  return {
   runId:variant.runId,sourceObjectKey:variant.key,
   incomingSha256:variant.sha256,
   disposition:!first?'D1_CANDIDATE_MISSING':
    shaMatches?'IDENTICAL_SHA':
    repeated?'DUPLICATE_INCOMING_SHA':
    changes.length?'RESEARCH_FIELDS_DIFFER':
                   'DIFFERENT_BYTES_FIELDS_NOT_YET_EXPLAINED',
   changedResearchFields:changes.map(x=>x.field),
   differences:changes,independentlyValidated:false
  };
 });
 return {
  artifactType:'PANCHAVANI_PRIVATE_SHA_CONFLICT_TRIAGE',
  schemaVersion:1,cityId:city,localDate:date,
  storedState:stored.state,storedSha256:stored.sha256??null,
  scannedManifests:scanned,variantCount:results.length,
  variants:results,
  livePrivateD1WasActuallyRead:stored.state==='research',
  reviewedScienceApproved:false,shaConflictResolved:false,
  approvedClaimsForDeepSeek:[],publicReleaseAllowed:false,
  indexingAuthorized:false,
  nextAction:'An authorized scientific reviewer must inspect full source provenance and independently decide the disposition; do not auto-overwrite D1.'
 };
}

function renderCase(city,date,stored,variants,scanned){
 const origin=stored.state==='research'?stored.record:null;
 const base='<section><h2>Existing D1 candidate</h2><p>Status: '+esc(stored.state)+
 ' · SHA: <code>'+esc(stored.sha256??'unavailable')+'</code></p></section>';
 const seen=new Set();
 let out=base+'<section><h2>Nightly source variants</h2><p>Scanned '+scanned+
 ' validated completed manifests; all candidate source objects SHA checked.</p>';
 for(const v of variants){
  const isStored=v.sha256===stored.sha256;
  const changes=origin?compareResearchVersions(origin,v.record):[];
  const duplicate=seen.has(v.sha256);seen.add(v.sha256);
  out+='<article><h3>Run '+esc(v.runId)+'</h3><p>Inbox SHA: <code>'+
   esc(v.sha256)+'</code> · '+(isStored?'Same SHA as D1':
   duplicate?'Same SHA as another nightly version':'DIFFERENT SHA')+'</p>';
  if(!origin)out+='<p>Stored D1 candidate unavailable; field comparison blocked.</p>';
  else if(isStored)out+='<p>Identical source bytes by verified SHA.</p>';
  else if(!changes.length)out+='<p>Different SHA, but selected scientific fields match. Other bytes/fields may still differ; manual investigation required.</p>';
  else{
   out+='<p>Changed scientific/metadata fields: '+changes.length+'. No automatic authority or winner selected.</p>'+
    '<div style="overflow:auto"><table><thead><tr><th>Field</th><th>Saved D1</th><th>Nightly R2</th></tr></thead><tbody>';
   for(const d of changes)out+='<tr><td>'+esc(d.field)+'</td><td><code>'+
    printed(d.stored)+'</code></td><td><code>'+printed(d.incoming)+'</code></td></tr>';
   out+='</tbody></table></div>';
  }
  out+='</article>';
 }
 out+='</section><p>For '+esc(city)+' / '+esc(date)+
 ': investigate source/coordinate/method changes before any separately reviewed replacement. Existing records were not modified.</p>';
 return out;
}
/** Reusable authenticated read-only D1/R2 inspection; never choose the winner. */
export async function inspectConflictCase(env,city,date){
if(!CITY_IDS.has(city)||!isoDay(date))throw Error('bad-case-scope');
if(!env?.DB||!env?.CANDIDATES||!env?.INGEST_INBOX)
 throw Error('private-bindings-missing');
const stored=await readCityResearchDay(env,city,date);
if(!['research','missing'].includes(stored.state))
 throw Error('stored-source-not-verified');
let cursor=undefined,scanned=0,complete=false;
const matches=[];
for(let pg=0;pg<10;pg++){
 const list=await env.INGEST_INBOX.list({prefix:'inbox/manifests/',limit:1000,cursor});
 for(const item of list.objects){
  if(!/^inbox\/manifests\/[0-9]{6,20}\.json$/.test(item.key))continue;
  const raw=await loadRaw(env.INGEST_INBOX,item.key,100000);
  let manifest;
  try{manifest=checkManifest(JSON.parse(raw),item.key);}catch{throw Error('manifest-contract-invalid');}
  scanned++;
  for(const entry of manifest.entries){
   if(entry.cityId!==city||entry.localDate!==date)continue;
   if(matches.length>=20)throw Error('variant-limit-exceeded');
   matches.push(await checkedVariant(env,manifest,entry));
  }
 }
 if(!list.truncated){complete=true;break;}
 if(!list.cursor||list.cursor===cursor)throw Error('manifest-pagination-stalled');
 cursor=list.cursor;
}
if(!complete)throw Error('manifest-backlog-incomplete');
return {stored,matches,scanned,report:conflictTriage(city,date,stored,matches,scanned)};
}

export async function handleConflictForensics(request,env,actor){
 const url=new URL(request.url);
 if(url.pathname!=='/research/conflicts')return null;
 if(!actor)return page('<p>Access denied</p>',403);
 if(request.method!=='GET')return page('<p>Read-only GET required</p>',405);
 const city=url.searchParams.get('city'),date=url.searchParams.get('date');
 if(city===null&&date===null)return page(
  '<p>Inspect historical 16 October source conflicts:</p><ul>'+
  ['delhi','mumbai','chennai'].map(x=>'<li><a href="/research/conflicts?city='+
   x+'&date=2026-10-16">'+x+'</a></li>').join('')+'</ul>');
 if(!CITY_IDS.has(city)||!isoDay(date))return page('<p>Invalid city/date</p>',400);
 const format=url.searchParams.get('format');
 if(format!==null&&format!=='json')return page('<p>Invalid forensic format</p>',400);
 if(!env?.DB||!env?.CANDIDATES||!env?.INGEST_INBOX)
  return page('<p>Private D1 / candidate R2 / incoming R2 not available</p>',503);
 try{
  const {stored,matches,scanned,report}=await inspectConflictCase(env,city,date);
  if(format==='json'){
   return new Response(JSON.stringify(report,null,2)+'\n',{
    status:200,headers:{...H,'Content-Type':'application/json; charset=utf-8'}
   });
  }
  return page(renderCase(city,date,stored,matches,scanned)+
   '<p><a href="/research/conflicts?city='+esc(city)+'&date='+esc(date)+
   '&format=json">Download private machine-readable SHA triage (read-only)</a></p>');
 }catch{
  return page('<p>Source inspection incomplete or integrity check failed. Nothing modified; review private Worker logs and source provenance.</p>',503);
 }
}
