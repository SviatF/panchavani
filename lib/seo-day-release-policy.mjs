/** Independently released DAILY Panchang SEO whitelist.
 *
 * Must NOT be derived automatically from JPL research, DeepSeek drafts,
 * or even scientifically reviewed day data. An explicit per-URL editorial
 * SEO decision and separately pinned manifest digest are both required.
 * This checks provenance/shape; it never certifies actual astronomy.
 */
import {createHash} from 'node:crypto';
const SHA=/^[a-f0-9]{64}$/;
const DATE=/^20\d{2}-\d{2}-\d{2}$/;
const INSTANT=/^20\d{2}-\d{2}-\d{2}T\d\d:\d\d:\d\d(?:\.\d+)?Z$/;
const CITIES=new Set(['delhi','mumbai','kolkata','chennai','bengaluru',
 'hyderabad','ahmedabad','pune','jaipur','varanasi']);
const validDate=s=>typeof s==='string'&&DATE.test(s)&&
 !Number.isNaN(Date.parse(s+'T12:00:00Z'))&&
 new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const validInstant=s=>typeof s==='string'&&INSTANT.test(s)&&
 Number.isFinite(Date.parse(s));
const isObject=x=>x&&typeof x==='object'&&!Array.isArray(x);
const invalidMarker=s=>typeof s!=='string'||s.trim().length<8||
 /(?:synthetic|test[-_ ]|mock|sample|placeholder|fake|dummy|unapproved)/i.test(s);
export const seoDayPath=(city,date)=>'/panchang/'+city+'/'+date+'/';
export function validateSeoDayRelease(manifest,approvedDays,expectedDigest){
 if(!isObject(manifest)||manifest.schemaVersion!==1||
   !Array.isArray(manifest.records)||!Array.isArray(approvedDays))
   throw Error('Invalid distinct day SEO release manifest schema');
 if(manifest.records.length===0){
  if(manifest.releaseStatus!=='NO_APPROVED_DAY_SEO_ROUTES')
   throw Error('Empty day SEO manifest must be explicitly disabled');
  return [];
 }
 if(manifest.releaseStatus!=='HUMAN_APPROVED_DAILY_SEO_PER_URL')
   throw Error('Daily SEO review status not authorized');
 if(typeof expectedDigest!=='string'||!SHA.test(expectedDigest))
   throw Error('Missing separately approved SEO manifest SHA256');
 const actual=createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
 if(actual!==expectedDigest)
   throw Error('SEO manifest digest mismatch: not an authorized build');
 const source=new Map(approvedDays.map(x=>[x?.cityId+'/'+x?.date,x]));
 if(source.size!==approvedDays.length)throw Error('Duplicate science-reviewed city/date input');
 const used=new Set(),out=[];
 for(const row of manifest.records){
  if(!isObject(row)||!CITIES.has(row.cityId)||!validDate(row.date)||
    !SHA.test(row.sourceRecordHash||'')||
    invalidMarker(row.releaseId)||invalidMarker(row.seoReviewer)||
    row.editorialApproved!==true||row.searchIntentReviewed!==true||
    row.independentSourceReviewComplete!==true||
    row.cityCoordinatesReviewed!==true||
    row.indexingAuthorized!==true||!validInstant(row.approvedAt))
   throw Error('Unreviewed or malformed per-day SEO permit');
  const route=seoDayPath(row.cityId,row.date);
  if(used.has(route))throw Error('Duplicate approved day SEO permit');
  used.add(route);
  const day=source.get(row.cityId+'/'+row.date);
  if(!day||day.status!=='approved'||
      day.releaseId!==row.releaseId||
      day.sourceRecordHash!==row.sourceRecordHash||
      day.editorial?.reviewedBy===undefined||
      day.releaseEvidence?.reviewStatus!=='domain-reviewed'||
      day.releaseEvidence?.blockerCount!==0||
      !validInstant(day.releaseEvidence.approvedAt)||
      Date.parse(row.approvedAt)<Date.parse(day.releaseEvidence.approvedAt))
    throw Error('SEO permit has no matching independently reviewed scientific and editorial day');
  if(row.seoReviewer===day.editorial.reviewedBy ||
     row.seoReviewer===day.releaseEvidence.scientificReviewer)
    throw Error('Independent SEO reviewer must differ from scientific/editorial reviewers');
  out.push({path:route,lastModified:row.approvedAt,
    kind:'approved-daily-panchang',sourceIds:day.releaseEvidence.sourceIds});
 }
 return out.sort((a,b)=>a.path.localeCompare(b.path));
}
