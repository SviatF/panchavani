/**
 * PANCHAVANI private operations console.
 * Fail-closed Cloudflare Worker Access native identity + email allowlist.
 * This Worker is INDEPENDENT of the public assets-only Next.js Worker.
 */
import { handleRunner } from './runner.mjs';
import { ACTIVE_CITIES, CITY_IDS } from './city-catalog.mjs';
import { handleAi, EDITORIAL_POLICY_VERSION } from './ai-editorial.mjs';
import { SEO_PIPELINE_VERSION } from './seo-automation.mjs';
import { runAutonomy, readiness } from './autonomy.mjs';
import { handleResearchImport } from './research-handoff.mjs';
import { handleResearchDay } from './research-daily.mjs';
import { handleDailyBrief } from './daily-brief-route.mjs';
import { handleIngestConsole } from './ingest-console.mjs';
import { pilotReadiness } from './pilot-readiness.mjs';
import { skinAdminResponse, ADMIN_UI_VERSION } from './console-ui.mjs';
import { renderCommandCenter, readDashboardMetrics } from './console-dashboard.mjs';
import { handleScienceConsole } from './science-console.mjs';
import { handleDailyScienceAudit } from './science-day.mjs';
import { handleConflictForensics } from './conflict-forensics.mjs';
import { handlePilotConflictAudit } from './pilot-conflict-audit.mjs';
import {handleDailyForensicStatus,runDailyForensics} from './daily-forensic-automation.mjs';
import {handleMuhuratWindowConsole} from './muhurat-window-console.mjs';
import {handleMuhuratRulesConsole} from './muhurat-rule-console.mjs';
import {handleMultiIntentConsole} from './multidomain-route.mjs';
import {handleEditorialReadiness} from './editorial-readiness.mjs';


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


const baseWorker = {
  async fetch(request, env, ctx) {
    // Internal runners need an independent signed identity; neither path approves or publishes.
    const runner = await handleRunner(request, env);
    if (runner) return runner;
    // The dashboard refuses access without Cloudflare-verified identity and explicit email allowlist.
    const actor = await authenticate(ctx, env);
    if (!actor) return deny();
    const editorialReadiness=await handleEditorialReadiness(request,env,actor);
    if(editorialReadiness)return editorialReadiness;
    const editorialProduction=await handleMultiIntentConsole(request,env,actor,isTrustedBrowserPost);
    if(editorialProduction)return editorialProduction;
    const sourceScreen=await handleMuhuratRulesConsole(request,env,actor);
    if(sourceScreen)return sourceScreen;
    const privateWindows=await handleMuhuratWindowConsole(request,env,actor);
    if(privateWindows)return privateWindows;
    const archivedForensics=await handleDailyForensicStatus(request,env,actor);
    if(archivedForensics)return archivedForensics;
    const pilotConflicts=await handlePilotConflictAudit(request,env,actor);
    if(pilotConflicts)return pilotConflicts;
    const forensic=await handleConflictForensics(request,env,actor);
    if(forensic)return forensic;
    const dailyScience=await handleDailyScienceAudit(request,env,actor);
    if(dailyScience)return dailyScience;
    const science=await handleScienceConsole(request,env,actor);
    if(science)return science;
    const imported = await handleResearchImport(request, env, actor, isTrustedBrowserPost);
    if (imported) return imported;
    const ingestPage=await handleIngestConsole(request,env,actor,isTrustedBrowserPost);
    if(ingestPage)return ingestPage;
    const dailyBrief=await handleDailyBrief(request,env,actor);
    if(dailyBrief)return dailyBrief;
    const researched = await handleResearchDay(request, env, actor);
    if (researched) return researched;
    const ai = await handleAi(request, env, actor, isTrustedBrowserPost);
    if (ai) return ai;
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/robots.txt') return response('User-agent: *\nDisallow: /\n', 200, 'text/plain; charset=utf-8');
    if (request.method === 'GET' && url.pathname === '/api/status') {
      const pilot=await pilotReadiness(env);
      return response(JSON.stringify({ privacy: 'authenticated', engine: 'research-only', publishing: 'disabled', database: Boolean(env.DB), runnerReady: Boolean(env.DB && env.CANDIDATES && env.RUNNER_HMAC_SECRET), deepseekConfigured: Boolean(env.DEEPSEEK_API_KEY && env.CANDIDATES && env.DB), editorialPolicyVersion: EDITORIAL_POLICY_VERSION, seoPipelineVersion: SEO_PIPELINE_VERSION, adminUiVersion: ADMIN_UI_VERSION, automation: readiness(env), pilot }), 200, 'application/json; charset=utf-8');
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
      const [pilot,metrics]=await Promise.all([pilotReadiness(env),readDashboardMetrics(env)]);
      return response(renderCommandCenter({
        actor,jobs,pilot,metrics,configured:Boolean(env.DB),
        pipelineReady:Boolean(env.DB && env.CANDIDATES && env.RUNNER_HMAC_SECRET)
      }),200,'text/html; charset=utf-8');
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
    const [result,forensics]=await Promise.all([
      runAutonomy(env,controller.scheduledTime),
      runDailyForensics(env,controller.scheduledTime).catch(()=>({status:'private-forensics-cron-error',indexingAuthorized:false}))
    ]);
    console.log('PANCHAVANI private automation',JSON.stringify({
      research:result.queue?.status,queued:result.queue?.queued||0,
      ingest:result.ingest?.status,ingested:result.ingest?.stored||0,
      editorial:result.draft?.status,attempted:result.draft?.attempted||0,
      signedDaily:result.daily?.status||'disabled',dailyAttempts:result.daily?.attempted||0,
      sourceLockedMultiIntent:result.multiIntent?.status||'disabled',multiIntentAttempts:result.multiIntent?.attempted||0,
      forensicsStatus:forensics.status,
      unresolvedCityCount:forensics.unresolvedCityCount??null,
      publishingAuthorized:false
    }));
  },
};
// Apply design only after all original private Access and signed runner
// authorization checks have completed. Scheduled Cron remains unchanged.
export default {
  fetch:async(request,env,ctx)=>skinAdminResponse(await baseWorker.fetch(request,env,ctx),request),
  scheduled:(controller,env,ctx)=>baseWorker.scheduled(controller,env,ctx)
};
