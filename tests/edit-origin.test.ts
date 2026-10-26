import test from 'node:test';
import assert from 'node:assert/strict';
import {addGroup,editGroupDetails,saveWorkspace,loadWorkspace} from '../src/workspace.ts';
import type {Workspace} from '../src/workspace.ts';
const oldPlace={id:'old',name:'이전학교',address:'이전 주소',lat:35.1,lng:127.1,provider:'kakao' as const};
const nextPlace={id:'new',name:'효천고등학교',address:'새 주소',lat:34.9,lng:127.5,provider:'kakao' as const};
function setup(){return addGroup({version:2,view:'admin',activeGroupId:'',groups:[]} as Workspace,{name:'학교',origin:oldPlace.name,originPlace:oldPlace,travelDate:'2099-01-01',youth:25,leaders:2,ic:true,bridge:true})}
test('editing an address updates the guide origin and invalidates old distance, preserving history and counts',()=>{
 const before=setup();before.groups[0].state.totalRoadDistanceKm=100;
 const snapshot=structuredClone(before),id=before.activeGroupId;
 const after=editGroupDetails(before,id,{name:'효천',...before.groups[0].state.counts,originPlace:nextPlace});
 const state=after.groups[0].state;
 assert.equal(state.trip.origin,nextPlace.name);
 assert.deepEqual(state.waypoints.find(p=>p.id==='start')?.place,nextPlace);
 assert.equal(state.totalRoadDistanceKm,undefined);assert.equal(state.distanceNeedsReview,true);
 assert.deepEqual(state.counts,snapshot.groups[0].state.counts);
 assert.deepEqual(state.reports,snapshot.groups[0].state.reports);
 assert.deepEqual(state.changes,snapshot.groups[0].state.changes);
 assert.deepEqual(state.waypoints.filter(p=>p.id!=='start'),snapshot.groups[0].state.waypoints.filter(p=>p.id!=='start'));
 assert.deepEqual(before,snapshot);
 const map=new Map<string,string>(),storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v)}};
 saveWorkspace(storage,after);assert.deepEqual(loadWorkspace(storage).groups[0].state.waypoints.find(p=>p.id==='start')?.place,nextPlace);
});
test('typing a new name without selecting an address preserves the saved origin; invalid selection does not mutate it',()=>{
 const before=setup(),snapshot=structuredClone(before),input={name:'새 이름',...before.groups[0].state.counts};
 const after=editGroupDetails(before,before.activeGroupId,input);
 assert.deepEqual(after.groups[0].state.waypoints.find(p=>p.id==='start')?.place,oldPlace);
 assert.throws(()=>editGroupDetails(before,before.activeGroupId,{...input,originPlace:{...nextPlace,lat:NaN}}));
 assert.deepEqual(before,snapshot);
});
