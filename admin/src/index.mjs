/**
 * PANCHAVANI private operations console.
 * Fail-closed Cloudflare Worker Access native identity + email allowlist.
 * This Worker is INDEPENDENT of the public assets-only Next.js Worker.
 */
import { handleRunner } from './runner.mjs';
import { ACTIVE_CITIES, CITY_IDS } from './city-catalog.mjs';
import { handleAi } from './ai-editorial.mjs';
import { runAutonomy, readiness } from './autonomy.mjs';
import { handleResearchImport } from './research-handoff.mjs';

const HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

function response(message, status = 200, type = 'text/plain; charset=utf-8', extra = {}) {
  return new Response(message, { status, headers: { ...HEADERS, 'Content-Type': type, ...extra } });
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
}
function deny() { return response('Access denied', 403); }
/**
 * Browsers may omit Origin on a same-origin HTML form POST (for example when
 * a restrictive referrer policy is in effect). Sec-Fetch-Site is a
 * browser-controlled forbidden header; accept absent/null Origin ONLY when
 * that header positively proves this is a same-origin request.
 * Never rely on Access identity alone as CSRF protection.
 */
export function isTrustedBrowserPost(request) {
  const target = new URL(request.url);
  if (target.protocol !== 'https:' || target.hostname !== 'admin.panchavani.com') return false;
  const site = request.headers.get('Sec-Fetch-Site');
  if (site !== null && site !== 'same-origin') return false;
  const origin = request.headers.get('Origin');
  if (origin && origin !== 'null') return origin === target.origin;
  return site === 'same-origin';
}
function blockUnsafeForm() {
  return response('Form blocked by the same-origin security check. Return to the admin dashboard and try again.', 403);
}

