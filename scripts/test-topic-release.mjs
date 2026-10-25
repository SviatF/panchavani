import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {topicPath,validateTopicContent,validateTopicSeo} from '../lib/topic-release-policy.mjs';
const SHA=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const MONTH='2027-02';
function days(n=28,cityId='delhi'){
 return Array.from({length:n},(_,i)=>{
  const date=MONTH+'-'+String(i+1).padStart(2,'0');
  const next=new Date(Date.parse(date+'T12:00:00Z')+86400000).toISOString().slice(0,10);
  return {cityId,date,status:'approved',
    sourceRecordHash:(i+1).toString(16).padStart(64,'0'),
    releaseEvidence:{approvedAt:'2027-03-01T12:00:00Z'},
    sun:{sunriseUtc:date+'T00:55:00Z',nextSunriseUtc:next+'T00:55:00Z'}};
 });
}
const textCity='For Delhi, a reader needs the precise selected observer reference and the named lunar-day rule, not the label for a nearby default city.';
const textMethod='The local reference point is essential to the sunrise boundary; solar-day labels can differ while a geocentric phase transition is shared between observer locations. Compare the independently reviewed evidence instead of assigning the same conclusion to every state in India.';
function editorial(city='Delhi'){
 return {headline:city+' October Panchang calendar overview and regional astronomy',
   description:city+' calendar guide, including city-specific dawn comparisons and independently reviewed local astronomical events, the method and cited evidence.',
   lead:'A useful local Panchang reference begins with the observer point and a clearly identified day. '+textCity+' '+textMethod+' Here the chapter and the actual approved daily facts answer different parts of that reader question.',
   sections:[
    {heading:'How local sunrise relates to lunar-day assignments',body:textCity+' '+textMethod+' '+textCity},
    {heading:'Comparing phases and civil clock labels',body:textMethod+' '+textCity+' '+textMethod},
    {heading:'Method, sources and what the reader should verify',body:textCity+' '+textMethod+' '+textMethod}
   ],
   faqs:[{question:'Why can two almanacs disagree about local day labels?',answer:textCity+' '+textMethod},
    {question:'Which geography and source choices should be checked?',answer:textMethod+' '+textCity}],
   sources:[{label:'Indian Meteorological Department',url:'https://mausam.imd.gov.in/'},
    {label:'Indian National Physical Laboratory',url:'https://www.nplindia.res.in/'}],
   localEvidence:[{factId:'delhi-geo-001',cityId:'delhi',localRelevance:textCity+' '+textMethod,
      sourceUrl:'https://mausam.imd.gov.in/'},
     {factId:'delhi-time-002',cityId:'delhi',localRelevance:textMethod+' '+textCity,
      sourceUrl:'https://www.nplindia.res.in/'}]
 };
}
const release=(...records)=>({schemaVersion:1,releaseStatus:records.length?
 'HUMAN_APPROVED_CITY_TOPIC_CONTENT':'NO_APPROVED_TOPIC_PAGES',records});
const seo=(...records)=>({schemaVersion:1,releaseStatus:records.length?
 'HUMAN_APPROVED_CITY_TOPIC_SEO':'NO_APPROVED_TOPIC_SEO_ROUTES',records});
