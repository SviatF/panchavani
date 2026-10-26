/** Verify actually exported HTML, canonical, robots and exact date-scoped posts. */
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd();
const payload=JSON.parse(readFileSync(join(root,'data/research-panchang-pilot.json'),'utf8'));
const all=payload.days||[];
const ist=()=>{
 const chunks=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',
  year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const s=Object.fromEntries(chunks.map(x=>[x.type,x.value]));
 return s.year+'-'+s.month+'-'+s.day;
};
const day=process.env.GITHUB_EVENT_NAME==='pull_request'&&
 process.env.PANCHAVANI_PILOT_TEST_BUILD_DATE||ist();
const released=all.filter(x=>x.date<=day);
function file(path){
 const whole=join(root,'out',path);
 assert(existsSync(whole),'Missing exported file: '+whole);
 return readFileSync(whole,'utf8');
}
const sitemap=file('sitemap.xml');
assert(!sitemap.includes('/research/panchang'),'Research entries cannot enter Google sitemap');
const hub=file('research/panchang/index.html');
assert(/noindex/.test(hub),'Research diary must remain noindex');
const seenTitles=new Set();
for(const d of all){
 const path='research/panchang/delhi/'+d.date+'/index.html';
 if(d.date>day){
  assert(!existsSync(join(root,'out',path)),'Future day leaked early: '+d.date);
  continue;
 }
 const html=file(path);
 assert(/<meta[^>]*name="robots"[^>]*content="[^"]*noindex/.test(html),
    'Missing explicit noindex on '+d.date);
 assert(html.includes('https://panchavani.com/research/panchang/delhi/'+d.date+'/'),
    'Missing matching canonical URL on '+d.date);
 assert(html.includes('Unverified astronomy'), 'Research warning missing on '+d.date);
 assert(html.includes(d.date),'Wrong date on '+d.date);
 assert(html.includes(d.panchang.tithi),'Tithi text omitted on '+d.date);
 assert(html.includes(d.panchang.nakshatra),'Nakshatra text omitted on '+d.date);
 assert(html.includes(d.titleAngle),'Unique editorial angle omitted on '+d.date);
 assert(html.includes(d.researchSourceRecordSha256),'Scientific source SHA omitted on '+d.date);
 assert(html.includes('NOT an independently'),'Unverified-disclosure text missing on '+d.date);
 const title=(html.match(/<title>([^<]+)<\/title>/)||[])[1];
 assert(title,'Missing SEO title on '+d.date);
 assert(!seenTitles.has(title),'Duplicate SEO title on '+d.date);
 seenTitles.add(title);
}
console.log('PANCHAVANI SEO QUALITY: '+released.length+' / 7 released article HTML pages passed');
console.log('PASS: unique titles, exact canonical, visible source SHA, dynamic facts, noindex, future-date hold and excluded from sitemap.');
