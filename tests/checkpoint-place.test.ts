import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroup,saveRoute} from '../src/workspace.ts';
test('selected search address registers a new checkpoint with coordinates in one update',()=>{
 const group=createGroup({name:'테스트학교',travelDate:'2099-01-01',origin:'학교',youth:10,leaders:1,ic:true,bridge:true});
 const workspace={version:2 as const,view:'admin' as const,activeGroupId:group.id,groups:[group]};
 const points=group.state.waypoints.filter(p=>p.included&&p.kind!=='destination').map(p=>({id:p.id,name:p.name}));
 const place={id:'search-test',name:'선택한 휴게소',address:'선택한 도로명 주소',lat:35,lng:127,provider:'kakao' as const};
 const saved=saveRoute(workspace,group.id,[...points,{id:'custom-search-test',name:place.name,place}]);
 assert.deepEqual(saved.groups[0].state.waypoints.find(p=>p.id==='custom-search-test')?.place,place);
 assert.equal(group.state.waypoints.some(p=>p.id==='custom-search-test'),false);
 assert.throws(()=>saveRoute(workspace,group.id,[...points,{id:'custom-invalid',name:place.name,place:{...place,lat:999}}]));
});
