/** Data-first Command Center. Every number originates in private D1;
 * unavailable reads are shown as unknown rather than made-up success counts.
 */
import {ACTIVE_CITIES} from './city-catalog.mjs';
import {ingestReadiness} from './nightly-import.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;', '"':'&quot;',"'":'&#39;'}[c]));
const safe=(v)=>v===null||v===undefined?'—':(Number.isSafeInteger(Number(v))&&Number(v)>=0?Number(v).toLocaleString('en-US'):'—');
async function count(db,sql){
 if(!db)return null;
 try{
  const row=await db.prepare(sql).first();
  return Number.isSafeInteger(Number(row?.n))&&Number(row.n)>=0?Number(row.n):null;
 }catch{return null}
}
export async function readDashboardMetrics(env){
 const db=env?.DB;
 const [candidates,cities,drafts,imports,failed]=await Promise.all([
  count(db,"SELECT COUNT(*) AS n FROM research_candidates WHERE status='unapproved'"),
  count(db,"SELECT COUNT(DISTINCT city_id) AS n FROM research_candidates WHERE status='unapproved'"),
  count(db,"SELECT COUNT(*) AS n FROM editorial_one_shot WHERE status='stored'"),
  count(db,"SELECT COUNT(*) AS n FROM automated_research_import_slots WHERE status='stored'"),
  count(db,"SELECT COUNT(*) AS n FROM automated_research_import_slots WHERE status='failed'")
 ]);
 return {candidates,cities,drafts,imports,failed,
  importReady:ingestReadiness(env).enabled&&Boolean(env.INGEST_INBOX&&db&&env.CANDIDATES),
  editorialEnabled:env?.AUTO_EDITORIAL_ENABLED==='true'};
}
const metric=(label,value,detail)=>'<div class="pv-metric"><span>'+esc(label)+'</span>'+
 '<strong>'+esc(safe(value))+'</strong><small>'+esc(detail)+'</small></div>';
const link=(href,title,detail)=>'<a class="pv-feature" href="'+href+'"><span>'+
 '<strong>'+esc(title)+'</strong><span>'+esc(detail)+'</span></span><em aria-hidden="true">↗</em></a>';
const pipe=(n,name,body)=>'<div class="pv-pipe"><small>PHASE '+n+
 '</small><h3>'+esc(name)+'</h3><p>'+esc(body)+'</p></div>';
const jobsTable=jobs=>jobs.map(j=>'<tr><td>'+esc(j.city_id)+'</td><td>'+esc(j.local_date)+'</td>'+
 '<td>'+esc(j.status)+'</td><td><code>'+esc(j.candidate_hash?j.candidate_hash.slice(0,12)+'…':(j.error_code||'—'))+
 '</code></td><td>'+esc(j.created_at)+'</td><td>'+esc(j.requested_by)+'</td>'+
 '<td>'+(j.status==='failed'?'<form action="/jobs/retry" method="post">'+
 '<input type="hidden" name="id" value="'+esc(j.id)+'"><button type="submit">Retry research</button></form>':'—')+
 '</td></tr>').join('');
