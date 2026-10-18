import test from 'node:test';
import assert from 'node:assert/strict';
import {readerWordCount,readerText,v4QualityIssues,canonicalSimilarity,
  EDITORIAL_V4_POLICY,CITY_RESEARCH_QUESTIONS} from '../src/editorial-v4.mjs';
const good={
 headline:'Understanding local time in Mumbai',
 seoTitle:'Mumbai Panchang: Local Sunrise and Calendar Guide',
 metaDescription:'Learn how to read a Mumbai Panchang using city-specific sunrise conventions and solar–lunar timing.',
 introduction:'A Panchang brings lunar and solar traditions together. Reading the information responsibly starts with knowing which locality and calendar convention a source follows, rather than assuming a national clock always captures its methodology.',
 localContext:'Mumbai uses the same civil time zone as Delhi and Chennai, yet a city-specific sunrise is calculated for its own location. A careful reader should check which coordinates, horizon convention and calculation date a source has used before comparing its displayed values with another almanac.',
 dailyUnderstanding:'Treat the five Angas as related but different calendar concepts. Some values describe angular positions, while a local sunrise may be used to assign a conventional daily label. First establish the method and regional tradition before drawing conclusions.',
 uncertaintyNote:'Independent astronomical and regional references still require review.',
 faq:[],
 referencedFactIds:[]
};
test('new V4 research questions give distinct non-factual directions for ten city-guide cities',()=>{
 assert.equal(EDITORIAL_V4_POLICY,'deepseek-private-editorial-v4');
 const angles=Object.values(CITY_RESEARCH_QUESTIONS);
 assert.equal(angles.length,10);
 assert.equal(new Set(angles).size,10);
 assert.ok(angles.every(x=>x.length>80));
});
test('valid city-hub example has substantive local copy and never claims approval',()=>{
 const issues=v4QualityIssues(good,'Mumbai',{intent:'city-hub',lang:'en'});
 assert.equal(issues.includes('v4-faq-schema'),false);
 assert.equal(issues.includes('v4-reader-body-length'),false);
 assert.equal(issues.includes('v4-local-substance-missing'),false);
 assert.equal(issues.includes('v4-evergreen-date-leak'),false);
 assert.equal(issues.includes('v4-audit-leak'),false);
 assert.ok(readerWordCount(good)>=100);
 assert.ok(readerWordCount(good)<=200);
 assert.ok(readerText(good).includes('Mumbai'));
});
test('V3 Delhi prose overflow and object FAQ are flagged, without mutating cache',()=>{
 const prior={...good,faq:{question:'Why?',answer:'Local convention.'},
  introduction:good.introduction.repeat(4)};
 const raw=JSON.stringify(prior);
 const issues=v4QualityIssues(prior,'Mumbai',{intent:'city-hub',lang:'en'});
 assert.ok(issues.includes('v4-faq-schema'));
 assert.ok(issues.includes('v4-reader-body-length'));
 assert.equal(JSON.stringify(prior),raw);
});
test('rejects invented city day details, stale calendar dates, poor local substance',()=>{
 const bad={...good,
  localContext:'Generic calendar explanation not specific to any place.',
  dailyUnderstanding:'Today is 16 October 2026 and Shukla Shashthi is active. This claim is unverified.',
  faq:[{question:12,answer:'Not valid'}]};
 const issues=v4QualityIssues(bad,'Mumbai',{intent:'city-hub',lang:'en'});
 for(const flag of ['v4-faq-schema','v4-local-substance-missing','v4-evergreen-temporal-copy',
                    'v4-evergreen-date-leak','v4-audit-leak','v4-specific-unapproved-anga'])
  assert.ok(issues.includes(flag),flag);
});
test('same copy with city name replaced is strongly flagged by cross-city heuristic',()=>{
 const delhi={...good,
  headline:good.headline.replaceAll('Mumbai','Delhi'),
  seoTitle:good.seoTitle.replaceAll('Mumbai','Delhi'),
  metaDescription:good.metaDescription.replaceAll('Mumbai','Delhi'),
  localContext:good.localContext.replaceAll('Mumbai','Delhi')};
 const ratio=canonicalSimilarity(good,delhi);
 assert.ok(ratio>.95,ratio);
 assert.ok(ratio<=1);
 assert.equal(canonicalSimilarity(good,{...good,
  introduction:'',localContext:'',dailyUnderstanding:'',headline:'',
  seoTitle:'',metaDescription:''}),0);
});
