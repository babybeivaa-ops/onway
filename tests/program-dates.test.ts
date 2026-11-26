import test from 'node:test';import assert from 'node:assert/strict';import {programDates} from '../src/programDates.ts';import {monday} from '../src/weeklyMeals.ts';
test('printed November dates determine Monday independently of selected group',()=>{const r=programDates(['11월 16일','11월 17일','11월 18일','11월 19일','11월 20일'],2026);assert.equal(monday(r.dates[0]),'2026-11-16');assert.equal(r.yearInferred,true)});
test('printed year takes precedence over current year',()=>{const r=programDates(['2027년 11월 15일','11월 16일'],2026);assert.deepEqual(r.dates,['2027-11-15','2027-11-16']);assert.equal(r.yearInferred,false)});
test('December week continues into January',()=>{assert.deepEqual(programDates(['12월 28일','12월 29일','1월 1일'],2026).dates,['2026-12-28','2026-12-29','2027-01-01']);assert.deepEqual(programDates(['12월 28일','2027년 1월 1일'],2026).dates,['2026-12-28','2027-01-01'])});
test('unreadable, impossible or reversed dates are rejected',()=>{for(const labels of [['날짜 없음'],['2월 30일'],['11월 17일','11월 16일'],['11월 1일','11월 20일']])assert.throws(()=>programDates(labels,2026))});
test('small PNG month glyph correction preserves printed date and year rollover',()=>{
 assert.deepEqual(programDates(['11월30일','12월01일','12월02일','12뭘03일','12월04일'],2026).dates,['2026-11-30','2026-12-01','2026-12-02','2026-12-03','2026-12-04']);
});
