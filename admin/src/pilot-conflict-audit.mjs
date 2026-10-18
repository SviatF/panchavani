/** Three-city, ONE Access-only GET, immutable per-case SHA evidence. NEVER a decision.
 * Fail closed if any private D1/R2 source is missing or corrupt; no partial
 * 'conflicts resolved' status and no calls to the public Worker.
 */
import {inspectConflictCase} from './conflict-forensics.mjs';

const CITIES=Object.freeze(['delhi','mumbai','chennai']);
const DATE='2026-10-16';
const headers={
 'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':'private, no-store, max-age=0',
 'X-Robots-Tag':'noindex, nofollow, noarchive',
 'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
 'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
};
const json=(body,status=200)=>new Response(JSON.stringify(body,null,2)+'\n',
 {status,headers});
export function aggregatePilotConflicts(cases){
 if(!Array.isArray(cases)||cases.length!==3||
    !CITIES.every(c=>cases.some(r=>r.cityId===c))||
    new Set(cases.map(x=>x.cityId)).size!==3)
  throw Error('missing-or-duplicate-pilot-city-case');
 if(cases.some(x=>x.artifactType!=='PANCHAVANI_PRIVATE_SHA_CONFLICT_TRIAGE'||
    x.localDate!==DATE||x.livePrivateD1WasActuallyRead!==true||
    x.publicReleaseAllowed!==false||x.indexingAuthorized!==false||
    x.shaConflictResolved!==false||
    !Array.isArray(x.variants)))
  throw Error('invalid-or-unavailable-private-source');
 const unresolved=[];
 for(const item of cases){
   const variants=item.variants;
   const changed=variants.filter(v=>v.disposition!=='IDENTICAL_SHA'&&
                                    v.disposition!=='DUPLICATE_INCOMING_SHA');
   // Also flag no original manifest copy found: lack of evidence is
   // NOT a scientifically resolved or approved source.
   if(!variants.length||changed.length)
     unresolved.push({
       cityId:item.cityId,storedSha256:item.storedSha256,
       unresolvedVariantCount:changed.length,
       observedDistinctVariants:new Set(variants.map(v=>v.incomingSha256)).size,
       hasNoSourceVariants:variants.length===0,
       changedResearchFields:[...new Set(changed.flatMap(v=>v.changedResearchFields||[]))].sort(),
       byteOnlyOrUnexplained:changed.some(v=>v.disposition==='DIFFERENT_BYTES_FIELDS_NOT_YET_EXPLAINED')
     });
 }
 return {
   artifactType:'PANCHAVANI_PRIVATE_THREE_CITY_SHA_CONFLICT_AUDIT',
   schemaVersion:1,status:'UNAPPROVED_RESEARCH',
   localDate:DATE,cityCount:3,caseCount:cases.length,
   pilotCities:[...CITIES],
   unresolvedCityCount:unresolved.length,
   unresolved,
   cases,
   realProductionD1ReadForAllCities:true,
   reviewedByScientificExpert:null,
   historicalConflictsScientificallyResolved:false,
   safeAutomaticSourceWinnerSelection:false,
   originalSourcesReplaced:false,
   scientificApproval:false,
   approvedClaimsForDeepSeek:[],
   releaseAuthorized:false,indexingAuthorized:false,
   nextAction:'External scientific reviewer must inspect all original versioned sources and explicitly sign each disposition; nothing was written.'
 };
}
export async function handlePilotConflictAudit(request,env,actor){
 const url=new URL(request.url);
 if(url.pathname!=='/research/conflicts/pilot')return null;
 if(!actor)return json({error:'access-denied'},403);
 if(request.method!=='GET')return json({error:'only-read-only-get'},405);
 // One fixed archival case: GET without search params is the canonical URL.
 // Query parameters are optional. Fail closed on any other city/day/filter
 // and on duplicate keys; never allow selector injection into D1 or R2.
 const dateValues=url.searchParams.getAll('date');
 const formatValues=url.searchParams.getAll('format');
 if(dateValues.length>1||formatValues.length>1||
    (dateValues.length===1&&dateValues[0]!==DATE)||
    (formatValues.length===1&&formatValues[0]!=='json')||
    [...url.searchParams.keys()].some(k=>k!=='date'&&k!=='format'))
  return json({error:'unsupported-pilot-audit-query',
    expectedPath:'/research/conflicts/pilot',
    supportedHistoricalDate:DATE,
    hint:'Open the clean path without query parameters. This always audits Delhi, Mumbai and Chennai for the original historical date.',
    indexingAuthorized:false},400);
 if(!env?.DB||!env?.CANDIDATES||!env?.INGEST_INBOX)
  return json({error:'private-stores-not-configured'},503);
 // Access-only: provide a minimal per-city blocker for useful real
 // production troubleshooting; do not expose stored hashes or D1/R2 bytes
 // when any source is missing or malformed.
 const cases=[];
 for(const city of CITIES){
  try{
   const {report}=await inspectConflictCase(env,city,DATE);
   if(report.livePrivateD1WasActuallyRead!==true){
    return json({
      error:'private-source-incomplete',
      blockedCityId:city,
      reason:'HISTORICAL_D1_CANDIDATE_NOT_AVAILABLE',
      status:'INCOMPLETE_PRIVATE_FORENSICS',
      unresolved:true,publicationAuthorized:false,indexingAuthorized:false
    },503);
   }
   cases.push(report);
  }catch{
   return json({
      error:'private-source-validation-failed',
      blockedCityId:city,
      reason:'D1_R2_OR_MANIFEST_VALIDATION_FAILED',
      status:'INCOMPLETE_PRIVATE_FORENSICS',
      unresolved:true,publicationAuthorized:false,indexingAuthorized:false
   },503);
  }
 }
 try{return json(aggregatePilotConflicts(cases))}
 catch{return json({
   error:'private-three-city-integrity-check-failed',
   status:'INCOMPLETE_PRIVATE_FORENSICS',
   unresolved:true,publicationAuthorized:false,indexingAuthorized:false
 },503)}
}
