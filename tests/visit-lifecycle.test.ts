import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isVisitPast,visitEndDate} from '../src/visitLifecycle.ts';
const group={travelDate:'2026-11-25',state:{organization:{visitDuration:'2박 3일'}}};
test('stay remains current through checkout day until 18:00 Korea',()=>{
 assert.equal(visitEndDate(group),'2026-11-27');
 assert.equal(isVisitPast(group,'2026-11-26',new Date('2026-11-26T10:00:00Z')),false);
 assert.equal(isVisitPast(group,'2026-11-27',new Date('2026-11-27T08:59:59Z')),false);
 assert.equal(isVisitPast(group,'2026-11-27',new Date('2026-11-27T09:00:00Z')),true);
 assert.equal(isVisitPast(group,'2026-11-28'),true);
});
test('checkout handles month/year boundaries and same-day visits',()=>{
 assert.equal(visitEndDate({travelDate:'2026-12-31',state:{organization:{visitDuration:'1박 2일'}}}),'2027-01-01');
 assert.equal(isVisitPast({travelDate:'2026-11-27'},'2026-11-27',new Date('2026-11-27T08:00:00Z')),false);
});
