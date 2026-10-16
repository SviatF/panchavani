import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.mjs';
import {skinAdminResponse,ADMIN_UI_VERSION} from '../src/console-ui.mjs';
import {readDashboardMetrics,renderCommandCenter} from '../src/console-dashboard.mjs';
import {scienceOverview,handleScienceConsole} from '../src/science-console.mjs';

const ACTOR='owner@example.test';
const access={access:{getIdentity:async()=>({email:ACTOR})}};
const allow={ALLOWED_ADMIN_EMAILS:ACTOR};
const url=path=>'https://admin.panchavani.com'+path;
function db(){
 const queries=[];
 return {queries,
  prepare(sql){queries.push(sql);return {
   async first(){if(sql.includes('sqlite_master'))return {n:1};
    if(sql.includes('automated_research_import_slots'))return {n:47};
    if(sql.includes('editorial_one_shot'))return {n:3};
    if(sql.includes('COUNT(DISTINCT city_id)'))return {n:25};
    return {n:50}},
   async all(){
    if(sql.includes('name FROM sqlite_master'))return {results:[
     'job_requests','research_candidates','editorial_one_shot','private_research_handoff_slots','audit_log'
    ].map(name=>({name}))};
    if(sql.includes('FROM research_candidates')&&sql.includes('GROUP BY city_id'))
     return {results:[{city_id:'delhi',n:2},{city_id:'chennai',n:2}]};
    if(sql.includes('GROUP BY status'))return {results:[{status:'stored',n:47}]};
    return {results:[]};
   }
  }}
 };
}
test('cinematic shell is applied to private HTML only and preserves security headers',async()=>{
 const r=new Response('<!doctype html><html><head><title>A</title></head><body><h1>A</h1><form action="/jobs"></form></body></html>',{
  status:200,headers:{'Content-Type':'text/html; charset=utf-8',
   'X-Robots-Tag':'noindex,nofollow','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'"}
 });
 const req=new Request(url('/research/daily'));
 const skin=await skinAdminResponse(r,req);
 const markup=await skin.text();
 assert.match(markup,new RegExp(ADMIN_UI_VERSION));
 assert.match(markup,/PANCHAVANI/);
 assert.match(markup,/Command Center/);
 assert.match(markup,/Science gates/);
 assert.match(markup,/Import telemetry/);
 assert.match(markup,/form action="\/jobs"/);
 assert.match(markup,/aria-current="page"/);
 assert.match(markup,/prefers-reduced-motion/);
 assert.match(markup,/pv-workspace/);
 assert.match(markup,/pv-topbar/);
 assert.equal(skin.headers.get('X-Robots-Tag'),'noindex,nofollow');
 assert.match(skin.headers.get('Content-Security-Policy'),/default-src 'none'/);
 assert.doesNotMatch(markup,/https?:\/\/fonts\.|<script\b/i);
 assert.doesNotMatch(markup,/https?:\/\/cdn\./i);
});
test('deny pages, JSON responses and forbidden cross-host routes never get decorative shell',async()=>{
 const req=new Request(url('/api/status'));
 const json=await skinAdminResponse(new Response('{"ok":true}',{headers:{'Content-Type':'application/json'}}),req);
 assert.equal(await json.text(),'{"ok":true}');
 const blocked=await skinAdminResponse(new Response('<html><head></head><body>Forbidden</body></html>',{status:403,headers:{'Content-Type':'text/html'}}),req);
 assert.doesNotMatch(await blocked.text(),/pv-workspace/);
 const unrelated=await skinAdminResponse(new Response('<html><head></head><body>Unrelated</body></html>',{
  headers:{'Content-Type':'text/html'}
 }),new Request('https://somewhere.example/'));
 assert.doesNotMatch(await unrelated.text(),/pv-workspace/);
});
test('Command Center reports real D1 counts and retains legacy operator forms inside Advanced',async()=>{
 const fake=db();
 const env={...allow,DB:fake,CANDIDATES:{},INGEST_INBOX:{},AUTO_RESEARCH_IMPORT_ENABLED:'true'};
 const result=await worker.fetch(new Request(url('/')),env,access);
 assert.equal(result.status,200);
 const text=await result.text();
 assert.match(text,/Command Center/);
 assert.match(text,/Production pipeline/);
 assert.match(text,/Research candidates/);
 assert.match(text,/Cities in research D1/);
 assert.match(text,/Advanced operations/);
 assert.match(text,/action="\/research\/import"/);
 assert.match(text,/action="\/jobs"/);
 assert.match(text,/aria-current="page"/);
 assert.equal(result.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');
 assert.match(result.headers.get('Content-Security-Policy'),/default-src 'none'/);
 assert.ok(fake.queries.some(s=>s.includes('COUNT(DISTINCT city_id)')));
});
test('Failed private D1 counts are UNKNOWN, never optimistic 0',async()=>{
 const stats=await readDashboardMetrics({DB:{prepare(){throw Error('not configured')}}});
 assert.equal(stats.candidates,null);
 assert.equal(stats.cities,null);
 const content=renderCommandCenter({actor:ACTOR,jobs:[],pilot:{importReady:false},
  configured:false,pipelineReady:false,metrics:stats});
 assert.match(content,/Research candidates/);
 assert.match(content,/—/);
 assert.doesNotMatch(content,/Stored, not scientifically approved<\/small><\/div><div class="pv-metric"><span>Cities in research D1<\/span><strong>0<\/strong>/);
});
test('Science gates page is Access protected, read-only and truthfully research-only',async()=>{
 const fake=db();
 const env={...allow,DB:fake};
 const blocked=await worker.fetch(new Request(url('/science/overview')),env,{});
 assert.equal(blocked.status,403);
 const result=await worker.fetch(new Request(url('/science/overview')),env,access);
 assert.equal(result.status,200);
 const page=await result.text();
 assert.match(page,/Science gates/);
 assert.match(page,/GATE 03/);
 assert.match(page,/Nakshatra and Yoga are not calculated/);
 assert.match(page,/UNAPPROVED RESEARCH/);
 assert.match(page,/Research explorer|Open detailed date explorer/);
 assert.match(page,/No science sign-off or public SEO release/);
 assert.doesNotMatch(page,/scientifically approved: yes/);
 assert.equal(result.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');
 assert.match(page,/pv-sidebar/);
 const wrong=await handleScienceConsole(new Request(url('/science/overview'),{method:'POST'}),env,ACTOR);
 assert.equal(wrong.status,405);
});
test('public API remains unchanged except additive Admin UI version',async()=>{
 const data=await worker.fetch(new Request(url('/api/status')),allow,access);
 const json=await data.json();
 assert.equal(typeof json.adminUiVersion,'string');
 assert.equal(json.privacy,'authenticated');
 assert.equal(json.publishing,'disabled');
 assert.equal(json.automation.nightlyIngestion.enabled,false);
});
