import test from 'node:test';
import assert from 'node:assert/strict';
import {fixedRouteOrder,canMoveRoutePoint} from '../src/routeOrder.ts';
import {addGroup,saveRoute,loadWorkspace,saveWorkspace} from '../src/workspace.ts';
import {routeService} from '../src/services.ts';
import {NARO_BRIDGE_ID,NARO_BRIDGE_PLACE} from '../src/naroOriginRoute.ts';
const base=[{id:'start',name:'학교'},{id:'ic',name:'고흥IC'},{id:'bridge',name:'나로1대교'}];
test('bridge 2 follows bridge 1 for both new and legacy point IDs',()=>{
 for(const id of [NARO_BRIDGE_ID,'custom-legacy']){
  const result=fixedRouteOrder([...base,{id,name:'나로 2대교'},{id:'custom-rest',name:'휴게소'}]);
  assert.deepEqual(result.map(p=>p.id),['start','ic','custom-rest','bridge',id]);
  assert.equal(canMoveRoutePoint(result,4,-1),false);
  assert.equal(canMoveRoutePoint(result,2,-1),true);
 }
});
test('Naro origin without bridge 1 preserves custom stop ordering',()=>{
 const points=[base[0],{id:NARO_BRIDGE_ID,name:'나로2대교'},{id:'custom-rest',name:'휴게소'}];
 assert.deepEqual(fixedRouteOrder(points),points);
 assert.equal(canMoveRoutePoint(points,1,1),true);
 assert.equal(canMoveRoutePoint(points,1,-1),false);
});
test('saving and reloading bridge 2 preserves order, coordinates and records',()=>{
 let w=addGroup({version:2,view:'admin',activeGroupId:'',groups:[]},{name:'테스트학교',origin:'테스트학교',travelDate:'2099-01-01',youth:30,leaders:2,ic:true,bridge:true});
 const id=w.activeGroupId;
 w.groups[0].state.reports=[{id:'departure',waypointId:'start',at:'2099-01-01T09:00:00+09:00',status:'saved',revisions:[]}];
 w=saveRoute(w,id,[...base,{id:NARO_BRIDGE_ID,name:'나로2대교'}]);
 assert.deepEqual(routeService.points(w.groups[0].state).map(p=>p.id),['start','ic','bridge',NARO_BRIDGE_ID,'arrival']);
 assert.deepEqual(w.groups[0].state.waypoints.find(p=>p.id===NARO_BRIDGE_ID)?.place,NARO_BRIDGE_PLACE);
 const map=new Map<string,string>();const storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v)}};
 saveWorkspace(storage,w);const loaded=loadWorkspace(storage);
 assert.deepEqual(routeService.points(loaded.groups[0].state).map(p=>p.id),['start','ic','bridge',NARO_BRIDGE_ID,'arrival']);
 assert.equal(loaded.groups[0].state.reports[0].id,'departure');
});
