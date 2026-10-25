/** Read-only, private per-city editorial production census.
 * A stored draft is NOT a completed article, and a complete count of days
 * is NOT evidence of scientific continuity or a publication permit.
 * Does not make provider calls or write to D1/R2.
 */
import {CITY_NAMES} from './grounded-day-editorial.mjs';

const MONTH=/^20\d\d-(0[1-9]|1[0-2])$/;
const ROUTES=new Set(['/editorial/readiness','/editorial/readiness.json']);
const HEADERS={
 'Cache-Control':'private, no-store',
 'X-Robots-Tag':'noindex,nofollow,noarchive',
 'X-Content-Type-Options':'nosniff',
 'X-Frame-Options':'DENY'
};
const esc=x=>String(x).replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
const reply=(body,type,status=200)=>new Response(body,{
 status,headers:{...HEADERS,'Content-Type':type}
});
export function indiaMonth(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{
  timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit'
 }).formatToParts(now);
 const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
 return p.year+'-'+p.month;
}
export function summarizeEditorialReadiness(month,science=[],drafts=[],rules=[]){
 if(!MONTH.test(month)||!Array.isArray(science)||!Array.isArray(drafts)||
    !Array.isArray(rules))throw Error('Invalid private editorial summary scope');
 const [year,m]=month.split('-').map(Number);
 const daysInMonth=new Date(Date.UTC(year,m,0)).getUTCDate();
 const cities=Object.entries(CITY_NAMES).map(([cityId,city])=>{
  const scienceRow=science.find(x=>x.city_id===cityId);
  const signedDays=Number(scienceRow?.n||0);
  if(!Number.isSafeInteger(signedDays)||signedDays<0||signedDays>daysInMonth)
   throw Error('Impossible count of independently signed science days');
  const byIntent={};
  for(const intent of ['daily-panchang','calendar-month','festival','vrat','muhurat']){
   byIntent[intent]={storedDrafts:0,failedOrReserved:0,reviewedRuleSets:0};
  }
  for(const row of drafts.filter(x=>x.city_id===cityId)){
   if(!Object.hasOwn(byIntent,row.intent))throw Error('Unexpected editorial intent');
   const n=Number(row.n);
   if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid private draft count');
   if(row.state==='stored')byIntent[row.intent].storedDrafts+=n;
   else if(row.state==='reserved'||row.state==='failed')
    byIntent[row.intent].failedOrReserved+=n;
   else throw Error('Unexpected private draft state');
  }
  for(const row of rules.filter(x=>x.city_id===cityId)){
   if(!['festival','vrat','muhurat'].includes(row.intent))
    throw Error('Unexpected expert rule review scope');
   const n=Number(row.n);
   if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid reviewed rule count');
   byIntent[row.intent].reviewedRuleSets+=n;
  }
  const blockers=[];
  if(!signedDays)blockers.push('independently-signed-science-missing');
  else if(signedDays<daysInMonth)blockers.push('calendar-month-science-incomplete');
  if(signedDays&&!byIntent['daily-panchang'].storedDrafts)
   blockers.push('daily-deepseek-drafts-missing');
  if(signedDays===daysInMonth&&!byIntent['calendar-month'].storedDrafts)
   blockers.push('calendar-editorial-draft-missing');
  if(!['festival','vrat','muhurat'].some(k=>byIntent[k].reviewedRuleSets))
   blockers.push('tradition-specific-independent-reviews-missing');
  blockers.push('independent-editorial-and-seo-publication-review-not-recorded-here');
  const storedDrafts=Object.values(byIntent).reduce((n,x)=>n+x.storedDrafts,0);
  const reviewedRuleSets=Object.values(byIntent).reduce((n,x)=>n+x.reviewedRuleSets,0);
  return {cityId,city,month,daysInMonth,signedDays,
   completeSourceDayCount:signedDays===daysInMonth,
   sourceDayContinuityVerified:false,
   storedDrafts,reviewedRuleSets,byIntent,blockers,
   publicPublicationAuthorized:false,indexingAuthorized:false};
 });
 return {schemaVersion:1,scope:'PRIVATE_EDITORIAL_READINESS_RESEARCH_ONLY',
   month,daysInMonth,cities,summary:{
    cityCount:cities.length,
    signedScienceDays:cities.reduce((n,x)=>n+x.signedDays,0),
    privateDrafts:cities.reduce((n,x)=>n+x.storedDrafts,0),
    independentlyReviewedRuleSets:cities.reduce((n,x)=>n+x.reviewedRuleSets,0),
    // The public repo's separately pinned manifests, not Admin D1, decide releases.
    approvedPublicPages:'not-determined-by-private-admin'
   },publicationAuthorized:false,indexingAuthorized:false};
}
export async function readEditorialReadiness(env,month){
 if(!env?.DB?.prepare)throw Error('Private D1 unavailable');
 if(!MONTH.test(month))throw Error('Invalid requested local month');
 const operations=[
  env.DB.prepare("SELECT city_id,COUNT(*) AS n FROM science_approved_day_sources "+
   "WHERE state='approved_for_draft' AND local_date LIKE ? GROUP BY city_id")
   .bind(month+'-%').all(),
  env.DB.prepare("SELECT city_id,intent,state,COUNT(*) AS n FROM editorial_multi_intent_once "+
   "WHERE month=? GROUP BY city_id,intent,state").bind(month).all(),
  env.DB.prepare("SELECT city_id,intent,COUNT(*) AS n FROM independently_reviewed_rule_sources "+
   "WHERE state='approved_for_draft' AND science_dates_json LIKE ? GROUP BY city_id,intent")
   .bind('%'+month+'-%').all()
 ];
 const [science,drafts,rules]=await Promise.all(operations);
 return summarizeEditorialReadiness(month,science.results||[],
  drafts.results||[],rules.results||[]);
}
function render(report){
 const rows=report.cities.map(x=>{
  const statuses=x.blockers.map(y=>'<li>'+esc(y.replaceAll('-',' '))+'</li>').join('');
  return '<tr><td><strong>'+esc(x.city)+'</strong><small>'+esc(x.cityId)+'</small></td>'+
   '<td>'+x.signedDays+' / '+x.daysInMonth+'</td><td>'+x.storedDrafts+'</td>'+
   '<td>'+x.reviewedRuleSets+'</td><td><details><summary>Review blockers</summary><ul>'+
   statuses+'</ul></details></td></tr>';
 }).join('');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="robots" content="noindex,nofollow,noarchive">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>PANCHAVANI | Production readiness</title>'+
  '<style>body{max-width:1150px;margin:32px auto;padding:0 18px;background:#080a09;color:#e9ddc9;font:15px/1.6 system-ui,sans-serif}h1{font:42px Georgia,serif;color:#e7c18b}a{color:#f4c889}table{border-collapse:collapse;width:100%}th,td{padding:12px;text-align:left;border-bottom:1px solid #524536;vertical-align:top}small{display:block;color:#acaa9c}summary{cursor:pointer;color:#e7c18b}section{padding:22px;background:#171810;border:1px solid #6b5539;border-radius:12px;margin:20px 0}input,button{background:#202018;color:#f5ead7;border:1px solid #826b48;padding:9px;border-radius:5px}ul{padding-left:20px}strong{color:#ecd1a3}</style></head><body>'+
  '<a href="/">← Admin</a> · <a href="/editorial/multi">Draft studio</a>'+
  '<h1>City × month production readiness</h1>'+
  '<p>Read-only inventory of independently signed source days, private DeepSeek drafts and separate ritual reviews. No values below are permissions to publish.</p>'+
  '<form method="get" action="/editorial/readiness"><label>Indian calendar month <input name="month" pattern="20[0-9]{2}-(0[1-9]|1[0-2])" value="'+esc(report.month)+'"></label> <button>Inspect month</button></form>'+
  '<section><strong>'+report.summary.signedScienceDays+'</strong> reviewed source days · <strong>'+report.summary.privateDrafts+'</strong> stored private drafts · <strong>'+report.summary.independentlyReviewedRuleSets+'</strong> expert rule packs<br>'+
  '<small>Month: '+esc(report.month)+' · '+report.summary.cityCount+' approved pilot cities · <a href="/editorial/readiness.json?month='+encodeURIComponent(report.month)+'">Read machine-readable status</a></small></section>'+
  '<p><strong>Interpretation:</strong> Even a complete day count still needs cross-day astronomical continuity verification, human substantive editorial review, a separate SEO allowlist and signed public deployment manifests.</p>'+
  '<div style="overflow:auto"><table><thead><tr><th>City</th><th>Signed days</th><th>Private drafts</th><th>Ritual reviews</th><th>Missing gates</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
  '</body></html>';
}
export async function handleEditorialReadiness(request,env,actor){
 const url=new URL(request.url);
 if(!ROUTES.has(url.pathname))return null;
 if(!actor)return reply('Access denied','text/plain; charset=utf-8',403);
 if(request.method!=='GET')return reply('Method not allowed','text/plain; charset=utf-8',405);
 const month=url.searchParams.get('month')||indiaMonth();
 if(!MONTH.test(month))return reply('Invalid YYYY-MM month','text/plain; charset=utf-8',400);
 try{
  const data=await readEditorialReadiness(env,month);
  if(url.pathname.endsWith('.json'))
   return reply(JSON.stringify(data),'application/json; charset=utf-8');
  return reply(render(data),'text/html; charset=utf-8');
 }catch{
  return reply('Private D1 or editorial migration unavailable. No readiness assumed.',
   'text/plain; charset=utf-8',503);
 }
}
