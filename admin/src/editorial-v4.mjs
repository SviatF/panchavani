/** Editorial V4 research-only quality controls. No publication or API actions.
 * Stable, deterministic and independent of generated text storage.
 */
export const EDITORIAL_V4_POLICY='deepseek-private-editorial-v4';
export const CITY_RESEARCH_QUESTIONS=Object.freeze({
  delhi:'Explain what a Delhi reader should check when comparing local sunrise conventions across nearby northern Indian locations. Avoid unsupported numerical or religious assertions.',
  mumbai:'Explain why a Mumbai reader should distinguish the shared IST civil clock from a location-specific sunrise calculation. Treat coast-related ritual claims as needing separate evidence.',
  chennai:'Explain why a Chennai reader should verify both local sunrise conventions and the selected regional calendar tradition rather than treating a nationwide timing card as universal.'
});
const READER_KEYS=['headline','seoTitle','metaDescription','introduction','localContext','dailyUnderstanding'];
const clean=x=>typeof x==='string'?x.trim():'';
export function readerText(draft){
 if(!draft||typeof draft!=='object'||Array.isArray(draft))return '';
 const faq=Array.isArray(draft.faq)?draft.faq:[];
 return [...READER_KEYS.map(k=>clean(draft[k])),
   ...faq.map(x=>clean(x?.answer))].filter(Boolean).join(' ');
}
const words=s=>s.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)||[];
const norm=s=>clean(s).toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function readerWordCount(draft){return words([
  clean(draft?.introduction),clean(draft?.localContext),
  clean(draft?.dailyUnderstanding),
  ...(Array.isArray(draft?.faq)?draft.faq.map(x=>clean(x?.answer)):[])
 ].join(' ')).length}
export function v4QualityIssues(draft,city,{intent='city-hub',lang='en'}={}){
 if(!draft||typeof draft!=='object'||Array.isArray(draft))
  return ['invalid-v4-object'];
 const errors=[];
 if(!Array.isArray(draft.faq)||draft.faq.length>1||
    draft.faq.some(x=>!x||typeof x!=='object'||Array.isArray(x)||
       Object.keys(x).sort().join('|')!=='answer|question'||
       !clean(x.question)||!clean(x.answer)))
  errors.push('v4-faq-schema');
 if(!Array.isArray(draft.referencedFactIds)||draft.referencedFactIds.length!==0)
  errors.push('v4-source-citation-risk');
 if(lang==='en'){
  const count=readerWordCount(draft);
  if(count<100||count>200)errors.push('v4-reader-body-length');
 }
 if(clean(draft.seoTitle).length>65||clean(draft.metaDescription).length>160)
  errors.push('v4-serp-length');
 const body=[draft.introduction,draft.localContext,draft.dailyUnderstanding,
    ...(Array.isArray(draft.faq)?draft.faq.map(x=>x?.answer):[])].map(clean);
 const normalized=body.filter(Boolean).map(norm);
 const sentences=normalized.join(' ').split(/[.!?]+/).filter(x=>x.length>=55);
 // Long, duplicated literal statements are a deterministic warning. A
 // semantic similarity audit across independent city records is STILL needed.
 if(new Set(sentences).size!==sentences.length)errors.push('v4-repeated-sentence');
 const local=clean(draft.localContext).toLowerCase();
 const c=typeof city==='string'?city:city?.name||'';
 if(!c||!local.includes(c.toLowerCase())||local.length<100)
  errors.push('v4-local-substance-missing');
 const reader=readerText(draft);
 if(/\b(?:unverified|research.only|do not publish|pending clearance|not for publication|internal audit)\b/i.test(reader))
  errors.push('v4-audit-leak');
 if(intent==='city-hub'&&/\b(?:today|tomorrow|yesterday)\b/i.test(reader))
  errors.push('v4-evergreen-temporal-copy');
 if(intent==='city-hub'&&/\b(?:20\d{2}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2})\b/i.test(reader))
  errors.push('v4-evergreen-date-leak');
 if(/\b(?:Shukla|Krishna)\s+(?:Pratipada|Dvitiya|Tritiya|Chaturthi|Panchami|Shashthi|Saptami|Ashtami|Navami|Dashami|Ekadashi|Dwadashi|Trayodashi|Chaturdashi|Purnima|Amavasya)\b/i.test(reader)||
    /\b(?:Bava|Balava|Kaulava|Taitila|Garaja|Vanija|Vishti|Shakuni|Chatushpada|Naga|Kimstughna)\b/i.test(reader))
  errors.push('v4-specific-unapproved-anga');
 return errors;
}
export function canonicalSimilarity(left,right){
 // Heuristic ONLY for editor screening; not a plagiarism determination.
 const tokens=x=>new Set(words(norm(readerText(x))
   .replace(/\b(delhi|mumbai|chennai)\b/g,' '))
   .filter(w=>w.length>=4));
 const a=tokens(left),b=tokens(right);
 if(!a.size||!b.size)return 0;
 const overlap=[...a].filter(x=>b.has(x)).length;
 return overlap/(a.size+b.size-overlap);
}
