import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultPilotStart,pilotWeekCensus,handleSciencePilotWeek
} from '../src/science-pilot-week.mjs';

test('21 exact seven-day rows and no scientific or model approval',async()=>{
 let n=0;
 const report=await pilotWeekCensus({},'2026-10-20',async (_env,city,day)=>{
   n++;
   assert(['delhi','mumbai','chennai'].includes(city));
   assert(day>='2026-10-20'&&day<='2026-10-26');
   return {state:'missing'};
 });
 assert.equal(n,21);
 assert.equal(report.rows.length,21);
 assert.equal(new Set(report.rows.map(x=>x.cityId+' '+x.localDate)).size,21);
 assert.equal(report.count.sourceShaVerified,0);
 assert.equal(report.count.missingOrUnverifiable,21);
 assert.equal(report.scientificReviewSigned,false);
 assert.equal(report.modelInvocationAuthorized,false);
 assert.equal(report.indexingAuthorized,false);
 assert.equal(report.publicationAuthorized,false);
 assert.deepEqual(report.approvedClaimsForDeepSeek,[]);
});
test('broken research row is marked as failed QA, never as approved',async()=>{
 const report=await pilotWeekCensus({},'2026-10-20',async (_env,city,date)=>
  city==='delhi'&&date==='2026-10-20'?
  {state:'research',record:{},sha256:'f'.repeat(64)}:{state:'missing'});
 assert.equal(report.count.sourceShaVerified,1);
 assert.equal(report.count.internalConsistencyPassed,0);
 assert.equal(report.rows[0].internalConsistency,'INTERNAL_CONSISTENCY_FAILURE');
 assert.equal(report.rows[0].approvalForDeepSeek,false);
});
test('Access boundary, method and storage are fail-closed',async()=>{
 const u='https://admin.panchavani.com/science/pilot-week.json?start=2026-10-20';
 assert.equal((await handleSciencePilotWeek(new Request(u),{},null)).status,403);
 assert.equal((await handleSciencePilotWeek(new Request(u,{method:'POST'}),{},'editor')).status,405);
 assert.equal((await handleSciencePilotWeek(new Request(u.replace('2026-10-20','2026-02-30')),{},'editor')).status,400);
 assert.equal((await handleSciencePilotWeek(new Request(u),{},'editor')).status,503);
});
test('date picker defaults to seven India-local dates ending today',()=>{
 assert.equal(defaultPilotStart(new Date('2026-10-26T02:00:00Z')),'2026-10-19');
 assert.equal(defaultPilotStart(new Date('2026-10-26T18:30:00Z')),'2026-10-20');
});