// ctx.access is attached by Cloudflare *only after* Access authenticates the
// request to this Worker. Never trust user-supplied email or JWT headers.
export async function authenticate(ctx, env) {
  if (!ctx?.access || typeof ctx.access.getIdentity !== 'function') return null;
  if (typeof env.ALLOWED_ADMIN_EMAILS !== 'string') return null;
  const allowed = new Set(env.ALLOWED_ADMIN_EMAILS.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
  if (!allowed.size) return null;
  try {
    const identity = await ctx.access.getIdentity();
    const email = typeof identity?.email === 'string' ? identity.email.trim().toLowerCase() : '';
    return email && allowed.has(email) ? email : null;
  } catch {
    return null;
  }
}
function html(email, jobs, configured, pipelineReady) {
  const rows = jobs.map(j => `<tr><td>${escapeHtml(j.city_id)}</td><td>${escapeHtml(j.local_date)}</td><td>${escapeHtml(j.status)}</td><td><code>${escapeHtml(j.candidate_hash ? j.candidate_hash.slice(0,12) + '…' : (j.error_code || '—'))}</code></td><td>${escapeHtml(j.created_at)}</td><td>${escapeHtml(j.requested_by)}</td><td>${j.status==='failed'?`<form action="/jobs/retry" method="post"><input type="hidden" name="id" value="${escapeHtml(j.id)}"><button type="submit">Retry</button></form>`:'—'}</td></tr>`).join('');
  const cityOptions = ACTIVE_CITIES.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PANCHAVANI — Private Calculation Console</title><style>
:root{color-scheme:dark;font-family:Arial,Helvetica,sans-serif;background:#070707;color:#f9f0df}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 75% 0%,#39221366,transparent 42%),#070707;min-height:100vh}header{border-bottom:1px solid #63492b79;padding:20px max(24px,5vw);display:flex;justify-content:space-between;gap:20px;align-items:center;background:#080707bf}header strong{font:500 24px Georgia,serif;letter-spacing:2px}header small{color:#aa9879}main{max-width:1130px;margin:auto;padding:40px 24px 80px}h1{font:normal clamp(29px,4vw,47px) Georgia,serif;margin:4px 0 10px}.muted{color:#b9afa1;line-height:1.6;font-size:14px}.eyebrow{font-size:10px;letter-spacing:2px;color:#e8bc70;text-transform:uppercase}section{border:1px solid #58432b76;background:linear-gradient(140deg,#17120e,#0b0a09);padding:24px;border-radius:13px;margin-top:22px;box-shadow:0 12px 30px #0005}.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:30px}.cards section{margin:0}.cards strong{font:normal 22px Georgia,serif;color:#edc98c}.cards p{font-size:12px;color:#bfb7a8;line-height:1.5}form{display:flex;gap:10px;flex-wrap:wrap;align-items:end}label{display:flex;flex-direction:column;gap:7px;font-size:12px;color:#e9c58c}input,select,button{font:inherit;padding:12px;border-radius:6px;border:1px solid #766044;background:#111;color:#f8ead4;min-height:42px}button{border:1px solid #e7bd77;background:linear-gradient(100deg,#c99242,#edca8b);color:#1f1308;font-weight:700;cursor:pointer}button:disabled{opacity:.4;cursor:not-allowed}table{width:100%;border-collapse:collapse;font-size:12px;overflow:auto}th,td{text-align:left;padding:13px 9px;border-bottom:1px solid #54433277}th{color:#ebc58e}a{color:#efc988}code{color:#efca8c}footer{margin-top:36px;font-size:11px;color:#938778}@media(max-width:730px){.cards{grid-template-columns:1fr}header{align-items:start;flex-direction:column}main{padding:24px 16px}} 
</style></head><body><header><strong>PANCHAVANI <small>· PRIVATE OPS</small></strong><small>Authenticated: ${escapeHtml(email)}</small></header><main><div class="eyebrow">Restricted research environment</div><h1>Calculation Control Center</h1><p class="muted">Draft calculations are never published automatically. No ritual or Muhurat recommendation can pass this interface without separately validated astronomy, traditional rules and an audited approval workflow.</p><div class="cards"><section><div class="eyebrow">Ephemeris pipeline</div><strong>${pipelineReady ? 'Runner gateway ready' : 'Runner not configured'}</strong><p>${pipelineReady ? 'Research requests can be claimed by an authenticated external Skyfield runner. Candidates remain UNAPPROVED and cannot publish.' : 'Configure private R2 and a signed research runner before executing queued jobs.'}</p></section><section><div class="eyebrow">Quality gate</div><strong>Publication locked</strong><p>Incomplete Ayanamsa, regional calendar rules and source verification are hard blockers.</p></section><section><div class="eyebrow">Database</div><strong>${configured ? 'Connected' : 'Unconfigured'}</strong><p>${configured ? 'Job requests can be queued for a future trusted runner.' : 'Configure a private D1 DB binding; no job requests can be accepted until then.'}</p></section></div><section><div class="eyebrow">Queue research calculation</div><h2>City / date</h2><p class="muted">This requests a calculation; it does NOT compute, verify, approve or publish results. All research city coordinates remain provisional; the admin reads the same versioned catalogue as the astronomy engine.</p><form action="/jobs" method="post"><label>City<select name="city" required>${cityOptions}</select></label><label>Local date<input type="date" name="date" min="2000-01-01" max="2099-12-31" required></label><button ${configured ? '' : 'disabled'} type="submit">Queue research only</button></form></section><section><div class="eyebrow">Private AI Editorial</div><h2>DeepSeek draft workshop</h2><p class="muted">Create natural, city-specific RESEARCH drafts using a completed private astronomical candidate. The Worker uses an encrypted server-side API secret; no AI draft is verified or published automatically.</p><a href="/ai">Open private AI Editorial Drafts →</a></section><section><div class="eyebrow">ONE-TIME SCIENCE IMPORT · THREE CITIES</div><h2>Import JPL research handoff</h2><p class="muted">When GitHub-to-Cloudflare Service Auth is blocked, import one downloaded three-city GitHub Actions research bundle here. Existing Cloudflare Access identity is required. NASA/JPL candidates remain UNAPPROVED, stored only in private D1/R2. This performs ZERO DeepSeek calls and cannot publish.</p><form action="/research/import" method="post" enctype="multipart/form-data"><label>GitHub Actions research JSON<input type="file" name="bundle" accept=".json,application/json" required></label><button type="submit">Import three research candidates</button></form><p class="muted">Only use the JSON file from the GitHub Actions workflow: PANCHAVANI three-city JPL private handoff.</p></section><section><div class="eyebrow">Audit trail</div><h2>Recent requests</h2><div style="overflow-x:auto"><table><thead><tr><th>City</th><th>Date</th><th>Status</th><th>Artifact SHA / failure</th><th>Requested UTC</th><th>Requested by</th><th>Recovery</th></tr></thead><tbody>${rows || '<tr><td colspan="7">No calculation requests.</td></tr>'}</tbody></table></div></section><footer>Private operation — protected by Cloudflare-verified Access identity and an email allowlist. X-Robots-Tag: noindex. Not connected to the public PANCHAVANI SSG site.</footer></main></body></html>`;
}

export default {
  async fetch(request, env, ctx) {
    // Internal runners need an independent signed identity; neither path approves or publishes.
    const runner = await handleRunner(request, env);
    if (runner) return runner;
    // The dashboard refuses access without Cloudflare-verified identity and explicit email allowlist.
    const actor = await authenticate(ctx, env);
    if (!actor) return deny();
    const imported = await handleResearchImport(request, env, actor, isTrustedBrowserPost);
    if (imported) return imported;
    const ai = await handleAi(request, env, actor, isTrustedBrowserPost);
    if (ai) return ai;
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/robots.txt') return response('User-agent: *\nDisallow: /\n', 200, 'text/plain; charset=utf-8');
    if (request.method === 'GET' && url.pathname === '/api/status') {
      return response(JSON.stringify({ privacy: 'authenticated', engine: 'research-only', publishing: 'disabled', database: Boolean(env.DB), runnerReady: Boolean(env.DB && env.CANDIDATES && env.RUNNER_HMAC_SECRET), deepseekConfigured: Boolean(env.DEEPSEEK_API_KEY && env.CANDIDATES && env.DB), automation: readiness(env) }), 200, 'application/json; charset=utf-8');
    }
    if (request.method === 'GET' && url.pathname === '/api/jobs') {
      if (!env.DB) return response(JSON.stringify({jobs:[],configured:false}),200,'application/json; charset=utf-8');
      try { const jobs=(await env.DB.prepare('SELECT id,city_id,local_date,status,candidate_hash,error_code,created_at FROM job_requests ORDER BY created_at DESC LIMIT 100').all()).results||[]; return response(JSON.stringify({jobs,publishing:'disabled'}),200,'application/json; charset=utf-8'); }
      catch { return response(JSON.stringify({error:'database_unavailable'}),503,'application/json; charset=utf-8'); }
    }
    if (request.method === 'GET' && url.pathname === '/') {
      let jobs = [];
      if (env.DB) {
        try { jobs = (await env.DB.prepare('SELECT id, city_id, local_date, status, candidate_hash, error_code, created_at, requested_by FROM job_requests ORDER BY created_at DESC LIMIT 30').all()).results || []; }
        catch { return response('Database unavailable — access locked', 503); }
      }
      return response(html(actor, jobs, Boolean(env.DB), Boolean(env.DB && env.CANDIDATES && env.RUNNER_HMAC_SECRET)), 200, 'text/html; charset=utf-8');
    }
    if (request.method === 'POST' && url.pathname === '/jobs/retry') {
      if (!isTrustedBrowserPost(request)) return blockUnsafeForm();
      if (!env.DB) return response('Private database is not provisioned',503);
      if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded') || Number(request.headers.get('Content-Length')||0)>1024) return response('Invalid request type or size',400);
      const form=await request.formData();const id=form.get('id');
      if (typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id)) return response('Invalid job identifier',400);
      try{
        const changed=await env.DB.prepare("UPDATE job_requests SET status='queued',lease_token=NULL,started_at=NULL,error_code=NULL WHERE id=? AND (status='failed' OR (status='running' AND started_at IS NOT NULL AND started_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-60 minutes'))) RETURNING id").bind(id).first();
        if(!changed)return response('Job not eligible for manual retry; candidates cannot be retried',409);
        await env.DB.prepare("INSERT INTO audit_log (id,actor,action,subject_id) VALUES (? ,?,'manual_research_retry',?)").bind(crypto.randomUUID(),actor,id).run();
      }catch{return response('Database unavailable — no publication',503);}
      return response('',303,'text/plain; charset=utf-8',{Location:'/'});
    }
    if (request.method === 'POST' && url.pathname === '/jobs') {
      // Verify browser-controlled same-origin signals, including forms with omitted Origin.
      if (!isTrustedBrowserPost(request)) return blockUnsafeForm();
      if (!env.DB) return response('Private database is not provisioned', 503);
      if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) return response('Unsupported request type', 415);
      if (Number(request.headers.get('Content-Length') || 0) > 2048) return response('Request too large', 413);
      const form = await request.formData();
      const city = form.get('city'); const localDate = form.get('date');
      if (typeof city !== 'string' || !CITY_IDS.has(city) || typeof localDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return response('Invalid city or date', 400);
      const parsed = new Date(`${localDate}T12:00:00Z`);
      if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== localDate || localDate < '2000-01-01' || localDate > '2099-12-31') return response('Invalid date', 400);
      const id = crypto.randomUUID(), auditId = crypto.randomUUID();
      try {
        await env.DB.batch([
          env.DB.prepare("INSERT INTO job_requests (id, city_id, local_date, status, requested_by) VALUES (?, ?, ?, 'queued', ?)").bind(id, city, localDate, actor),
          env.DB.prepare("INSERT INTO audit_log (id, actor, action, subject_id) VALUES (?, ?, 'research_job_queued', ?)").bind(auditId, actor, id),
        ]);
      } catch { return response('Failed to queue request; no action published', 503); }
      return response('', 303, 'text/plain; charset=utf-8', { Location: '/' });
    }
    return response('Not found', 404);
  },
  async scheduled(controller, env, ctx) {
    // Cloudflare Cron events are internal triggers, never exposed via HTTP.
    // Without BOTH explicitly opted-in flags there are zero queued/model jobs.
    const result=await runAutonomy(env,controller.scheduledTime);
    console.log('PANCHAVANI private automation',JSON.stringify({
      research:result.queue?.status,queued:result.queue?.queued||0,
      editorial:result.draft?.status,attempted:result.draft?.attempted||0,
      publishingAuthorized:false
    }));
  },
};
