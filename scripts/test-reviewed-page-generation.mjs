import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,access,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const generator=fileURLToPath(new URL('./generate-reviewed-pages.mjs',import.meta.url));
const digest=raw=>createHash('sha256').update(JSON.stringify(raw)).digest('hex');
async function temporary(){
 const dir=await mkdtemp(path.join(tmpdir(),'panchavani-reviewed-routes-'));
 await mkdir(path.join(dir,'data'),{recursive:true});
 await writeFile(path.join(dir,'data','approved-seo-days.json'),JSON.stringify({schemaVersion:1,releaseStatus:'NO_APPROVED_DAY_SEO_ROUTES',records:[]})+'\n');
 await mkdir(path.join(dir,'app','panchang'),{recursive:true});
 return dir;
}
async function put(dir,data){
 await writeFile(path.join(dir,'data','approved-panchang.json'),JSON.stringify(data)+'\n');
}
const run=(cwd,sha)=>spawnSync(process.execPath,[generator],{
 cwd,encoding:'utf8',env:{...process.env,PANCHAVANI_APPROVED_RELEASE_SHA256:sha||''}
});
const pathFor=(dir,city,date)=>path.join(dir,'app','panchang',city,date,'page.tsx');

function syntheticFullRecord(city='delhi'){
 const start='2026-10-16T00:50:00Z',end='2026-10-17T00:50:00Z';
 const labels={tithi:'Shukla Shashthi',karana:'Kaulava',nakshatra:'Jyestha',yoga:'Shobhana'};
 return {
  cityId:city,date:'2026-10-16',timezone:'Asia/Kolkata',status:'approved',
  releaseId:'synthetic-test-release',sourceRecordHash:'a'.repeat(64),
  releaseEvidence:{
    reviewer:'Test Reviewer',scientificReviewer:'Test Astronomer',
    reviewStatus:'domain-reviewed',blockerCount:0,
    geoSource:'Reviewed city point used only by synthetic fixture',
    approvedAt:'2026-10-16T13:00:00Z',
    comparisons:['test-compare-1','test-compare-2'],sourceIds:['source-1','source-2']
  },
  sun:{sunriseUtc:start,sunsetUtc:'2026-10-16T12:20:00Z',nextSunriseUtc:end},
  panchang:{...labels,vara:'Friday',paksha:'Shukla'},
  transitions:Object.fromEntries(Object.entries(labels).map(([kind,name])=>
   [kind,[{name,startUtc:start,endUtc:end}]])),
  editorial:{
   reviewedBy:'Test Reviewer',
   body:('An example review explains how local sunrise and the dawn-to-dawn window '
    +'change interpretation, while avoiding unsupported religious claims. ').repeat(8),
   localMeaning:'Delhi local sunrise and the defined observation point have to be checked before using time values.',
   readerQuestion:'How is the city-specific dawn time used to interpret this astronomical date?',
   readerAnswer:'Check the chosen coordinates, sunrise calculation, civil timezone and applicable calendar rule before trusting a day label.',
   cityEvidence:[
    {cityId:city,factId:city+'-geodata',localRelevance:'The selected astronomical reference point and its location must be independently verified for this city.',sourceUrl:'https://www.geonames.org/'},
    {cityId:city,factId:city+'-conventions',localRelevance:'The sunrise and lunar event methodology must be referenced to original and separately reviewed sources.',sourceUrl:'https://packolkata.imd.gov.in/panchang/en'}
   ]
  }
 };
}


test('empty evidence emits absolutely zero calendar routes',async()=>{
 const dir=await temporary();
 try{
  await put(dir,{schemaVersion:1,releaseStatus:'NO_APPROVED_RECORDS',records:[]});
  const result=run(dir,'');
  assert.equal(result.status,0,result.stderr);
  const manifest=JSON.parse(await readFile(path.join(dir,'app','panchang','.generated-reviewed-day-paths.json'),'utf8'));
  assert.deepEqual(manifest,[]);
  await assert.rejects(access(pathFor(dir,'delhi','2026-10-16')),{code:'ENOENT'});
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('digest-pinned reviewed routes build once, then stale physical pages are removed',async()=>{
 const dir=await temporary();
 try{
  const record=syntheticFullRecord();
  const approved={schemaVersion:1,releaseStatus:'HUMAN_REVIEWED_WITH_EVIDENCE',records:[record]};
  await put(dir,approved);
  assert.equal(run(dir,'').status,1,'Missing review SHA must block approved route generation');
  await assert.rejects(access(pathFor(dir,'delhi','2026-10-16')),{code:'ENOENT'});
  let result=run(dir,digest(approved));
  assert.equal(result.status,0,result.stderr);
  assert.match(await readFile(pathFor(dir,'delhi','2026-10-16'),'utf8'),/ReviewedDayPage/);
  await put(dir,{schemaVersion:1,releaseStatus:'NO_APPROVED_RECORDS',records:[]});
  result=run(dir,'');
  assert.equal(result.status,0,result.stderr);
  await assert.rejects(access(pathFor(dir,'delhi','2026-10-16')),{code:'ENOENT'});
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('duplicate city/dates and wrong hashes cannot generate public routes',async()=>{
 const dir=await temporary();
 try{
  const record=syntheticFullRecord();
  const duplicate={schemaVersion:1,releaseStatus:'HUMAN_REVIEWED_WITH_EVIDENCE',records:[record,record]};
  await put(dir,duplicate);
  assert.equal(run(dir,digest(duplicate)).status,1);
  assert.equal(run(dir,'0'.repeat(64)).status,1);
  const fake={schemaVersion:1,releaseStatus:'HUMAN_REVIEWED_WITH_EVIDENCE',records:[
   {cityId:'wrong-city',date:'2026-10-16',status:'approved'}]};
  await put(dir,fake);
  assert.equal(run(dir,digest(fake)).status,1);
 }finally{await rm(dir,{recursive:true,force:true})}
});

test('a properly reviewed-looking synthetic Kolkata route can be built, never without exact source SHA',async()=>{
 const dir=await temporary();
 try{
  const record=syntheticFullRecord('kolkata');
  const payload={schemaVersion:1,releaseStatus:'HUMAN_REVIEWED_WITH_EVIDENCE',records:[record]};
  await put(dir,payload);
  assert.equal(run(dir,'').status,1);
  const result=run(dir,digest(payload));
  assert.equal(result.status,0,result.stderr);
  assert.match(await readFile(pathFor(dir,'kolkata','2026-10-16'),'utf8'),/ReviewedDayPage/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
