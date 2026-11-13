import test from 'node:test';
import assert from 'node:assert/strict';
import {addGroup,editGroupDetails} from '../src/workspace.ts';
import {routeService} from '../src/services.ts';
const empty={version:2 as const,view:'admin' as const,activeGroupId:'',groups:[]};
const place={id:'test-yeosu',provider:'kakao' as const,name:'아쿠아플라넷 여수',address:'전남 여수시',lat:34.75,lng:127.75};
test('Yeosu origin uses first bridge without IC',()=>{const w=addGroup(empty,{name:'동원고',origin:'동원고',travelDate:'2099-01-01',youth:10,leaders:1,ic:true,bridge:false,originMode:'other',originPlace:place});const ids=routeService.points(w.groups[0].state).map(p=>p.id);assert.deepEqual(ids,['start','bridge','arrival']);});
test('changing Naro origin to Yeosu replaces the old route with first bridge without duplicates',()=>{let w=addGroup(empty,{name:'동원고',origin:'동원고',travelDate:'2099-01-01',youth:10,leaders:1,ic:true,bridge:true,originMode:'other',originPlace:{...place,name:'나로우주센터'}});const id=w.activeGroupId;for(let i=0;i<2;i++)w=editGroupDetails(w,id,{name:'동원고',youth:10,leaders:1,originMode:'other',originPlace:place});const points=routeService.points(w.groups[0].state);assert.equal(points.filter(p=>p.id==='bridge').length,1);assert.deepEqual(points.map(p=>p.id),['start','bridge','arrival']);});
