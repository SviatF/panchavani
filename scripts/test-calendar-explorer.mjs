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
 assert.equal(JSON.parse(records).records.length,0);
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
