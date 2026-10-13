import test from 'node:test';
import assert from 'node:assert/strict';
import {reportDatePrefix,validateReportTime} from '../src/reportTime.ts';
import {checkpointService} from '../src/services.ts';
import {createDemo} from '../src/data.ts';
test('record dates compare local dates and distinguish other years',()=>{
 const at=new Date(2026,8,28,13,35).toISOString();
 assert.equal(reportDatePrefix(at,'2026-09-28'),'');
 assert.equal(reportDatePrefix(at,'2026-09-29'),'9/28 ');
 assert.equal(reportDatePrefix(at,'2027-09-28'),'2026/9/28 ');
});
test('future records are rejected on both save and edit without state changes',()=>{
 const now=Date.now(),future=new Date(now+86400000).toISOString(),s=createDemo(),before=structuredClone(s);
 assert.doesNotThrow(()=>validateReportTime(new Date(now).toISOString(),now));
 assert.doesNotThrow(()=>validateReportTime(new Date(now-60000).toISOString(),now));
 assert.throws(()=>validateReportTime('bad',now));
 assert.throws(()=>checkpointService.save(s,'bridge',future),/미래/);
 assert.throws(()=>checkpointService.edit(s,s.reports[0].id,future),/미래/);
 assert.deepEqual(s,before);
});
