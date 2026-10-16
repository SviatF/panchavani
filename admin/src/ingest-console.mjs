/** Access-only operator page for the scheduled R2 -> D1 JPL ingestion.
 * Read-only status GET; CSRF-protected POST explicitly runs the same capped
 * SHA-validated importer as Cron. Never touches DeepSeek or public release.
 */
import {ingestNightly,ingestReadiness} from './nightly-import.mjs';

const ESC=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const H={
 'Content-Type':'text/html; charset=utf-8',
 'Cache-Control':'private, no-store',
 'X-Robots-Tag':'noindex, nofollow, noarchive',
 'X-Content-Type-Options':'nosniff',
 'X-Frame-Options':'DENY',
 'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
};
function render(content,status=200){
 return new Response(`<!doctype html><html lang="uk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>PANCHAVANI · JPL Import Status</title>
<style>:root{color-scheme:dark;background:#090909;color:#f4ead8;font:15px system-ui}
body{max-width:970px;padding:22px;margin:34px auto}a{color:#ebbf7d}
h1{font:normal clamp(29px,5vw,47px) Georgia,serif}
section{margin:21px 0;padding:24px;background:#17120e;border:1px solid #5c472e;border-radius:13px}
p{line-height:1.65;color:#c8bdaf}b,strong{color:#f4d39b}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}
.stat{padding:14px;background:#110f0c;border:1px solid #463624;border-radius:8px}
.stat span{display:block;font-size:12px;color:#baae99;margin-bottom:8px}
.stat strong{font:normal 21px Georgia,serif}
button{background:#eac181;border:0;border-radius:7px;color:#24170b;cursor:pointer;font:700 15px system-ui;padding:14px 19px}
button:disabled{opacity:.4}.notice{border-left:4px solid #cda56a;padding:15px;background:#332515}
code{overflow-wrap:anywhere}.sub{font-size:13px;color:#b4a68f}
@media(max-width:600px){.grid{grid-template-columns:1fr}body{padding:14px}}
</style></head><body><a href="/">← Private Calculation Control Center</a>
<h1>JPL · Import Status</h1>${content}
<p class="sub">Private research only · Cloudflare Access protected · no DeepSeek calls · no publishing · no SEO indexing</p>
</body></html>`,{status,headers:H});
}
const safeError=error=>{
 const codes=new Set(['invalid-manifest','invalid-manifest-entry',
 'duplicate-city-day','unreadable-private-manifest','inbox-sha-or-object-missing',
 'candidate-science-contract-invalid','private-store-failed',
 'private-d1-schema-interface-unavailable',
 'private-d1-import-table-create-failed',
 'private-d1-import-index-create-failed',
 'private-d1-import-schema-verification-failed',
 'invalid-candidate-json']);
 return codes.has(error?.message)?error.message:'private-import-failed-see-worker-logs';
};
async function counts(env){
 const state={candidateTotal:'unavailable',automated:'not-initialized',
    ledger:'not-initialized',inbox:'unavailable'};
 if(env.DB){
  try{
   const value=await env.DB.prepare("SELECT COUNT(*) AS n FROM research_candidates WHERE status='unapproved'").first();
   state.candidateTotal=String(value?.n??0);
  }catch{state.candidateTotal='database-query-failed'}
  try{
   const value=await env.DB.prepare("SELECT COUNT(*) AS n FROM automated_research_import_slots WHERE status='stored'").first();
   state.automated=String(value?.n??0);
   const rows=(await env.DB.prepare("SELECT status, COUNT(*) AS n FROM automated_research_import_slots GROUP BY status").all()).results||[];
   state.ledger=rows.map(r=>r.status+': '+r.n).join(' · ')||'0';
  }catch{state.ledger='schema-not-created-or-unavailable'}
 }
 if(env.INGEST_INBOX){
  try{
   const listing=await env.INGEST_INBOX.list({prefix:'inbox/manifests/',limit:200});
   state.inbox=String(listing.objects.filter(x=>/^inbox\/manifests\/[0-9]{6,20}\.json$/.test(x.key)).length)+
     (listing.truncated?'+':'')+' completed manifest(s)';
  }catch{state.inbox='r2-list-unavailable'}
 }
 return state;
}
const cell=(label,value)=>'<div class="stat"><span>'+ESC(label)+'</span><strong>'+ESC(value)+'</strong></div>';
export async function handleIngestConsole(request,env,actor,isTrustedBrowserPost,runImport=ingestNightly){
 const url=new URL(request.url);
 if(url.pathname!=='/research/ingest-status')return null;
 if(!actor)return render('<h1>Access denied</h1>',403);
 if(!['GET','POST'].includes(request.method))return render('Method not allowed',405);
 if(request.method==='POST'){
  if(!isTrustedBrowserPost(request))return render('Same-origin form required',403);
  if(!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')||
    Number(request.headers.get('Content-Length')||0)>512)
   return render('Invalid request format',400);
  const data=await request.formData();
  if(data.get('run')!=='1')return render('Invalid import action',400);
 }
 const ready=ingestReadiness(env);
 let result=null,error=null;
 if(request.method==='POST'){
  if(!ready.enabled||!ready.inbox||!ready.database||!ready.privateStorage)
   return render('Private importer disabled or missing R2/D1 bindings',503);
  try{result=await runImport(env)}
  catch(e){error=safeError(e);console.log('PANCHAVANI ingest operator status',error)}
 }
 const state=await counts(env);
 const readiness=ready.enabled&&ready.inbox&&ready.database&&ready.privateStorage;
 const terminalConflict=result?.status==='conflicts-needing-review'&&result.stored===0;
 const info=result?
  '<div class="notice"><strong>Import run result: '+ESC(result.status)+
  '</strong><p>New stored: '+ESC(result.stored??0)+
  ' · Existing unique records: '+ESC(result.existing??0)+
  ' · Unique conflicts: '+ESC(result.conflicts??0)+
  ' · Distinct checked: '+ESC(result.checked??0)+'</p>'+
  '<p>Completed manifests: '+ESC(result.manifests??'—')+
  ' · Repeated entries skipped: '+ESC(result.repeatedManifestEntries??0)+
  ' · Different source hashes: '+ESC(result.sourceVariantConflicts??0)+'</p>'+
  (result.conflictExamples?.length?
  '<p>Requires source reconciliation (no overwrites): '+ESC(result.conflictExamples.join(', '))+'</p>':'')+
  (result.stored===0&&result.status==='conflicts-needing-review'?
   '<p>All available unique dates were checked; repeating Import Now will not resolve these conflicts. No action required until source reconciliation.</p>':'')+'</div>':
  error?'<div class="notice"><strong>Import failed:</strong> '+ESC(error)+
   '<p>No retry or existing candidate deletion is performed here.</p></div>':'';
 const body='<section><h2>Private pipeline readiness</h2><div class="grid">'+
  cell('Import enabled',ready.enabled?'yes':'no')+
  cell('R2 inbox binding',ready.inbox?'connected':'missing')+
  cell('D1 database',ready.database?'connected':'missing')+
  cell('Private candidate R2',ready.privateStorage?'connected':'missing')+
  '</div></section><section><h2>Actual storage (not just configuration)</h2><div class="grid">'+
  cell('Completed R2 manifests',state.inbox)+
  cell('Stored JPL imports',state.automated)+
  cell('All research candidates',state.candidateTotal)+
  cell('D1 import ledger',state.ledger)+
  '</div></section>'+info+
  '<section><h2>Run the import now</h2><p>Run the existing verified importer immediately. At most 20 NEW city/date records per execution. Original SHA-256 values and science rules are checked before writing. Already stored or conflicting records are never overwritten. This makes zero DeepSeek calls.</p>'+
  '<form action="/research/ingest-status" method="post"><input type="hidden" name="run" value="1">'+
  '<button type="submit"'+(readiness&&!terminalConflict?'':' disabled')+'>Import next batch now →</button></form>'+
  '<p class="sub">Press again only when the result says batch-cap. Repeated nightly manifests are counted once per unique city/date, and conflicting source hashes are never overwritten.</p></section>';
 return render(body,error?503:200);
}