function article(kind='calendar-month'){
 const science=days();
 return {kind,cityId:'delhi',topic:kind==='calendar-month'?'calendar':'diwali',
  month:MONTH,status:'human-approved',releaseId:'independent-city-topic-202702-release',
  scientificReviewer:'Independent Science Reviewer',
  editorialReviewer:'Independent Editorial Reviewer',
  approvedAt:'2027-03-03T12:00:00Z',publicationApproved:true,
  sourceDays:kind==='calendar-month'?science.map(x=>({date:x.date,sourceRecordHash:x.sourceRecordHash}))
   :[{date:science[0].date,sourceRecordHash:science[0].sourceRecordHash}],
  editorial:editorial(),ritualReview:kind==='calendar-month'?null:{
   status:'independently-reviewed',rulePackSha256:'a'.repeat(64),
   expertReviewer:'Independent Ritual Expert',tradition:'Named historical festival convention',
   sources:[{label:'Named Indian calendar reference',url:'https://mausam.imd.gov.in/'},
    {label:'Distinct calendar reference',url:'https://www.nplindia.res.in/'}],
   approvedAt:'2027-03-02T12:00:00Z'},
  verifiedResult:kind==='calendar-month'?null:{dates:['2027-02-01']}}
}
function permit(a){
 return {path:topicPath(a),releaseId:a.releaseId,approvedAt:'2027-03-04T12:00:00Z',
  sourceHashesSha256:SHA(a.sourceDays),seoReviewer:'Independent SEO Reviewer',
  indexingAuthorized:true,searchIntentReviewed:true,citySpecificValueReviewed:true,
  scientificSourcesReviewed:true};
}
test('empty topic manifests keep every topical city/month URL out of sitemap',()=>{
 const content=JSON.parse(readFileSync(new URL('../data/approved-topic-pages.json',import.meta.url),'utf8'));
 const allow=JSON.parse(readFileSync(new URL('../data/approved-topic-seo.json',import.meta.url),'utf8'));
 assert.deepEqual(validateTopicContent(content,[],undefined),[]);
 assert.deepEqual(validateTopicSeo(allow,[],undefined),[]);
});
test('full 28-day city calendar is an independently attributable monthly article',()=>{
 const a=article();
 const docs=release(a),found=validateTopicContent(docs,days(),SHA(docs));
 assert.equal(found.length,1);
 assert.equal(found[0].path,'/calendar/delhi/2027/2/');
 const allow=seo(permit(a)),routes=validateTopicSeo(allow,found,SHA(allow));
 assert.equal(routes[0].path,'/calendar/delhi/2027/2/');
 assert.equal(routes[0].kind,'approved-city-topic');
 assert.equal(routes.length,1);
});
test('wrong month source, partial city/month or unauthorized source digest fails',()=>{
 const a=article();
 for(const kind of ['missing','othercity','wronghash','wrongmonth','copied']) {
  const row=structuredClone(a);
  let found=days();
  if(kind==='missing')row.sourceDays.pop();
  if(kind==='othercity')found[2].cityId='mumbai';
  if(kind==='wronghash')row.sourceDays[0].sourceRecordHash='f'.repeat(64);
  if(kind==='wrongmonth')row.sourceDays[0].date='2027-03-01';
  if(kind==='copied')row.editorial.sections[0].body='Generic contents.';
  const bundle=release(row);
  assert.throws(()=>validateTopicContent(bundle,found,SHA(bundle)),undefined,kind);
 }
 const valid=release(a);
 assert.throws(()=>validateTopicContent(valid,days(),'0'.repeat(64)),/SHA/);
});
test('festival requires named source-reviewed local date and independent ritual signature evidence',()=>{
 const festival=article('festival');
 festival.editorial.headline='Delhi Diwali celebration and independently reviewed local festival date';
 const bundle=release(festival);
 const found=validateTopicContent(bundle,days(),SHA(bundle));
 assert.equal(found[0].path,'/festivals/diwali/2027/delhi/');
 const bad=structuredClone(festival);bad.verifiedResult.dates=['2027-02-11'];
 assert.throws(()=>validateTopicContent(release(bad),days(),SHA(release(bad))),/outside approved/);
 const missing=structuredClone(festival);missing.ritualReview=null;
 assert.throws(()=>validateTopicContent(release(missing),days(),SHA(release(missing))),/tradition-specific/);
});
test('Vrat fasting/Parana and Muhurat need real expert-reviewed time intervals',()=>{
 for(const kind of ['vrat','muhurat']) {
  const a=article(kind);a.topic=kind==='vrat'?'ekadashi':'wedding';
  a.editorial.headline='Delhi '+a.topic+' real observance and locally reviewed clock windows';
  const b=release(a);
  assert.throws(()=>validateTopicContent(b,days(),SHA(b)),/time windows/);
  a.verifiedResult.windows=[{
    date:'2027-02-01',startUtc:'2027-02-01T05:00:00Z',endUtc:'2027-02-01T06:00:00Z'
  }];
  const full=release(a),routes=validateTopicContent(full,days(),SHA(full));
  assert.equal(routes.length,1);
  assert.equal(routes[0].path,kind==='vrat'?
   '/vrat/ekadashi/2027/2/delhi/':'/muhurat/wedding/2027/2/delhi/');
 }
});
test('DeepSeek approved article still cannot index without separate genuine SEO permit and hash',()=>{
 const a=article('calendar-month'),pages=release(a);
 const content=validateTopicContent(pages,days(),SHA(pages));
 const allow=seo(permit(a));
 assert.throws(()=>validateTopicSeo(allow,content,undefined),/SEO manifest/);
 const wrong=structuredClone(allow);wrong.records[0].seoReviewer=a.editorialReviewer;
 assert.throws(()=>validateTopicSeo(wrong,content,SHA(wrong)),/SEO topic permit/);
 const permitWrongSha=structuredClone(allow);permitWrongSha.records[0].sourceHashesSha256='b'.repeat(64);
 assert.throws(()=>validateTopicSeo(permitWrongSha,content,SHA(permitWrongSha)),/SEO topic permit/);
});
test('release-generated routes cannot be confused with static directory or allow path traversal',()=>{
 for(const row of [
  {kind:'calendar-month',cityId:'../',topic:'calendar',month:'2027-02'},
  {kind:'festival',cityId:'delhi',topic:'../diwali',month:'2027-02'},
  {kind:'vrat',cityId:'bogus',topic:'ekadashi',month:'2027-02'}])
  assert.throws(()=>topicPath(row));
});
