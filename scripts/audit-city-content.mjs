/** Deterministic reader-first editorial audit of PUBLIC city copy + SEO plans.
 * This is a quality regression screen, not a claim of expert validation/rank.
 */
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {buildSeoBrief} from '../admin/src/seo-automation.mjs';
import {ACTIVE_CITIES} from '../admin/src/city-catalog.mjs';

const guides=JSON.parse(await readFile(fileURLToPath(new URL('../data/city-guides.json',import.meta.url)),'utf8'));
const words=x=>(x.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)||[]);
const normalized=x=>x.toLowerCase().replace(/[\p{P}\p{S}]/gu,' ').replace(/\s+/g,' ').trim();
const tokens=x=>new Set(words(normalized(x)).filter(w=>w.length>3));
const overlap=(a,b)=>{
 const x=tokens(a),y=tokens(b);if(!x.size||!y.size)return 0;
 const common=[...x].filter(w=>y.has(w)).length;
 return common/(x.size+y.size-common);
};
export function auditGuide(id,guide){
 const body=[guide.introduction,guide.insight,guide.method].join(' ');
 const issues=[];
 const count=words(body).length;
 if(count<105||count>250)issues.push('reader-body-length');
 if(!guide.tagline||guide.tagline.length>100)issues.push('unclear-tagline');
 if(guide.metaDescription.length<110||guide.metaDescription.length>160)
  issues.push('meta-description-length');
 if(!guide.introduction.toLowerCase().includes(id))issues.push('missing-local-introduction');
 if(!/\b(check|compare|read|look|start|find)\b/i.test(body))
  issues.push('no-reader-action');
 if(/\b(?:independently verified|domain.review|research.only|editorial reviewer|validation blockers|publishing approved|evidence required|methodology pending)\b/i.test(body))
  issues.push('internal-qa-language-leak');
 if(/\b(?:at the meeting of|harmonious cosmic|delve into|unravel the|meticulously curated|in today.s fast.paced)\b/i.test(body))
  issues.push('generic-ai-marketing-phrases');
 if(/\b(?:sun rises over the arabian sea)\b/i.test(body))
  issues.push('geographical-misstatement');
 return {city:id,words:count,metaLength:guide.metaDescription.length,issues};
}
export function auditCorpus(collection){
 const ids=Object.keys(collection);
 const records=ids.map(id=>auditGuide(id,collection[id]));
 const pairs=[];
 for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
  const a=ids[i],b=ids[j];
  const x=[collection[a].introduction,collection[a].insight,collection[a].method].join(' ').replaceAll(new RegExp(a,'ig'),'');
  const y=[collection[b].introduction,collection[b].insight,collection[b].method].join(' ').replaceAll(new RegExp(b,'ig'),'');
  const ratio=overlap(x,y);
  pairs.push({pair:a+'/'+b,tokenJaccard:Math.round(ratio*100)/100});
  if(ratio>0.7){
   records.find(r=>r.city===a).issues.push('near-clone-location-text');
   records.find(r=>r.city===b).issues.push('near-clone-location-text');
  }
 }
 return {records,pairs,screenPassed:records.every(x=>x.issues.length===0)};
}
export function auditPlans(cities){
 const plans=cities.map(c=>buildSeoBrief(c));
 const findings=[];
 for(const plan of plans){
  const issues=[];
  if(!plan.groundedLocalContext||plan.groundedLocalContext.length<110)
   issues.push('thin-local-brief');
  if(plan.seoTitle.length>65||plan.metaDescription.length>160)
   issues.push('poor-serp-metadata');
  if(/a useful check is: \w+[^.]+\?/i.test(plan.groundedLocalContext))
   issues.push('awkward-interrogative-template');
  if(!guideExists(plan.cityId))issues.push('no-public-city-guide');
  findings.push({city:plan.cityId,issues,primaryQuery:plan.primaryQuery});
 }
 return {count:findings.length,findings};
}
function guideExists(id){return Object.hasOwn(guides,id)}
const publicAudit=auditCorpus(guides);
const planAudit=auditPlans(ACTIVE_CITIES);
const report={
 version:'reader-first-audit-2026-10-15',
 scope:'GitHub public city guide copy and deterministic SEO plans, not private DeepSeek R2 output',
 publicAudit,planAudit,
 conditions:{
  factComplete:false,liveDailyCalendar:false,independentlyVerified:false,
  humanNaturalnessReviewPending:true,searchRankingsNotMeasured:true
 }
};
if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
else{
 console.log('PANCHAVANI PUBLIC COPY QA:',publicAudit.screenPassed?'PASS':'FAIL');
 for(const row of publicAudit.records)console.log(row.city,row.words+' words',row.issues.join(',')||'reader-first checks pass');
 console.log('City briefs:',planAudit.count,'with recorded caveats:',planAudit.findings.filter(x=>x.issues.length).length);
}
if(!publicAudit.screenPassed)process.exitCode=1;
