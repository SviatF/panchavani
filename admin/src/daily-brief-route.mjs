/** Access-only fact-grounded SEO brief preview for one private JPL city-day.
 * No paid DeepSeek completion, publication, public API or mutable records.
 */
import {readCityResearchDay} from './research-daily.mjs';
import {buildDailyResearchBrief} from './daily-brief.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const headers={
 'Content-Type':'text/html; charset=utf-8',
 'Cache-Control':'private, no-store, max-age=0',
 'X-Robots-Tag':'noindex, nofollow, noarchive',
 'X-Content-Type-Options':'nosniff',
 'X-Frame-Options':'DENY',
 'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"
};
const html=(body,status=200)=>new Response(`<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="robots" content="noindex,nofollow,noarchive">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PANCHAVANI · Private Daily SEO Research Brief</title>
<style>:root{color-scheme:dark;background:#080808;color:#f8ead5;font:15px system-ui}
body{max-width:1000px;margin:35px auto;padding:0 22px}a{color:#f3cb86}h1{font:42px Georgia,serif}
h2{font:26px Georgia,serif;color:#f0c989}
section{padding:22px;border:1px solid #654e32;background:#1a1610;border-radius:12px;margin:22px 0}
p,li{line-height:1.7;color:#d3c3ad}.alert{border-left:4px solid #e4b76f;background:#3d2b17;padding:15px}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.card{padding:13px;border:1px solid #59452c;background:#100e0b;border-radius:8px}
.card small{display:block;color:#bba689}.card strong{font:normal 21px Georgia,serif}
code{overflow-wrap:anywhere;color:#c8bb9f}.small{font-size:12px}
@media(max-width:640px){h1{font-size:32px}.grid{grid-template-columns:1fr}}
</style></head><body><p><a href="/research/daily">← Private JPL city-day explorer</a></p>
${body}</body></html>`,{status,headers});
export function renderDailyResearchBrief(brief){
 const x=brief,city=x.location.name;
 const fact=x.privateCandidateFacts.map(f=>'<div class="card"><small>'+
  esc(f.type)+'</small><strong>'+esc(f.value)+'</strong></div>').join('');
 const blocks=x.transitions.tithi.concat(x.transitions.karana).map(e=>
  '<li>'+esc(e.layer)+': '+esc(e.from)+' → '+esc(e.to||'next interval')+
  ' at '+esc(e.atIST)+(e.daylight?' (during daylight)':' (outside daylight)')+'</li>').join('');
 return '<h1>'+esc(city)+' · '+esc(x.location.localDate)+'</h1>'+
  '<div class="alert"><strong>RESEARCH-ONLY SEO INPUT · NOT FACTUALLY APPROVED</strong>'+
  '<p>These are provisional, SHA-verified JPL research calculations, not independently validated Panchang advice. '+
  'No DeepSeek request was made, no public content was created and nothing was indexed.</p></div>'+
  '<section><h2>Specific reader question</h2><p>'+esc(x.dailyDifferenceFocus)+
  '</p><p><strong>Draft search intent:</strong> '+esc(x.searchIntent)+
  '</p><p><strong>Proposed page:</strong> <code>'+esc(x.suggestedCanonical)+'</code></p></section>'+
  '<section><h2>Private calculation candidates</h2><div class="grid">'+fact+
  '</div><p class="small">Each value remains unverified and is excluded from approved DeepSeek truth claims.</p></section>'+
  '<section><h2>Day-specific changes</h2>'+
  (blocks?'<ul>'+blocks+'</ul>':'<p>No phase transition within this sunrise-to-sunrise candidate interval.</p>')+
  '</section><section><h2>Questions readers would actually ask</h2><ol>'+
  x.readerQuestions.map(q=>'<li>'+esc(q)+'</li>').join('')+
  '</ol></section><section><h2>Before DeepSeek may write factual explanations</h2><ul>'+
  x.missingEvidence.map(q=>'<li>'+esc(q)+'</li>').join('')+
  '</ul><p>Not calculated: '+esc(x.uncalculated.join(', '))+
  '</p><p>Allowed approved truth claims: <strong>0</strong> · Paid AI calls: <strong>0</strong></p>'+
  '<p class="small">Source SHA-256: <code>'+esc(x.evidence.sourceSha256)+
  '</code> · Brief version: '+esc(x.version)+'</p></section>';
}
export async function handleDailyBrief(request,env,actor){
 const u=new URL(request.url);
 if(u.pathname!=='/research/daily-brief')return null;
 if(!actor)return html('<h1>Access denied</h1>',403);
 if(request.method!=='GET')return html('<h1>Read-only route</h1>',405);
 const city=u.searchParams.get('city'),date=u.searchParams.get('date');
 if(!city||!date)return html('<h1>Choose one city and date</h1><p>Start at the <a href="/research/daily">private JPL city-day explorer</a>.</p>');
 try{
  const candidate=await readCityResearchDay(env,city,date);
  if(candidate.state!=='research')
   return html('<h1>No verified private source record</h1><p>Source status: '+
    esc(candidate.state)+'</p>',candidate.state==='missing'?404:503);
  const brief=buildDailyResearchBrief(candidate.record,candidate.sha256);
  return html(renderDailyResearchBrief(brief));
 }catch{
  return html('<h1>Cannot build research-only content brief</h1><p>Invalid or incomplete source data. Nothing has been generated or published.</p>',503);
 }
}
