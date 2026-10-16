/**
 * One-command PRE-INDEX readiness report. Read-only, no AI, no Cloudflare or GSC writes.
 * Exit 0 in normal research mode to preserve fail-closed noindex development.
 * Use --require-ready for a planned FIRST PUBLIC release (fails if not ready).
 */
import {readFile} from 'node:fs/promises';
import {assessFirstRelease} from './approved-day-value-gate.mjs';
const bundle=JSON.parse(await readFile(new URL('../data/approved-panchang.json',import.meta.url),'utf8'));
if(bundle?.schemaVersion!==1||!Array.isArray(bundle.records))
 throw Error('Malformed approved data bundle');
const quality=assessFirstRelease(bundle.records);
const reasons=[];
if(bundle.records.length===0)reasons.push('no-independently-approved-city-day-data');
if(bundle.records.length&&bundle.releaseStatus!=='HUMAN_REVIEWED_WITH_EVIDENCE')
 reasons.push('missing-scientifically-and-editorially-reviewed-release-status');
if(!quality.readyForHumanReleaseReview)
 reasons.push('page-evidence-uniqueness-or-timeline-failed');
const firstApproved=quality.readyForHumanReleaseReview&&reasons.length===0;
const report={
 status:firstApproved?'REVIEW_CANDIDATES_READY_NOT_INDEXABLE':'FIRST_INDEXING_BLOCKED',
 cityDays:bundle.records.length,readyForHumanReleaseReview:quality.readyForHumanReleaseReview,
 issueCount:quality.rows.reduce((sum,row)=>sum+row.issues.length,0),
 blockers:reasons,records:quality.rows.filter(x=>x.issues.length),
 scientificIndependentApprovalProvenByThisScript:false,
 googleIndexingAuthorized:false,
 note:'Actual scientific evidence, independently verified sources, sitemap SEO whitelist, human signoff, live Cloudflare and GSC all require separate verification.'
};
console.log(JSON.stringify(report,null,2));
if(process.argv.includes('--require-ready')&&!firstApproved)process.exitCode=1;
