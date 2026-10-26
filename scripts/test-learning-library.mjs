import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const guides=read('lib/learning-guides.ts');
const page=read('app/learn/[topic]/page.tsx');
const links=read('lib/section-experience.ts');
const nav=read('components/site-header.tsx');
const sitemap=read('lib/seo-release-manifest.ts');
const policy=['what-is-tithi','what-is-nakshatra','sunrise-and-city-panchang'];
test('Three original, content-rich guides have distinct search intents',()=>{
 const titles=[
  'What Is Tithi? Lunar Days, Paksha and Sunrise Explained',
  'What Is Nakshatra? The 27 Lunar Mansions Explained',
  'Why Panchang Sunrise Times Differ by City'
 ];
 for(const slug of policy){
  assert.match(guides,new RegExp("'"+slug+"':\\{"));
  assert.match(links,new RegExp("href:'/learn/"+slug+"/'"));
  assert.match(nav,new RegExp("href:'/learn/"+slug+"/'"));
 }
 for(const title of titles)assert(guides.includes(title));
 assert.match(guides,/12.degree rule measures/);
 assert.match(guides,/Ayanamsa is not a cosmetic setting/);
 assert.match(guides,/Why refraction and the Sun/);
 assert.match(guides,/https:\/\/packolkata\.imd\.gov\.in\/panchang\/en\/explanation/);
 assert.match(guides,/https:\/\/mausam\.imd\.gov\.in\/responsive\/rashtriyPanchang\.php/);
});
test('Educational examples must be explicitly fictional, never projected science',()=>{
 for(const text of ['fictional','hypothetical','conceptual example','not a calculated observation'])
   assert(guides.toLowerCase().includes(text.toLowerCase()),text);
 assert.match(page,/ILLUSTRATIVE, NOT LIVE DATA/);
 assert.match(page,/This page does not provide verified city\/date astronomy/);
});
test('Each new page remains noindex and omitted from independently approved SEO routes',()=>{
 assert.match(page,/robots:\{index:false,follow:false\}/);
 assert.match(page,/generateStaticParams/);
 assert.match(page,/alternates:\{canonical:/);
 for(const slug of policy)
  assert(!sitemap.includes("/learn/"+slug+"/"),slug+' cannot enter sitemap without editorial signoff');
 assert(!sitemap.includes('learningSlugs'),'Unapproved guides are forbidden from existing SEO allowlist');
});
