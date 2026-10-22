import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const section=read('lib/section-experience.ts');
const page=read('app/[section]/page.tsx');
const city=read('app/panchang/[city]/page.tsx');
const muhurat=read('app/muhurat/[type]/page.tsx');
const region=read('app/regional/[state]/page.tsx');
const home=read('components/home-experience.tsx');
const css=read('app/globals.css');
const released=JSON.parse(read('data/approved-panchang.json'));

test('all seven informational sections have distinct useful editorial chapters',()=>{
 for(const name of ['calendar','festivals','muhurat','vrat','tools','learn','regional']){
  assert.match(section,new RegExp('\\n '+name+':\\{'),name+' must have specific guidance');
 }
 assert.match(page,/content\.basics\.map/);
 assert.match(page,/content\.checklist\.map/);
 assert.match(page,/content\.faqs\.map/);
 assert.match(page,/content\.links\.map/);
 assert.doesNotMatch(page,/Clarity before complexity|Explore the experience|BEHIND THE EXPERIENCE/);
 assert.match(page,/robots:\{index:false,follow:false\}/);
});

test('city guides start with reviewed date availability and never synthesize dates',()=>{
 assert.ok(city.indexOf('DAILY PANCHANG')<city.indexOf('UNDERSTANDING THE LOCAL CALENDAR'));
 assert.match(city,/releases\.length\?/);
 assert.match(city,/Date-by-date values are in scientific review/);
 assert.match(city,/guide\.sources\.map/);
 assert.deepEqual(released.records,[]);
});

test('Muhurats provide readable progressive disclosure without publishing dates',()=>{
 assert.match(muhurat,/guide\.sections\.map/);
 assert.match(muhurat,/details className="editorial-details"/);
 assert.match(muhurat,/Read the method/);
 assert.match(muhurat,/robots:\{index:false,follow:false\}/);
 assert.match(muhurat,/guide\.references\.map/);
 assert.match(css,/\.muhurat-details \.interior-body/);
});

test('regional pages link to real city guides, not repeat unverified content',()=>{
 for(const id of ['uttar-pradesh','maharashtra','tamil-nadu','karnataka','gujarat']){
  assert.ok(region.includes("'"+id+"':"),id);
 }
 assert.match(region,/CITY_GUIDES\[city\]/);
 assert.match(region,/robots:\{index:false,follow:false\}/);
});

test('navigation does not misrepresent live unapproved calendar results',()=>{
 assert.match(home,/Panchang for/);
 assert.doesNotMatch(home,/Explore Today’s<br\/>Panchang/);
 assert.match(css,/\.editorial-basics-grid/);
 assert.match(css,/@media\(max-width:620px\)/);
});
