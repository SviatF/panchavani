import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {hashLearningGuide,validateLearningSeoRelease} from '../lib/learning-seo-release-policy.mjs';
const guide={
 slug:'what-is-tithi',title:'A well-explained independent article on lunar days',
 lead:'Original substantial material on how the Moon advances relative to the Sun; '.repeat(5),
 sections:[{title:'One'},{title:'Two'},{title:'Three'}],
 faqs:[{question:'What?'},{question:'Why?'}],
 references:[{url:'https://packolkata.imd.gov.in/panchang/en/explanation'},
             {url:'https://mausam.imd.gov.in/responsive/rashtriyPanchang.php'}]
};
const guides={'what-is-tithi':guide};
const disabled={schemaVersion:1,releaseStatus:'NO_APPROVED_LEARNING_SEO_ROUTES',records:[]};
const permit=()=>({
 slug:'what-is-tithi',sourceContentSha256:hashLearningGuide(guide),
 contentReviewer:'Human Research Editor',seoReviewer:'Independent SEO Reviewer',
 contentReviewedAt:'2026-10-26T10:00:00Z',seoReviewedAt:'2026-10-26T11:00:00Z',
 originalSourcesReadAndVerified:true,astronomyAndCulturalLanguageReviewed:true,
 conceptualExamplesCheckedAsNonLive:true,pageUsefulnessAndNonDuplicationReviewed:true,
 canonicalAndInternalLinksReviewed:true,noFalseLiveCalendarClaimsConfirmed:true,
 indexingAuthorized:true
});
const signed=(r)=>({schemaVersion:1,releaseStatus:'HUMAN_REVIEWED_EDUCATIONAL_URL_RELEASE',records:[r]});
const sha=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
test('unreviewed starting manifest permanently yields no released routes',()=>{
 assert.deepEqual(validateLearningSeoRelease(disabled,guides,undefined),[]);
 assert.throws(()=>validateLearningSeoRelease({...disabled,releaseStatus:'HUMAN_REVIEWED_EDUCATIONAL_URL_RELEASE'},guides,undefined));
});
test('a two-person SHA-pinned permit can release exactly one reviewed guide',()=>{
 const doc=signed(permit());
 const approved=validateLearningSeoRelease(doc,guides,sha(doc));
 assert.equal(approved[0].path,'/learn/what-is-tithi/');
 assert.equal(approved[0].kind,'approved-learning-guide');
 assert.equal(approved.length,1);
});
test('no one may self-publish without two different reviewers',()=>{
 const row=permit();row.seoReviewer=row.contentReviewer;
 const doc=signed(row);
 assert.throws(()=>validateLearningSeoRelease(doc,guides,sha(doc)));
});
test('changing content, even one word, revokes indexing',()=>{
 const doc=signed(permit());
 assert.throws(()=>validateLearningSeoRelease(doc,{
  'what-is-tithi':{...guide,lead:guide.lead+' extra unreviewed statement'}
 },sha(doc)));
});
test('manifest digest is separate and must match exactly',()=>{
 const doc=signed(permit());
 assert.throws(()=>validateLearningSeoRelease(doc,guides,undefined));
 assert.throws(()=>validateLearningSeoRelease(doc,guides,'a'.repeat(64)));
});
test('checklist evidence cannot be skipped',()=>{
 for(const key of ['originalSourcesReadAndVerified','astronomyAndCulturalLanguageReviewed',
   'conceptualExamplesCheckedAsNonLive','pageUsefulnessAndNonDuplicationReviewed',
   'canonicalAndInternalLinksReviewed','noFalseLiveCalendarClaimsConfirmed',
   'indexingAuthorized']){
  const row=permit();row[key]=false;
  const doc=signed(row);
  assert.throws(()=>validateLearningSeoRelease(doc,guides,sha(doc)),key);
 }
});
test('duplicate permits or nonexistent article are blocked',()=>{
 const doc=signed(permit());doc.records.push(permit());
 assert.throws(()=>validateLearningSeoRelease(doc,guides,sha(doc)));
 const ghost=permit();ghost.slug='nonexistent-guide';
 const forged=signed(ghost);
 assert.throws(()=>validateLearningSeoRelease(forged,guides,sha(forged)));
});
test('editorial checks must precede independent SEO release',()=>{
 const row=permit();row.contentReviewedAt='2026-10-26T12:00:00Z';
 const doc=signed(row);
 assert.throws(()=>validateLearningSeoRelease(doc,guides,sha(doc)));
});
