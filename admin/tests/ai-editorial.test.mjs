import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import worker, {isTrustedBrowserPost} from '../src/index.mjs';
import {handleAi,buildEditorialPrompt,draftIssues} from '../src/ai-editorial.mjs';
import {CATALOG_VERSION,CITY_META} from '../src/city-catalog.mjs';

const actor='admin@example.test',jobId=randomUUID();
const location=CITY_META.get('delhi');
const utc={sunriseUtc:'2026-10-13T00:50:00Z',
           sunsetUtc:'2026-10-13T12:20:00Z',
           nextSunriseUtc:'2026-10-14T00:50:00Z'};
const candidate={
 schemaVersion:'1.0.0',recordId:'delhi:2026-10-13:research',
 city:{id:'delhi',lat:location.latitude,lon:location.longitude,
       elevationMeters:location.elevationMeters,tz:location.timezone,
       catalogVersion:CATALOG_VERSION},
 localDate:'2026-10-13',status:'calculated',approvedBy:null,releaseId:null,
 methodology:{ephemerisHash:'b'.repeat(64),ayanamsa:'NOT_VALIDATED',rulePackId:'NONE'},
 validation:{blockerCount:4,reviewStatus:'not-reviewed'},
 panchangAtSunrise:{tithi:'Shukla Tritiya',nakshatra:null,yoga:null,karana:null},
 sun:utc,transitions:[{type:'tithi',startUtc:utc.sunriseUtc,endUtc:utc.nextSunriseUtc,value:'Shukla Tritiya'}]
};
const raw=JSON.stringify(candidate);
const hash=createHash('sha256').update(raw).digest('hex');
const r2Key='unapproved/'+jobId+'/'+hash+'.json';
const record={id:jobId,city_id:'delhi',local_date:'2026-10-13',
 status:'candidate',candidate_hash:hash,content_hash:hash,r2_key:r2Key};