export function renderCommandCenter({actor,jobs,pilot,configured,pipelineReady,metrics}){
 const choices=ACTIVE_CITIES.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
 const tags='<span class="pv-tag">NASA/JPL DE440s</span>'+
  '<span class="pv-tag">Access protected</span><span class="pv-tag">No public release</span>';
 return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<meta name="robots" content="noindex,nofollow,noarchive">'+
 '<title>PANCHAVANI · Command Center</title></head><body>'+
 '<div class="pv-hero"><p class="pv-eyebrow">PANCHAVANI / PRIVATE OPERATIONS · CONTROL 01</p>'+
 '<h1>Command Center<span style="color:#d9ac70">.</span></h1>'+
 '<p>One workspace for the astronomy pipeline, research data, editorial quality and release gates. '+
 'Observe first. Verify before creating public calendar claims.</p>'+
 '<div class="pv-herotags">'+tags+'</div></div>'+
 '<div class="pv-metrics">'+
 metric('Research candidates',metrics.candidates,'Stored, not scientifically approved')+
 metric('Cities in research D1',metrics.cities,'Distinct city IDs')+
 metric('Saved DeepSeek drafts',metrics.drafts,'Private, unapproved research')+
 metric('R2 → D1 imported',metrics.imports,'Completed source records')+
 '</div>'+
 '<div class="pv-sectiontitle"><h2>Production pipeline</h2>'+
 '<a href="/science/overview">Examine science gates ↗</a></div>'+
 '<div class="pv-pipeline">'+
 pipe('01','Acquire','JPL calculations, SHA-verified and saved privately.')+
 pipe('02','Reconcile','Validate independent sources, sidereal limbs and city rules.')+
 pipe('03','Compose','Convert approved facts into useful, natural DeepSeek prose.')+
 pipe('04','Release','Index only independently approved dates with real user value.')+
 '</div>'+
 '<div class="pv-sectiontitle"><h2>Operational workspaces</h2>'+
 '<span class="pv-caption">LIVE LINKS · PRIVATE ONLY</span></div>'+
 '<div class="pv-feature-grid">'+
 link('/research/daily','Research explorer','Browse individual Tithi and Karana transitions from R2, by city and day.')+
 link('/research/ingest-status','JPL import telemetry','See actual R2 manifests, D1 records, conflicts and capped imports.')+
 link('/science/overview','Science evidence gates','Track exactly why provisional astronomy cannot yet be published.')+
 link('/ai','DeepSeek editorial studio','View cached private AI drafts without spending tokens on previews.')+
 link('/editorial/readiness','City × month release readiness','Count signed science days, unpublished DeepSeek drafts, independent ritual rules and unresolved review gates.')+
 link('/editorial/multi','City × date production studio','Import independently reviewed science, run source-locked DeepSeek for all page intents, and inspect private drafts.')+
 link('/ai/quality-report','Originality & quality','Compare existing content for overlap and repetitive wording.')+
 link('/ai/provider-status','Provider health','Read-only API balance readiness; zero completions.')+
 '</div>'+
 '<div class="pv-sectiontitle"><h2>System safeguards</h2></div>'+
 '<div class="pv-feature-grid">'+
 '<div class="pv-feature"><span><strong>Research storage</strong><span>'+
  (configured?'D1 configured':'D1 unavailable')+' · '+
  (pipelineReady?'External runner gateway configured':'Runner unavailable')+
 '</span></span><em>◈</em></div>'+
 '<div class="pv-feature"><span><strong>Scientific & SEO release</strong><span>'+
 'Locked until independently validated geodata, sidereal limbs, tradition rules and editorial review.'+
 '</span></span><em>◉</em></div>'+
 '<div class="pv-feature"><span><strong>Private R2 ingestion</strong><span>'+
 (metrics.importReady?'Configured for scheduled ingestion':'Inactive or missing connection')+
 (metrics.failed?'. Failed import slots: '+esc(metrics.failed):'')+
 '</span></span><em>⇅</em></div>'+
 '<div class="pv-feature"><span><strong>Automatic paid AI</strong><span>'+
 (metrics.editorialEnabled?'Enabled by operator flag; one-shot limits remain in place.':
  'Disabled. Cached previews incur no DeepSeek charges.')+
 '</span></span><em>✧</em></div></div>'+
 '<details class="pv-advanced"><summary>Advanced operations · manual research & audit log</summary>'+
 '<p class="pv-caption">Only use these tools for exceptional scientific recovery and operator-led research. They do not approve or publish.</p>'+
 '<section><p class="pv-eyebrow">MANUAL SCIENCE REQUEST</p><h2>Queue a research calculation</h2>'+
 '<p>Select a city and local date. This queues an unapproved research job, not a public article.</p>'+
 '<form action="/jobs" method="post"><label>City<select name="city" required>'+choices+
 '</select></label><label>Local date<input type="date" name="date" min="2000-01-01" max="2099-12-31" required></label>'+
 '<button type="submit"'+(configured?'':' disabled')+'>Queue research only</button></form></section>'+
 '<section><p class="pv-eyebrow">LEGACY THREE-CITY HANDOFF</p><h2>Private import from local artifact</h2>'+
 '<p>The automated nightly R2 inbox is the preferred path. Use this only for a separately authenticated legacy three-city handoff.</p>'+
 '<form method="post" action="/research/import" enctype="multipart/form-data">'+
 '<label>Research JSON<input type="file" name="bundle" accept=".json,application/json" required></label>'+
 '<button type="submit"'+(pilot.importReady?'':' disabled')+'>Import research</button></form></section>'+
 '<section><p class="pv-eyebrow">OPERATOR AUDIT</p><h2>Recent research jobs</h2>'+
 '<div style="overflow:auto"><table><thead><tr><th>City</th><th>Date</th><th>Status</th>'+
 '<th>Candidate / error</th><th>Created</th><th>Actor</th><th>Action</th></tr></thead><tbody>'+
 (jobsTable(jobs)||'<tr><td colspan="7">No research job history.</td></tr>')+
 '</tbody></table></div></section></details>'+
 '<p class="pv-caption">Authenticated private workspace · Automated science research remains unapproved · No public page is unlocked here</p>'+
 '</body></html>';
}
