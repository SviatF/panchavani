/** Read-only science gate matrix. "Internal data contract passes" NEVER
 * implies independent astrophysical, geographic or ritual verification.
 */
import {ACTIVE_CITIES} from './city-catalog.mjs';
import {ingestReadiness} from './nightly-import.mjs';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const H={
 'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store',
 'X-Robots-Tag':'noindex, nofollow, noarchive','X-Content-Type-Options':'nosniff',
 'X-Frame-Options':'DENY',
 'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"
};
const html=(body,status=200)=>new Response('<!doctype html><html lang="en"><head><meta charset="utf-8">'+
 '<meta name="robots" content="noindex,nofollow,noarchive">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1"><title>PANCHAVANI · Science gates</title>'+
 '</head><body>'+body+'</body></html>',{status,headers:H});
async function read(db,sql){
 try{return await db.prepare(sql).all()}catch{return null}
}
const gate=(id,title,description,status)=>'<div class="pv-pipe"><small>GATE '+esc(id)+' · '+esc(status)+
 '</small><h3>'+esc(title)+'</h3><p>'+esc(description)+'</p></div>';
export async function scienceOverview(env){
 const readD1=Boolean(env?.DB);
 const [rows,storedRows,failedRows]=await Promise.all([
  readD1?read(env.DB,"SELECT city_id, COUNT(*) AS n FROM research_candidates WHERE status='unapproved' GROUP BY city_id ORDER BY city_id LIMIT 25"):null,
  readD1?read(env.DB,"SELECT status, COUNT(*) AS n FROM automated_research_import_slots GROUP BY status"):null,
  readD1?read(env.DB,"SELECT city_id, local_date, COUNT(*) AS n FROM research_candidates WHERE status='unapproved' GROUP BY city_id,local_date HAVING COUNT(*)>1 LIMIT 10"):null
 ]);
 const counts=new Map((rows?.results||[]).map(r=>[r.city_id,Number(r.n)||0]));
 const status=new Map((storedRows?.results||[]).map(r=>[r.status,Number(r.n)||0]));
 return {databaseConnected:readD1,candidateCoverageKnown:rows!==null,
  cities:ACTIVE_CITIES.map(c=>({id:c.id,name:c.name,stored:counts.get(c.id)||0})),
  privateImports:storedRows===null?null:status.get('stored')||0,
  importFailed:storedRows===null?null:status.get('failed')||0,
  duplicateSourceRows:failedRows===null?null:(failedRows?.results||[]).length,
  ingestReady:ingestReadiness(env)};
}
export function renderScienceOverview(s){
 const count=s.cities.filter(c=>c.stored>0).length;
 const list=s.cities.map(c=>'<tr><td>'+esc(c.name)+'</td><td>'+esc(c.stored)+
 '</td><td>'+ (c.stored>0?'Private research · Not reviewed':'No D1 research candidate')+
 '</td><td><a href="/research/daily">Inspect →</a></td></tr>').join('');
 const header='<div class="pv-hero"><p class="pv-eyebrow">EVIDENCE CONTROL / SCIENCE 02</p>'+
 '<h1>Science gates<span style="color:#d9ac70">.</span></h1>'+
 '<p>Keep scientific calculations, astronomical methodology and regional traditions separate. '+
 'A successful import or internal checksum is not proof that a Panchang value is correct.</p>'+
 '<div class="pv-herotags"><span class="pv-tag">UNAPPROVED RESEARCH</span>'+
 '<span class="pv-tag">Sideral method pending</span>'+
 '<span class="pv-tag">Public indexing disabled</span></div></div>';
 const metrics='<div class="pv-metrics">'+
 '<div class="pv-metric"><span>Cities with research</span><strong>'+
 (s.candidateCoverageKnown?esc(count):'—')+'</strong><small>Of '+s.cities.length+' pilot/expansion cities</small></div>'+
 '<div class="pv-metric"><span>Stored nightly imports</span><strong>'+
 (s.privateImports===null?'—':esc(s.privateImports))+
 '</strong><small>Not scientific approvals</small></div>'+
 '<div class="pv-metric"><span>Failed import slots</span><strong>'+
 (s.importFailed===null?'—':esc(s.importFailed))+'</strong><small>Private storage issues only</small></div>'+
 '<div class="pv-metric"><span>Independently approved days</span><strong>—</strong>'+
 '<small>Not tracked by this research-only system</small></div></div>';
 const areas='<div class="pv-sectiontitle"><h2>Independent review matrix</h2>'+
 '<span class="pv-caption">NOT A RELEASE AUTHORIZATION</span></div>'+
 '<div class="pv-pipeline">'+
 gate('01','Ephemeris provenance','DE440s SHA-256 is pinned. Numeric accuracy still needs independent reference comparison.','SOURCE PINNED')+
 gate('02','Local geography','City catalogue currently uses provisional coordinates and elevation. Independent locality review required.','REVIEW NEEDED')+
 gate('03','Sidereal limbs','Nakshatra and Yoga are not calculated by the current approved method; Lahiri Ayanamsa remains unvalidated.','BLOCKED')+
 gate('04','Traditional rules','Ritual observance, festival and regional rule packs are not approved. Do not infer fasting or Muhurat from Tithi alone.','BLOCKED')+
 gate('05','Editorial quality','DeepSeek copy must be checked for hallucinations, useful specificity, naturalness and duplicate city/date paragraphs.','REVIEW NEEDED')+
 gate('06','Public release','No private candidate may enter the public date bundle, sitemap or index without independently approved evidence.','LOCKED')+
 '</div>';
 const table='<div class="pv-sectiontitle"><h2>City-level candidate coverage</h2>'+
 '<a href="/research/daily">Open detailed date explorer ↗</a></div>'+
 '<section><p>Only research record counts are shown. A count indicates storage, not scientific truth. '+
 'Unverified Nakshatra and Yoga are deliberately absent from public pages.</p>'+
 '<div style="overflow-x:auto"><table><thead><tr><th>City</th><th>Saved dates</th>'+
 '<th>Evidence state</th><th>Review</th></tr></thead><tbody>'+list+
 '</tbody></table></div></section>';
 const links='<div class="pv-sectiontitle"><h2>Next actions for operators</h2></div>'+
 '<div class="pv-feature-grid">'+
 '<a class="pv-feature" href="/research/daily"><span><strong>Inspect JPL candidate</strong>'+
 '<span>Check sunrise, Tithi/Karana phase boundaries and original SHA-256.</span></span><em>↗</em></a>'+
 '<a class="pv-feature" href="/research/daily-brief"><span><strong>Review daily SEO brief</strong>'+
 '<span>See distinct reader questions without making factual AI claims.</span></span><em>↗</em></a>'+
 '<a class="pv-feature" href="/ai/quality-report"><span><strong>Audit originality</strong>'+
 '<span>Examine cached editorial draft similarity without another paid generation.</span></span><em>↗</em></a>'+
 '<a class="pv-feature" href="/research/ingest-status"><span><strong>Check ingestion health</strong>'+
 '<span>Compare R2 manifests with D1 stored research records.</span></span><em>↗</em></a></div>';
 return header+metrics+areas+table+links+'<p class="pv-caption">No science sign-off or public SEO release is performed by this page.</p>';
}
export async function handleScienceConsole(request,env,actor){
 if(new URL(request.url).pathname!=='/science/overview')return null;
 if(!actor)return html('Access denied',403);
 if(request.method!=='GET')return html('Read-only page',405);
 const evidence=await scienceOverview(env);
 return html(renderScienceOverview(evidence));
}
