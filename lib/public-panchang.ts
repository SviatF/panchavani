/** Build-time gate for explicitly approved city/day Panchang data.
 * NEVER ingest nightly research or unapproved DeepSeek data into these routes.
 * An immutable reviewed manifest digest must be set during the public build
 * before any entry is available, including for sitemap generation.
 */
import { createHash } from 'node:crypto';
import raw from '@/data/approved-panchang.json';
export const PILOT_CITY_IDS=['delhi','mumbai','chennai'] as const;
export type PilotCityId=typeof PILOT_CITY_IDS[number];
export const CITY_GUIDES={
 delhi:{
  label:'Delhi',region:'National Capital Territory',
  tagline:'Panchang at the meeting of solar time and lunar tradition',
  introduction:'For Delhi, the location of sunrise is fundamental to the Panchang date. A lunar phase transition may occur at the same astronomical instant worldwide, yet the local sunrise used for assigning Tithi differs from other Indian cities.',
  insight:'Delhi belongs to India Standard Time, but identical civil clocks do not imply identical sunrise times. Panchang calculations must use city coordinates, an explicitly documented sunrise convention and the local civil calendar date.',
  method:'Compare sunrise-anchored Tithi, lunar transitions and the selected calendar tradition before interpreting an observance.'
 },
 mumbai:{
  label:'Mumbai',region:'Maharashtra',
  tagline:'India’s western coast, interpreted through local sunrise',
  introduction:'Mumbai follows India Standard Time, while its western location influences the local sunrise anchor used in Panchang calculations. This distinction matters whenever a Tithi or Karana transition occurs near sunrise.',
  insight:'A scientifically consistent transition timestamp should not be altered to make Mumbai different from Delhi. Instead, we explain its correct relationship to local sunrise and explicitly sourced regional traditions.',
  method:'Use geographical coordinates and the agreed astronomical convention; ritual interpretations need separately reviewed Maharashtra-specific evidence.'
 },
 chennai:{
  label:'Chennai',region:'Tamil Nadu',
  tagline:'Local solar timing and the diversity of Hindu calendars',
  introduction:'Chennai uses India Standard Time like other Indian cities, but its geographical position produces its own sunrise and sunset. Reliable daily Panchang data must therefore be anchored to Chennai rather than copied from a national calendar.',
  insight:'Tamil calendar traditions may use conventions that differ from those applied in other regions. We distinguish the astronomical calculation from any tradition-specific observance or recommendation.',
  method:'Show only independently checked solar and lunar information; do not infer a fasting date or Muhurat without an approved local rule pack.'
 }
} as const;
export type ApprovedCityDay={
 cityId:PilotCityId;
 date:string;
 timezone:'Asia/Kolkata';
 status:'approved';
 releaseId:string;
 sourceRecordHash:string;
 releaseEvidence:{
  reviewer:string;scientificReviewer:string;reviewStatus:'domain-reviewed';
  comparisons:[string,string,...string[]];
  sourceIds:[string,string,...string[]];geoSource:string;
  approvedAt:string;blockerCount:0;
 };
 sun:{sunriseUtc:string;sunsetUtc:string};
 panchang:{tithi:string;nakshatra:string;yoga:string;karana:string;vara:string;paksha:string};
 editorial:{reviewedBy:string;localMeaning:string;body:string};
};
type Bundle={schemaVersion:1;releaseStatus:string;records:unknown[]};
const allowedCity=new Set<string>(PILOT_CITY_IDS);
const isoDay=(s:unknown)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const isoInstant=(s:unknown)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(s)&&!Number.isNaN(Date.parse(s));
const sha=(x:string)=>/^[a-f0-9]{64}$/.test(x);
const obj=(x:unknown):x is Record<string,unknown>=>Boolean(x)&&typeof x==='object'&&!Array.isArray(x);
function check(record:unknown):record is ApprovedCityDay{
 if(!obj(record)||!allowedCity.has(String(record.cityId))||!isoDay(record.date)||
   record.timezone!=='Asia/Kolkata'||record.status!=='approved'||
   typeof record.releaseId!=='string'||record.releaseId.length<8||
   typeof record.sourceRecordHash!=='string'||!sha(record.sourceRecordHash))return false;
 const e=record.releaseEvidence;
 if(!obj(e)||e.reviewStatus!=='domain-reviewed'||e.blockerCount!==0||
   typeof e.reviewer!=='string'||e.reviewer.length<3||
   typeof e.scientificReviewer!=='string'||e.scientificReviewer.length<3||
   typeof e.geoSource!=='string'||e.geoSource.length<10||
   !isoInstant(e.approvedAt)||!Array.isArray(e.comparisons)||e.comparisons.length<2||
   !e.comparisons.every(x=>typeof x==='string'&&x.length>6)||
   !Array.isArray(e.sourceIds)||e.sourceIds.length<2||
   !e.sourceIds.every(x=>typeof x==='string'&&x.length>6))return false;
 const s=record.sun,p=record.panchang,t=record.editorial;
 if(!obj(s)||!isoInstant(s.sunriseUtc)||!isoInstant(s.sunsetUtc)||
   Date.parse(s.sunriseUtc as string)>=Date.parse(s.sunsetUtc as string))return false;
 if(!obj(p)||!['tithi','nakshatra','yoga','karana','vara','paksha'].every(k=>
     typeof p[k]==='string'&&(p[k] as string).trim().length>1))return false;
 if(!obj(t)||typeof t.reviewedBy!=='string'||t.reviewedBy.length<3||
   typeof t.localMeaning!=='string'||t.localMeaning.length<40||
   typeof t.body!=='string'||t.body.length<250||
   t.reviewedBy!==e.reviewer)return false;
 return true;
}
export function loadApprovedDays(bundle:unknown, expectedDigest:string|undefined):ApprovedCityDay[]{
 if(!obj(bundle)||bundle.schemaVersion!==1||!Array.isArray(bundle.records)||
   typeof bundle.releaseStatus!=='string')throw new Error('Invalid approved release bundle');
 if(bundle.records.length===0)return [];
 // A release cannot be activated merely by adding an AI draft or a JSON file.
 // Requires a separately supplied, independently reviewed exact bundle digest.
 if(!expectedDigest||!sha(expectedDigest))return [];
 const serialized=JSON.stringify(bundle);
 if(createHash('sha256').update(serialized).digest('hex')!==expectedDigest)
   throw new Error('Approved release bundle digest mismatch');
 if(bundle.releaseStatus!=='HUMAN_REVIEWED_WITH_EVIDENCE')
   throw new Error('Approved release status missing');
 const seen=new Set<string>();
 return bundle.records.map(item=>{
  if(!check(item))throw new Error('Unapproved or incomplete city-day record');
  const key=item.cityId+'/'+item.date;
  if(seen.has(key))throw new Error('Duplicate city/date public record');
  seen.add(key);return item;
 });
}
let cached:ApprovedCityDay[]|undefined;
export function approvedCityDays():ApprovedCityDay[]{
 if(!cached)cached=loadApprovedDays(raw as Bundle,process.env.PANCHAVANI_APPROVED_RELEASE_SHA256);
 return cached;
}
export function approvedCityDay(city:string,date:string):ApprovedCityDay|undefined{
 return approvedCityDays().find(x=>x.cityId===city&&x.date===date);
}
export function cityDayRoute(record:ApprovedCityDay):string{
 return '/panchang/'+record.cityId+'/'+record.date+'/';
}
export function indiaTime(utc:string):string{
 return new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(utc));
}
