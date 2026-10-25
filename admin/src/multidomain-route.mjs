/** Access-authenticated, same-origin operator console. Every POST is explicit;
 * there are no public endpoints, model-triggering GETs, or publishing actions.
 */
import {
 importSignedScientificDay,loadScienceForJob,importSignedRitualRules,
 runApprovedEditorialJob
} from './multidomain-production.mjs';
const NOINDEX={'Content-Type':'text/html; charset=utf-8',
 'Cache-Control':'private, no-store','X-Robots-Tag':'noindex,nofollow,noarchive',
 'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'};
const json=(value,status=200)=>new Response(JSON.stringify(value),{
 status,headers:{...NOINDEX,'Content-Type':'application/json; charset=utf-8'}});
const txt=(v,status=200)=>new Response(v,{status,headers:NOINDEX});
const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const allowed=new Set(['daily-panchang','calendar-month','festival','vrat','muhurat']);
const city=/^[a-z][a-z0-9-]{1,45}$/;
const date=/^20\d\d-\d\d-\d\d$/;
const month=/^20\d\d-(0[1-9]|1[0-2])$/;
const topic=/^[a-z0-9-]{3,70}$/;
export function validateTaskInput(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||!allowed.has(body.intent)||
    typeof body.cityId!=='string'||!city.test(body.cityId)||
    typeof body.month!=='string'||!month.test(body.month)||
    typeof body.topic!=='string'||(body.intent==='daily-panchang'?
      !['','daily-panchang'].includes(body.topic):
      body.intent==='calendar-month'?!['','calendar'].includes(body.topic):
      !topic.test(body.topic))||
    (body.intent!=='calendar-month'&&
      (typeof body.date!=='string'||!date.test(body.date)||!body.date.startsWith(body.month+'-'))))
  throw Error('Invalid city/month/day/intent/topic; no paid request made');
 return {cityId:body.cityId,intent:body.intent,month:body.month,
  date:body.intent==='calendar-month'?null:body.date,topic:body.topic||''};
}
async function input(request){
 if(!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))
  throw Error('Form content type required');
 if(Number(request.headers.get('content-length')||0)>140000)throw Error('Request exceeds safe input size');
 const text=await request.text();
 if(text.length>140000)throw Error('Form content exceeds safe size');
 const form=new URLSearchParams(text);
 if([...form.keys()].length>10)throw Error('Unexpected extra form fields');
 return form;
}
async function status(env){
 const safe=(query,bind=[])=>env.DB.prepare(query).bind(...bind).all();
 const [sources,slots,rules]=await Promise.all([
  safe("SELECT city_id,local_date,state,created_at FROM science_approved_day_sources ORDER BY local_date DESC LIMIT 25"),
  safe("SELECT id,city_id,intent,topic,month,state,r2_key,created_at FROM editorial_multi_intent_once ORDER BY created_at DESC LIMIT 30"),
  safe("SELECT city_id,intent,topic,state FROM independently_reviewed_rule_sources ORDER BY created_at DESC LIMIT 25")
 ]);
 return {science:(sources.results||[]),drafts:(slots.results||[]),
  rituals:(rules.results||[]),
  enabled:env.AUTO_MULTI_INTENT_EDITORIAL_ENABLED==='true',
  deepseekSecretPresent:Boolean(env.DEEPSEEK_API_KEY),
  scienceApprovalSecretPresent:Boolean(env.PANCHAVANI_SCIENCE_APPROVAL_SECRET),
  ritualApprovalSecretPresent:Boolean(env.PANCHAVANI_RITUAL_APPROVAL_SECRET),
  publicationAuthorized:false};
}
const STYLE=`<style>body{max-width:1080px;margin:36px auto;padding:0 18px 70px;background:#080908;color:#e9dfd0;font:14px/1.55 Arial,sans-serif}
a{color:#e7bc79}h1,h2{font-weight:400;color:#f0d5a1}h1{font:42px Georgia,serif}
h2{font:25px Georgia,serif}section{border:1px solid #645035;border-radius:12px;padding:21px;margin:18px 0;background:#141511}
label{display:block;margin:12px 0 5px;color:#d9ba87}select,input,textarea,button{display:block;width:100%;padding:10px;border-radius:6px;border:1px solid #786042;background:#0d1012;color:#f8ead2}
textarea{min-height:145px}button{margin-top:16px;background:#b89056;color:#07090b;font-weight:700;cursor:pointer}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
small,p{color:#bcbdba}.warning{border-left:3px solid #ddb66d;padding:10px 14px;background:#242017}
code{font-size:12px;overflow-wrap:anywhere}li{margin:8px 0}</style>`;
function formFields(){
 return `<label>City ID (reviewed ten-city cohort)</label><input name="cityId" value="delhi" required>
<label>Intent</label><select name="intent"><option>daily-panchang</option><option>calendar-month</option><option>festival</option><option>vrat</option><option>muhurat</option></select>
<label>Month (YYYY-MM)</label><input name="month" value="2026-10" required>
<label>Day (YYYY-MM-DD; empty for calendar-month)</label><input name="date" value="2026-10-21">
<label>Topic slug (ritual only)</label><input name="topic" placeholder="wedding / diwali / ekadashi">`;
}
function render(state){
 const rows=state.drafts.map(x=>`<li><code>${escape(x.city_id)} · ${escape(x.intent)} · ${escape(x.topic)} · ${escape(x.month)}</code> — ${escape(x.state)} ${x.state==='stored'?`<a href="/editorial/multi/draft?id=${encodeURIComponent(x.id)}">Inspect private draft</a>`:''}</li>`).join('');
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PANCHAVANI · Editorial Production</title>${STYLE}</head><body>
 <a href="/">← Private Admin</a><h1>Editorial Production Control</h1>
 <p class="warning">Nothing on this screen approves astronomical methods or publishes a public page. Science imports MUST be signed by an independent reviewer; paid DeepSeek is opt-in only, maximum one attempt per submitted job and 3 total paid attempts per 24 hours.</p>
 <p>Signed science records: ${state.science.length} recent · ritual rule records: ${state.rituals.length} recent · paid multi-intent editorial: ${state.enabled?'enabled':'disabled'} · scientific reviewer secret: ${state.scienceApprovalSecretPresent?'present':'missing'} · DeepSeek: ${state.deepseekSecretPresent?'present':'missing'}</p>
 <div class="grid"><section><h2>1 · Import independently signed day</h2>
 <p>No automatic reviewer is created. Upload only genuine independently signed fact packs.</p>
 <form method="post" action="/editorial/multi/science"><label>Exact reviewer-signed science JSON</label><textarea name="pack" required></textarea><button>Store immutable private scientific evidence</button></form></section>
 <section><h2>2 · Import separately reviewed tradition</h2>
 <p>Signed ritual rules require the exact approved day(s) they reference. Nothing infers festival dates, Parana, or Muhurat from a Tithi alone.</p>
 <form method="post" action="/editorial/multi/ritual">${formFields()}
 <label>Independently signed ritual-review JSON</label><textarea name="rule" required></textarea><button>Store source-locked ritual review</button></form></section>
 <section><h2>3 · Generate private DeepSeek draft</h2>
 <p>Rejects missing scientific approvals and ritual rules before any API request.</p>
 <form method="post" action="/editorial/multi/run">${formFields()}
 <button>Authorize one paid DeepSeek draft</button></form></section></div>
 <section><h2>Recent generated drafts</h2><ul>${rows||'<li>None yet. No privately approved source has been rendered into a draft.</li>'}</ul>
 <p>Review the source-linked prose independently; separately approve original publication in GitHub. This Worker never changes sitemap, indexability or static files.</p></section>
 </body></html>`;
}
async function draftDetail(env,url){
 const id=url.searchParams.get('id');
 if(!/^[a-f0-9]{64}$/.test(id||''))return txt('Invalid draft id',400);
 const row=await env.DB.prepare(
  "SELECT source_hash,r2_key,state FROM editorial_multi_intent_once WHERE id=?"
 ).bind(id).first();
 if(!row||row.state!=='stored'||!row.r2_key?.startsWith(`unapproved/multidomain/${id}/`))
  return txt('Private editorial draft not available',404);
 const object=await env.CANDIDATES.get(row.r2_key);
 if(!object)return txt('Private artifact missing, no publication permitted',503);
 const raw=await object.text();
 if(raw.length>120000)return txt('Oversized private artifact',503);
 const result=JSON.parse(raw);
 if(result.scienceHash!==row.source_hash||result.publicationAuthorized!==false||
    result.indexingAuthorized!==false)return txt('Private editorial artifact corrupted',503);
 return txt(`<a href="/editorial/multi">← Back to editorial</a><h1>Private draft (not approved for publication)</h1><p>Scientific fact values and model prose are separate. Research preview only.</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${escape(JSON.stringify(result,null,2))}</pre>`);
}
export async function handleMultiIntentConsole(request,env,actor,trust,transport=fetch){
 const url=new URL(request.url);
 if(!url.pathname.startsWith('/editorial/multi'))return null;
 if(!actor)return txt('Denied',403);
 if(!env?.DB?.prepare||!env?.CANDIDATES)return txt('Private storage not configured',503);
 if(request.method==='GET'){
  if(url.pathname==='/editorial/multi/draft')return draftDetail(env,url);
  if(url.pathname!=='/editorial/multi')return txt('Not found',404);
  try{return txt(render(await status(env)));}
  catch{return txt('Private migration 0007 or source storage not available',503);}
 }
 if(request.method!=='POST')return txt('Method not allowed',405);
 if(!trust(request))return txt('Same-origin browser verification failed',403);
 try{
  const values=await input(request);
  if(url.pathname==='/editorial/multi/science'){
   const pack=JSON.parse(values.get('pack')||'');
   return json(await importSignedScientificDay(env,pack,actor),200);
  }
  const payload=validateTaskInput(Object.fromEntries(values));
  if(url.pathname==='/editorial/multi/run'){
   const result=await runApprovedEditorialJob(env,payload,actor,transport);
   return json(result,200);
  }
  if(url.pathname==='/editorial/multi/ritual'){
   if(!['festival','vrat','muhurat'].includes(payload.intent))
    throw Error('Only tradition-specific rule evaluations are imported');
   const packs=await loadScienceForJob(env,payload,env.PANCHAVANI_SCIENCE_APPROVAL_SECRET);
   const rule=JSON.parse(values.get('rule')||'');
   if(rule.cityId!==payload.cityId||rule.intent!==payload.intent||rule.topic!==payload.topic)
    throw Error('Ritual reviewer item does not match requested city and tradition');
   return json(await importSignedRitualRules(env,rule,packs,actor),200);
  }
  return txt('Not found',404);
 }catch(error){
  // Keep secrets and provider payloads out of responses and browser history.
  const message=error instanceof SyntaxError?'Invalid submitted JSON':
   typeof error?.message==='string'&&error.message.length<170?error.message:'Approval or private storage failed';
  return json({status:'blocked',reason:message,publicationAuthorized:false,
    indexingAuthorized:false},409);
 }
}
