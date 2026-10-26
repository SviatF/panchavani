/** Seven-day PANCHAVANI source and authorship QA: never confuses PREVIEW with SEO release. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const data=JSON.parse(read('data/research-panchang-pilot.json'));
const dates=['2026-10-27','2026-10-28','2026-10-29','2026-10-30',
 '2026-10-31','2026-11-01','2026-11-02'];
const SHA=/^[0-9a-f]{64}$/;
const words=(x)=>x.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[];
const overlap=(a,b)=>{
 const grams=(s)=>new Set(words(s).slice(0,-2).map((_,i,t)=>t.slice(i,i+3).join(' ')));
 const x=grams(a),y=grams(b);
 return [...x].filter(s=>y.has(s)).length/Math.max(1,new Set([...x,...y]).size);
};
test('Science and indexing approval always remain disabled on research pages',()=>{
 assert.equal(data.artifactType,'PANCHAVANI_7DAY_NO_INDEX_PUBLIC_RESEARCH_PREVIEW');
 assert.equal(data.status,'UNAPPROVED_PUBLIC_RESEARCH_PILOT');
 assert.equal(data.sourceApproval,false);
 assert.equal(data.humanEditorialApproved,false);
 assert.equal(data.deepSeekInvocationAuthorized,false);
 assert.equal(data.searchIndexingAuthorized,false);
 assert.equal(data.publicationAsVerifiedPanchangAuthorized,false);
 assert.equal(data.scopeStart,dates[0]);
 assert.equal(data.scopeEnd,dates.at(-1));
 assert(Array.isArray(data.days));
 assert([0,7].includes(data.days.length),'Pilot must be uninitialized or pinned to all 7 research days');
});
test('All seven dates bind one unique record, story and astronomy provenance',()=>{
 if(!data.days.length)return;
 assert.equal(data.days.length,7);
 assert.equal(data.visibleThrough,dates.at(-1));
 assert.deepEqual(data.days.map(x=>x.date),dates);
 assert.equal(new Set(data.days.map(x=>x.titleAngle)).size,7);
 assert.equal(new Set(data.days.map(x=>x.researchSourceRecordSha256)).size,7);
 assert(SHA.test(data.sourceKernelSha256));
 for(const d of data.days){
  assert.equal(d.cityId,'delhi');
  assert.equal(d.status,'UNAPPROVED_PUBLIC_RESEARCH_PILOT');
  assert.equal(d.indexingAuthorized,false);
  assert.equal(d.humanEditorialApproved,false);
  assert.equal(d.verifiedByIndependentScientist,false);
  assert.equal(d.recommendedForRitualDecisions,false);
  assert.equal(d.sourceKernelSha256,data.sourceKernelSha256);
  assert(SHA.test(d.researchSourceRecordSha256));
  assert.equal(d.editorialParagraphs.length,3);
  assert(words(d.editorialParagraphs.join(' ')).length>=90);
  assert.deepEqual(Object.keys(d.transitions).sort(),['karana','nakshatra','tithi','yoga']);
 }
 for(let i=0;i<7;i++)for(let j=i+1;j<7;j++){
  const similarity=overlap(data.days[i].editorialParagraphs.join(' '),data.days[j].editorialParagraphs.join(' '));
  assert(similarity<.25,'Boilerplate content collision on '+dates[i]+' and '+dates[j]+': '+similarity);
 }
});
test('Public routes are permanently noindex and never in official sitemap',()=>{
 const article=read('app/research/panchang/[city]/[date]/page.tsx');
 const hub=read('app/research/panchang/page.tsx');
 const seo=read('lib/seo-release-manifest.ts');
 const sitemap=read('app/sitemap.ts');
 const lib=read('lib/research-pilot.ts');
 assert.match(article,/robots:\{index:false,follow:true\}/);
 assert.match(hub,/robots:\{index:false,follow:true\}/);
 assert.match(lib,/publicCutoff\(\)/);
 assert.match(lib,/GITHUB_EVENT_NAME==='pull_request'/);
 assert(!sitemap.includes('/research/panchang'),'Preview URLs cannot be an approved sitemap route');
 assert(!seo.includes('/research/panchang'),'Preview URLs may not join approved search release');
 assert.match(article,/Not an independently|NOT an independently|Unverified astronomy/);
});
