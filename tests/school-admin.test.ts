import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroup,editGroupDetails,saveWorkspace,loadWorkspace,copyJourney} from '../src/workspace.ts';
import {backupText,parseBackup} from '../src/backup.ts';
import {adminJourney} from '../src/adminJourney.ts';
import {checkpointService} from '../src/services.ts';
import {validGroup} from '../public-api/workspace-schema.mjs';
import type {Workspace} from '../src/workspace.ts';

function setup(){
 const a=createGroup({name:'창원 현동초',travelDate:'2026-10-14',origin:'학교',youth:40,leaders:3,ic:true,bridge:true});
 const b=createGroup({name:'광주고',travelDate:'2026-10-15',origin:'학교',youth:60,leaders:5,ic:true,bridge:true});
 const w:Workspace={version:2,view:'admin',activeGroupId:a.id,groups:[a,b]};
 return {a,b,w};
}
const arrivalA={contactName:'학교 A 담당',phone:'010-0000-0001',dropoff:'체험관 앞'};
const arrivalB={contactName:'학교 B 담당',phone:'010-0000-0002',dropoff:'정문 버스 승강장'};

test('contact and dropoff belong to each school and survive storage and backup',()=>{
 const {a,b,w}=setup();const original=structuredClone(w);
 let next=editGroupDetails(w,a.id,{name:a.state.organization.name,...a.state.counts,arrival:arrivalA});
 next=editGroupDetails(next,b.id,{name:b.state.organization.name,...b.state.counts,arrival:arrivalB});
 const data=new Map<string,string>();const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value)}};
 saveWorkspace(storage,next);const restored=loadWorkspace(storage);const backup=parseBackup(backupText(restored));
 assert.deepEqual(backup.groups[0].state.organization.arrival,arrivalA);assert.deepEqual(backup.groups[1].state.organization.arrival,arrivalB);
 assert.deepEqual(w,original);assert.deepEqual(next.groups[0].state.reports,a.state.reports);assert.equal(next.groups[0].state.changes.length,0);
});

test('editing name and counts preserves contact; blank contact can be saved explicitly',()=>{
 const {a,w}=setup();let next=editGroupDetails(w,a.id,{name:'현동초',...a.state.counts,arrival:arrivalA});
 next=editGroupDetails(next,a.id,{name:'창원 현동초',youth:41,leaders:3});assert.deepEqual(next.groups[0].state.organization.arrival,arrivalA);
 next=editGroupDetails(next,a.id,{name:'창원 현동초',youth:41,leaders:3,arrival:{contactName:'',phone:'',dropoff:''}});
 assert.equal(next.groups[0].state.organization.arrival?.phone,'');
});

test('copied visits have an independent contact object and legacy groups remain valid',()=>{
 const {a,w}=setup();assert.equal(validGroup(a),true);
 const next=editGroupDetails(w,a.id,{name:a.state.organization.name,...a.state.counts,arrival:arrivalA});
 const copied=copyJourney(next,a.id,{name:a.state.organization.name,...a.state.counts,travelDate:'2026-10-16'});
 assert.deepEqual(copied.groups[2].state.organization.arrival,arrivalA);
 copied.groups[2].state.organization.arrival!.phone='010-0000-0003';assert.equal(copied.groups[0].state.organization.arrival?.phone,arrivalA.phone);
 assert.equal(validGroup({...a,state:{...a.state,organization:{...a.state.organization,arrival:{...arrivalA,phone:42}}}}),false);
});

test('invalid contact information is rejected without changing a group',()=>{
 const {a,w}=setup();assert.throws(()=>editGroupDetails(w,a.id,{name:a.state.organization.name,...a.state.counts,arrival:{...arrivalA,phone:'잘못된 연락처'}}));
 assert.deepEqual(w.groups[0].state.organization.arrival,{contactName:'',phone:'',dropoff:'체험관 앞'});
});

test('journey summary reflects real confirmations and cancellation',()=>{
 const {a}=setup();let state=a.state;assert.equal(adminJourney(state).current,'출발 전');
 state=checkpointService.save(state,'start');assert.equal(adminJourney(state).current,'학교 출발');
 state=checkpointService.save(state,'ic');assert.equal(adminJourney(state).current,'고흥IC 통과');
 state=checkpointService.save(state,'bridge');assert.equal(adminJourney(state).current,'나로1대교 통과');
 state=checkpointService.cancel(state,state.reports.find(r=>r.waypointId==='bridge')!.id);assert.equal(adminJourney(state).current,'고흥IC 통과');
});

test('skipped stops are not presented as confirmed and excluded stops are omitted',()=>{
 const {a}=setup();let state=checkpointService.save(a.state,'bridge');const summary=adminJourney(state);
 assert.equal(summary.steps.find(p=>p.id==='start')?.done,false);assert.equal(summary.steps.find(p=>p.id==='ic')?.done,false);assert.equal(summary.steps.find(p=>p.id==='bridge')?.done,true);
 state={...state,waypoints:state.waypoints.map(p=>p.id==='ic'?{...p,included:false}:p)};assert.ok(!adminJourney(state).steps.some(p=>p.id==='ic'));
});

test('new groups default to experience hall dropoff and edits persist independently',()=>{const {a,b,w}=setup();assert.equal(a.state.organization.arrival?.dropoff,'체험관 앞');const updated=editGroupDetails(w,a.id,{name:a.state.organization.name,...a.state.counts,arrival:{contactName:'',phone:'',dropoff:'정문'}});const restored=parseBackup(backupText(updated));assert.equal(restored.groups[0].state.organization.arrival?.dropoff,'정문');assert.equal(restored.groups[1].state.organization.arrival?.dropoff,'체험관 앞');assert.equal(b.state.organization.arrival?.dropoff,'체험관 앞');});
