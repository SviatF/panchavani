import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const ROOT=new URL('../',import.meta.url);
const get=(path)=>fs.readFileSync(new URL(path,ROOT),'utf8');
const guides=JSON.parse(get('data/city-guides.json'));
const muhurat=JSON.parse(get('data/muhurat-guides.json'));
const cityScope=['delhi','mumbai','kolkata','chennai','bengaluru','hyderabad','ahmedabad','pune','jaipur','varanasi'];
const muhuratScope=['wedding','griha-pravesh','vehicle-purchase','start-business'];

test('Every indexable city has one public selector identity and one authored guide',()=>{
 assert.deepEqual(Object.keys(guides).sort(),[...cityScope].sort());
 const selector=get('components/city-selection.tsx');
 const home=get('components/home-experience.tsx');
 const header=get('components/site-header.tsx');
 for(const id of cityScope){
  assert.match(selector,new RegExp("\\b"+id+"\\b"));
  assert.ok(guides[id].question.length>50);
  assert.ok(guides[id].sources.length>=2);
 }
 assert.match(home,/CITY_OPTIONS/);
 assert.match(header,/CITY_OPTIONS/);
 assert.match(header,/\\.\\.\\.CITY_OPTIONS\\.map/);
 assert.doesNotMatch(header,/first three research locations/i);
});
test('Four muhurat pages are substantially different, contain real reader answers and source attribution',()=>{
 assert.deepEqual(Object.keys(muhurat).sort(),[...muhuratScope].sort());
 const bodies=[];
 const questions=[];
 for(const slug of muhuratScope){
  const g=muhurat[slug];
  assert.ok(g.lead.length>85,slug);
  assert.ok(g.summary.length>170,slug);
  assert.equal(g.sections.length,3);
  assert.ok(g.sections.every(x=>x.title.length>18&&x.body.length>205),slug);
  assert.ok(g.checklist.length>=6);
  assert.ok(g.question.length>55&&g.answer.length>200,slug);
  assert.ok(g.references.length>=2,slug);
  assert.ok(g.references.every(x=>x.url.startsWith('https://')&&x.label.length>20),slug);
  assert.ok(g.state.toLowerCase().includes('no ')||g.state.toLowerCase().includes('remain withheld')||g.state.toLowerCase().includes('does not publish'),slug);
  bodies.push(g.sections.map(x=>x.body).join(' '));
  questions.push(g.question);
 }
 assert.equal(new Set(questions).size,4);
 assert.equal(new Set(bodies).size,4);
});
test('Muhurat is explicitly unindexed without human-reviewed timing recommendations',()=>{
 const page=get('app/muhurat/[type]/page.tsx');
 assert.match(page,/robots:\{index:false,follow:false\}/);
 assert.match(page,/guide.sections.map/);
 assert.match(page,/guide.references.map/);
 assert.match(page,/CITY_GUIDE_IDS.map/);
 assert.doesNotMatch(page,/Best dates for today|guaranteed auspicious/);
 const releases=JSON.parse(get('data/approved-panchang.json'));
 assert.equal(releases.records.length,0);
});
