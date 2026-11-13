import test from 'node:test';
import assert from 'node:assert/strict';
import {addGroup,editGroupDetails,copyJourney,loadWorkspace,saveWorkspace} from '../src/workspace.ts';
import {formatSchoolGroupName} from '../src/groupName.ts';
import {backupText,parseBackup} from '../src/backup.ts';
import type {Workspace} from '../src/workspace.ts';

const counts={youth:8,leaders:1};
const place={id:'jindo-office',name:'진도군청',address:'전남 진도군 테스트 주소',lat:34.486,lng:126.263,provider:'kakao' as const};
test('registration, location edits, copy, storage and backup preserve the administrator name',()=>{
 let w:Workspace=addGroup({version:2,view:'admin',activeGroupId:'',groups:[]},{name:'진도군 드림스타트',origin:'진도군 드림스타트',originPlace:place,originMode:'school',travelDate:'2099-01-01',...counts,ic:true,bridge:true});
 const id=w.activeGroupId;
 assert.equal(w.groups[0].state.organization.name,'진도군 드림스타트');
 assert.deepEqual(w.groups[0].state.waypoints.find(p=>p.id==='start')?.place,place);
 const before=structuredClone(w);
 const nextPlace={...place,name:'진도군청 별관',lat:34.487};
 w=editGroupDetails(w,id,{name:'진도군 드림스타트',...counts,originPlace:nextPlace,originMode:'school'});
 assert.deepEqual(before.groups[0].state.waypoints.find(p=>p.id==='start')?.place,place);
 assert.equal(w.groups[0].state.organization.name,'진도군 드림스타트');
 assert.deepEqual(w.groups[0].state.reports,before.groups[0].state.reports);
 w=copyJourney(w,id,{name:'진도군 드림스타트',...counts,travelDate:'2099-01-02'});
 const values=new Map<string,string>();const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v)}};
 saveWorkspace(storage,w);const restored=parseBackup(backupText(loadWorkspace(storage)));
 for(const g of restored.groups){assert.equal(g.state.organization.name,'진도군 드림스타트');assert.equal(formatSchoolGroupName(g.state.organization.name,g.state.counts,nextPlace.name),'진도군 드림스타트');assert.equal(g.state.waypoints.find(p=>p.id==='start')?.place?.lat,nextPlace.lat)}
});
test('regional youth institution names remain complete regardless of selected place',()=>{
 for(const name of ['궁동 청소년 문화의 집','궁동청소년문화의집','고흥 청소년문화의집','울산 북구 청소년문화의집']){
  for(const selected of ['청소년문화의집','진도군청','궁동초등학교']){
   assert.equal(formatSchoolGroupName(name,counts,selected,'school'),name);
   assert.equal(formatSchoolGroupName(name,counts,selected,'school','organization'),name);
   const w=addGroup({version:2,view:'admin',activeGroupId:'',groups:[]},{name,origin:selected,originPlace:{...place,name:selected},travelDate:'2099-01-01',...counts,ic:true,bridge:true});
   assert.equal(w.groups[0].state.organization.name,name);
   assert.equal(editGroupDetails(w,w.activeGroupId,{name,...counts}).groups[0].state.organization.name,name);
  }
 }
});
