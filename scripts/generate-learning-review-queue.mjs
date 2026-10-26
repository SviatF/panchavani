/** Read-only review manifest: exact immutable JS-object SHA, no synthetic approvers.
 * TypeScript is used only to transform trusted repository-local source.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import ts from 'typescript';
import {hashLearningGuide,validateLearningSeoRelease} from '../lib/learning-seo-release-policy.mjs';

const text=await readFile(new URL('../lib/learning-guides.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(text,{
 fileName:'learning-guides.ts',
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}
}).outputText;
const data=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const guides=data.learningGuides;
const allowed=new Set(['what-is-tithi','what-is-nakshatra','sunrise-and-city-panchang']);
if(Object.keys(guides).length!==3||
 Object.keys(guides).some(k=>!allowed.has(k)))
 throw Error('Learning review scope changed; independent editorial decision required');
const q=Object.entries(guides).map(([slug,v])=>({
 slug,canonical:'https://panchavani.com/learn/'+slug+'/',
 title:v.title,description:v.description,sourceContentSha256:hashLearningGuide(v),
 contentWordCount:[v.lead,...v.sections.flatMap(s=>s.paragraphs),
  ...v.faqs.map(f=>f.answer)].join(' ').split(/\s+/).filter(Boolean).length,
 sourceUrls:v.references.map(x=>x.url),
 reviewStatus:'PENDING_HUMAN_EDITORIAL_AND_INDEPENDENT_SEO',
 reviewTasks:[
  'Read and verify actual PAC/IMD source documents, including method and station distinctions',
  'Check every astronomical or traditional assertion; correct ambiguous or unsupported claims',
  'Check that illustrative times are not presented as verified 2026 values',
  'Inspect real rendered mobile/desktop page, heading sequence, links and canonical',
  'Compare three articles for genuine standalone search intent and duplication',
  'Obtain separate content-reviewer and SEO-reviewer identities, dates and evidence'
 ],
 indexingAuthorized:false
}));
const result={
 artifactType:'PANCHAVANI_LEARNING_HUMAN_REVIEW_QUEUE',schemaVersion:1,
 status:'UNREVIEWED_NOT_INDEXABLE',records:q,
 humanEditorialReviewed:false,independentSeoReviewed:false,
 indexingAuthorized:false,sitemapInsertionAuthorized:false
};
if(process.argv.includes('--out')){
 const at=process.argv.indexOf('--out');
 const target=process.argv[at+1];
 if(!target||target.startsWith('-'))throw Error('Missing output path');
 await mkdir(resolve(target,'..'),{recursive:true});
 await writeFile(resolve(target),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify(result,null,2));
const release=JSON.parse(await readFile(new URL('../data/approved-learning-seo.json',import.meta.url)));
const released=validateLearningSeoRelease(release,guides,process.env.PANCHAVANI_APPROVED_LEARNING_SEO_SHA256);
console.error('Human-reviewed learning pages in sitemap:',released.length);