const modelDraft={
 headline:'What does the local Panchang day mean in Delhi?',
 seoTitle:'Delhi Panchang: a guide to understanding the day',
 metaDescription:'How Delhi readers can interpret a local Panchang day and why independent verification matters for devotional decisions.',
 introduction:'Delhi calendars depend on the adopted local sunrise point. These research calculations are not yet validated and must not be relied on for exact worship times.',
 localContext:'Delhi readers can compare the method used for their city with a neighboring city, but cannot infer a festival or ritual decision from raw astronomy alone.',
 dailyUnderstanding:'To know what one may plan today, separately reviewed regional rules and exact timings would be needed. This draft deliberately makes no recommendations.',
 uncertaintyNote:'The calculation and regional observance methodology still require independent expert verification.',
 faq:[{question:'Does a research Panchang show auspicious activities?',
       answer:'No. Research astronomy is not a reviewed local ritual rule.'}],
 referencedFactIds:[]
};
function fakeDb({count=0,hasCandidate=true}={}){
 const calls=[];
 return {
  calls,
  prepare(sql){
   return {
    bind(...args){
     return {
      async first(){
       calls.push({sql,args});
       if(sql.includes('FROM job_requests'))return hasCandidate?record:null;
       if(sql.includes('COUNT(*)'))return {n:count};
       return null;
      },
      async run(){calls.push({sql,args});return {success:true}}
     };
    },
    async all(){return {results:hasCandidate?[{id:jobId,city_id:'delhi',local_date:'2026-10-13'}]:[]}}
   };
  }
 };
}
function fakeEnv(opts={}){
 const writes=[];
 const store={
  writes,
  async get(key){assert.equal(key,r2Key);return {text:async()=>raw}},
  async put(key,data,options){writes.push({key,data,options});}
 };
 return {DB:fakeDb(opts),CANDIDATES:store,DEEPSEEK_API_KEY:'test-server-side-secret-only',writes};
}
function form({origin='https://admin.panchavani.com',site='same-origin',
              path='/ai/draft',id=jobId,intent='daily-panchang',lang='en'}={}){
 return new Request('https://admin.panchavani.com'+path,{
  method:'POST',
  headers:{Origin:origin,'Sec-Fetch-Site':site,'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({jobId:id,intent,language:lang}).toString()
 });
}
function mockDeepSeek(expect){
 return async(url,options)=>{
  assert.equal(url,'https://api.deepseek.com/chat/completions');
  assert.equal(options.method,'POST');
  assert.equal(options.headers.Authorization,'Bearer test-server-side-secret-only');
  const data=JSON.parse(options.body);
  assert.equal(data.response_format.type,'json_object');
  assert.equal(data.thinking.type,'disabled');
  assert.equal(data.messages[0].role,'system');
  assert.equal(data.model,'deepseek-flash');
  const packet=JSON.parse(data.messages[1].content.split('\n').at(-1));
  assert.equal(packet.city,'Delhi');
  assert.equal(packet.approvedAstronomicalFacts.length,0);
  assert.equal(packet.approvedDailyActivities.length,0);
  assert.equal(packet.researchAstronomy_DO_NOT_PUBLISH.sunriseUtc,utc.sunriseUtc);
  if(expect)expect(packet);
  return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(modelDraft)}}]}),{status:200});
 };
}
test('native Cloudflare Access identity required before entering AI workshop',async()=>{
 const env=fakeEnv();
 const req=new Request('https://admin.panchavani.com/ai');
 const denied=await worker.fetch(req,env,{});
 assert.equal(denied.status,403);
 assert.equal(env.writes.length,0);
 const allowed=await worker.fetch(req,{...env,ALLOWED_ADMIN_EMAILS:actor},{access:{getIdentity:async()=>({email:actor})}});
 assert.equal(allowed.status,200);
 assert.match(await allowed.text(),/AI Editorial Drafts/);
 assert.equal(allowed.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');
});
test('GET /ai does not reveal private secret, even to owner',async()=>{
 const env=fakeEnv();
 const reply=await handleAi(new Request('https://admin.panchavani.com/ai'),env,actor,isTrustedBrowserPost);
 const t=await reply.text();
 assert.equal(reply.status,200);
 assert.ok(t.includes('Configured for private draft generation.'));
 assert.ok(!t.includes(env.DEEPSEEK_API_KEY));
});
test('prompt separates unapproved astronomy from approved facts and decision rules',()=>{
 const msgs=buildEditorialPrompt(candidate,location,'vrat','hi',hash);
 const packet=JSON.parse(msgs[1].content.split('\n').at(-1));
 assert.equal(packet.language,'hi');
 assert.equal(packet.researchAstronomy_DO_NOT_PUBLISH.verified,false);
 assert.deepEqual(packet.approvedLocalRitualRules,[]);
 assert.deepEqual(packet.approvedAstronomicalFacts,[]);
 assert.ok(msgs[0].content.includes('Return only a JSON object'));
});
test('valid same-origin posted draft calls DeepSeek server side, stores unapproved R2 draft only',async()=>{
 const env=fakeEnv();
 const response=await handleAi(form(),env,actor,isTrustedBrowserPost,mockDeepSeek());
 assert.equal(response.status,200);
 assert.equal(env.writes.length,1);
 assert.ok(env.writes[0].key.startsWith('unapproved/ai-editorial/'+jobId+'/'));
 const stored=JSON.parse(env.writes[0].data);
 assert.equal(stored.status,'AI_DRAFT_UNAPPROVED');
 assert.equal(stored.publicationAuthorized,false);
 assert.equal(stored.indexingAuthorized,false);
 assert.equal(stored.scienceApproved,false);
 assert.ok(stored.reviewBlockers.includes('human-editorial-review-required'));
 assert.ok(env.DB.calls.some(x=>x.sql.includes('INSERT INTO audit_log')));
 const text=await response.text();
 assert.match(text,/UNAPPROVED AI RESEARCH/);
 assert.ok(!text.includes(env.DEEPSEEK_API_KEY));
 assert.equal(response.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');
});
test('cross-origin form and missing native admin actor never trigger a model call',async()=>{
 const env=fakeEnv();
 const banned=await handleAi(form({origin:'https://evil.example',site:'cross-site'}),env,actor,isTrustedBrowserPost,
   ()=>{throw Error('Should not call model')});
 assert.equal(banned.status,403);
 const none=await handleAi(form(),env,null,isTrustedBrowserPost,
   ()=>{throw Error('Should not call model')});
 assert.equal(none.status,403);
 assert.equal(env.writes.length,0);
});
test('missing Cloudflare DeepSeek secret fails closed without API requests',async()=>{
 const env=fakeEnv();delete env.DEEPSEEK_API_KEY;
 const res=await handleAi(form(),env,actor,isTrustedBrowserPost,()=>{throw Error('Never fetch')});
 assert.equal(res.status,503);
 assert.equal(env.writes.length,0);
});
test('invalid job, wrong research status and exhausted daily budget never call provider',async()=>{
 const env=fakeEnv({count:3});
 const bad=await handleAi(form({id:'invalid'}),env,actor,isTrustedBrowserPost,()=>{throw Error('Never fetch')});
 assert.equal(bad.status,400);
 const limit=await handleAi(form(),env,actor,isTrustedBrowserPost,()=>{throw Error('Never fetch')});
 assert.equal(limit.status,429);
 const wrong=fakeEnv({hasCandidate:false});
 const missing=await handleAi(form(),wrong,actor,isTrustedBrowserPost,()=>{throw Error('Never fetch')});
 assert.equal(missing.status,409);
});
test('fake HTML, imaginary time, and made-up citation flagged for review',()=>{
 const bad={...modelDraft,localContext:'The best time to marry is 10:25.',
   referencedFactIds:['fake-source'],introduction:'<script>alert(1)</script>'};
 const flags=draftIssues(bad,location);
 assert.ok(flags.includes('fabricated-time-risk'));
 assert.ok(flags.includes('unsupported-ritual-claim'));
 assert.ok(flags.includes('unverified-citation'));
 assert.ok(flags.includes('seo-release-disabled'));
});
