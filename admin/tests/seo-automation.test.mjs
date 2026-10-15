import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSeoBrief,composeSeoDraft,SEO_PIPELINE_VERSION} from '../src/seo-automation.mjs';
import {CITY_META} from '../src/city-catalog.mjs';

const city=id=>CITY_META.get(id);
const raw={
 headline:'Marketing title from model',seoTitle:'Shiny local SEO title',
 metaDescription:'Generated coast-boundaries or unverified facts',
 introduction:'A local Panchang joins solar and lunar ways of interpreting time. Its day labels depend on the calculation convention and the source used. When reviewing entries, begin with the location and then inspect each transition and the stated boundary.',
 localContext:'Mumbai watches the sun rise above the Arabian Sea. This is an unsupported geographic claim.',
 dailyUnderstanding:'The lunar phase does not always change at the beginning of a civil day. A reader can compare event time, locally calculated sunrise and a source’s method before interpreting a Panchang entry.',
 uncertaintyNote:'Validate coordinates and observance rules.',
 faq:{question:'Model invented question',answer:'Model invented answer'},
 referencedFactIds:[]
};
test('SEO composition is deterministic, city specific and independent of model-proposed fabricated geography',()=>{
 const m=buildSeoBrief(city('mumbai'));
 const d=buildSeoBrief(city('delhi'));
 const c=buildSeoBrief(city('chennai'));
 assert.equal(m.version,SEO_PIPELINE_VERSION);
 assert.equal(m.canonicalPath,'/panchang/mumbai/');
 assert.equal(new Set([m.seoTitle,d.seoTitle,c.seoTitle]).size,3);
 assert.equal(new Set([m.groundedLocalContext,d.groundedLocalContext,c.groundedLocalContext]).size,3);
 assert.equal(m.sourceFacts[0].url,'https://www.nplindia.org/clockcode/html/');
 const compiled=composeSeoDraft(raw,m);
 assert.equal(compiled.draft.headline,'Mumbai Panchang');
 assert.equal(compiled.draft.seoTitle,m.seoTitle);
 assert.equal(compiled.draft.metaDescription,m.metaDescription);
 assert.equal(compiled.draft.localContext,m.groundedLocalContext);
 assert.equal(compiled.draft.faq.length,1);
 assert.equal(compiled.draft.faq[0].question,m.practicalQuestion);
 assert.ok(!JSON.stringify(compiled.draft).includes('Arabian Sea'));
 assert.equal(compiled.publicationAuthorized,false);
 assert.equal(compiled.indexingAuthorized,false);
 assert.ok(compiled.repairs.includes('faq-normalized'));
 assert.ok(m.seoTitle.length<=65);
 assert.ok(m.metaDescription.length<=160);
 assert.deepEqual(compiled.draft.referencedFactIds,[]);
 assert.equal(composeSeoDraft(raw,m).draft.localContext,compiled.draft.localContext);
});
test('catalogue allows research-only SEO briefs beyond 3 cities, without claiming approved science',()=>{
 const b=buildSeoBrief(city('jaipur'));
 assert.equal(b.canonicalPath,'/panchang/jaipur/');
 assert.equal(b.approvedAstronomicalFacts.length,0);
 assert.equal(b.approvedRitualFacts.length,0);
 assert.equal(b.indexingAuthorized,false);
 assert.ok(b.researchQuestion);
});
test('one-shot repair uses zero model calls and never mutates the immutable raw response',()=>{
 const m=buildSeoBrief(city('chennai'));
 const input=JSON.stringify(raw);
 const output=composeSeoDraft(raw,m);
 assert.equal(JSON.stringify(raw),input);
 assert.equal(output.draft.faq.length,1);
 const second=composeSeoDraft(raw,m);
 assert.deepEqual(output,second);
 assert.notEqual(output.draft.headline,raw.headline);
});
test('unsupported precise daily Anga output cannot become automatically published',()=>{
 const modified={...raw,introduction:'Shukla Shashthi is active at 08:25 IST.'};
 const result=composeSeoDraft(modified,buildSeoBrief(city('delhi')));
 assert.ok(result.blockers.includes('seo-unapproved-daily-fact-in-model-prose'));
 assert.equal(result.publicationAuthorized,false);
});
