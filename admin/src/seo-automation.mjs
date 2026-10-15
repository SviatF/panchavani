/** PANCHAVANI: one-shot SEO composition from grounded reader tasks.
 * DeepSeek only drafts prose. SERP metadata, grounded locality and FAQs
 * are deterministic. No page release or follow-up paid model requests.
 */
import research from '../../engine/editorial/expansion-17-research-briefs.v1.json' with {type:'json'};

export const SEO_PIPELINE_VERSION='city-evergreen-grounded-v1';
const NPL='https://www.nplindia.org/clockcode/html/';
const FOCUS=Object.freeze({
 delhi:{
  query:'Delhi Panchang',
  title:'Delhi Panchang Guide: Sunrise, Tithi & Local Timing',
  meta:'How to read a Delhi Panchang: check city-specific sunrise, Tithi transitions and the almanac’s date convention before comparing daily entries.',
  question:'How should I compare a Tithi transition with sunrise in Delhi?',
  answer:'Check the transition timestamp, the specified Delhi sunrise and the rule used to assign the calendar day. A Tithi transition does not necessarily occur at sunrise.',
  context:'For Delhi, the useful comparison is between the stated local sunrise and a lunar transition time. Before reading a daily label, check whether the source assigns it at sunrise and which location and calculation convention it uses.'
 },
 mumbai:{
  query:'Mumbai Panchang',
  title:'Mumbai Panchang Guide: IST, Sunrise & Lunar Days',
  meta:'How to read a Mumbai Panchang: distinguish the IST clock from the city-specific sunrise event, and check the calendar’s calculation rules.',
  question:'Is the IST clock the same as local sunrise for Mumbai?',
  answer:'No. IST is the civil time reference; a sunrise is an astronomical event calculated for a place. Its time can be expressed in IST using a stated method and location.',
  context:'For Mumbai, India Standard Time is the clock used to express a calculated local sunrise, not a competing astronomical definition. A useful Panchang should state its location, sunrise convention and the method that connects lunar transitions to the calendar day.'
 },
 chennai:{
  query:'Chennai Panchang',
  title:'Chennai Panchang Guide: Sunrise & Calendar Traditions',
  meta:'Learn how to read a Chennai Panchang by checking local sunrise, lunar transitions and the regional calendar convention used for daily observances.',
  question:'What should I check when comparing Panchang dates for Chennai?',
  answer:'Check that each source uses Chennai as its location, identifies the sunrise method and states the regional calendar convention. A transition time and an observance date are not automatically the same.',
  context:'For Chennai, compare the locality of the sunrise calculation with the regional calendar convention used by the almanac. A time of lunar transition alone does not establish a festival or fasting date without the applicable observance rule.'
 }
});
const clean=x=>typeof x==='string'?x.replace(/\s+/g,' ').trim():'';
const words=s=>(s.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)||[]).length;
const clip=(s,max)=>s.length<=max?s:s.slice(0,max+1).replace(/\s+\S*$/,'').replace(/[,:;—\-]+$/,'').trim();
const sourceBrief=id=>(research.cityBriefs||[]).find(x=>x.cityId===id);
export function buildSeoBrief(city,{language='en'}={}){
 if(!city||!(/^[a-z][a-z0-9-]*$/).test(city.id)||!clean(city.name))
  throw new Error('Invalid city identity');
 if(city.timezone!=='Asia/Kolkata')throw new Error('Unsupported civil timezone');
 const topic=FOCUS[city.id];
 const other=sourceBrief(city.id);
 const focus=topic||{
  query:city.name+' Panchang',
  title:city.name+' Panchang: Local Sunrise & Calendar Guide',
  meta:'Read '+city.name+' Panchang with a location-specific sunrise and clearly stated lunar calendar conventions.',
  question:'How do I compare Panchang information for '+city.name+'?',
  answer:'Check the stated city, sunrise calculation method and regional observance convention before comparing daily Panchang entries.',
  context:'For '+city.name+', start with the locality and sunrise convention used by the almanac. Distinguish a lunar transition timestamp from the observance date assigned by a documented calendar rule.'
 };
 // City research briefs create genuinely distinct reader tasks without
 // misrepresenting an unverified local ritual claim as a fact.
 if(!topic&&clean(other?.localResearchAngle)){
   focus.question=clean(other.localResearchAngle);
   focus.context='For '+city.name+', a useful check is: '+focus.question+
     ' Compare the source’s city, sunrise method and calendar rule with any '+
     'lunar transition before applying an observance or daily label.';
   focus.answer='Begin with the locally specified sunrise and the source’s '+
     'calendar convention. Treat this question as something to verify, '+
     'not as proof of an observance or numerical calculation.';
   focus.meta='Read '+city.name+' Panchang: review local sunrise, calendar '+
     'method and regional conventions before relying on daily dates.';
 }

 const secondary=[city.name+' Panchang guide',city.name+' sunrise Panchang',
  'how to read Panchang in '+city.name];
 return Object.freeze({
  type:'city-hub',version:SEO_PIPELINE_VERSION,
  cityId:city.id,cityName:city.name,language,
  canonicalPath:'/panchang/'+city.id+'/',
  searchIntent:'Learn to interpret a local Hindu Panchang',
  primaryQuery:focus.query,secondaryQueries:secondary,
  seoTitle:focus.title,metaDescription:focus.meta,
  h1:focus.query,
  practicalQuestion:focus.question,
  practicalAnswer:focus.answer,
  groundedLocalContext:focus.context,
  researchQuestion:clean(other?.localResearchAngle)||focus.question,
  // This legal civil clock fact is explicitly documented by the metrology institute.
  sourceFacts:[{id:'npl-ist-utc-offset',claim:'India Standard Time (IST) uses UTC +05:30.',url:NPL}],
  // Provisional coordinates and regional ritual practices are NEVER sent as facts.
  approvedAstronomicalFacts:[],approvedRitualFacts:[],
  relatedLinks:[{label:'Panchang city directory',href:'/panchang/'}],
  evidenceStatus:'RESEARCH_ONLY',
  publicationAuthorized:false,indexingAuthorized:false,
 });
}
export function composeSeoDraft(model,brief){
 // Never trust model-generated SERP titles, fabricated place descriptions or
 // ritual FAQs. Preserve the original raw response separately in private R2.
 const raw=model&&typeof model==='object'&&!Array.isArray(model)?model:{};
 const repairs=[];
 const asText=(k,limit)=>{
  let value=clean(raw[k]);
  if(!value){repairs.push('missing-'+k);return '';}
  const resized=clip(value,limit);
  if(resized!==value)repairs.push('shortened-'+k);
  return resized;
 };
 // Correct FAQ and metadata without another paid model call.
 if(!Array.isArray(raw.faq))repairs.push('faq-normalized');
 if(clean(raw.seoTitle)!==brief.seoTitle)repairs.push('seo-title-grounded');
 if(clean(raw.metaDescription)!==brief.metaDescription)repairs.push('meta-description-grounded');
 if(clean(raw.localContext)!==brief.groundedLocalContext)repairs.push('local-context-grounded');
 const draft={
  headline:brief.h1,
  seoTitle:brief.seoTitle,
  metaDescription:brief.metaDescription,
  introduction:asText('introduction',550),
  localContext:brief.groundedLocalContext,
  dailyUnderstanding:asText('dailyUnderstanding',550),
  uncertaintyNote:asText('uncertaintyNote',350)||
   'Astronomical and ritual claims require independent source verification.',
  faq:[{question:brief.practicalQuestion,answer:brief.practicalAnswer}],
  referencedFactIds:[]
 };
 const known=Object.values(FOCUS).some(x=>x.context===brief.groundedLocalContext);
 if(!known)repairs.push('generic-city-context-needs-source');
 const wordCount=words([
   draft.introduction,draft.localContext,draft.dailyUnderstanding,draft.faq[0].answer
 ].join(' '));
 // This is an editorial scoring signal, never approval for search indexing.
 const blockers=[];
 if(wordCount<95||wordCount>200)blockers.push('seo-reader-value-length');
 if(!draft.introduction||!draft.dailyUnderstanding)blockers.push('seo-prose-missing');
 if(repairs.includes('generic-city-context-needs-source'))blockers.push('seo-specific-evidence-needed');
 const prohibited=/(?:\b(?:Shukla|Krishna)\s+(?:Shashthi|Panchami|Ekadashi|Dvitiya|Tritiya)|\b(?:Kaulava|Bava|Vanija)\b|\b\d{1,2}[:.]\d{2}\s*(?:am|pm|IST)\b)/i;
 if(prohibited.test([draft.introduction,draft.dailyUnderstanding].join(' ')))
  blockers.push('seo-unapproved-daily-fact-in-model-prose');
 return {draft,repairs:[...new Set(repairs)],blockers,wordCount,
   seoBriefVersion:brief.version,canonicalPath:brief.canonicalPath,
   provenance:brief.sourceFacts.map(x=>({id:x.id,url:x.url})),
   publicationAuthorized:false,indexingAuthorized:false};
}
