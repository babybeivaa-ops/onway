import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroup} from '../src/workspace.ts';
import {checkpointService as cp,confirmCenterArrival,activeReports} from '../src/services.ts';
import {toggleAdminCheckpointCheck} from '../src/adminAcknowledgment.ts';
const group=()=>createGroup({name:'고흥청소년문화의집',travelDate:'2099-01-01',origin:'학교·단체',youth:3,leaders:2,ic:false,bridge:true});
test('undo departure clears later arrival and admin confirmations before departure is recorded again',()=>{
 let s=group().state;s=cp.save(s,'start');const departure=s.reports.at(-1)!.id;
 s=cp.save(s,'bridge');s=toggleAdminCheckpointCheck(s,'bridge');s=confirmCenterArrival(s);
 assert.equal(s.trip.status,'도착');s=cp.cancel(s,departure);
 assert.equal(s.trip.status,'출발 전');assert.equal(s.adminCheckpointChecks?.length,0);
 assert(s.reports.every(r=>r.status==='cancelled'));
 s=cp.save(s,'start');assert.equal(s.trip.status,'이동 중');assert.equal(cp.next(s)?.id,'bridge');assert.equal(activeReports(s).length,1);
});
test('undo bridge preserves departure and earlier admin checks, but cancels destination',()=>{
 let s=group().state;s=cp.save(s,'start');s=toggleAdminCheckpointCheck(s,'start');s=cp.save(s,'bridge');const id=s.reports.at(-1)!.id;
 s=toggleAdminCheckpointCheck(s,'bridge');s=confirmCenterArrival(s);s=cp.cancel(s,id);
 assert.equal(s.trip.status,'이동 중');assert.deepEqual(s.adminCheckpointChecks?.map(c=>c.waypointId),['start']);assert.equal(cp.next(s)?.id,'bridge');
 assert.equal(s.reports.find(r=>r.waypointId==='arrival')?.status,'cancelled');
 s=cp.save(s,'bridge');assert.equal(s.trip.status,'이동 중');assert.equal(cp.next(s),undefined);
});
