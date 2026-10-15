import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readCityResearchDay,handleResearchDay} from '../src/research-daily.mjs';
import {CITY_META,CATALOG_VERSION} from '../src/city-catalog.mjs';

const id=randomUUID();
const s='2026-10-16T00:50:00Z',t='2026-10-16T12:20:00Z',n='2026-10-17T00:50:00Z';
const meta=CITY_META.get('delhi');
const valid={
 schemaVersion:'1.0.0',recordId:'delhi:2026-10-16:official-jpl',
 status:'calculated',approvedBy:null,releaseId:null,localDate:'2026-10-16',
 city:{id:'delhi',lat:meta.latitude,lon:meta.longitude,
  elevationMeters:meta.elevationMeters,catalogVersion:CATALOG_VERSION,
  tz:'Asia/Kolkata'},
 methodology:{ephemerisHash:'c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2',
  ayanamsa:'NOT_VALIDATED',rulePackId:'NONE',
  sunriseConvention:'Skyfield Sun upper limb, geocentric horizon -50 arcmin'},
 validation:{blockerCount:4,reviewStatus:'not-reviewed'},
 sun:{sunriseUtc:s,sunsetUtc:t,nextSunriseUtc:n},
 panchangAtSunrise:{tithi:'Shukla Shashthi',karana:'Bava',
  vara:'Friday',paksha:'Shukla',nakshatra:null,yoga:null},
 transitions:[{type:'tithi',value:'Shukla Shashthi',startUtc:s,endUtc:n},
 {type:'karana',value:'Bava',startUtc:s,endUtc:n},
 {type:'rahu-kalam',value:'Rahu Kalam',startUtc:'2026-10-16T02:00:00Z',endUtc:'2026-10-16T03:00:00Z'}]
};
const sha=raw=>createHash('sha256').update(raw).digest('hex');
function makeEnv(candidate=valid,{tamper=false,missing=false}={}){
 const original=JSON.stringify(candidate),hash=sha(original);
 const row={job_id:id,city_id:'delhi',local_date:'2026-10-16',
  content_hash:hash,r2_key:'unapproved/'+id+'/'+hash+'.json'};
 let reads=0;
 const env={
  DB:{prepare(sql){return{
    bind(...args){return{async first(){
     assert.equal(args[0],'delhi');assert.equal(args[1],'2026-10-16');
     return row;
    }}},
    async all(){return{results:[{city_id:'delhi',local_date:'2026-10-16'}]}}
  }}},
  CANDIDATES:{async get(key){reads++;assert.equal(key,row.r2_key);
   return missing?null:{text:async()=>tamper?original+'tampered':original};
  }}
 };
 return {env,get reads(){return reads}};
}
test('read-only real JPL candidate preview shows true city/time while remaining non-indexable',async()=>{
 const e=makeEnv();
 const x=await readCityResearchDay(e.env,'delhi','2026-10-16');
 assert.equal(x.state,'research');
 assert.equal(x.record.status,'calculated');
 const page=await handleResearchDay(new Request(
  'https://admin.panchavani.com/research/daily?city=delhi&date=2026-10-16'),
  e.env,'owner@example.test');
 assert.equal(page.status,200);
 assert.equal(page.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');
 const body=await page.text();
 assert.match(body,/Shukla Shashthi/);
 assert.match(body,/Rahu Kalam/);
 assert.match(body,/Nakshatra/);
 assert.match(body,/Methodology pending/);
 assert.match(body,/UNAPPROVED ASTRONOMY RESEARCH/);
 assert.match(body,/DeepSeek used: 0 calls/);
 assert.equal(body.includes('Approved for publication'),false);
 assert.equal(e.reads,2);
});
test('anonymous and invalid selector cannot reach private D1 or R2',async()=>{
 let touched=0;
 const env={DB:{prepare(){touched++;throw Error('not allowed')}},CANDIDATES:{}};
 const req=new Request('https://admin.panchavani.com/research/daily?city=delhi&date=2026-10-16');
 assert.equal((await handleResearchDay(req,env,null)).status,403);
 assert.equal((await handleResearchDay(new Request(
   'https://admin.panchavani.com/research/daily?city=bad&date=2026-10-16'),
   env,'admin')).status,503);
 assert.equal(touched,1); // latest city list query, no candidate read
});
test('altered, missing, or falsely approved R2 candidate is never displayed',async()=>{
 const bad=makeEnv(valid,{tamper:true});
 assert.equal((await readCityResearchDay(bad.env,'delhi','2026-10-16')).state,'integrity');
 const none=makeEnv(valid,{missing:true});
 assert.equal((await readCityResearchDay(none.env,'delhi','2026-10-16')).state,'object-missing');
 const approved=makeEnv({...valid,status:'approved',approvedBy:'hacker'});
 assert.equal((await readCityResearchDay(approved.env,'delhi','2026-10-16')).state,'integrity');
});
