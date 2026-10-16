/** Scientific *internal consistency* audit for a private, SHA-matched JPL
 * city/date research candidate. All checks are deterministic and read-only.
 *
 * PASS != independently verified astronomy, accepted Lahiri method, or
 * permission to pass date values as true statements to DeepSeek.
 */
import {candidateIssues} from './runner.mjs';

export const SCIENCE_INTEGRITY_VERSION='jpl-city-day-integrity-v1';
const TITHI_NAMES=[
 'Pratipada','Dvitiya','Tritiya','Chaturthi','Panchami','Shashthi',
 'Saptami','Ashtami','Navami','Dashami','Ekadashi','Dvadashi',
 'Trayodashi','Chaturdashi','Purnima','Pratipada','Dvitiya',
 'Tritiya','Chaturthi','Panchami','Shashthi','Saptami',
 'Ashtami','Navami','Dashami','Ekadashi','Dvadashi',
 'Trayodashi','Chaturdashi','Amavasya'
];
const WEEKDAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const KARANA_CYCLE=['Bava','Balava','Kaulava','Taitila','Gara','Vanija','Vishti'];
const FIXED=new Map([[1,'Kimstughna'],[58,'Shakuni'],[59,'Chatushpada'],[60,'Naga']]);
const tithiName=n=>(n<=15?'Shukla ':'Krishna ')+TITHI_NAMES[n-1];
const karanaName=n=>FIXED.get(n)||KARANA_CYCLE[(n-2)%7];
const tithiIndex=name=>{
 for(let n=1;n<=30;n++)if(tithiName(n)===name)return n;
 return null;
};
const utcMillis=s=>{
 if(typeof s!=='string'||!/^20\d\d-\d\d-\d\dT/.test(s))return NaN;
 return Date.parse(s);
};
const localDateAt=(epochMs,tz)=>{
 const d=new Date(epochMs);
 if(!Number.isFinite(epochMs))return null;
 const f=new Intl.DateTimeFormat('en-GB',{
  timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'
 }).formatToParts(d);
 const p=Object.fromEntries(f.map(x=>[x.type,x.value]));
 return p.year+'-'+p.month+'-'+p.day;
};
function auditLayer(transitions,kind,start,end){
 const x=transitions.filter(v=>v?.type===kind);
 if(!x.length)return {ok:false,rows:[],bounds:[]};
 const n=x.map(i=>({...i,a:utcMillis(i.startUtc),b:utcMillis(i.endUtc)}));
 if(n.some(z=>!Number.isFinite(z.a)||!Number.isFinite(z.b)||z.b<=z.a))
  return {ok:false,rows:n,bounds:[]};
 const aligned=Math.abs(n[0].a-start)<=1000&&Math.abs(n.at(-1).b-end)<=1000&&
  n.every((v,i)=>i===0||Math.abs(v.a-n[i-1].b)<=1000);
 return {ok:aligned,rows:n,bounds:n.slice(0,-1).map(x=>x.b)};
}
function inspect(record,sourceSha){
 const issues=[];
 const check=(id,passed,description)=>{
  checks.push({id,state:passed?'pass':'fail',description});
  if(!passed)issues.push(id);
 };
 const checks=[];
 const id=record?.city?.id,day=record?.localDate;
 const job={city_id:id,local_date:day};
 const structural=candidateIssues(record,job);
 check('source-structure',structural.length===0,
  structural.length?structural.join(', '):'Existing research-only candidate contract satisfied');
 check('source-sha256',typeof sourceSha==='string'&&/^[a-f0-9]{64}$/.test(sourceSha),
  'Candidate is obtained from private D1/R2 and matched to its storage SHA by the caller');
 const sun=record?.sun||{},p=record?.panchangAtSunrise||{},segments=record?.transitions||[];
 const sunrise=utcMillis(sun.sunriseUtc),sunset=utcMillis(sun.sunsetUtc),next=utcMillis(sun.nextSunriseUtc);
 const solar=Number.isFinite(sunrise)&&Number.isFinite(sunset)&&Number.isFinite(next)&&
  sunrise<sunset&&sunset<next&&next-sunrise<32*3600_000;
 check('solar-time-order',solar,'One ordered sunrise → sunset → next sunrise interval');
 let dateFits=false,weekdayFits=false;
 try{
  dateFits=solar&&localDateAt(sunrise,record.city.tz)===day;
  weekdayFits=typeof day==='string'&&p.vara===
    WEEKDAYS[new Date(day+'T12:00:00Z').getUTCDay()];
 }catch{}
 check('local-sunrise-day',dateFits,'Sunrise falls on the requested local calendar date');
 check('weekday-vara',weekdayFits,'Vara matches the weekday of the requested local date');
 const ti=Array.isArray(segments)?auditLayer(segments,'tithi',sunrise,next):{ok:false,rows:[],bounds:[]};
 const ka=Array.isArray(segments)?auditLayer(segments,'karana',sunrise,next):{ok:false,rows:[],bounds:[]};
 check('tithi-continuity',ti.ok,'Tithi intervals cover sunrise-to-next-sunrise without gaps');
 check('karana-continuity',ka.ok,'Karana intervals cover sunrise-to-next-sunrise without gaps');
 const titleNum=tithiIndex(p.tithi);
 const titleMatch=titleNum!==null&&ti.rows.length>0&&ti.rows[0].value===p.tithi&&
  p.paksha===(titleNum<=15?'Shukla':'Krishna');
 check('tithi-paksha-sunrise',titleMatch,'Tithi at sunrise and Paksha agree with first Tithi interval');
 const seq=ti.ok&&ti.rows.every((v,i)=>{
  const n=tithiIndex(v.value);
  if(n===null)return false;
  return i===0||n===tithiIndex(ti.rows[i-1].value)%30+1;
 });
 check('tithi-ordinal-progression',seq,'Every Tithi interval advances one 12-degree ordinal');
 const karanaOrdinals=ka.ok&&titleNum!==null?
  Array.from({length:60},(_,i)=>i+1).filter(n=>
   karanaName(n)===ka.rows[0]?.value&&
   Math.ceil(n/2)===titleNum&&
   ka.rows.every((v,i)=>karanaName((n+i-1)%60+1)===v.value)):[];
 check('karana-ordinal-progression',karanaOrdinals.length===1,
  'Every Karana half-Tithi proceeds through the mathematically allowed 6-degree cycle');
 check('karana-sunrise',ka.rows.length>0&&p.karana===ka.rows[0].value,
  'Karana at local sunrise matches its first interval');
 const tithiKarana=ti.ok&&ka.ok&&ti.bounds.every(v=>
  ka.bounds.some(w=>Math.abs(w-v)<=1000));
 check('tithi-karana-crossings',tithiKarana,
  'Every complete 12-degree Tithi boundary is a 6-degree Karana boundary within one second');
 const siderealAbsent=p.nakshatra===null&&p.yoga===null&&
  record?.methodology?.ayanamsa==='NOT_VALIDATED';
 check('unapproved-sidereal-absent',siderealAbsent,
  'Nakshatra and Yoga are omitted until Lahiri sidereal methodology is independently calibrated');
 return {checks,issues};
}
export function auditResearchCandidate(record,sourceSha){
 if(!record||typeof record!=='object'||Array.isArray(record))
  throw new Error('invalid-research-candidate');
 const out=inspect(record,sourceSha);
 const blockers=[
  'independent ephemeris/convention-matched numerical comparison missing',
  'city coordinates, elevation and sunrise refraction not independently verified',
  'sidereal Lahiri method for Nakshatra and Yoga not independently calibrated',
  'regional festival, vrat and ritual conventions not approved',
  'human review of accuracy, useful copy and original SEO content missing'
 ];
 return {
  schemaVersion:1,auditVersion:SCIENCE_INTEGRITY_VERSION,
  cityId:record.city?.id||null,localDate:record.localDate||null,
  candidateSourceSha256:sourceSha,
  status:out.issues.length?'INTERNAL_CONSISTENCY_FAILURE':'INTERNAL_CONSISTENCY_PASS',
  internalChecksPassed:out.issues.length===0,
  checks:out.checks,issues:out.issues,
  independentScienceVerified:false,
  scientificApproval:false,ritualApproval:false,seoRelease:false,
  approvedFactIds:[],approvedClaimsForDeepSeek:[],
  publicIndexingAuthorized:false,paidEditorialGenerationAuthorized:false,
  externalEvidenceBlockers:blockers
 };
}
