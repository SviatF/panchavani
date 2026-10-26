/** 3-city x 7-day PRIVATE scientific review queue, not a scientific signature.
 * Every individual cell is retrieved afresh through the existing SHA-checked
 * production D1/R2 reader. No AI, D1 mutation, approval or publication.
 */
import {readCityResearchDay} from './research-daily.mjs';
import {auditResearchCandidate} from './science-integrity.mjs';

export const PILOT_CITIES=Object.freeze(['delhi','mumbai','chennai']);
const DAYS=7;
const HEADERS={
 'Cache-Control':'private, no-store',
 'X-Robots-Tag':'noindex,nofollow,noarchive',
 'X-Content-Type-Options':'nosniff',
 'X-Frame-Options':'DENY'
};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
const dateOk=s=>typeof s==='string'&&/^20\d\d-\d\d-\d\d$/.test(s)&&
 Number.isFinite(Date.parse(s+'T12:00:00Z'))&&
 new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const nextDays=start=>Array.from({length:DAYS},(_,i)=>
 new Date(Date.parse(start+'T12:00:00Z')+i*86400000).toISOString().slice(0,10));
export function defaultPilotStart(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',
   year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const d=Object.fromEntries(parts.map(x=>[x.type,x.value]));
 return new Date(Date.parse(d.year+'-'+d.month+'-'+d.day+'T12:00:00Z')-
   6*86400000).toISOString().slice(0,10);
}
export async function pilotWeekCensus(env,start,reader=readCityResearchDay){
 if(!dateOk(start))throw Error('Expected valid India-local start date');
 const requested=nextDays(start);
 const rows=[];
 // Sequential bounded reads preserve a clear provenance for each cell and
 // avoid a burst of 21 simultaneous D1+R2 requests.
 for(const cityId of PILOT_CITIES){
  for(const localDate of requested){
   let found;
   try{found=await reader(env,cityId,localDate)}
   catch{found={state:'read-error'}}
   const row={cityId,localDate,sourceState:found?.state||'read-error',
      internalConsistency:'NOT_EVALUATED',
      sourceRecordSha256:null,
      researchTithi:null,researchKarana:null,
      missingIndependentEvidence:[
       'method-matched-independent-lunar-comparison',
       'independent-city-geolocation-and-refraction-review',
       'certified-lahiri-sidereal-nakshatra-yoga-timelines',
       'production-source-conflict-disposition',
       'independent-scientific-review-signature'
      ],
      approvalForDeepSeek:false,indexingAuthorized:false};
   if(found?.state==='research'){
    const data=found.record;
    try{
     const a=auditResearchCandidate(data,found.sha256);
     row.internalConsistency=a.status;
     row.internalIssues=a.issues;
     row.sourceRecordSha256=found.sha256;
     row.researchTithi=data?.panchangAtSunrise?.tithi||null;
     row.researchKarana=data?.panchangAtSunrise?.karana||null;
    }catch{
     row.sourceState='audit-error';
    }
   }
   rows.push(row);
  }
 }
 const matched=rows.filter(x=>x.sourceState==='research');
 const internallyValid=matched.filter(x=>x.internalConsistency==='INTERNAL_CONSISTENCY_PASS');
 return {
  artifactType:'PANCHAVANI_PRODUCTION_3CITY_7DAY_PRIVATE_REVIEW',
  schemaVersion:1,status:'RESEARCH_AND_REVIEW_ONLY',
  scope:{cities:[...PILOT_CITIES],start,end:requested.at(-1),
   dates:requested,expectedCityDays:PILOT_CITIES.length*DAYS},
  count:{
   expected:rows.length,sourceShaVerified:matched.length,
   internalConsistencyPassed:internallyValid.length,
   missingOrUnverifiable:rows.length-matched.length,
   independentlyScienceApproved:0,
   newDeepSeekDraftsAuthorized:0,
   publicPagesAuthorized:0
  },
  // Deliberately not an approvable evidence pack: an external reviewer must
  // resolve separate lunar, geography and tradition questions from originals.
  outstandingMethodology:'JPL source SHA and internal order do not independently certify Lahiri, solar point, regional observance or release.',
  scientificReviewSigned:false,
  approvedClaimsForDeepSeek:[],modelInvocationAuthorized:false,
  publicationAuthorized:false,indexingAuthorized:false,
  rows
 };
}
function html(report){
 const cells=report.rows.map(r=>'<tr><td>'+esc(r.cityId)+'</td><td>'+
  esc(r.localDate)+'</td><td>'+esc(r.sourceState)+'</td><td>'+
  esc(r.internalConsistency)+'</td><td>'+esc(r.researchTithi)+'</td><td>'+
  esc(r.researchKarana)+'</td><td><code>'+esc((r.sourceRecordSha256||'—').slice(0,16))+
  '</code></td><td><a href="/science/day?city='+encodeURIComponent(r.cityId)+
  '&date='+encodeURIComponent(r.localDate)+'">Audit</a></td></tr>').join('');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="robots" content="noindex,nofollow,noarchive">'+
  '<title>PANCHAVANI | 21 science records review</title>'+
  '<style>body{background:#090b09;color:#e9decb;font:15px/1.6 system-ui;margin:34px auto;max-width:1200px;padding:0 18px}a{color:#e3bc7d}h1{font:44px Georgia,serif;color:#e7c18b}table{border-collapse:collapse;width:100%;font-size:13px}th,td{padding:10px;border-bottom:1px solid #453e31;text-align:left;vertical-align:top}code{font-size:11px}section{padding:20px;background:#171710;border:1px solid #64543e;border-radius:10px;margin:18px 0}input,button{padding:10px;background:#2d2a21;color:#efe2cf;border:1px solid #816c4a;border-radius:5px}small{color:#b1aa9c}strong{color:#efcb8f}</style></head><body>'+
  '<p><a href="/">← Private Admin</a> · <a href="/editorial/readiness">Editorial readiness</a></p>'+
  '<h1>21-day-source scientific review</h1>'+
  '<p>Delhi · Mumbai · Chennai × seven consecutive local days. Each row is taken from real private D1/R2, cross-checked against its saved SHA-256. These calculations are not accepted astronomy and MUST NOT be published or supplied to DeepSeek as approved values.</p>'+
  '<form action="/science/pilot-week" method="get"><label>India-local first day <input type="date" name="start" value="'+esc(report.scope.start)+'" required></label> <button>Inspect 21 records</button></form>'+
  '<section><strong>'+report.count.sourceShaVerified+' / '+report.count.expected+'</strong> source-verified research · <strong>'+
   report.count.internalConsistencyPassed+'</strong> internal-only checks passed · <strong>0</strong> independently approved days · <strong>0</strong> indexable URLs'+
  '<p><a href="/science/pilot-week.json?start='+encodeURIComponent(report.scope.start)+'">Export immutable source pointers for an independent reviewer (JSON)</a></p></section>'+
  '<p><strong>Outstanding gates:</strong> independent ephemeris/convention reconciliation, city station/elevation/refraction, Lahiri four-limb chronology, historical R2 conflict investigation, separately signed human science review and editorial source audit.</p>'+
  '<div style="overflow-x:auto"><table><thead><tr><th>City</th><th>Date</th><th>Stored D1/R2</th><th>Internal QA</th><th>Research Tithi</th><th>Research Karana</th><th>Source SHA</th><th>Details</th></tr></thead><tbody>'+cells+'</tbody></table></div>'+
  '<small>Review only · no model call · no signed science authorization · no public publication · no SEO release</small></body></html>';
}
export async function handleSciencePilotWeek(request,env,actor){
 const url=new URL(request.url);
 if(!['/science/pilot-week','/science/pilot-week.json'].includes(url.pathname))return null;
 const response=(body,type,status=200)=>new Response(body,{
   status,headers:{...HEADERS,'Content-Type':type}});
 if(!actor)return response('Access denied','text/plain; charset=utf-8',403);
 if(request.method!=='GET')return response('GET only','text/plain; charset=utf-8',405);
 const start=url.searchParams.get('start')||defaultPilotStart();
 if(!dateOk(start))return response('Invalid YYYY-MM-DD','text/plain; charset=utf-8',400);
 if(!env?.DB||!env?.CANDIDATES)
  return response('Private storage unavailable','text/plain; charset=utf-8',503);
 const report=await pilotWeekCensus(env,start);
 if(url.pathname.endsWith('.json'))
  return response(JSON.stringify(report),'application/json; charset=utf-8');
 return response(html(report),'text/html; charset=utf-8');
}
