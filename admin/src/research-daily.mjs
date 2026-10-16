/** Authenticated, read-only city/day research preview.
 * A useful data-first preview today, with NO DeepSeek and NO SEO release.
 * Source is always a SHA-verified private D1/R2 candidate, not GitHub demo data.
 */
import {CITY_IDS,CITY_META} from './city-catalog.mjs';
import {candidateIssues} from './runner.mjs';

const HEADERS={
 'Content-Type':'text/html; charset=utf-8',
 'Cache-Control':'private, no-store, max-age=0',
 'X-Robots-Tag':'noindex, nofollow, noarchive',
 'X-Content-Security-Policy':'default-src none',
 'X-Content-Type-Options':'nosniff',
 'X-Frame-Options':'DENY',
 'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"
};
const JPL='c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2';
const encoder=new TextEncoder();
const sha256=async raw=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(raw))))
 .map(x=>x.toString(16).padStart(2,'0')).join('');
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const page=(body,status=200)=>new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="robots" content="noindex,nofollow,noarchive"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PANCHAVANI · Private City Day</title>
<style>:root{color-scheme:dark;background:#080808;color:#f5e7d4;font:15px system-ui}
body{max-width:1020px;margin:36px auto;padding:0 22px 70px}a{color:#e8bd7c}
h1{font:normal 44px Georgia,serif}h2{font:normal 26px Georgia,serif;color:#f0c786}
p{line-height:1.7;color:#c6bcad}section{padding:22px;border:1px solid #68503680;background:#18140f;border-radius:10px;margin:18px 0}
.warning{padding:17px;border-left:4px solid #d0a15e;color:#f0d1a0;background:#332514}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.grid article{background:#130f0b;border:1px solid #574632;padding:16px;border-radius:7px}
.grid span{display:block;font-size:12px;color:#bea987}.grid strong{font:normal 21px Georgia,serif}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:10px;text-align:left;border-bottom:1px solid #574632}
nav{margin:18px 0}.note{font-size:12px;color:#a69988}
@media(max-width:670px){body{padding:0 14px}h1{font-size:33px}.grid{grid-template-columns:1fr 1fr}table{font-size:11px}}
</style></head><body><nav><a href="/">← Private Calculation Control Center</a></nav>${body}</body></html>`,
{status,headers:HEADERS});
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 !Number.isNaN(Date.parse(x+'T12:00:00Z'))&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
const localTime=x=>{
 if(typeof x!=='string'||!Number.isFinite(Date.parse(x)))return 'not available';
 return new Intl.DateTimeFormat('en-IN',{
  timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hour12:false,
  day:'2-digit',month:'short'
 }).format(new Date(x))+' IST';
};
const fmt=(value)=>typeof value==='string'&&value.trim()?value:'not calculated';
const maxBytes=210000;
export async function readCityResearchDay(env,cityId,day){
 if(!CITY_IDS.has(cityId)||!validDate(day))return {state:'invalid'};
 if(!env?.DB||!env?.CANDIDATES)return {state:'unavailable'};
 const row=await env.DB.prepare(
  "SELECT job_id,city_id,local_date,content_hash,r2_key FROM research_candidates "+
  "WHERE city_id=? AND local_date=? AND status='unapproved' ORDER BY id DESC LIMIT 1"
 ).bind(cityId,day).first();
 if(!row)return {state:'missing'};
 if(row.city_id!==cityId||row.local_date!==day||typeof row.job_id!=='string'||
    typeof row.r2_key!=='string'||!row.r2_key.startsWith('unapproved/'+row.job_id+'/')||
    !/^[a-f0-9]{64}$/.test(row.content_hash||''))
  return {state:'integrity'};
 const object=await env.CANDIDATES.get(row.r2_key);
 if(!object)return {state:'object-missing'};
 const raw=await object.text();
 if(encoder.encode(raw).length>maxBytes||(await sha256(raw))!==row.content_hash)
  return {state:'integrity'};
 let record;
 try{record=JSON.parse(raw)}catch{return {state:'integrity'}}
 if(record.methodology?.ephemerisHash!==JPL||
   candidateIssues(record,{city_id:cityId,local_date:day}).length)
  return {state:'integrity'};
 return {state:'research',record,sha256:row.content_hash};
}
export function renderPrivateResearchDay(record,sha){
 const id=record.city.id,city=CITY_META.get(id);
 const title=city?.name||id;
 const solar=record.sun||{},p=record.panchangAtSunrise||{};
 const data=[
  ['Tithi at sunrise',p.tithi],['Karana at sunrise',p.karana],
  ['Vara',p.vara],['Paksha',p.paksha],
  ['Nakshatra','Methodology pending'],['Yoga','Methodology pending']
 ];
 const periods=record.transitions.filter(x=>['tithi','karana','rahu-kalam','yamaganda','gulika'].includes(x.type))
  .slice(0,35);
 const rows=periods.map(x=>'<tr><td>'+esc(x.type)+'</td><td>'+
  esc(x.value)+'</td><td>'+esc(localTime(x.startUtc))+'</td><td>'+
  esc(localTime(x.endUtc))+'</td></tr>').join('');
 return `<h1>${esc(title)} Panchang · ${esc(record.localDate)}</h1>
<div class="warning"><strong>UNAPPROVED ASTRONOMY RESEARCH</strong> · Precise looking times below are calculations using provisional coordinates and conventions; they are NOT independently reconciled, nor suitable for public calendar, fasting or Muhurat advice.</div>
<section><h2>Local time anchors</h2><div class="grid">
<article><span>Sunrise</span><strong>${esc(localTime(solar.sunriseUtc))}</strong></article>
<article><span>Sunset</span><strong>${esc(localTime(solar.sunsetUtc))}</strong></article>
<article><span>Next sunrise</span><strong>${esc(localTime(solar.nextSunriseUtc))}</strong></article>
</div></section><section><h2>Panchang research fields</h2><div class="grid">${data.map(([label,value])=>
'<article><span>'+esc(label)+'</span><strong>'+esc(fmt(value))+'</strong></article>').join('')}</div></section>
<section><h2>Computed transitions</h2><p>Transition intervals are research calculations with their own JPL methodology; not a city-specific ceremonial rule.</p>
<div style="overflow:auto"><table><thead><tr><th>Layer</th><th>Value</th><th>From (IST)</th><th>To (IST)</th></tr></thead><tbody>${rows}</tbody></table></div></section>
<section><h2>Research provenance</h2><p>NASA/JPL DE440s · ${esc(record.methodology?.sunriseConvention)}.</p>
<p class="note">Source SHA-256: ${esc(sha)} · JPL SHA-256: ${esc(JPL)}</p>
<p class="note">Missing independent scientific checks, region-specific rules, and final editorial evidence are publication blockers. DeepSeek used: 0 calls.</p></section>`;
}
export async function handleResearchDay(request,env,actor){
 const url=new URL(request.url);
 if(url.pathname!=='/research/daily')return null;
 if(!actor)return page('<h1>Access denied</h1>',403);
 if(request.method!=='GET')return page('<h1>Method not allowed</h1>',405);
 if(!env.DB||!env.CANDIDATES)return page('<h1>Private D1/R2 unavailable</h1>',503);
 const cityId=url.searchParams.get('city'),date=url.searchParams.get('date');
 try{
  const latest=(await env.DB.prepare(
   "SELECT city_id,local_date FROM research_candidates WHERE status='unapproved' "+
   "ORDER BY local_date DESC,city_id LIMIT 70"
  ).all()).results||[];
  const list=latest.filter(x=>CITY_IDS.has(x.city_id)&&validDate(x.local_date));
  const links=list.map(x=>'<a href="/research/daily?city='+
   encodeURIComponent(x.city_id)+'&date='+encodeURIComponent(x.local_date)+
   '">'+esc(CITY_META.get(x.city_id).name)+' · '+esc(x.local_date)+'</a>').join(' · ');
  let detail='<p>Select one of the available stored city/day records to inspect real calculations.</p>';
  if(cityId!==null||date!==null){
   if(!CITY_IDS.has(cityId)||!validDate(date))return page('<h1>Invalid city/date selector</h1>',400);
   const res=await readCityResearchDay(env,cityId,date);
   if(res.state!=='research')
    return page('<h1>Record not available</h1><p>Research status: '+esc(res.state)+
      '. Nothing was published or regenerated.</p>',res.state==='missing'?404:503);
   detail=renderPrivateResearchDay(res.record,res.sha256)+
    '<p><a href="/science/day?city='+
    encodeURIComponent(cityId)+'&date='+encodeURIComponent(date)+
    '">Audit Tithi, Karana and local calendar consistency →</a></p>'+
    '<p><a href="/research/daily-brief?city='+
    encodeURIComponent(cityId)+'&date='+encodeURIComponent(date)+
    '">View day-specific SEO content brief (research-only) →</a></p>';
  }
  return page('<h1>Private city-day research explorer</h1>'+
   '<p class="warning">Research candidates only · authenticated access · zero AI calls · not indexed.</p>'+
   '<section><h2>Stored city-days</h2><p>'+links+'</p></section>'+detail);
 }catch{return page('<h1>Private research preview unavailable</h1>',503)}
}
