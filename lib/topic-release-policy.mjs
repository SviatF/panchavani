/** Independently reviewed city/intent SEO releases.
 * A draft from DeepSeek or even a scientific research pack NEVER makes a URL.
 * This module requires reviewed day facts, independent topic expertise,
 * meaningful non-duplicate editorial content, then a separate SEO SHA permit.
 */
import {createHash} from 'node:crypto';
const CITIES=new Set(['delhi','mumbai','kolkata','chennai','bengaluru','hyderabad',
 'ahmedabad','pune','jaipur','varanasi']);
const KINDS=new Set(['calendar-month','festival','vrat','muhurat']);
const SHA=/^[a-f0-9]{64}$/;
const MONTH=/^20\d\d-(0[1-9]|1[0-2])$/;
const DAY=/^20\d\d-\d\d-\d\d$/;
const AT=/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/;
const SLUG=/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const OBJECT=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const validDay=x=>typeof x==='string'&&DAY.test(x)&&
 !Number.isNaN(Date.parse(x+'T12:00:00Z'))&&
 new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
const validInstant=x=>typeof x==='string'&&AT.test(x)&&Number.isFinite(Date.parse(x));
const uniq=a=>new Set(a).size===a.length;
const sources=x=>Array.isArray(x)&&x.length>=2&&
 uniq(x.map(v=>v?.url))&&x.every(v=>OBJECT(v)&&
 typeof v.label==='string'&&v.label.length>=8&&
 typeof v.url==='string'&&/^https:\/\/[^\s/]+\//.test(v.url));
const canonical=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const ensure=(a,msg)=>{if(!a)throw Error(msg)};
export function topicPath(x){
 if(!OBJECT(x)||!KINDS.has(x.kind)||!CITIES.has(x.cityId)||
    !MONTH.test(x.month)||!SLUG.test(x.topic||''))
  throw Error('Bad city, month or topic identity');
 const [year,month]=x.month.split('-');
 if(x.kind==='calendar-month'){
  if(x.topic!=='calendar')throw Error('Calendar topic ID must be calendar');
  return '/calendar/'+x.cityId+'/'+year+'/'+Number(month)+'/';
 }
 if(x.kind==='festival')return '/festivals/'+x.topic+'/'+year+'/'+x.cityId+'/';
 if(x.kind==='vrat')return '/vrat/'+x.topic+'/'+year+'/'+Number(month)+'/'+x.cityId+'/';
 return '/muhurat/'+x.topic+'/'+year+'/'+Number(month)+'/'+x.cityId+'/';
}
function validateBody(x){
 ensure(OBJECT(x)&&typeof x.headline==='string'&&x.headline.length>=30&&
   x.headline.length<=95&&typeof x.description==='string'&&
   x.description.length>=85&&x.description.length<=170&&
   typeof x.lead==='string'&&x.lead.length>=170,
   'Thin or poorly described editorial opening');
 ensure(Array.isArray(x.sections)&&x.sections.length>=3&&x.sections.length<=8&&
   x.sections.every(s=>OBJECT(s)&&typeof s.heading==='string'&&s.heading.length>=12&&
    typeof s.body==='string'&&s.body.length>=180) &&
   x.sections.reduce((n,s)=>n+s.body.length,0)>=680,
   'Page needs substantial source-grounded editorial chapters');
 ensure(Array.isArray(x.faqs)&&x.faqs.length>=2&&x.faqs.length<=6&&
   x.faqs.every(f=>OBJECT(f)&&typeof f.question==='string'&&
     f.question.length>=24&&typeof f.answer==='string'&&f.answer.length>=65),
   'Reader questions must be genuinely answered');
 ensure(sources(x.sources)&&Array.isArray(x.localEvidence)&&
   x.localEvidence.length>=2&&
   uniq(x.localEvidence.map(y=>y?.factId))&&
   x.localEvidence.every(f=>OBJECT(f)&&
     typeof f.factId==='string'&&f.factId.length>=8&&
     typeof f.cityId==='string'&&
     typeof f.localRelevance==='string'&&f.localRelevance.length>=75&&
     x.sources.some(s=>s.url===f.sourceUrl)),
   'Missing at least two cited original city-specific facts');
 const narrative=[x.lead,...x.sections.map(s=>s.body),
  ...x.faqs.map(f=>f.answer)].join(' ');
 ensure(!/(?:lorem ipsum|as an ai|in today's fast-paced|cosmic harmony|unlock the secrets|\btbd\b|\btodo\b)/i.test(narrative),
  'Page contains boilerplate or AI stock phrases');
 const words=narrative.split(/\s+/).length;
 ensure(words>=170,'Insufficient reader value to justify search indexing');
}
function reviewedRitual(x,days,approvedDayLookup){
 const r=x.ritualReview;
 ensure(OBJECT(r)&&r.status==='independently-reviewed'&&SHA.test(r.rulePackSha256||'')&&
    typeof r.expertReviewer==='string'&&r.expertReviewer.length>=8&&
    typeof r.tradition==='string'&&r.tradition.length>=15&&
    sources(r.sources)&&validInstant(r.approvedAt)&&
    r.expertReviewer!==x.scientificReviewer&&r.expertReviewer!==x.editorialReviewer,
    'Missing independently sourced and reviewed tradition-specific selection rule');
 ensure(Date.parse(r.approvedAt)<=Date.parse(x.approvedAt)&&
    [...days].every(d=>Date.parse(r.approvedAt)>=Date.parse(
      approvedDayLookup.get(d).releaseEvidence.approvedAt)),
    'Ritual expert review must follow science and precede editorial release');
 const result=x.verifiedResult;
 ensure(OBJECT(result)&&Array.isArray(result.dates)&&result.dates.length>0&&
    result.dates.every(d=>validDay(d)&&days.has(d))&&uniq(result.dates),
    'Ritual observable results are missing or outside approved science days');
 if(x.kind==='vrat'||x.kind==='muhurat'){
  ensure(Array.isArray(result.windows)&&result.windows.length>0&&
    result.windows.every(w=>OBJECT(w)&&validDay(w.date)&&days.has(w.date)&&
      result.dates.includes(w.date)&&
      validInstant(w.startUtc)&&validInstant(w.endUtc)&&
      Date.parse(w.startUtc)<Date.parse(w.endUtc)&&
      Date.parse(w.endUtc)-Date.parse(w.startUtc)<86400000&&
      Date.parse(w.startUtc)>=Date.parse(approvedDayLookup.get(w.date).sun.sunriseUtc)&&
      Date.parse(w.endUtc)<=Date.parse(approvedDayLookup.get(w.date).sun.nextSunriseUtc)),
    'Human rule reviewer must approve actual time windows, not just favorable lunar labels');
 }
}
function neutral(x){
 const names=[...CITIES].map(v=>v.replace(/-/g,' '));
 let value=[x.editorial.lead,...x.editorial.sections.map(y=>y.body)].join(' ').toLowerCase();
 for(const name of names)value=value.replaceAll(name,' city ');
 return value.replace(/[^\p{L}\p{N}]+/gu,' ').trim();
}
function overlap(a,b){
 const grams=s=>{
  const parts=s.split(' ').filter(Boolean),set=new Set();
  for(let i=0;i+4<parts.length;i++)set.add(parts.slice(i,i+5).join(' '));
  return set;
 };
 const x=grams(a),y=grams(b);
 if(!x.size||!y.size)return 0;
 let intersection=0;for(const word of x)if(y.has(word))intersection++;
 return intersection/(x.size+y.size-intersection);
}
export function validateTopicContent(bundle,approvedDays,expectedSha){
 ensure(OBJECT(bundle)&&bundle.schemaVersion===1&&
   Array.isArray(bundle.records)&&Array.isArray(approvedDays),
   'Invalid independent topic content manifest');
 if(!bundle.records.length){
  ensure(bundle.releaseStatus==='NO_APPROVED_TOPIC_PAGES',
   'Empty editorial topic release must remain closed');
  return [];
 }
 ensure(bundle.releaseStatus==='HUMAN_APPROVED_CITY_TOPIC_CONTENT'&&
   SHA.test(expectedSha||'')&&canonical(bundle)===expectedSha,
   'Missing immutable human-reviewed topic SHA');
 const known=new Map();
 for(const day of approvedDays){
  const id=day?.cityId+'/'+day?.date;
  ensure(!known.has(id),'Duplicate independently approved calendar data');
  known.set(id,day);
 }
 const routes=new Set(),articles=[],seenBodies=[];
 for(const row of bundle.records){
  ensure(OBJECT(row)&&row.status==='human-approved'&&
    typeof row.releaseId==='string'&&row.releaseId.length>=12&&
    typeof row.scientificReviewer==='string'&&row.scientificReviewer.length>=8&&
    typeof row.editorialReviewer==='string'&&row.editorialReviewer.length>=8&&
    row.editorialReviewer!==row.scientificReviewer&&
    validInstant(row.approvedAt)&&
    row.publicationApproved===true&&
    Array.isArray(row.sourceDays)&&row.sourceDays.length>=1&&row.sourceDays.length<=31,
    'Topic content lacks separate real source/editorial review');
  const path=topicPath(row);
  ensure(!routes.has(path),'Duplicate reviewed topical SEO path');
  routes.add(path);
  validateBody(row.editorial);
  const days=new Set();
  const dayLookup=new Map();
  for(const ref of row.sourceDays){
   const id=row.cityId+'/'+ref?.date;
   const day=known.get(id);
   ensure(day?.status==='approved'&&
     ref?.sourceRecordHash===day.sourceRecordHash&&
     validDay(ref.date)&&ref.date.startsWith(row.month+'-')&&
     !days.has(ref.date),'Topic fact references must match approved city/month/day source hashes');
   days.add(ref.date);
   dayLookup.set(ref.date,day);
  }
  if(row.kind==='calendar-month'){
   const [y,m]=row.month.split('-').map(Number);
   const count=new Date(Date.UTC(y,m,0)).getUTCDate();
   ensure(row.sourceDays.length===count&&
     [...Array(count)].every((_,i)=>days.has(row.month+'-'+String(i+1).padStart(2,'0'))),
     'City calendar cannot publish a partial research month');
   ensure(row.ritualReview===null&&row.verifiedResult===null,
     'Astronomy-only month must not claim ritual approval');
  }else reviewedRitual(row,days,dayLookup);
  for(const f of row.editorial.localEvidence)
   ensure(f.cityId===row.cityId,'Another city factual source contaminated this page');
  const locality=row.cityId.replace(/-/g,' ');
  const narrative=neutral(row);
  ensure(!seenBodies.some(text=>overlap(narrative,text)>.63),
   'Near-duplicate city swap / AI doorway page rejected');
  seenBodies.push(narrative);
  // A city name alone never proves original unique user value.
  ensure(row.editorial.headline.toLowerCase().includes(locality.split(' ')[0]),
   'City-specific topic headline missing the actual location');
  articles.push({...row,path});
 }
 return articles;
}
export function validateTopicSeo(seo,articles,expectedSha){
 ensure(OBJECT(seo)&&seo.schemaVersion===1&&Array.isArray(seo.records)&&
   Array.isArray(articles),'Invalid distinct topic SEO permit manifest');
 if(!seo.records.length){
  ensure(seo.releaseStatus==='NO_APPROVED_TOPIC_SEO_ROUTES','Empty SEO review must remain closed');
  return [];
 }
 ensure(seo.releaseStatus==='HUMAN_APPROVED_CITY_TOPIC_SEO'&&
  SHA.test(expectedSha||'')&&canonical(seo)===expectedSha,
  'Missing separate signed SEO manifest hash');
 const byPath=new Map(articles.map(a=>[a.path,a])),used=new Set(),out=[];
 for(const row of seo.records){
  ensure(OBJECT(row)&&typeof row.path==='string'&&!used.has(row.path),
   'Duplicate or invalid SEO topic route');
  used.add(row.path);
  const article=byPath.get(row.path);
  ensure(article&&row.releaseId===article.releaseId&&
    validInstant(row.approvedAt)&&Date.parse(row.approvedAt)>=Date.parse(article.approvedAt)&&
    row.sourceHashesSha256===canonical(article.sourceDays)&&
    row.indexingAuthorized===true&&row.searchIntentReviewed===true&&
    row.citySpecificValueReviewed===true&&row.scientificSourcesReviewed===true&&
    typeof row.seoReviewer==='string'&&row.seoReviewer.length>=8&&
    row.seoReviewer!==article.scientificReviewer&&
    row.seoReviewer!==article.editorialReviewer&&
    row.seoReviewer!==article.ritualReview?.expertReviewer,
    'SEO topic permit must follow independently approved reader facts/editorial review');
  out.push({path:article.path,lastModified:row.approvedAt,
    kind:'approved-city-topic',sourceIds:article.editorial.localEvidence.map(x=>x.factId)});
 }
 return out.sort((a,b)=>a.path.localeCompare(b.path));
}
