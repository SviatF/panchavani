/** First search pilot: exactly TEN hand-authored educational city guides.
 * Owner explicitly requested this 10-city launch on 2026-10-18.
 *
 * This is NOT scientific approval for daily Panchang records, ritual dates,
 * or private DeepSeek model outputs; it is an explicit editorial URL allowlist.
 * The public sitemap and per-page index/follow derive from this ONE file.
 */
import guides from '@/data/city-guides.json';
import seoDays from '@/data/approved-seo-days.json';
import {approvedCityDays} from '@/lib/public-panchang';
import {validateSeoDayRelease} from '@/lib/seo-day-release-policy.mjs';
import {approvedTopicSeoRoutes} from '@/lib/public-topics';
import {learningGuides} from '@/lib/learning-guides';
import learningSeo from '@/data/approved-learning-seo.json';
import {validateLearningSeoRelease} from '@/lib/learning-seo-release-policy.mjs';

export type ApprovedSeoRoute={
 path:string;
 lastModified:string;
 kind:'educational-evergreen-city-guide'|'approved-daily-panchang'|'approved-city-topic'|'approved-learning-guide';
 sourceIds:string[];
};
export const FIRST_TEN_CITY_GUIDE_IDS=[
 'delhi','mumbai','kolkata','chennai','bengaluru',
 'hyderabad','ahmedabad','pune','jaipur','varanasi'
] as const;
const OFFICIAL_DOMAINS=new Set([
 'mausam.imd.gov.in','packolkata.imd.gov.in','www.nplindia.res.in'
]);
const allowed=new Set<string>(FIRST_TEN_CITY_GUIDE_IDS);
if(allowed.size!==10)throw Error('First evergreen index release must contain precisely ten cities');
const approved=FIRST_TEN_CITY_GUIDE_IDS.map(city=>{
 const guide=guides[city];
 if(!guide||typeof guide.question!=='string'||guide.question.length<55||
    typeof guide.answer!=='string'||guide.answer.length<100||
    typeof guide.example!=='string'||guide.example.length<180||
    typeof guide.introduction!=='string'||guide.introduction.length<180||
    typeof guide.insight!=='string'||guide.insight.length<180||
    typeof guide.method!=='string'||guide.method.length<170||
    !Array.isArray(guide.sources)||guide.sources.length<2)
  throw Error('Thin or unevidenced city guide, release cancelled: '+city);
 for(const src of guide.sources){
  if(typeof src?.label!=='string'||src.label.length<10||
     typeof src.url!=='string'||!OFFICIAL_DOMAINS.has(new URL(src.url).hostname)||
     !src.url.startsWith('https://'))
   throw Error('Untrusted city guide reference: '+city);
 }
 return Object.freeze({
  path:'/panchang/'+city+'/',
  lastModified:'2026-10-18',
  kind:'educational-evergreen-city-guide' as const,
  sourceIds:guide.sources.map(s=>s.url)
 });
});
export function approvedDailySeoRoutes():ReadonlyArray<ApprovedSeoRoute>{
 return validateSeoDayRelease(seoDays,approvedCityDays(),process.env.PANCHAVANI_APPROVED_SEO_RELEASE_SHA256);
}
export function approvedLearningSeoRoutes():ReadonlyArray<ApprovedSeoRoute>{
 return validateLearningSeoRelease(learningSeo,learningGuides,process.env.PANCHAVANI_APPROVED_LEARNING_SEO_SHA256);
}
export function isIndexableLearningGuide(slug:string):boolean{
 return approvedLearningSeoRoutes().some(x=>x.path==='/learn/'+slug+'/');
}
export function approvedSeoRoutes():ReadonlyArray<ApprovedSeoRoute>{
 const topics:ApprovedSeoRoute[]=approvedTopicSeoRoutes().map(x=>({
  path:x.path,lastModified:x.lastModified,kind:'approved-city-topic' as const,
  sourceIds:x.sourceIds
 }));
 return [...approved,...approvedDailySeoRoutes(),...topics,...approvedLearningSeoRoutes()];
}
export function isIndexableApprovedCityDay(city:string,date:string):boolean{
 return approvedDailySeoRoutes().some(x=>x.path==='/panchang/'+city+'/'+date+'/');
}
export function isReleasedEvergreenCity(id:string):boolean{return allowed.has(id)}
