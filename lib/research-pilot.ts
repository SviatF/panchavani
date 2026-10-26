/** Safe build-time research preview: separate from APPROVED publication manifests. */
import payload from '@/data/research-panchang-pilot.json';

export type ResearchTransition={
 number:number;name:string;startUtc:string;endUtc:string
};
export type ResearchPilotDay={
 cityId:'delhi';cityName:'Delhi';date:string;
 status:'UNAPPROVED_PUBLIC_RESEARCH_PILOT';
 titleAngle:string;editorialParagraphs:[string,string,string];
 researchSourceRecordSha256:string;sourceKernelSha256:string;
 solarModel:string;siderealModel:string;
 cityReference:{
  latitude:number;longitude:number;estimatedElevationMeters:number;
  coordinatesVerified:false;elevationVerified:false;horizonConventionValidated:false
 };
 sun:{sunriseUtc:string;sunsetUtc:string;nextSunriseUtc:string};
 panchang:Record<'tithi'|'karana'|'nakshatra'|'yoga'|'vara'|'paksha',string>;
 transitions:Record<'tithi'|'karana'|'nakshatra'|'yoga',ResearchTransition[]>;
 verifiedByIndependentScientist:false;recommendedForRitualDecisions:false;
 modelNarrativeGenerated:false;humanEditorialApproved:false;indexingAuthorized:false
};
const SHA=/^[a-f0-9]{64}$/;
const UTC=/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/;
const components=['tithi','karana','nakshatra','yoga'] as const;
const ordered=['2026-10-27','2026-10-28','2026-10-29','2026-10-30',
 '2026-10-31','2026-11-01','2026-11-02'];
function object(x:unknown):x is Record<string,unknown>{
 return x!==null&&typeof x==='object'&&!Array.isArray(x);
}
function check(raw:unknown):ResearchPilotDay[]{
 if(!object(raw)||raw.artifactType!=='PANCHAVANI_7DAY_NO_INDEX_PUBLIC_RESEARCH_PREVIEW'||
  raw.schemaVersion!==1||raw.status!=='UNAPPROVED_PUBLIC_RESEARCH_PILOT'||
  raw.cityId!=='delhi'||raw.scopeStart!==ordered[0]||raw.scopeEnd!==ordered[6]||
  raw.sourceApproval!==false||raw.humanEditorialApproved!==false||
  raw.deepSeekInvocationAuthorized!==false||raw.publicationAsVerifiedPanchangAuthorized!==false||
  raw.searchIndexingAuthorized!==false||!Array.isArray(raw.days)||raw.days.length>7)
  throw Error('Invalid research pilot identity: no public science release is permitted');
 if(!raw.days.length){
  if(raw.visibleThrough!==null)return [];
  return [];
 }
 if(!SHA.test(String(raw.sourceKernelSha256)))throw Error('Unpinned research ephemeris');
 const rows:ResearchPilotDay[]=[];
 const titles=new Set<string>();
 for(let i=0;i<raw.days.length;i++){
  const d=raw.days[i];
  if(!object(d)||d.cityId!=='delhi'||d.cityName!=='Delhi'||
     d.date!==ordered[i]||d.status!=='UNAPPROVED_PUBLIC_RESEARCH_PILOT'||
     d.verifiedByIndependentScientist!==false||
     d.recommendedForRitualDecisions!==false||
     d.modelNarrativeGenerated!==false||
     d.humanEditorialApproved!==false||d.indexingAuthorized!==false||
     !SHA.test(String(d.researchSourceRecordSha256))||
     d.sourceKernelSha256!==raw.sourceKernelSha256||
     typeof d.titleAngle!=='string'||d.titleAngle.length<18||titles.has(d.titleAngle)||
     !Array.isArray(d.editorialParagraphs)||d.editorialParagraphs.length!==3||
     d.editorialParagraphs.some((x:unknown)=>typeof x!=='string'||x.length<105)||
     !object(d.cityReference)||d.cityReference.coordinatesVerified!==false||
     d.cityReference.elevationVerified!==false||
     d.cityReference.horizonConventionValidated!==false||
     !object(d.sun)||!object(d.panchang)||!object(d.transitions))
     throw Error('Research preview day fails scientific and editorial safety rules');
  titles.add(d.titleAngle);
  const panchang=d.panchang as Record<string,unknown>;
  const sun=d.sun as Record<string,unknown>;
  const transitions=d.transitions as Record<string,unknown>;
  if(!components.every(k=>typeof panchang[k]==='string'&&(panchang[k] as string).length>2))
   throw Error('Missing Panchang research limbs');
  if(![sun.sunriseUtc,sun.sunsetUtc,sun.nextSunriseUtc].every(x=>typeof x==='string'&&UTC.test(x)))
   throw Error('Malformed research sunrise');
  const sunrise=Date.parse(sun.sunriseUtc as string);
  const sunset=Date.parse(sun.sunsetUtc as string);
  const next=Date.parse(sun.nextSunriseUtc as string);
  if(!(sunrise<sunset&&sunset<next))throw Error('Bad research solar day');
  if(i&&Date.parse(rows[i-1].sun.nextSunriseUtc)!==sunrise)
   throw Error('Research preview sunrises are not continuous');
  for(const k of components){
   const events=transitions[k];
   if(!Array.isArray(events)||!events.length)throw Error('Incomplete '+k+' timeline');
   let cursor=sunrise;
   for(const event of events){
    if(!object(event)||typeof event.name!=='string'||!UTC.test(event.startUtc as string)||
     !UTC.test(event.endUtc as string)||Date.parse(event.startUtc as string)!==cursor||
     Date.parse(event.endUtc as string)<=cursor||
     Date.parse(event.endUtc as string)>next)throw Error('Invalid '+k+' research interval');
    cursor=Date.parse(event.endUtc as string);
   }
   if(cursor!==next||events[0].name!==panchang[k])
    throw Error('Inconsistent '+k+' sunrise component');
  }
  rows.push(d as unknown as ResearchPilotDay);
 }
 if(raw.visibleThrough!==rows.at(-1)?.date)
  throw Error('Preview dates extend beyond the selected daily release date');
 return rows;
}
// Only days whose India-local publication day has arrived may be visible
// in a static export. The full seven-day research source is versioned in git,
// but individual HTML URLs appear only after a scheduled daily rebuild.
function indiaCivilDate(){
 const parts=new Intl.DateTimeFormat('en-GB',{
  timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'
 }).formatToParts(new Date());
 const obj=Object.fromEntries(parts.map(x=>[x.type,x.value]));
 return obj.year+'-'+obj.month+'-'+obj.day;
}
function publicCutoff(){
 const today=indiaCivilDate();
 const test=process.env.PANCHAVANI_PILOT_TEST_BUILD_DATE;
 // A PR may validate tomorrow's HTML without releasing it in production.
 // A main/scheduled production deploy ignores this override entirely.
 if(process.env.GITHUB_EVENT_NAME==='pull_request'&&
    typeof test==='string'&&/^20\d\d-\d\d-\d\d$/.test(test))
  return test;
 return today;
}
let cached:ResearchPilotDay[]|undefined;
export function publicResearchPilotDays(){
 return cached??(cached=check(payload).filter(d=>d.date<=publicCutoff()));
}
export function researchPilotDay(city:string,date:string){
 return publicResearchPilotDays().find(d=>d.cityId===city&&d.date===date);
}
export const IST=(iso:string)=>new Intl.DateTimeFormat('en-IN',{
 timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hour12:false
}).format(new Date(iso))+' IST';
