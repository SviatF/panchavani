/** First search pilot: exactly TEN hand-authored educational city guides.
 * Owner explicitly requested this 10-city launch on 2026-10-18.
 *
 * This is NOT scientific approval for daily Panchang records, ritual dates,
 * or private DeepSeek model outputs; it is an explicit editorial URL allowlist.
 * The public sitemap and per-page index/follow derive from this ONE file.
 */
import guides from '@/data/city-guides.json';

export type ApprovedSeoRoute={
 path:string;
 lastModified:string;
 kind:'educational-evergreen-city-guide';
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
    typeof guide.introduction!=='string'||guide.introduction.length<500||
    typeof guide.insight!=='string'||guide.insight.length<500||
    typeof guide.method!=='string'||guide.method.length<500||
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
export function approvedSeoRoutes():ReadonlyArray<ApprovedSeoRoute>{
 return approved;
}
export function isReleasedEvergreenCity(id:string):boolean{return allowed.has(id)}
