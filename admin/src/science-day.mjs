/** Operator-only JPL city/date science internal consistency report.
 * Never certifies independent astronomy, sidereal method or ritual claims.
 */
import {CITY_IDS,CITY_META} from './city-catalog.mjs';
import {readCityResearchDay} from './research-daily.mjs';
import {auditResearchCandidate} from './science-integrity.mjs';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const header={
 'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store',
 'X-Robots-Tag':'noindex, nofollow, noarchive','X-Frame-Options':'DENY',
 'X-Content-Type-Options':'nosniff',
 'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"
};
const page=(body,status=200)=>new Response('<!doctype html><html lang="en"><head>'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<meta name="robots" content="noindex,nofollow,noarchive">'+
 '<title>PANCHAVANI · Daily Science Audit</title></head><body>'+body+'</body></html>',
 {status,headers:header});
const dateValid=x=>typeof x==='string'&&/^20\d\d-\d\d-\d\d$/.test(x)&&
 !Number.isNaN(Date.parse(x+'T12:00:00Z'))&&
 new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
export function renderDailyScienceReport(report){
 const ok=report.internalChecksPassed;
 const header='<div class="pv-hero"><p class="pv-eyebrow">SCIENCE / CITY-DAY AUDIT 03</p>'+
  '<h1>Scientific integrity<span style="color:#d9ac70">.</span></h1>'+
  '<p>Internal calendar consistency test of one private JPL research record. '+
  'This result cannot prove independent astronomical accuracy or authorize publication.</p>'+
  '<div class="pv-herotags"><span class="pv-tag">'+esc(report.status)+'</span>'+
  '<span class="pv-tag">External validation still required</span>'+
  '<span class="pv-tag">No AI calls</span></div></div>';
 const counts='<div class="pv-metrics">'+
  '<div class="pv-metric"><span>Internal checks passed</span><strong>'+
  esc(report.checks.filter(x=>x.state==='pass').length)+'/'+esc(report.checks.length)+
  '</strong><small>Deterministic candidate checks only</small></div>'+
  '<div class="pv-metric"><span>Internal errors</span><strong>'+esc(report.issues.length)+
  '</strong><small>Incorrect fields or inconsistent transition structure</small></div>'+
  '<div class="pv-metric"><span>Independent scientific approval</span><strong>NO</strong>'+
  '<small>Method-specific external comparisons are missing</small></div>'+
  '<div class="pv-metric"><span>Approved DeepSeek fact claims</span><strong>0</strong>'+
  '<small>Candidate calculations are not approved factual inputs</small></div></div>';
 const rows=report.checks.map(x=>'<tr><td>'+esc(x.id)+'</td><td>'+
  '<span style="color:'+(x.state==='pass'?'#b7d8aa':'#e5a585')+'">'+
   esc(x.state.toUpperCase())+'</span></td><td>'+esc(x.description)+'</td></tr>').join('');
 const matrix='<section><h2>Daily consistency matrix</h2><p>'+
  (ok?'All tested internal invariants passed; scientific approval is still blocked.':
   'The saved research candidate has inconsistent values. Investigate source before further editorial work.')+
  '</p><div style="overflow:auto"><table><thead><tr>'+
  '<th>Test</th><th>Result</th><th>What it checks</th></tr></thead><tbody>'+
  rows+'</tbody></table></div></section>';
 const blockers='<section><h2>External scientific evidence still required</h2>'+
  '<ol>'+report.externalEvidenceBlockers.map(x=>'<li>'+esc(x)+'</li>').join('')+
  '</ol><p>Sidereal Nakshatra/Yoga, regional festival and Muhurat rules must not be inferred from these internal tests.</p></section>';
 const link='<p><a href="/research/daily?city='+encodeURIComponent(report.cityId)+
  '&date='+encodeURIComponent(report.localDate)+'">← Return to this private JPL day</a></p>'+
  '<p class="pv-caption">SHA-256: '+esc(report.candidateSourceSha256)+
  ' · '+esc(report.auditVersion)+' · No data modifications, AI billing or SEO indexing</p>';
 return header+counts+matrix+blockers+link;
}
export async function handleDailyScienceAudit(request,env,actor){
 if(new URL(request.url).pathname!=='/science/day')return null;
 if(!actor)return page('Access denied',403);
 if(request.method!=='GET')return page('Read-only science audit',405);
 const u=new URL(request.url),city=u.searchParams.get('city'),date=u.searchParams.get('date');
 if(!CITY_IDS.has(city)||!dateValid(date))
  return page('<h1>Select a valid city and date</h1><p>Start in the <a href="/research/daily">private JPL explorer</a>.</p>',400);
 try{
  const found=await readCityResearchDay(env,city,date);
  if(found.state!=='research')return page(
   '<h1>Science source not available</h1><p>No candidate is published or modified.</p>',
   found.state==='missing'?404:503);
  const report=auditResearchCandidate(found.record,found.sha256);
  return page(renderDailyScienceReport(report));
 }catch{return page('<h1>Science consistency audit unavailable</h1><p>Research-only data has not been published.</p>',503)}
}
