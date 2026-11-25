import test from 'node:test';import assert from 'node:assert/strict';import {defaultScheduleDate,scheduleToday} from '../src/scheduleDate.ts';
const dates=['2026-11-25','2026-11-26','2026-11-27'];
test('schedule date defaults to first day before arrival, current day during visit, last day afterwards',()=>{
 assert.equal(defaultScheduleDate(dates,'2026-11-24'),dates[0]);
 assert.equal(defaultScheduleDate(dates,'2026-11-26'),dates[1]);
 assert.equal(defaultScheduleDate(dates,'2026-11-28'),dates[2]);
 assert.equal(defaultScheduleDate([],'2026-11-25'),'');
});
test('schedule today changes at Korean midnight, independent of device timezone',()=>{
 assert.equal(scheduleToday(new Date('2026-11-25T14:59:59Z')),'2026-11-25');
 assert.equal(scheduleToday(new Date('2026-11-25T15:00:00Z')),'2026-11-26');
});
