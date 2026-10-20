import test from 'node:test';
import assert from 'node:assert/strict';
import {journeyTimeLabel} from '../src/journeyTime.ts';
test('journey time uses Korean AM/PM in Seoul regardless of input offset',()=>{
 assert.equal(journeyTimeLabel('2026-10-20T16:21:00+09:00'),'오후 4시 21분');
 assert.equal(journeyTimeLabel('2026-10-20T07:21:00Z'),'오후 4시 21분');
 assert.equal(journeyTimeLabel('2026-10-20T09:05:00+09:00'),'오전 9시 05분');
 assert.equal(journeyTimeLabel('2026-10-20T00:00:00+09:00'),'오전 12시 00분');
 assert.equal(journeyTimeLabel('2026-10-20T12:00:00+09:00'),'오후 12시 00분');
 assert.equal(journeyTimeLabel('invalid'),'');
});
