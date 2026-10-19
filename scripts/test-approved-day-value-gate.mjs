import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectCityDay,assessFirstRelease,similarity} from './approved-day-value-gate.mjs';

/** Synthetic validation data ONLY; never astronomy approval or public content. */
export function syntheticReviewed(city='delhi'){
 const start='2026-10-16T00:50:00Z',
       end='2026-10-17T00:50:00Z';
 const label={tithi:'Shukla Shashthi',karana:'Kaulava',
              nakshatra:'Jyestha',yoga:'Shobhana'};
 const context=('This review explains the observed sunrise-day interval using the selected '
   +'city reference point and explicitly separates it from calendar-date rules. ').repeat(4);
 return {
  cityId:city,date:'2026-10-16',timezone:'Asia/Kolkata',status:'approved',
  releaseId:'synthetic-review-id',sourceRecordHash:'a'.repeat(64),
  releaseEvidence:{
   reviewer:'Test Reviewer',scientificReviewer:'Test Astronomer',
   reviewStatus:'domain-reviewed',comparisons:['test-compare-1','test-compare-2'],
   sourceIds:['test-source-1','test-source-2'],
   geoSource:'A separately reviewed city coordinate source',
   approvedAt:'2026-10-16T13:00:00Z',blockerCount:0
  },
  sun:{sunriseUtc:start,sunsetUtc:'2026-10-16T12:20:00Z',nextSunriseUtc:end},
  panchang:{...label,vara:'Friday',paksha:'Shukla'},
  transitions:Object.fromEntries(Object.entries(label).map(([kind,name])=>
    [kind,[{name,startUtc:start,endUtc:end}]])),
  editorial:{
   reviewedBy:'Test Reviewer',
   body:context,
   localMeaning:city+' has this synthetic astronomical anchor specifically to prove page-validation wiring.',
   readerQuestion:'How does the place-specific sunrise affect the daily reading in '+city+'?',
   readerAnswer:'The matching city, local horizon, time zone and astronomical boundary must be reconciled before any observance claim is made.',
   cityEvidence:[
    {cityId:city,factId:city+'-coordinate-source',localRelevance:'Coordinates and horizon parameters must be supported by documented station-specific source evidence.',sourceUrl:'https://www.geonames.org/'},
    {cityId:city,factId:city+'-solar-convention',localRelevance:'Official clock and astronomical convention data should be individually verified for this location.',sourceUrl:'https://packolkata.imd.gov.in/panchang/en'}
   ]
  }
 };
}
test('complete reviewed-looking specimen may pass STRUCTURAL value gate, never scientific approval',()=>{
 const a=syntheticReviewed();
 assert.deepEqual(inspectCityDay(a),[]);
 const report=assessFirstRelease([a]);
 assert.equal(report.readyForHumanReleaseReview,true);
 assert.equal(report.scientificApprovalGranted,false);
 assert.equal(report.automaticIndexingAuthorized,false);
});
test('no approvals means no indexable or release-ready output',()=>{
 assert.equal(assessFirstRelease([]).readyForHumanReleaseReview,false);
});
test('reject untrusted dates, time span and missing nakshatra timeline',()=>{
 const a=syntheticReviewed();
 a.sun.nextSunriseUtc='2026-10-16T13:00:00Z';
 assert.ok(inspectCityDay(a).includes('invalid-local-solar-day'));
 const b=syntheticReviewed();
 delete b.transitions.nakshatra;
 assert.ok(inspectCityDay(b).includes('missing-nakshatra-timeline'));
 const c=syntheticReviewed();c.date='2026-02-30';
 assert.ok(inspectCityDay(c).includes('unapproved-city-day-identity'));
});
test('reject missing local proof, different-city evidence and filler',()=>{
 const a=syntheticReviewed();
 a.editorial.cityEvidence[0].cityId='mumbai';
 assert.ok(inspectCityDay(a).includes('missing-two-grounded-local-facts'));
 const b=syntheticReviewed();b.editorial.cityEvidence[0].sourceUrl='https://example.com/source';
 assert.ok(inspectCityDay(b).includes('missing-two-grounded-local-facts'));
});
test('reject copied city text after stripping names, regardless of apparent city switch',()=>{
 const a=syntheticReviewed('delhi'),b=syntheticReviewed('mumbai');
 b.sun.sunriseUtc='2026-10-16T01:10:00Z';
 b.sun.nextSunriseUtc='2026-10-17T01:10:00Z';
 for(const k of Object.keys(b.transitions)){
   b.transitions[k][0].startUtc=b.sun.sunriseUtc;
   b.transitions[k][0].endUtc=b.sun.nextSunriseUtc;
 }
 b.sun.sunsetUtc='2026-10-16T12:40:00Z';
 const report=assessFirstRelease([a,b]);
 assert.ok(report.rows.some(x=>x.issues.includes('near-duplicate-after-city-replacement')));
 assert.ok(similarity(a.editorial.body,b.editorial.body)>.99);
});
test('same-city same-date repeated release disallowed',()=>{
 const a=syntheticReviewed();
 const r=assessFirstRelease([a,structuredClone(a)]);
 assert.ok(r.rows[1].issues.includes('duplicate-city-day'));
});
test('shared geocentric lunar times allowed but copied sunrise between cities disallowed',()=>{
 const a=syntheticReviewed('delhi'),b=syntheticReviewed('mumbai');
 const report=assessFirstRelease([a,b]);
 assert.ok(report.rows.some(x=>x.issues.includes('identical-cross-city-sunrise')));
});

test('all ten city IDs are eligible for future REVIEWED dates, never self-authorized',()=>{
 const cities=['delhi','mumbai','kolkata','chennai','bengaluru','hyderabad','ahmedabad','pune','jaipur','varanasi'];
 for(const city of cities){
  const specimen=syntheticReviewed(city);
  assert.deepEqual(inspectCityDay(specimen),[],city);
  specimen.status='UNAPPROVED_RESEARCH';
  assert.ok(inspectCityDay(specimen).includes('unapproved-city-day-identity'),city);
 }
 const other=syntheticReviewed('not-a-city');
 assert.ok(inspectCityDay(other).includes('unapproved-city-day-identity'));
});
