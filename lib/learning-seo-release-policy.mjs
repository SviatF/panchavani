/** Explicit two-person human-reviewed educational SEO release.
 * AI copy, source presence, or just creating a file must never index a URL.
 * A distinct GitHub Actions secret SHA approves exactly this manifest.
 */
import {createHash} from 'node:crypto';

const SHA=/^[a-f0-9]{64}$/;
const ISO=/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const SLUG=/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const OBJECT=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const VALID=(x)=>typeof x==='string'&&ISO.test(x)&&Number.isFinite(Date.parse(x));
const VALID_REVIEWER=x=>typeof x==='string'&&x.trim().length>=8&&
 !/(?:demo|sample|placeholder|fake|test|bot|ai|automatic|unknown)/i.test(x);
export const hashLearningGuide=guide=>createHash('sha256')
 .update(JSON.stringify(guide)).digest('hex');
export const learningSeoPath=slug=>'/learn/'+slug+'/';

export function validateLearningSeoRelease(manifest,guides,expectedSha){
 if(!OBJECT(manifest)||manifest.schemaVersion!==1||
    !Array.isArray(manifest.records)||!OBJECT(guides))
  throw Error('Invalid human-reviewed learning release manifest');
 if(!manifest.records.length){
  if(manifest.releaseStatus!=='NO_APPROVED_LEARNING_SEO_ROUTES')
   throw Error('Empty educational SEO release must remain disabled');
  return [];
 }
 if(manifest.releaseStatus!=='HUMAN_REVIEWED_EDUCATIONAL_URL_RELEASE'||
    typeof expectedSha!=='string'||!SHA.test(expectedSha)||
    createHash('sha256').update(JSON.stringify(manifest)).digest('hex')!==expectedSha)
  throw Error('Missing independently pinned human learning SEO release manifest');
 const seen=new Set();
 const paths=[];
 for(const r of manifest.records){
  if(!OBJECT(r)||!SLUG.test(r.slug||'')||
     !Object.hasOwn(guides,r.slug)||seen.has(r.slug)||
     !SHA.test(r.sourceContentSha256||'')||
     !VALID_REVIEWER(r.contentReviewer)||!VALID_REVIEWER(r.seoReviewer)||
     r.contentReviewer===r.seoReviewer||
     !VALID(r.contentReviewedAt)||!VALID(r.seoReviewedAt)||
     Date.parse(r.seoReviewedAt)<Date.parse(r.contentReviewedAt)||
     r.originalSourcesReadAndVerified!==true||
     r.astronomyAndCulturalLanguageReviewed!==true||
     r.conceptualExamplesCheckedAsNonLive!==true||
     r.pageUsefulnessAndNonDuplicationReviewed!==true||
     r.canonicalAndInternalLinksReviewed!==true||
     r.noFalseLiveCalendarClaimsConfirmed!==true||
     r.indexingAuthorized!==true)
   throw Error('Missing independent per-URL editorial or SEO signoff');
  const guide=guides[r.slug];
  if(!guide||guide.slug!==r.slug||hashLearningGuide(guide)!==r.sourceContentSha256)
   throw Error('Reviewed educational content changed since human approval');
  if(typeof guide.title!=='string'||guide.title.length<35||
     typeof guide.lead!=='string'||guide.lead.length<200||
     !Array.isArray(guide.sections)||guide.sections.length<3||
     !Array.isArray(guide.faqs)||guide.faqs.length<2||
     !Array.isArray(guide.references)||guide.references.length<2)
   throw Error('Thin learning article cannot be approved');
  seen.add(r.slug);
  paths.push({path:learningSeoPath(r.slug),lastModified:r.seoReviewedAt,
   kind:'approved-learning-guide',sourceIds:guide.references.map(x=>x.url)});
 }
 return paths.sort((a,b)=>a.path.localeCompare(b.path));
}
