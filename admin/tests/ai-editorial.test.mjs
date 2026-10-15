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
 const calls=[],slots=new Map();
 return {
  calls,slots,
  prepare(sql){
   return {
    bind(...args){
     return {
      async first(){
       calls.push({sql,args});
       if(sql.includes('FROM job_requests'))return hasCandidate?record:null;
       if(sql.includes('SELECT job_id,source_hash,status,r2_key'))return slots.get(args.slice(0,4).join('|'))||null;
       if(sql.includes('COUNT(*)'))return {n:count};
       return null;
      },
      async run(){
       calls.push({sql,args});
       if(sql.includes('INSERT OR IGNORE INTO editorial_one_shot')){
         const key=args.slice(0,4).join('|');
         if(slots.has(key))return {meta:{changes:0}};
         slots.set(key,{job_id:args[4],source_hash:args[5],status:'reserved'});
       }
       if(sql.includes("UPDATE editorial_one_shot SET status='stored'")){
         const key=args.slice(2,6).join('|'),row=slots.get(key);
         if(!row)return {meta:{changes:0}};
         row.status='stored';row.r2_key=args[0];row.content_hash=args[1];
       }
       if(sql.includes("UPDATE editorial_one_shot SET status='failed'")){
         const key=args.slice(1,5).join('|'),row=slots.get(key);
         if(row){row.status='failed';row.error_code=args[0];}
       }
       return {success:true,meta:{changes:1}};
      }
     };
    },
    async all(){
     if(sql.includes('FROM editorial_one_shot'))
       return {results:[...slots.entries()].map(([key,row])=>{
        const [city_id,local_date,intent,language]=key.split('|');
        return {city_id,local_date,intent,language,status:row.status,
          error_code:row.error_code||null,policy_version:'v3'};
       })};
     return {results:hasCandidate?[{id:jobId,city_id:'delhi',local_date:'2026-10-13'}]:[]};
    }
   };
  }
 };
}
function fakeEnv(opts={}){
 const writes=[];
 const store={
  writes,
  async get(key){
   if(key===r2Key)return {text:async()=>raw};
   const draft=writes.find(x=>x.key===key);
   return draft?{text:async()=>draft.data}:null;
  },
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
  assert.deepEqual(packet.evidenceState.approvedDaySpecificFacts,[]);
  assert.equal(packet.evidenceState.astronomyVerified,false);
  assert.equal('researchAstronomy_DO_NOT_PUBLISH' in packet,false);
  const transmitted=JSON.stringify(packet);
  assert.equal(transmitted.includes('Shukla Tritiya'),false);
  assert.equal(transmitted.includes(utc.sunriseUtc),false);
  assert.equal(transmitted.includes(candidate.panchangAtSunrise.karana),false);
  if(expect)expect(packet);
  return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(modelDraft)}}],usage:{prompt_tokens:341,completion_tokens:173}}),{status:200});
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
 assert.equal(packet.evidenceState.astronomyVerified,false);
 assert.deepEqual(packet.approvedLocalRitualRules,[]);
 assert.deepEqual(packet.approvedAstronomicalFacts,[]);
 assert.ok(msgs[0].content.toLowerCase().includes('return only a json object'));
});
test('reader-first prompt keeps unapproved astronomy out of the model and separates audit language',()=>{
 const msgs=buildEditorialPrompt(candidate,location,'daily-panchang','en',hash);
 const research=JSON.parse(msgs[1].content.split('\n').at(-1));
 assert.equal(research.city,'Delhi');
 assert.equal(research.timezone,'Asia/Kolkata');
 assert.deepEqual(research.approvedAstronomicalFacts,[]);
 assert.ok(msgs[0].content.includes('INTERNAL ONLY'));
 assert.ok(msgs[0].content.includes('reader'));
 assert.ok(!JSON.stringify(research).includes('Shukla Tritiya'));
 assert.ok(!JSON.stringify(research).includes(utc.sunsetUtc));
});
test('leaky initial Chennai-style research prose is flagged before any public review',()=>{
 const original={
  ...modelDraft,
  headline:'Chennai Panchang Study: Sunrise Anchor and Day Structure',
  seoTitle:'Chennai Panchang Research: Sunrise Anchor for 16 Oct 2026',
  metaDescription:'Research note on how Chennai sunrise anchors the day; data are unverified.',
  introduction:'This is a research-only note for Chennai. No public guidance is offered.',
  localContext:'This draft uses a sunrise convention but its methodology is unverified.',
  dailyUnderstanding:'Here the draft lists Shukla Shashthi and Kaulava, none validated.',
  uncertaintyNote:'No approved facts or regional rules are available.',
  faq:[]
 };
 const flags=draftIssues(original,CITY_META.get('chennai'));
 assert.ok(flags.includes('internal-research-status-leaked-into-reader-copy'));
 assert.ok(flags.includes('unapproved-day-specific-panchang-value'));
 assert.ok(flags.includes('seo-release-disabled'));
});
test('reader-friendly educational copy is not incorrectly flagged as fabricated timing or disclaimer',()=>{
 const safe={...modelDraft,
  headline:'Understanding local sunrise in Delhi Panchang',
  seoTitle:'Delhi Panchang Guide: Why the City Matters',
  metaDescription:'Explore how city location and the sunrise anchor shape the way a Panchang is read.',
  introduction:'A local Panchang combines lunar cycles and a specific sunrise convention.',
  localContext:'Readers in Delhi can compare the local date and calculation convention before consulting daily details.',
  dailyUnderstanding:'Use the city calendar to distinguish a lunar transition from the civil clock. For ceremony planning, consult the appropriate regional tradition.',
  uncertaintyNote:'Day-specific values still require independent review.',
  faq:[]
 };
 const flags=draftIssues(safe,CITY_META.get('delhi'));
 assert.equal(flags.includes('internal-research-status-leaked-into-reader-copy'),false);
 assert.equal(flags.includes('unapproved-day-specific-panchang-value'),false);
 assert.ok(flags.includes('scientific-verification-required'));
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
 assert.match(text,/Input tokens: <strong>341<\/strong>/);
 assert.match(text,/Output tokens: <strong>173<\/strong>/);
 assert.ok(!text.includes(env.DEEPSEEK_API_KEY));
 assert.equal(response.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');
});
test('same city/date/content/language returns cached copy without a second paid request',async()=>{
 const env=fakeEnv();
 let charged=0;
 const once=async(...args)=>{charged++;return mockDeepSeek()(...args);};
 const first=await handleAi(form(),env,actor,isTrustedBrowserPost,once);
 assert.equal(first.status,200);
 const repeat=await handleAi(form(),env,actor,isTrustedBrowserPost,
   ()=>{throw Error('CACHED CONTENT SHOULD NEVER CALL THE PROVIDER')});
 assert.equal(repeat.status,200);
 assert.equal(charged,1);
 assert.equal(env.writes.length,1);
 assert.equal(env.DB.slots.size,1);
 const cached=await repeat.text();
 assert.match(cached,/UNAPPROVED AI RESEARCH/);
 assert.match(cached,/Input tokens: <strong>341<\/strong>/);
 assert.match(cached,/Output tokens: <strong>173<\/strong>/);
});
test('malformed object FAQ remains STORED and readable from R2 without a second paid request',async()=>{
 const env=fakeEnv();
 let paid=0;
 const malformed={...modelDraft,
   faq:{question:'How do I read a local Panchang?',answer:'Start with city and local sunrise.'}
 };
 const model=async()=>{
   paid++;
   return new Response(JSON.stringify({choices:[{
     finish_reason:'stop',message:{content:JSON.stringify(malformed)}
   }],usage:{prompt_tokens:505,completion_tokens:202}}),{status:200});
 };
 const generated=await handleAi(form(),env,actor,isTrustedBrowserPost,model);
 assert.equal(generated.status,200);
 assert.equal(env.DB.slots.size,1);
 assert.equal([...env.DB.slots.values()][0].status,'stored');
 assert.equal(env.writes.length,1);
 const initial=await generated.text();
 assert.match(initial,/How do I read a local Panchang/);
 assert.match(initial,/saved FAQ format requires editorial review/);
 const stored=JSON.parse(env.writes[0].data);
 assert.deepEqual(stored.draft.faq,malformed.faq);
 assert.ok(stored.reviewBlockers.includes('invalid-faq'));
 const cached=await handleAi(form(),env,actor,isTrustedBrowserPost,
   ()=>{throw new Error('Repeat must not call the model')});
 assert.equal(cached.status,200);
 const html=await cached.text();
 assert.match(html,/How do I read a local Panchang/);
 assert.match(html,/Input tokens: <strong>505<\\/strong>/);
 assert.equal(paid,1);
});
test('null and malformed FAQ entries never crash private draft previews',async()=>{
 for(const badFaq of [null,'free text',[null,42,{question:123,answer:{bad:true}}]]){
  const env=fakeEnv();
  const malformed={...modelDraft,faq:badFaq};
  const reply=await handleAi(form(),env,actor,isTrustedBrowserPost,async()=>new Response(
    JSON.stringify({choices:[{finish_reason:'stop',
      message:{content:JSON.stringify(malformed)}}]}),{status:200}));
  assert.equal(reply.status,200);
  assert.equal([...env.DB.slots.values()][0].status,'stored');
  assert.match(await reply.text(),/FAQ format requires editorial review/);
  const reread=await handleAi(form(),env,actor,isTrustedBrowserPost,
    ()=>{throw new Error('No further model call permitted')});
  assert.equal(reread.status,200);
  assert.match(await reread.text(),/FAQ format requires editorial review/);
 }
});
test('failed one-shot locks repeated attempts instead of charging again',async()=>{
 const env=fakeEnv();
 let calls=0;
 const first=await handleAi(form(),env,actor,isTrustedBrowserPost,async()=>{calls++;throw Error('provider connection lost')});
 assert.equal(first.status,502);
 const repeat=await handleAi(form(),env,actor,isTrustedBrowserPost,async()=>{calls++;throw Error('should not call')});
 assert.equal(repeat.status,409);
 assert.equal(calls,1);
});
test('manual account check verifies provider readiness without calling completion or revealing balance',async()=>{
 const env=fakeEnv();
 let requests=0;
 const checker=async(url,opts)=>{
   requests++;assert.equal(url,'https://api.deepseek.com/user/balance');
   assert.equal(opts.method,'GET');
   assert.equal(opts.headers.Authorization,'Bearer test-server-side-secret-only');
   return new Response(JSON.stringify({is_available:true,
     balance_infos:[{total_balance:'DELIBERATELY-HIDDEN-BALANCE'}]}),{status:200});
 };
 const resp=await handleAi(new Request('https://admin.panchavani.com/ai/provider-status'),
    env,actor,isTrustedBrowserPost,checker);
 assert.equal(resp.status,200);assert.equal(requests,1);
 const content=await resp.text();
 assert.match(content,/provider-ready/);
 assert.equal(content.includes('DELIBERATELY-HIDDEN-BALANCE'),false);
 assert.equal(content.includes(env.DEEPSEEK_API_KEY),false);
 assert.equal(env.DB.slots.size,0);
 const denied=await handleAi(new Request('https://admin.panchavani.com/ai/provider-status'),
    env,null,isTrustedBrowserPost,()=>{throw Error('should not call')});
 assert.equal(denied.status,403);
 const noFunds=await handleAi(new Request('https://admin.panchavani.com/ai/provider-status'),
    env,actor,isTrustedBrowserPost,async()=>new Response(JSON.stringify({is_available:false}),{status:200}));
 assert.match(await noFunds.text(),/provider-insufficient-balance/);
 const authFail=await handleAi(new Request('https://admin.panchavani.com/ai/provider-status'),
    env,actor,isTrustedBrowserPost,async()=>new Response('secret provider body',{status:401}));
 const authContent=await authFail.text();
 assert.match(authContent,/provider-http-401/);
 assert.equal(authContent.includes('secret provider body'),false);
});
test('DeepSeek HTTP errors are classified without leaking provider text or creating repeat charges',async()=>{
 const env=fakeEnv();
 let billedRequests=0;
 const result=await handleAi(form(),env,actor,isTrustedBrowserPost,async()=>{
  billedRequests++;
  return new Response('provider account private error must not leak',{status:402});
 });
 assert.equal(result.status,502);
 const displayed=await result.text();
 assert.match(displayed,/provider-http-402/);
 assert.equal(displayed.includes('provider account private'),false);
 const slot=[...env.DB.slots.values()][0];
 assert.equal(slot.status,'failed');
 assert.equal(slot.error_code,'provider-http-402');
 const next=await handleAi(form(),env,actor,isTrustedBrowserPost,async()=>{
  billedRequests++;throw Error('Should not retry');
 });
 assert.equal(next.status,409);
 assert.equal(billedRequests,1);
 const admin=await handleAi(new Request('https://admin.panchavani.com/ai'),env,actor,isTrustedBrowserPost);
 const dashboard=await admin.text();
 assert.match(dashboard,/provider-http-402/);
 assert.equal(dashboard.includes('provider account private'),false);
});
test('truncated model JSON and partial R2 failure get separate, safe locked codes',async()=>{
 const truncated=fakeEnv();
 const reply=await handleAi(form(),truncated,actor,isTrustedBrowserPost,async()=>new Response(
  JSON.stringify({choices:[{finish_reason:'length',message:{content:'{}'}}]}),{status:200}));
 assert.equal(reply.status,502);
 assert.match(await reply.text(),/provider-output-truncated/);
 assert.equal([...truncated.DB.slots.values()][0].error_code,'provider-output-truncated');
 const storage=fakeEnv();
 storage.CANDIDATES.put=async()=>{throw Error('private R2 binding secret must not leak')};
 const storageReply=await handleAi(form(),storage,actor,isTrustedBrowserPost,mockDeepSeek());
 assert.equal(storageReply.status,502);
 const body=await storageReply.text();
 assert.match(body,/private-r2-or-d1-store-failed/);
 assert.equal(body.includes('private R2 binding secret'),false);
 assert.equal([...storage.DB.slots.values()][0].error_code,'private-r2-or-d1-store-failed');
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
