/** Research-only daily SEO input planner.
 * Consumes one SHA-verified private JPL candidate. The generated text is NOT
 * an approved fact or a public article. Zero LLM calls, billing or mutation.
 */
import {CITY_META} from './city-catalog.mjs';

export const DAILY_BRIEF_VERSION='research-daily-intent-v1';
const zone='Asia/Kolkata';
const formats=Object.freeze({
 clock:new Intl.DateTimeFormat('en-IN',{timeZone:zone,hour:'2-digit',minute:'2-digit',hour12:false}),
 date:new Intl.DateTimeFormat('en-IN',{timeZone:zone,day:'2-digit',month:'short'})
});
const validDate=s=>typeof s==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(s)&&
 !Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
function clock(iso){
 const ms=Date.parse(iso);
 if(!Number.isFinite(ms))throw new Error('invalid-candidate-time');
 return formats.clock.format(new Date(ms))+' IST';
}
function dateTime(iso,localDate){
 const date=new Date(Date.parse(iso));
 const here=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
 const stamp=clock(iso);
 return here===localDate?stamp:formats.date.format(date)+' · '+stamp;
}
const stamp=(type,value,path,extra={})=>({type,value,sourcePath:path,
 evidence:'JPL_RESEARCH_UNAPPROVED',...extra});
const differentTime=(a,b)=>Date.parse(a)-Date.parse(b);
function transitions(record,type){
 const items=(record.transitions||[]).filter(x=>x.type===type);
 const end=Date.parse(record.sun.nextSunriseUtc);
 return items.slice(0,-1).filter(x=>Date.parse(x.endUtc)<end-1000).map(x=>{
  const boundary=x.endUtc,at=Date.parse(boundary);
  const next=items.find(y=>Math.abs(Date.parse(y.startUtc)-at)<=1000 && y!==x);
  return {layer:type,from:x.value,to:next?.value||null,
   atUtc:boundary,atIST:dateTime(boundary,record.localDate),
   daylight:at>=Date.parse(record.sun.sunriseUtc)&&at<Date.parse(record.sun.sunsetUtc),
   sourcePath:'transitions'};
 });
}
export function buildDailyResearchBrief(record,sourceSha){
 const id=record?.city?.id,date=record?.localDate;
 const city=CITY_META.get(id);
 if(!city||!validDate(date)||!(/^[a-f0-9]{64}$/).test(sourceSha||'')||
  record.status!=='calculated'||record.approvedBy!==null||
  record.releaseId!==null||record.validation?.reviewStatus!=='not-reviewed'||
  record.validation?.blockerCount<1||
  record.methodology?.ayanamsa!=='NOT_VALIDATED'||
  record.methodology?.rulePackId!=='NONE'||
  record.panchangAtSunrise?.nakshatra!==null||
  record.panchangAtSunrise?.yoga!==null)throw new Error('unapproved-source-contract-required');
 const sun=record.sun||{},p=record.panchangAtSunrise||{};
 if(!sun.sunriseUtc||!sun.sunsetUtc||!sun.nextSunriseUtc||
    !(differentTime(sun.sunriseUtc,sun.sunsetUtc)<0&&
      differentTime(sun.sunsetUtc,sun.nextSunriseUtc)<0))
  throw new Error('invalid-sunrise-intervals');
 if(typeof p.tithi!=='string'||!p.tithi||typeof p.karana!=='string'||!p.karana)
  throw new Error('missing-research-lunar-fields');
 const tithiEvents=transitions(record,'tithi');
 const karanaEvents=transitions(record,'karana');
 const focus=tithiEvents.length?
   'Tithi transition before the next '+city.name+' sunrise':
   'Tithi at local sunrise and its next transition';
 const facts=[
  stamp('sunrise',clock(sun.sunriseUtc),'sun.sunriseUtc',{atUtc:sun.sunriseUtc}),
  stamp('sunset',clock(sun.sunsetUtc),'sun.sunsetUtc',{atUtc:sun.sunsetUtc}),
  stamp('tithiAtSunrise',p.tithi,'panchangAtSunrise.tithi'),
  stamp('karanaAtSunrise',p.karana,'panchangAtSunrise.karana'),
  stamp('vara',p.vara||null,'panchangAtSunrise.vara'),
  stamp('paksha',p.paksha||null,'panchangAtSunrise.paksha')
 ];
 const evidence={
  state:'UNAPPROVED_JPL_RESEARCH',sourceSha256:sourceSha,
  ephemerisHash:record.methodology.ephemerisHash,
  scientificReviewComplete:false,ritualRuleReviewComplete:false,
  approvedForAITruthClaims:false,
  modelCalls:0,publicationAuthorized:false,indexingAuthorized:false
 };
 const questions=[
  `What Tithi and Karana does the provisional ${city.name} calculation show at sunrise on ${date}?`,
  tithiEvents.length?
   `When does Tithi change between ${city.name} sunrise and the following sunrise?`:
   `Does Tithi remain the same until the following sunrise in ${city.name}?`,
  karanaEvents.length?
   `Which Karana transition is shown on ${date} for ${city.name}?`:
   `Which Karana is listed at sunrise in ${city.name}?`
 ];
 return {
  schemaVersion:1,version:DAILY_BRIEF_VERSION,
  location:{id,name:city.name,timeZone:zone,localDate:date},
  searchIntent:`${city.name} Panchang ${date}`,
  suggestedCanonical:`/panchang/${id}/${date}/`,
  researchHeadline:`${city.name} Panchang — ${date}: Tithi and Sunrise Research`,
  dailyDifferenceFocus:focus,
  evidence,
  privateCandidateFacts:facts,
  transitions:{tithi:tithiEvents,karana:karanaEvents},
  readerQuestions:questions,
  suggestedStructure:[
   'Key Tithi, Karana and sunrise values in a compact table',
   tithiEvents.length?'What changes between this sunrise and the next?':'How to read the Tithi that appears at sunrise',
   'What the local date and time convention means',
   'Concise FAQ answering the day-specific reader questions'
  ],
  uncalculated:['Nakshatra','Yoga'],
  missingEvidence:[
   'independent sunrise and phase-transition verification',
   'verified local coordinates and calculation conventions',
   'approved sidereal/Nakshatra/Yoga methodology',
   'regional and festival observance rules',
   'human editorial and SEO release'
  ],
  safeModelInputs:{approvedClaims:[],allowedFactsForPublication:[],
   candidateIdentity:{cityId:id,localDate:date,sha256:sourceSha},
   previewOnly:true,paidGenerationAllowed:false},
  // No generated SEO copy from these provisional facts may be indexed.
  publicationAuthorized:false,indexingAuthorized:false
 };
}
