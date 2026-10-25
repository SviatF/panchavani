import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const text=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Monthly calendar uses explicit reviewed data only, never provisional numerical packets',()=>{
 const view=text('components/calendar-explorer.tsx');
 const source=text('app/[section]/page.tsx');
 const records=text('data/approved-panchang.json');
 assert.match(source,/section==='calendar'&&<CalendarExplorer/);
 assert.match(source,/allApproved=\{approvedCityDays\(\)\}/);
 assert.match(view,/monthCells\(month,allApproved\.filter/);
 assert.match(view,/reviewed:indexed\.get\(date\)\?\?null/);
 assert.match(view,/if\(!cell\.reviewed\)/);
 assert.match(view,/href=\{`\/panchang\/\$\{cityId\}\/\$\{cell\.date\}\/`\}/);
 assert.doesNotMatch(view,/UNAPPROVED\.json|nightly-|month.*research|mockTithi/);
 const published=JSON.parse(records);
 assert.ok(Array.isArray(published.records));
 assert.ok(published.records.every(x=>x.status==='approved'),
  'Calendar must never publish unapproved science records');
});
test('Live calendar has real civil month controls and all ten canonical cities',()=>{
 const view=text('components/calendar-explorer.tsx');
 assert.match(view,/new Date\(Date\.UTC\(y,m,0\)\)/);
 assert.match(view,/getUTCDay\(\)\+6\)\%7/);
 assert.match(view,/CITY_OPTIONS\.map/);
 assert.match(view,/setCityId\(next\.id\)/);
 assert.match(view,/monthShift\(month,step\)/);
 assert.match(view,/aria-label/);
 assert.match(text('app/panchang/[city]/page.tsx'),/Browse monthly calendar/);
});

test('Unreviewed dates are useful, selectable civil dates with city-specific sourced guidance, not false data',()=>{
 const view=text('components/calendar-explorer.tsx');
 const guide=JSON.parse(text('data/city-guides.json'));
 assert.match(view,/setFocusedDate\(cell\.date\)/);
 assert.match(view,/focusedDay===cell\.date/);
 assert.match(view,/localGuide\.question/);
 assert.match(view,/localGuide\.answer/);
 assert.match(view,/localGuide\.example/);
 assert.match(view,/localGuide\.sources\.map/);
 assert.match(view,/timeZone:'UTC',weekday:'long'/);
 assert.match(view,/not yet independently released/);
 assert.match(view,/if\(!cell\.reviewed\)return <button type="button"/);
 assert.doesNotMatch(view,/mock[A-Z]|fakeSunrise|modelledResearchOutput/i);
 const questions=new Set(Object.values(guide).map(g=>g.question.trim().toLowerCase()));
 assert.equal(questions.size,10,'ten cities need genuinely distinct editorial questions');
 for(const [city,g] of Object.entries(guide)){
  assert.ok(g.introduction.length>180,city);
  assert.ok(g.example.length>180,city);
  assert.ok(g.sources.length>=2,city);
 }
});
