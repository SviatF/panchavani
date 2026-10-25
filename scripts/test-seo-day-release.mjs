import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {validateSeoDayRelease,seoDayPath} from '../lib/seo-day-release-policy.mjs';

const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function day(city='delhi',date='2026-10-21'){
 return {cityId:city,date,status:'approved',sourceRecordHash:'f'.repeat(64),
   releaseId:'reviewed-delhi-release-20261024',
   releaseEvidence:{reviewStatus:'domain-reviewed',blockerCount:0,
     approvedAt:'2026-10-22T10:00:00Z',
     scientificReviewer:'Independent Astronomer',
     sourceIds:['independent-source-one','independent-source-two']},
   editorial:{reviewedBy:'Independent Editor'}};
}
function permit(d=day()){
 return {cityId:d.cityId,date:d.date,sourceRecordHash:d.sourceRecordHash,
   releaseId:d.releaseId,seoReviewer:'Separate Search Reviewer',
   approvedAt:'2026-10-23T10:00:00Z',editorialApproved:true,
   searchIntentReviewed:true,independentSourceReviewComplete:true,
   cityCoordinatesReviewed:true,indexingAuthorized:true};
}
function manifest(...records){return {schemaVersion:1,
 releaseStatus:records.length?'HUMAN_APPROVED_DAILY_SEO_PER_URL':'NO_APPROVED_DAY_SEO_ROUTES',
 records};}
const content=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('live repo only exposes permitted city/day URLs backed by independent SEO reviews',()=>{
 const approved=JSON.parse(content('data/approved-panchang.json'));
 const release=JSON.parse(content('data/approved-seo-days.json'));
 assert.ok(Array.isArray(approved.records));
 assert.ok(Array.isArray(release.records));
 if(!release.records.length)
  assert.deepEqual(validateSeoDayRelease(release,approved.records,undefined),[]);
 else {
  const digest=process.env.PANCHAVANI_APPROVED_SEO_RELEASE_SHA256;
  assert.equal(validateSeoDayRelease(release,approved.records,digest).length,release.records.length);
 }
 assert.equal(seoDayPath('delhi','2026-10-21'),'/panchang/delhi/2026-10-21/');
});
test('a genuine independent second permission allows one date and only that date',()=>{
 const source=day(),m=manifest(permit(source));
 const approved=validateSeoDayRelease(m,[source],sha(m));
 assert.equal(approved.length,1);
 assert.deepEqual(approved[0],{
  path:'/panchang/delhi/2026-10-21/',
  lastModified:'2026-10-23T10:00:00Z',
  kind:'approved-daily-panchang',
  sourceIds:['independent-source-one','independent-source-two']
 });
});
test('date cannot enter sitemap if independent SEO digest or scientific record missing',()=>{
 const source=day(),m=manifest(permit(source));
 for(const [label,rows,key] of [
  ['absent digest',[source],undefined],['wrong digest',[source],'0'.repeat(64)],
  ['no science day',[],sha(m)],['different source hash',[{...source,sourceRecordHash:'a'.repeat(64)}],sha(m)],
  ['different release id',[{...source,releaseId:'reviewed-other-release'}],sha(m)]
 ]){
  assert.throws(()=>validateSeoDayRelease(m,rows,key),undefined,label);
 }
});
test('independent SEO review is required for each city/date, including explicit original source review',()=>{
 const d=day(),good=permit(d);
 const corruptions=[
  r=>r.editorialApproved=false,r=>r.indexingAuthorized=false,
  r=>r.cityCoordinatesReviewed=false,r=>r.independentSourceReviewComplete=false,
  r=>r.searchIntentReviewed=false,r=>r.seoReviewer='Independent Editor',
  r=>r.seoReviewer='Independent Astronomer',
  r=>r.approvedAt='2026-10-20T10:00:00Z',r=>r.date='2026-10-22',
  r=>r.cityId='fake-city',r=>r.releaseId='synthetic-review-id'
 ];
 for(const damage of corruptions){
  const candidate={...good};damage(candidate);
  const m=manifest(candidate);
  assert.throws(()=>validateSeoDayRelease(m,[d],sha(m)));
 }
});
test('identical day SEO entries, stale manifest, and unsupported status fail closed',()=>{
 const d=day(),p=permit(d);
 const duplicate=manifest(p,p);
 assert.throws(()=>validateSeoDayRelease(duplicate,[d],sha(duplicate)),/Duplicate/);
 const bad=manifest(p);bad.releaseStatus='NO_APPROVED_DAY_SEO_ROUTES';
 assert.throws(()=>validateSeoDayRelease(bad,[d],sha(bad)),/not authorized/);
 const empty=manifest();empty.releaseStatus='HUMAN_APPROVED_DAILY_SEO_PER_URL';
 assert.throws(()=>validateSeoDayRelease(empty,[],undefined),/disabled/);
});
test('sitemap and metadata derive day releases from the same SEO policy',()=>{
 const seo=content('lib/seo-release-manifest.ts');
 const meta=content('components/reviewed-day-page.tsx');
 const sitemap=content('app/sitemap.ts');
 assert.match(seo,/validateSeoDayRelease\(seoDays,approvedCityDays\(\)/);
 assert.match(seo,/isIndexableApprovedCityDay/);
 assert.match(meta,/index:isIndexableApprovedCityDay\(city,date\)/);
 assert.match(sitemap,/approvedSeoRoutes\(\)/);
 assert.match(sitemap,/approved-daily-panchang/);
});
