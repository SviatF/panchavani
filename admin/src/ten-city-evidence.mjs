/** Access-only research snapshot reader: future site content work starts from
 * ACTUAL JPL science, never from a DeepSeek-invented numerical event.
 * Reads ONLY immutable 'ops/' snapshots inside the private INBOX R2 bucket.
 */
const PREFIX='ops/ten-city-six-limb/v1/';
const CITIES=Object.freeze(['delhi','mumbai','kolkata','chennai','bengaluru',
 'hyderabad','ahmedabad','pune','jaipur','varanasi']);
const C_SET=new Set(CITIES);
const HEADERS={
 'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':'private, no-store, max-age=0',
 'X-Robots-Tag':'noindex, nofollow, noarchive',
 'X-Content-Type-Options':'nosniff',
 'X-Frame-Options':'DENY',
 'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
};
const json=(obj,status=200)=>new Response(JSON.stringify(obj,null,2)+'\n',{status,headers:HEADERS});
const fail=(code,status=503)=>json({error:code,scientificApproval:false,
 publishingAuthorized:false,indexingAuthorized:false,approvedClaimsForDeepSeek:[]},status);
const isoDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 !Number.isNaN(Date.parse(s+'T00:00:00Z'))&&
 new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
function tomorrowIndia(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{
  timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'
 }).formatToParts(now);
 const get=type=>parts.find(x=>x.type===type)?.value||'';
 const day=get('year')+'-'+get('month')+'-'+get('day');
 if(!isoDate(day))throw Error('unparseable-IST-day');
 return new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString().slice(0,10);
}
async function sha256(value){
 const data=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return [...new Uint8Array(data)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
/** @returns {Array<{cityId:string,localDate:string,...}>} no approval */
export function summarizeSnapshot(science,index,day,hash){
 if(science?.artifactType!=='PANCHAVANI_TEN_CITY_SIX_LIMB_RESEARCH_BATCH'||
    science?.status!=='UNAPPROVED_RESEARCH'||
    science?.cityCount!==10||
    science?.scienceChecks?.checkedFourLimbDawnContinuities!==40||
    science?.scienceChecks?.checkedCityDays!==20||
    science?.publicationAuthorized!==false||
    science?.scientificApproval!==false||
    science?.indexingAuthorized!==false||
    !Array.isArray(science?.approvedClaimsForDeepSeek)||
    science.approvedClaimsForDeepSeek.length||
    index?.artifactType!=='PANCHAVANI_ROLLING_CITY_DAY_RESEARCH_PREVIEWS'||
    index?.status!=='UNAPPROVED_RESEARCH'||
    index?.cityCount!==10||index?.cityDays!==20||
    index?.fourLimbDawnChecks!==40||
    index?.scientificApproval!==false||
    index?.publicationAuthorized!==false||
    index?.indexingAuthorized!==false||
    index?.modelInvocationAuthorized!==false||
    index?.jplResearchBatchSha256!==hash||
    index?.approvedClaimsForDeepSeek?.length!==0||
    !Array.isArray(science.records)||science.records.length!==20)
  throw Error('Untrusted 10-city science and editorial source bundle');
 const first=day;
 const after=new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString().slice(0,10);
 const expected=new Set(CITIES.flatMap(city=>[city+'/'+first,city+'/'+after]));
 const observed=new Set();
 const rows=[];
 for(const record of science.records){
  const key=record.cityId+'/'+record.localDate;
  if(!expected.has(key)||observed.has(key)||
     record.artifactType!=='PANCHAVANI_SIX_LIMB_RESEARCH_PACKET'||
     record.status!=='UNAPPROVED_RESEARCH'||
     record.scientificApproval!==false||
     record.publicReleaseAllowed!==false||
     record.indexingAuthorized!==false||
     record.paidGenerationAuthorized!==false||
     !Array.isArray(record.approvedClaimsForDeepSeek)||
     record.approvedClaimsForDeepSeek.length!==0||
     record.cityReference?.coordinatesVerified!==false||
     record.methodology?.siderealMethodIndependentlyCalibrated!==false||
     record.timezone!=='Asia/Kolkata'||
     !record.sun?.sunriseUtc||!record.sun?.nextSunriseUtc||
     !record.panchangAtSunrise||!record.transitions||
     !['tithi','karana','nakshatra','yoga'].every(k=>
        Array.isArray(record.transitions[k])&&record.transitions[k].length>=1))
   throw Error('Unexpected city/day, false approval, or incomplete astronomical evidence');
  observed.add(key);
  rows.push({
    cityId:record.cityId,localDate:record.localDate,
    observerPoint:record.cityReference,
    sunriseUtc:record.sun.sunriseUtc,
    sunsetUtc:record.sun.sunsetUtc,
    followingSunriseUtc:record.sun.nextSunriseUtc,
    panchangAtModeledSunrise:record.panchangAtSunrise,
    completeAstronomicalTimelines:record.transitions,
    sourceCandidateSha256:record.recomputedJplCandidateCanonicalSha256,
    calculatedUsing:record.methodology.provisionalSiderealModel,
    methodologicalIndependentApproval:false,
    muhuratOrFestivalEligibilityCalculated:false,
    reviewedFactsForDeepSeek:[],
  });
 }
 if(observed.size!==20)throw Error('missing-ten-city-science');
 if(index.records?.length!==20||
    new Set(index.records.map(x=>x.cityId+'/'+x.localDate)).size!==20||
    index.records.some(x=>!observed.has(x.cityId+'/'+x.localDate)))
  throw Error('Mismatched previews and JPL facts');
 rows.sort((a,b)=>a.localDate.localeCompare(b.localDate)||a.cityId.localeCompare(b.cityId));
 return rows;
}
export async function handleTenCityEvidence(request,env,actor){
 const url=new URL(request.url);
 if(url.pathname!=='/research/daily/ten-city')return null;
 if(!actor)return fail('access-denied',403);
 if(request.method!=='GET')return fail('read-only-get',405);
 // Browser and link-app tracking parameters are irrelevant to the fixed
 // science source scope; only an explicit date can select a snapshot.
 if(url.searchParams.getAll('date').length>1)
  return fail('invalid-query',400);
 const day=url.searchParams.get('date')||tomorrowIndia();
 if(!isoDate(day)||day<'2026-01-01'||day>'2099-12-30')
  return fail('invalid-IST-date',400);
 if(!env?.INGEST_INBOX)return fail('private-research-inbox-unavailable');
 try{
  const prefix=PREFIX+day+'/';
  const listing=await env.INGEST_INBOX.list({prefix,limit:1000});
  if(listing.truncated)return fail('source-list-truncated');
  const suffix='/science-UNAPPROVED.json';
  const eligible=(listing.objects||[]).map(x=>x.key).filter(k=>{
    if(!k.startsWith(prefix))return false;
    const rest=k.slice(prefix.length);
    return /^[0-9]{9,16}\/science-UNAPPROVED\.json$/.test(rest);
  });
  if(!eligible.length)return fail('ten-city-source-not-yet-archived');
  eligible.sort((a,b)=>BigInt(a.slice(prefix.length).split('/')[0])<
    BigInt(b.slice(prefix.length).split('/')[0])?-1:1);
  const key=eligible.at(-1);
  const preview=key.replace(suffix,'/preview-index-UNAPPROVED.json');
  const [scienceObject,previewObject]=await Promise.all([
    env.INGEST_INBOX.get(key),env.INGEST_INBOX.get(preview)
  ]);
  if(!scienceObject||!previewObject)return fail('incomplete-R2-snapshot-pair');
  const [raw,previewRaw]=await Promise.all([scienceObject.text(),previewObject.text()]);
  if(raw.length>1500000||previewRaw.length>300000)return fail('private-snapshot-size-exceeded');
  const hash=await sha256(raw);
  const science=JSON.parse(raw),index=JSON.parse(previewRaw);
  const rows=summarizeSnapshot(science,index,day,hash);
  return json({
   artifactType:'PANCHAVANI_TEN_CITY_PRIVATE_DAILY_SCIENCE_VIEW',
   status:'UNAPPROVED_RESEARCH',
   localDateFrom:day,localDateThrough:index.dateThrough,
   cityCount:10,cityDayCount:20,
   sourceFileSha256:hash,
   evidenceSourceKey:key,
   cityDayRecords:rows,
   scientificApproval:false,
   publishedPublicCalendarPages:0,
   publicReleaseAuthorized:false,
   indexingAuthorized:false,
   approvedClaimsForDeepSeek:[],
   nextAction:'Human science reviewer must approve observing points, matched Lahiri and rules, and explicitly sign facts before public publication or any AI fact allowlist.'
  });
 }catch{
  return fail('invalid-private-ten-city-source-or-cryptographic-integrity');
 }
}
