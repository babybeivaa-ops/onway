import test from 'node:test';
import assert from 'node:assert/strict';
import {addGroup,editGroupDetails,saveWorkspace,loadWorkspace} from '../src/workspace.ts';
import {roadRoutePlan} from '../src/roadRoute.ts';
import type {Workspace} from '../src/workspace.ts';
const place={id:'school-test',name:'현동초등학교',address:'경남 창원시',lat:35.14,lng:128.58,provider:'kakao' as const};
test('selected registration address survives display name/count/contact edits and reload into guide route',()=>{
 const empty:Workspace={version:2,view:'admin',activeGroupId:'',groups:[]};
 let w=addGroup(empty,{name:'창원 현동초',origin:place.name,originPlace:place,travelDate:'2026-10-16',youth:34,leaders:12,ic:true,bridge:true});
 w=editGroupDetails(w,w.activeGroupId,{name:'창원 현동초 5학년',youth:35,leaders:12,arrival:{contactName:'',phone:'',dropoff:'체험관 앞'}});
 const data=new Map<string,string>();const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value)}};
 saveWorkspace(storage,{...w,view:'guide'});w=loadWorkspace(storage);
 assert.deepEqual(w.groups[0].state.waypoints.find(p=>p.id==='start')?.place,place);
 const route=roadRoutePlan(w.groups[0].state,w.groups[0].travelDate);
 assert.equal(route.error,'');assert.deepEqual(JSON.parse(route.key)[0],[place.lng,place.lat]);
 assert.equal(empty.groups.length,0);
});
