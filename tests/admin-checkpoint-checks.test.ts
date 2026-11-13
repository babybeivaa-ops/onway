import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroup} from '../src/workspace.ts';
import {adminJourney,adminCardJourney} from '../src/adminJourney.ts';
import {toggleAdminCheckpointCheck,editAdminCheckpointTime} from '../src/adminAcknowledgment.ts';
import {validGroup} from '../public-api/workspace-schema.mjs';
test('administrator acknowledgment never changes reported journey or counts, and can be undone',()=>{
 const group=createGroup({name:'동원고등학교',travelDate:'2026-10-30',origin:'학교',youth:20,leaders:2,ic:true,bridge:true});
 const before=structuredClone(group.state);
 const point=adminJourney(before).steps.find(p=>p.id!=='before')!;
 const after=toggleAdminCheckpointCheck(before,point.id,'2026-10-30T03:00:00Z');
 assert.deepEqual(adminJourney(after),adminJourney(before));
 const {adminCheckpointChecks,...rest}=after;
 assert.deepEqual(rest,before);
 assert.equal(adminCheckpointChecks?.length,1);
 assert.equal(validGroup({...group,state:after}),true);
 assert.deepEqual(toggleAdminCheckpointCheck(after,point.id).adminCheckpointChecks,[]);
 const first=toggleAdminCheckpointCheck(before,'before','2026-10-30T02:00:00Z'); assert.equal(first.adminCheckpointChecks?.[0].waypointId,'before'); assert.deepEqual(adminJourney(first),adminJourney(before)); assert.throws(()=>toggleAdminCheckpointCheck(before,'missing-point'));
 assert.equal(validGroup({...group,state:{...after,adminCheckpointChecks:[{waypointId:point.id,confirmedAt:'bad'}]}}),false);
});

test('editing admin time retains Korea calendar date and independent guide reports',()=>{
 const g=createGroup({name:'동원고등학교',travelDate:'2026-10-30',origin:'학교',youth:20,leaders:2,ic:true,bridge:true});
 const original=toggleAdminCheckpointCheck(g.state,'before','2026-10-29T23:00:00Z');
 const edited=editAdminCheckpointTime(original,'before','13:55');
 assert.equal(edited.adminCheckpointChecks?.[0].confirmedAt,'2026-10-30T04:55:00.000Z');
 assert.deepEqual(adminJourney(edited),adminJourney(original));
 const {adminCheckpointChecks:a,...rest}=edited; const {adminCheckpointChecks:b,...prior}=original;
 assert.deepEqual(rest,prior);assert.equal(validGroup({...g,state:edited}),true);
 for(const value of ['24:00','13:60','bad',''])assert.throws(()=>editAdminCheckpointTime(original,'before',value));
 assert.throws(()=>editAdminCheckpointTime(original,'missing','12:00'));
});

test('admin checks advance card status without rewriting guide timeline and undo restores it',()=>{
 const group=createGroup({name:'봉황초등학교',travelDate:'2026-10-30',origin:'학교',youth:20,leaders:2,ic:true,bridge:true});
 const original=group.state;
 const started=toggleAdminCheckpointCheck(original,'start','2026-10-30T05:00:00Z');
 assert.equal(adminCardJourney(started).current,'학교 출발');
 const passed=toggleAdminCheckpointCheck(started,'ic','2026-10-30T05:06:00Z');
 assert.equal(adminCardJourney(passed).current,'고흥IC 통과');
 assert.equal(adminCardJourney(passed).recordedAt,'2026-10-30T05:06:00Z');
 assert.deepEqual(adminJourney(passed),adminJourney(original));
 const undone=toggleAdminCheckpointCheck(passed,'ic');
 assert.equal(adminCardJourney(undone).phase,'departed');
 assert.equal(adminCardJourney(toggleAdminCheckpointCheck(undone,'start')).phase,'waiting');
});

 test('admin progress advances guide next checkpoint without creating guide reports',async()=>{
 const {checkpointService}=await import('../src/services.ts');
 const original=createGroup({name:'동원고등학교',travelDate:'2026-10-30',origin:'학교',youth:20,leaders:2,ic:true,bridge:true}).state;
 assert.equal(checkpointService.next(original)?.id,'start');
 const passed=toggleAdminCheckpointCheck(original,'ic','2026-10-30T05:06:00Z');
 assert.equal(checkpointService.next(passed)?.id,'bridge');
 assert.deepEqual(passed.reports,original.reports);
 assert.equal(checkpointService.next(toggleAdminCheckpointCheck(passed,'ic'))?.id,'start');
 assert.equal(checkpointService.next(toggleAdminCheckpointCheck(passed,'bridge','2026-10-30T05:10:00Z')),undefined);
 const excluded={...passed,waypoints:passed.waypoints.map(p=>p.id==='ic'?{...p,included:false}:p)};
 assert.equal(checkpointService.next(excluded)?.id,'start');
 const reported=checkpointService.save(passed,'bridge');
 assert.equal(checkpointService.next(toggleAdminCheckpointCheck(reported,'ic')),undefined);
 });
