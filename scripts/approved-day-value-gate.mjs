/**
 * A strict, pure prebuild CITY/DAY VALUE contract.
 *
 * Passing means structure and editorial distinctiveness are plausible,
 * NOT independent science, ritual approval, or Google indexability.
 * All inputs must already have separate signed, human-reviewed evidence.
 */
const kinds=['tithi','karana','nakshatra','yoga'];
const names=new Set(['delhi','mumbai','chennai']);
const date=v=>typeof v==='string'&&/^20\d\d-\d\d-\d\d$/.test(v)&&
 !Number.isNaN(Date.parse(v+'T12:00:00Z'))&&
 new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
const instant=v=>typeof v==='string'&&/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(v)&&
 Number.isFinite(Date.parse(v));
const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const substantial=v=>typeof v==='string'&&v.trim().length>=40;
const sourceUrl=v=>typeof v==='string'&&/^https:\/\/[^/\s?#]+\.[^/\s?#]+(?:[/?#][^\s]*)?$/.test(v)&&
 !/(?:example\.com|example\.org|localhost|test\.invalid)/i.test(v);
const knownCities=['delhi','mumbai','chennai'];
const tokens=v=>String(v??'').toLocaleLowerCase('en').replace(
 /\b(delhi|mumbai|chennai)\b/g,'CITY').match(/[\p{L}\p{N}]+/gu)||[];
function shingles(v){
 const words=tokens(v);const out=new Set();
 for(let i=0;i+3<words.length;i++)out.add(words.slice(i,i+4).join(' '));
 return out;
}
export function similarity(a,b){
 const x=shingles(a),y=shingles(b);
 if(!x.size||!y.size)return 0;
 let inter=0;for(const t of x)if(y.has(t))inter++;
 return inter/(x.size+y.size-inter);
}
function localDate(value) {
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',
  year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
 const dict=Object.fromEntries(parts.map(x=>[x.type,x.value]));
 return dict.year+'-'+dict.month+'-'+dict.day;
}
function segmentCheck(record, issues) {
 const start=Date.parse(record.sun?.sunriseUtc),stop=Date.parse(record.sun?.nextSunriseUtc);
 const transitions=record.transitions;
 if(!obj(transitions)){issues.push('missing-four-limb-timeline');return;}
 for(const kind of kinds){
  const items=transitions[kind];
  if(!Array.isArray(items)||!items.length||items.length>8){
   issues.push('missing-'+kind+'-timeline');continue;
  }
  let previous=start;
  for(const [index,item] of items.entries()){
   const a=Date.parse(item?.startUtc),b=Date.parse(item?.endUtc);
   if(!instant(item?.startUtc)||!instant(item?.endUtc)||!Number.isFinite(a)||
      !Number.isFinite(b)||a!==previous||b<=a||b>stop||
      typeof item?.name!=='string'||item.name.trim().length<2){
    issues.push('invalid-'+kind+'-interval');break;
   }
   previous=b;
   if(index===0 && item.name!==record.panchang?.[kind])
    issues.push(kind+'-sunrise-label-mismatch');
  }
  if(previous!==stop)issues.push('incomplete-'+kind+'-timeline');
 }
 // Every 12-degree Tithi crossing must also be a 6-degree Karana crossing.
 if(Array.isArray(transitions.tithi)&&Array.isArray(transitions.karana)){
  const ti=transitions.tithi.slice(0,-1).map(x=>Date.parse(x.endUtc));
  const ka=transitions.karana.slice(0,-1).map(x=>Date.parse(x.endUtc));
  if(ti.some(x=>!ka.some(y=>Math.abs(x-y)<=1000)))
   issues.push('tithi-karana-boundaries-disagree');
 }
}
export function inspectCityDay(record) {
 const issues=[];
 if(!obj(record)||!names.has(record.cityId)||!date(record.date)||
    record.timezone!=='Asia/Kolkata'||record.status!=='approved')
  return ['unapproved-city-day-identity'];
 if(!sha(record.sourceRecordHash)||typeof record.releaseId!=='string'||record.releaseId.length<8)
  issues.push('missing-reviewed-source-identity');
 const sun=record.sun||{},a=Date.parse(sun.sunriseUtc),b=Date.parse(sun.sunsetUtc),
       c=Date.parse(sun.nextSunriseUtc);
 if(!instant(sun.sunriseUtc)||!instant(sun.sunsetUtc)||!instant(sun.nextSunriseUtc)||
    !(a<b&&b<c&&c-a>20*3600000&&c-a<28*3600000))
  issues.push('invalid-local-solar-day');
 else if(localDate(sun.sunriseUtc)!==record.date)
  issues.push('sunrise-not-on-local-date');
 const p=record.panchang;
 if(!obj(p)||['tithi','karana','nakshatra','yoga','paksha','vara']
   .some(k=>typeof p[k]!=='string'||p[k].trim().length<3))
  issues.push('incomplete-six-limb-panchang');
 if(!issues.includes('invalid-local-solar-day'))segmentCheck(record,issues);
 const e=record.editorial||{};
 if(!substantial(e.localMeaning)||!substantial(e.body)||e.body.length<350)
  issues.push('thin-city-day-editorial');
 if(!substantial(e.readerQuestion)||!substantial(e.readerAnswer))
  issues.push('missing-actionable-reader-answer');
 if(!Array.isArray(e.cityEvidence)||e.cityEvidence.length<2||
    e.cityEvidence.some(x=>!obj(x)||x.cityId!==record.cityId||
     typeof x.factId!=='string'||x.factId.length<6||
     !substantial(x.localRelevance)||!sourceUrl(x.sourceUrl))||
    new Set((e.cityEvidence||[]).map(x=>x?.factId)).size<2)
  issues.push('missing-two-grounded-local-facts');
 const approval=record.releaseEvidence||{};
 if(approval.reviewStatus!=='domain-reviewed'||approval.blockerCount!==0||
   typeof approval.geoSource!=='string'||approval.geoSource.length<10||
   !instant(approval.approvedAt)||typeof approval.reviewer!=='string'||approval.reviewer.length<3||
   typeof approval.scientificReviewer!=='string'||approval.scientificReviewer.length<3||
   !Array.isArray(approval.comparisons)||approval.comparisons.length<2||
   !Array.isArray(approval.sourceIds)||approval.sourceIds.length<2||
   e.reviewedBy!==approval.reviewer)
  issues.push('missing-independent-review-evidence');
 return [...new Set(issues)];
}
export function assessFirstRelease(records) {
 if(!Array.isArray(records))throw Error('Expected approved record array');
 const rows=records.map(r=>({cityId:r?.cityId,date:r?.date,issues:inspectCityDay(r)}));
 const identities=new Set();
 for(const row of rows){
  const id=row.cityId+'/'+row.date;
  if(identities.has(id))row.issues.push('duplicate-city-day');
  identities.add(id);
 }
 for(let i=0;i<records.length;i++)for(let j=i+1;j<records.length;j++){
  const x=records[i],y=records[j];
  if(!obj(x?.editorial)||!obj(y?.editorial))continue;
  if(x.cityId===y.cityId)continue;
  const bodyA=[x.editorial.body,x.editorial.localMeaning,x.editorial.readerAnswer].join(' ');
  const bodyB=[y.editorial.body,y.editorial.localMeaning,y.editorial.readerAnswer].join(' ');
  if(similarity(bodyA,bodyB)>=.67) {
   rows[i].issues.push('near-duplicate-after-city-replacement');
   rows[j].issues.push('near-duplicate-after-city-replacement');
  }
  if(x.editorial.readerQuestion===y.editorial.readerQuestion) {
   rows[i].issues.push('identical-reader-question-across-cities');
   rows[j].issues.push('identical-reader-question-across-cities');
  }
  const left=Array.isArray(x.editorial.cityEvidence)?x.editorial.cityEvidence:[];
  const right=Array.isArray(y.editorial.cityEvidence)?y.editorial.cityEvidence:[];
  const common=new Set(left.map(z=>z?.factId));
  if(left.length&&right.length&&right.every(z=>common.has(z?.factId))){
   rows[i].issues.push('identical-local-evidence-across-cities');
   rows[j].issues.push('identical-local-evidence-across-cities');
  }
 }
 // At least one city-specific astronomical difference per SAME date:
 // sunrise time differs by location; never distort shared lunar crossing times.
 for(let i=0;i<records.length;i++)for(let j=i+1;j<records.length;j++){
  if(records[i]?.date===records[j]?.date&&records[i]?.cityId!==records[j]?.cityId&&
     records[i]?.sun?.sunriseUtc===records[j]?.sun?.sunriseUtc) {
    rows[i].issues.push('identical-cross-city-sunrise');
    rows[j].issues.push('identical-cross-city-sunrise');
  }
 }
 for(const row of rows)row.issues=[...new Set(row.issues)];
 return {recordCount:records.length,readyForHumanReleaseReview:
   records.length>0&&rows.every(x=>x.issues.length===0),rows,
   scientificApprovalGranted:false,automaticIndexingAuthorized:false};
}
