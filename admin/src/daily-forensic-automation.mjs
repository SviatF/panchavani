/** Cloudflare Cron: private daily three-city SHA forensic snapshot.
 * Automated evidence collection, NOT automated arbitration, publication, or AI.
 * One terminal R2 snapshot per UTC day; no candidate or D1 writes.
 */
import {inspectConflictCase} from './conflict-forensics.mjs';
import {aggregatePilotConflicts} from './pilot-conflict-audit.mjs';

export const SNAPSHOT_PREFIX='ops/private-sha-audits/v1/';
const CITIES=Object.freeze(['delhi','mumbai','chennai']);
const FAIL_SAFE={scientificApproval:false,releaseAuthorized:false,
 indexingAuthorized:false,approvedClaimsForDeepSeek:[],sourceConflictResolved:false};
const HEADERS={
 'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':'private, no-store, max-age=0',
 'X-Robots-Tag':'noindex, nofollow, noarchive',
 'X-Content-Type-Options':'nosniff'
};
const serialize=r=>JSON.stringify(r,null,2)+'\n';
function utcDay(time){
 const v=new Date(time);
 if(!Number.isFinite(v.valueOf()))throw Error('invalid-cron-time');
 return v.toISOString().slice(0,10);
}
export function snapshotKey(utcTime){
 return SNAPSHOT_PREFIX+utcDay(utcTime)+'.json';
}
export function validateSnapshot(snapshot,day){
 if(snapshot?.artifactType!=='PANCHAVANI_DAILY_PRIVATE_SOURCE_TRIAGE'||
    snapshot?.schemaVersion!==1||snapshot.utcDate!==day||
    !['RESEARCH_EVIDENCE_CAPTURED','BLOCKED_MISSING_OR_UNTRUSTED_SOURCE'].includes(snapshot.status)||
    snapshot?.scientificApproval!==false||
    snapshot?.releaseAuthorized!==false||snapshot?.indexingAuthorized!==false||
    snapshot?.sourceConflictResolved!==false||
    !Array.isArray(snapshot.approvedClaimsForDeepSeek)||
    snapshot.approvedClaimsForDeepSeek.length)throw Error('invalid-private-archive');
 if(snapshot.status==='RESEARCH_EVIDENCE_CAPTURED'){
  if(snapshot?.report?.artifactType!=='PANCHAVANI_PRIVATE_THREE_CITY_SHA_CONFLICT_AUDIT'||
     snapshot.report.realProductionD1ReadForAllCities!==true||
     snapshot.report.scientificApproval!==false||
     snapshot.report.indexingAuthorized!==false||
     snapshot.report.historicalConflictsScientificallyResolved!==false||
     snapshot.report.caseCount!==3)throw Error('invalid-archived-case-report');
 }else if(snapshot.report!==null||snapshot.errorCode!=='PRIVATE_SOURCE_VALIDATION_INCOMPLETE'){
  throw Error('untrusted-status-content');
 }
 return snapshot;
}
function blocked(day){
 return {
  artifactType:'PANCHAVANI_DAILY_PRIVATE_SOURCE_TRIAGE',schemaVersion:1,
  utcDate:day,status:'BLOCKED_MISSING_OR_UNTRUSTED_SOURCE',
  ...FAIL_SAFE,report:null,
  errorCode:'PRIVATE_SOURCE_VALIDATION_INCOMPLETE',
  note:'No all-clear: a private D1/R2 source or SHA manifest was missing, incomplete, or invalid. The next daily cycle retries.'
 };
}
async function capture(env,day){
 const cases=[];
 for(const city of CITIES){
  const {report}=await inspectConflictCase(env,city,'2026-10-16');
  cases.push(report);
 }
 return {
  artifactType:'PANCHAVANI_DAILY_PRIVATE_SOURCE_TRIAGE',schemaVersion:1,
  utcDate:day,status:'RESEARCH_EVIDENCE_CAPTURED',...FAIL_SAFE,
  report:aggregatePilotConflicts(cases),
  note:'Read-only private D1/R2 source comparison. Actual scientific signoff is still required.'
 };
}
export async function runDailyForensics(env,when){
 if(env?.AUTO_PRIVATE_FORENSICS_ENABLED!=='true')
  return {status:'disabled',indexingAuthorized:false};
 const stamp=new Date(when);
 if(!Number.isFinite(stamp.valueOf()))throw Error('bad-cron-time');
 // Hourly trigger already serves ingestion. Do a forensic sweep at most once
 // per UTC day from 03:00 UTC onward, after expected overnight imports.
 if(stamp.getUTCHours()<3)
  return {status:'before-audit-window',indexingAuthorized:false};
 if(!env?.DB||!env?.CANDIDATES||!env?.INGEST_INBOX)
  return {status:'missing-private-binding',indexingAuthorized:false};
 const day=utcDay(stamp),key=snapshotKey(stamp);
 const old=await env.CANDIDATES.get(key);
 if(old){
  const previous=validateSnapshot(JSON.parse(await old.text()),day);
  return {status:'already-archived',utcDate:day,
   archivedStatus:previous.status,indexingAuthorized:false};
 }
 let evidence;
 try{evidence=await capture(env,day)}
 catch{evidence=blocked(day)}
 validateSnapshot(evidence,day);
 // R2 contains only private forensics, never public releases or data candidate
 // overrides. A Cloudflare retried Cron may repeat an identical snapshot.
 await env.CANDIDATES.put(key,serialize(evidence),{
   httpMetadata:{contentType:'application/json'},
   customMetadata:{status:evidence.status,policy:'read-only-science-triage'}
 });
 return {
  status:evidence.status,utcDate:day,
  unresolvedCityCount:evidence.report?.unresolvedCityCount??null,
  indexingAuthorized:false
 };
}
function json(data,status=200){
 return new Response(serialize(data),{status,headers:HEADERS});
}
export async function handleDailyForensicStatus(request,env,actor){
 const url=new URL(request.url);
 if(url.pathname!=='/research/conflicts/automation')return null;
 if(!actor)return json({error:'access-denied',...FAIL_SAFE},403);
 if(request.method!=='GET')return json({error:'read-only-get',...FAIL_SAFE},405);
 if([...url.searchParams.keys()].some(k=>k!=='date')||
     [...url.searchParams.getAll('date')].length>1)
  return json({error:'unsupported-query',...FAIL_SAFE},400);
 const day=url.searchParams.get('date')||utcDay(Date.now());
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||
    !Number.isFinite(Date.parse(day+'T00:00:00Z'))||
    new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day)
  return json({error:'invalid-date',...FAIL_SAFE},400);
 if(!env?.CANDIDATES)return json({error:'private-storage-missing',...FAIL_SAFE},503);
 try{
  const object=await env.CANDIDATES.get(SNAPSHOT_PREFIX+day+'.json');
  if(!object)return json({error:'daily-snapshot-not-created',
   date:day,...FAIL_SAFE},503);
  const report=validateSnapshot(JSON.parse(await object.text()),day);
  return json(report,report.status==='RESEARCH_EVIDENCE_CAPTURED'?200:503);
 }catch{
  return json({error:'private-snapshot-integrity-check-failed',...FAIL_SAFE},503);
 }
}
