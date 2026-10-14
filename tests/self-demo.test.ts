import {test} from 'node:test';import assert from 'node:assert/strict';
import {demoStorage,DEMO_STORAGE_PREFIX} from '../src/demoStorage.ts';
import {loadWorkspace,saveWorkspace,addGroup,WORKSPACE_KEY,LEGACY_KEY} from '../src/workspace.ts';
test('self demo starts empty, accepts entries, and leaves original records untouched',()=>{
 const map=new Map([[WORKSPACE_KEY,'private-data'],[LEGACY_KEY,'legacy-data']]);const storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v)}};const isolated=demoStorage(storage);
 const empty=loadWorkspace(isolated);assert.equal(empty.view,'admin');assert.deepEqual(empty.groups,[]);
 const w=addGroup(empty,{name:'체험학교',origin:'체험학교',travelDate:'2026-10-14',youth:20,leaders:2,ic:true,bridge:true});saveWorkspace(isolated,w);
 assert.equal(loadWorkspace(isolated).groups[0].state.organization.name,'체험학교');assert.equal(map.get(WORKSPACE_KEY),'private-data');assert.equal(map.get(LEGACY_KEY),'legacy-data');assert.ok(map.has(DEMO_STORAGE_PREFIX+WORKSPACE_KEY));
 const another=demoStorage({getItem:()=>null,setItem:()=>{}});assert.equal(loadWorkspace(another).groups.length,0);
});
