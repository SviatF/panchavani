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
  const record={cityId:'delhi',date:'2026-10-16',status:'approved'};
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
  const record={cityId:'delhi',date:'2026-10-16',status:'approved'};
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
