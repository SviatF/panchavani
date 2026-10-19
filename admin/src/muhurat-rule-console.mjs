/** Private, read-only source-and-metrics dashboard; never publishes Muhurat. */
const ROOT="ops/ten-city-six-limb/v1/";
const SUFFIX="/sourced-rule-screening-UNAPPROVED.json";
const DENY={publicationAuthorized:false,indexingAuthorized:false,muhuratRecommendationsAuthorized:false,approvedClaimsForDeepSeek:[]};
const H={"Cache-Control":"private, no-store, max-age=0","X-Robots-Tag":"noindex, nofollow, noarchive",
 "X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY",
 "Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"};
const json=(x,n=200)=>new Response(JSON.stringify(x,null,2)+"\n",{status:n,headers:{"Content-Type":"application/json; charset=utf-8",...H}});
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function indiaTomorrow(){
 const p=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"})
  .formatToParts(new Date()),o=Object.fromEntries(p.map(x=>[x.type,x.value]));
 return new Date(Date.parse(o.year+"-"+o.month+"-"+o.day+"T00:00:00Z")+86400000).toISOString().slice(0,10);
}
function validDay(d){return /^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+"T00:00:00Z"))&&new Date(d+"T00:00:00Z").toISOString().slice(0,10)===d}
export function verifyMuhuratScreening(a,day){
 if(!a||a.artifactType!=="PANCHAVANI_SOURCED_MUHURAT_RESEARCH_METRICS"||
    a.schemaVersion!==1||a.status!=="SOURCE_GROUNDED_PRELIMINARY_SCREEN_ONLY"||
    a.cityCount!==10||a.localDateFrom!==day||
    a.scientificApproval!==false||a.independentRuleApproval!==false||
    a.muhuratRecommendationsAuthorized!==false||
    a.paidDeepSeekGenerationAuthorized!==false||
    a.publicationAuthorized!==false||a.indexingAuthorized!==false||
    !Array.isArray(a.approvedClaimsForDeepSeek)||a.approvedClaimsForDeepSeek.length!==0||
    !/^[a-f0-9]{64}$/.test(a.rulebookSha256||"")||
    !/^[a-f0-9]{64}$/.test(a.sourceGridSha256||"")||
    !a.metrics||a.metrics.cityDaysValidated!==20||
    !Number.isFinite(a.metrics.phaseSlicesValidated)||a.metrics.phaseSlicesValidated<20||
    a.metrics.maximumSunriseChainErrorSeconds>0.001||
    a.metrics.maximumDurationErrorSeconds>0.001||
    !a.analysis||Object.keys(a.analysis).sort().join(",")!=="vehicle-purchase,wedding")throw Error("Unsafe or incomplete screening artifact");
 for(const [kind,row] of Object.entries(a.analysis)){
  if(!row||row.testedCityDays!==20||!Number.isInteger(row.initialSurvivingWindows)||
     row.initialSurvivingWindows<0||row.qualifyingWeddingOrPurchaseMuhuratCount!==0||
     row.muhuratRecommendationsAuthorized!==false||
     !Array.isArray(row.approvedRitualWindows)||row.approvedRitualWindows.length||
     !Array.isArray(row.approvedClaimsForDeepSeek)||row.approvedClaimsForDeepSeek.length||
     !Array.isArray(row.remainingIndependentChecks)||row.remainingIndependentChecks.length<4||
     !Array.isArray(row.rawInitialMatches)||row.rawInitialMatches.length!==row.initialSurvivingWindows||
     row.rawInitialMatches.length>500)throw Error("Unreviewed Muhurat outcome unsafe: "+kind);
  for(const window of row.rawInitialMatches){
   if(window.auspiciousRecommendation!==false||
      window.expertApproved!==false||
      window.criteriaSatisfied!=="REFERENCE_INITIAL_SCREEN_ONLY"||
      !Number.isFinite(window.durationSeconds)||window.durationSeconds<300)
     throw Error("Implicit favorable date leaked");
  }
 }
 return a;
}
export async function handleMuhuratRulesConsole(request,env,actor){
 const url=new URL(request.url);
 if(url.pathname!=="/research/muhurat-rules")return null;
 if(!actor)return json({error:"Cloudflare Access required",...DENY},403);
 if(request.method!=="GET")return json({error:"Read-only GET",...DENY},405);
 const params=[...url.searchParams.keys()];
 const dates=url.searchParams.getAll("date"),formats=url.searchParams.getAll("format");
 const day=dates[0]||indiaTomorrow(),format=formats[0]||"html";
 if(params.some(k=>!["date","format"].includes(k))||dates.length>1||formats.length>1||
    !validDay(day)||!["html","json"].includes(format))
  return json({error:"Invalid date or format",...DENY},400);
 if(!env?.CANDIDATES)return json({error:"Private R2 missing",...DENY},503);
 try{
  const prefix=ROOT+day+"/";
  const list=await env.CANDIDATES.list({prefix,limit:100});
  if(list?.truncated)throw Error("Ambiguous private source listing");
  const matches=(list?.objects||[]).filter(o=>o.key.startsWith(prefix)&&o.key.endsWith(SUFFIX)&&
    /^\d{5,30}$/.test(o.key.slice(prefix.length,-SUFFIX.length)))
   .sort((a,b)=>{
    const x=BigInt(a.key.slice(prefix.length,-SUFFIX.length));
    const y=BigInt(b.key.slice(prefix.length,-SUFFIX.length));
    return x>y?-1:x<y?1:0;
   });
  if(!matches.length)return json({error:"No complete sourced rule screen in private R2 for this date",day,...DENY},503);
  const obj=await env.CANDIDATES.get(matches[0].key);
  if(!obj)throw Error("Private source removed");
  const report=verifyMuhuratScreening(JSON.parse(await obj.text()),day);
  const output={...report,privateSourceObjectKey:matches[0].key};
  if(format==="json")return json(output);
  const profiles=Object.entries(report.analysis).map(([kind,rec])=>{
   const decisions=Object.entries(rec.filteredReasonsBySlice||{}).map(([key,n])=>"<tr><td>"+esc(key)+"</td><td>"+esc(n)+"</td></tr>").join("");
   const examples=rec.rawInitialMatches.slice(0,12).map(row=>"<tr><td>"+esc(row.cityId)+"</td><td>"+esc(row.localDate)+"</td><td>"+esc(row.startIST)+" → "+esc(row.endIST)+"</td><td>"+esc(row.durationSeconds)+"s</td></tr>").join("");
   return "<section><h2>"+esc(kind)+" · "+esc(rec.policyId)+"</h2>"+
   "<p>Complete days tested: "+esc(rec.testedCityDays)+
   " · Atomic intervals: "+esc(rec.inputPhaseSlices)+
   " · Preliminary matches: "+esc(rec.initialSurvivingWindows)+
   " · Approved auspicious results: <strong>0</strong></p>"+
   "<h3>Reasons for screening out intervals (non-exclusive counts)</h3><table><tbody>"+decisions+"</tbody></table>"+
   "<h3>First-stage examples, NEVER recommendations</h3><table><tbody>"+examples+"</tbody></table>"+
   "<h3>Prerequisites still missing</h3><ul>"+rec.remainingIndependentChecks.map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul></section>";
  }).join("");
  const html='<!doctype html><html lang="en"><head><meta charset="utf-8">'+
   '<meta name="viewport" content="width=device-width,initial-scale=1">'+
   '<meta name="robots" content="noindex,nofollow,noarchive"><title>PANCHAVANI · Sourced Muhurat Methods</title>'+
   '<style>body{background:#0f1116;color:#eee;font:14px system-ui;margin:0;padding:24px}main{max-width:1100px;margin:auto}section{border:1px solid #665032;padding:22px;border-radius:12px;margin:22px 0}h1,h2{color:#f0c78f}table{display:block;overflow-x:auto;border-collapse:collapse}td{padding:11px;border-bottom:1px solid #393c42;white-space:nowrap}.warning{padding:16px;background:#3c291f;border:1px solid #a46c45}a{color:#f0c78f}input,button{padding:8px;background:#1c2430;color:white;border:1px solid #876e4a}li{margin-bottom:9px}</style>'+
   '</head><body><main><p><a href="/">← Admin</a></p><h1>Wedding + Vehicle rule screening</h1>'+
   '<p class="warning"><strong>NOT A MUHURAT CALENDAR.</strong> This report counts only preliminary source-convention matches. City coordinates, Lahiri, Lagna, Asta, regional and human expert review remain incomplete. ZERO approved dates; ZERO public indexing and DeepSeek-ready facts.</p>'+
   '<form method="get"><label>India local start date <input type="date" name="date" value="'+esc(day)+'"></label><button>View</button></form>'+
   '<p>20 city/days validated · '+esc(report.metrics.phaseSlicesValidated)+' lunar phase slices · '+
   esc(report.metrics.fourLimbLabelsValidated)+' four-limb facts checked · max sunrise chain drift '+
   esc(report.metrics.maximumSunriseChainErrorSeconds)+' seconds</p>'+
   '<p><a href="?date='+esc(day)+'&amp;format=json">Download private numeric metrics</a></p>'+
   profiles+'<p>Rulebook SHA256 '+esc(report.rulebookSha256)+' · Research source '+esc(matches[0].key)+'</p></main></body></html>';
  return new Response(html,{status:200,headers:{"Content-Type":"text/html; charset=utf-8",...H}});
 }catch{
  return json({error:"Private sourced Muhurat report incomplete or tampered",...DENY},503);
 }
}
