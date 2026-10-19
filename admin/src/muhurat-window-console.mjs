/** Access-only preview of the nightly science grids in PRIVATE R2. */
const CITIES=["delhi","mumbai","kolkata","chennai","bengaluru","hyderabad","ahmedabad","pune","jaipur","varanasi"];
const prefix="ops/ten-city-six-limb/v1/";
const suffix="/muhurat-interval-grid-UNAPPROVED.json";
const HEADER={"Cache-Control":"private, no-store, max-age=0",
 "X-Robots-Tag":"noindex, nofollow, noarchive",
 "X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY",
 "Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"};
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const json=(value,status=200)=>new Response(JSON.stringify(value,null,2)+"\n",{
 status,headers:{"Content-Type":"application/json; charset=utf-8",...HEADER}
});
const dayOk=day=>/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day+"T00:00:00Z"))&&
 new Date(day+"T00:00:00Z").toISOString().slice(0,10)===day;
function nextIndianDate(){
 const parts=new Intl.DateTimeFormat("en-GB",{
   timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"
 }).formatToParts(new Date());
 const d=Object.fromEntries(parts.map(p=>[p.type,p.value]));
 const current=d.year+"-"+d.month+"-"+d.day;
 return new Date(Date.parse(current+"T00:00:00Z")+86400000).toISOString().slice(0,10);
}
export function verifyPrivateGrid(g,date){
 if(g?.artifactType!=="PANCHAVANI_TEN_CITY_FOUR_LIMB_INTERSECTION_GRID"||
    g?.status!=="UNAPPROVED_RESEARCH"||g?.cityCount!==10||g?.cityDays!==20||
    g?.localDateFrom!==date||g?.scientificApproval!==false||
    g?.muhuratRecommendationsAuthorized!==false||g?.publicationAuthorized!==false||
    g?.indexingAuthorized!==false||g?.paidDeepSeekGenerationAuthorized!==false||
    !Array.isArray(g?.approvedClaimsForDeepSeek)||g.approvedClaimsForDeepSeek.length||
    !Array.isArray(g?.windows)||g.windows.length!==20)throw Error("research grid invalid");
 const validDates=new Set([date,new Date(Date.parse(date+"T00:00:00Z")+86400000).toISOString().slice(0,10)]);
 const seen=new Set();
 for(const r of g.windows){
  const key=r.cityId+"/"+r.localDate;
  if(!CITIES.includes(r.cityId)||!validDates.has(r.localDate)||seen.has(key)||
     r.scientificApproval!==false||r.traditionRuleApplied!==false||
     r.indexingAuthorized!==false||
     !Array.isArray(r.windows)||!r.windows.length||r.windows.length>60||
     r.windowCount!==r.windows.length)throw Error("city-day slice invalid");
  seen.add(key);
  for(const w of r.windows){
   if(w.auspiciousRecommendation!==false||w.ritualEligibilityDetermined!==false||
      !["tithi","karana","nakshatra","yoga"].every(x=>typeof w.elements?.[x]?.name==="string"&&w.elements[x].name.length>1)||
      !Number.isFinite(w.durationSeconds)||w.durationSeconds<=0||
      typeof w.startIST!=="string"||typeof w.endIST!=="string")throw Error("unsafe time slice");
  }
 }
 if(seen.size!==20)throw Error("incomplete city/date coverage");
 return g;
}
export async function handleMuhuratWindowConsole(request,env,actor){
 const url=new URL(request.url);
 if(url.pathname!=="/research/muhurat-windows")return null;
 if(!actor)return json({error:"Cloudflare Access required"},403);
 if(request.method!=="GET")return json({error:"GET only"},405);
 const dates=url.searchParams.getAll("date"),cities=url.searchParams.getAll("city"),
       formats=url.searchParams.getAll("format");
 const date=dates[0]||nextIndianDate(),city=cities[0]||"delhi",
       format=formats[0]||"html";
 if([...url.searchParams.keys()].some(x=>!["date","city","format"].includes(x))||
    dates.length>1||cities.length>1||formats.length>1||
    !dayOk(date)||!CITIES.includes(city)||!["json","html"].includes(format))
  return json({error:"Invalid research date or city"},400);
 if(!env?.CANDIDATES)return json({error:"Private R2 unavailable",indexingAuthorized:false},503);
 try{
  const path=prefix+date+"/";
  const list=await env.CANDIDATES.list({prefix:path,limit:100});
  if(list?.truncated)throw Error("truncated R2 listing");
  const objects=(list?.objects||[]).filter(v=>
     v.key.startsWith(path)&&v.key.endsWith(suffix)&&
     /^\d{5,30}$/.test(v.key.slice(path.length,-suffix.length)))
   .sort((a,b)=>{
    const x=BigInt(a.key.slice(path.length,-suffix.length));
    const y=BigInt(b.key.slice(path.length,-suffix.length));
    return x>y?-1:x<y?1:0;
   });
  if(!objects.length)return json({error:"No private research grid for this date",
    date,latestResearchAvailable:false,indexingAuthorized:false},503);
  const object=await env.CANDIDATES.get(objects[0].key);
  if(!object)throw Error("latest R2 grid missing");
  const source=verifyPrivateGrid(JSON.parse(await object.text()),date);
  const selected=source.windows.filter(r=>r.cityId===city);
  if(selected.length!==2)throw Error("city date incomplete");
  const output={status:"UNAPPROVED_RESEARCH",cityId:city,
    archiveObjectKey:objects[0].key,days:selected,
    astronomyModelCertified:false,ritualRuleCertified:false,
    muhuratRecommendationsAuthorized:false,
    approvedClaimsForDeepSeek:[],publicationAuthorized:false,indexingAuthorized:false};
  if(format==="json")return json(output);
  const rows=selected.map(r=>'<section><h2>'+esc(city)+' — '+esc(r.localDate)+
    '</h2><p>Modeled sunrise IST: '+esc(r.modeledSunriseIST)+
    ' · modeled sunset: '+esc(r.modeledSunsetIST)+'</p><table>'+
    '<thead><tr><th>IST interval</th><th>Tithi</th><th>Karana</th><th>Nakshatra</th><th>Yoga</th></tr></thead><tbody>'+
    r.windows.map(w=>'<tr><td>'+esc(w.startIST)+' → '+esc(w.endIST)+'</td>'+
    ["tithi","karana","nakshatra","yoga"].map(k=>'<td>'+esc(w.elements[k].name)+'</td>').join('')+
    '</tr>').join('')+'</tbody></table></section>').join('');
  const form='<form method="get" action="/research/muhurat-windows">'+
    '<label>Research start date <input type="date" name="date" value="'+esc(date)+'"></label> '+
    '<label>City <select name="city">'+CITIES.map(c=>
      '<option value="'+c+'"'+(c===city?' selected':'')+'>'+esc(c)+'</option>').join('')+
    '</select></label> <button type="submit">View intervals</button></form>';
  const body='<!doctype html><html lang="en"><head><meta charset="utf-8">'+
    '<meta name="robots" content="noindex,nofollow,noarchive">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>Private PANCHAVANI · Science Intervals</title>'+
    '<style>body{font:14px system-ui;background:#0d1015;color:#eee;padding:22px}main{max-width:1140px;margin:auto}a{color:#ebc28a}h1,h2{color:#eaca9b}section{padding:20px;border:1px solid #584832;border-radius:10px;margin:22px 0}table{display:block;overflow-x:auto;border-collapse:collapse;width:100%}td,th{padding:11px;border-bottom:1px solid #393b3f;text-align:left;white-space:nowrap}input,select,button{padding:10px;color:#eee;background:#262a30;border:1px solid #785837}.warning{border:1px solid #ab7945;background:#33261d;padding:18px}</style>'+
    '</head><body><main><p><a href="/">← Admin</a></p>'+
    '<h1>Four-limb research intersections · '+esc(city)+'</h1>'+
    '<p class="warning"><strong>RESEARCH ONLY.</strong> Times use unreviewed location and sidereal conventions; neither Wedding nor Vehicle Purchase auspicious windows are determined. The grid cannot authorize DeepSeek factual claims, publication, or indexing.</p>'+
    form+'<p><a href="?date='+esc(date)+'&amp;city='+esc(city)+'&amp;format=json">View source-linked JSON</a></p>'+
    rows+'<p>Archive: '+esc(objects[0].key)+'</p></main></body></html>';
  return new Response(body,{status:200,headers:{"Content-Type":"text/html; charset=utf-8",...HEADER}});
 }catch{
  return json({error:"Private interval source unavailable or failed integrity checks",
    muhuratRecommendationsAuthorized:false,indexingAuthorized:false},503);
 }
}
