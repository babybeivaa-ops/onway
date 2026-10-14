import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemo} from '../src/data.ts';
import {correctLegacyIc,FIXED_PLACES,withFixedPlaces} from '../src/fixedPlaces.ts';
import {roadRoutePlan} from '../src/roadRoute.ts';
import {routeService} from '../src/services.ts';
const point=()=>({...createDemo().waypoints.find(p=>p.id==='ic')!,place:{id:'POI01000000DX6QNP',name:'고흥IC',address:'',lat:34.82396270775956,lng:127.34215037413877,provider:'vworld' as const}});
test('old default IC is corrected for stored groups and shared route calculation without mutating records',()=>{
 const ic=point();const s=createDemo();s.waypoints=s.waypoints.map(p=>p.id==='ic'?ic:p);const before=JSON.stringify(s);
 assert.deepEqual(withFixedPlaces(s).waypoints.find(p=>p.id==='ic')?.place,FIXED_PLACES.ic);
 assert.deepEqual(routeService.waypoint(s,'ic')?.place,FIXED_PLACES.ic);
 assert.deepEqual(JSON.parse(roadRoutePlan(s,undefined,'ic').key)[0],[FIXED_PLACES.ic.lng,FIXED_PLACES.ic.lat]);
 assert.equal(JSON.stringify(s),before);
});
test('manual coordinates and renamed checkpoints are preserved; correction is idempotent',()=>{
 const ic=point();const manual={...ic,place:{...ic.place,lat:34.826}};
 assert.equal(correctLegacyIc(manual),manual);
 const renamed={...ic,name:'다른 지점'};assert.equal(correctLegacyIc(renamed),renamed);
 const changed=correctLegacyIc(ic);assert.equal(correctLegacyIc(changed),changed);
});
