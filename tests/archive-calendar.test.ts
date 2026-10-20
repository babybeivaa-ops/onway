import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarDays,shiftCalendarMonth,archivedVisits} from '../src/archiveCalendarModel.ts';

test('calendar uses correct weekdays and includes leap day, with full weeks',()=>{
 const leap=calendarDays('2024-02');
 assert.deepEqual(leap.slice(0,5),[null,null,null,null,'2024-02-01']);
 assert.equal(leap.filter(Boolean).length,29);
 assert.equal(leap.length%7,0);
 assert.ok(leap.includes('2024-02-29'));
 assert.equal(calendarDays('2025-02').filter(Boolean).length,28);
 assert.equal(calendarDays('2026-11')[0],'2026-11-01');
 assert.deepEqual(calendarDays('2026-13'),[]);
});
test('month navigation crosses year boundaries',()=>{
 assert.equal(shiftCalendarMonth('2026-01',-1),'2025-12');
 assert.equal(shiftCalendarMonth('2026-12',1),'2027-01');
});
test('archive month and day filters retain all same-day groups and exclude current or future visits',()=>{
 const groups=[{id:'future',travelDate:'2026-10-25'},{id:'a',travelDate:'2026-10-02'},{id:'b',travelDate:'2026-10-02'},{id:'earlier',travelDate:'2026-09-30'},{id:'today',travelDate:'2026-10-20'},{id:'c',travelDate:'2026-10-19'}];
 const original=structuredClone(groups);
 assert.deepEqual(archivedVisits(groups,'2026-10-20','2026-10').map(g=>g.id),['a','b','c']);
 assert.deepEqual(archivedVisits(groups,'2026-10-20','2026-10','2026-10-02').map(g=>g.id),['a','b']);
 assert.deepEqual(archivedVisits(groups,'2026-10-20','2026-10','2026-10-03'),[]);
 assert.deepEqual(archivedVisits(groups,'2026-10-20','2026-08'),[]);
 assert.deepEqual(groups,original);
});
