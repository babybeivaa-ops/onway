import {overviewPosition} from '../src/overviewPosition.ts';
import {withFixedPlaces,FIXED_PLACES} from '../src/fixedPlaces.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createMapHandler} from '../public-api/gateway.mjs';
import {setWaypointPlace} from '../src/places.ts';
import {createDemo} from '../src/data.ts';
import {loadWorkspace,saveWorkspace,updateGroup,addGroup,migrateLegacy,renameCheckpoint,saveRoute} from '../src/workspace.ts';
import {tripService} from '../src/services.ts';
const place={id:'poi',name:'실제 장소',address:'전남 고흥군',lat:34.53,lng:127.46,provider:'vworld'};
async function request(handler,path){let status,body;const res={writeHead(s){status=s},end(b){body=b}};await handler({method:'GET'},res,new URL(path,'http://localhost'));return {status,body:Buffer.isBuffer(body)?body:JSON.parse(body)};}
test('place selection updates origin and coordinates without changing reports',()=>{const s=createDemo();const next=setWaypointPlace(s,'start',place);assert.equal(next.trip.origin,place.name);assert.deepEqual(next.waypoints.find(p=>p.id==='start').place,place);assert.deepEqual(next.reports,s.reports);assert.equal(s.waypoints.find(p=>p.id==='start').place,undefined);});
test('renaming clears old location; reordering preserves it',()=>{const w=migrateLegacy(setWaypointPlace(createDemo(),'start',place));const g=w.groups[0];assert.equal(renameCheckpoint(w,g.id,'start','다른 학교').groups[0].state.waypoints.find(p=>p.id==='start').place,undefined);const route=g.state.waypoints.filter(p=>p.included&&p.kind!=='destination').reverse();assert.deepEqual(saveRoute(w,g.id,route).groups[0].state.waypoints.find(p=>p.id==='start').place,place);});
test('meal change clears stale coordinates; invalid coordinates and destination rejected',()=>{const s=setWaypointPlace(createDemo('meal'),'meal',place);assert.equal(s.trip.meal.name,place.name);assert.equal(tripService.updateMeal(s,{enabled:true,name:'다른 식당'}).waypoints.find(p=>p.id==='meal').place,undefined);assert.throws(()=>setWaypointPlace(s,'start',{...place,lat:NaN}));assert.throws(()=>setWaypointPlace(s,'arrival',place));});

import {spreadMapMarkers} from '../src/markerLayout.ts';
test('dense and identical map markers remain individually clickable without changing coordinates',()=>{
 const input=[{x:10,y:10},{x:12,y:13},{x:10,y:10},{x:14,y:17},{x:200,y:200}];const saved=structuredClone(input);const output=spreadMapMarkers(input);
 assert.deepEqual(input,saved);assert.deepEqual(output[4],input[4]);
 for(let i=0;i<output.length;i++)for(let j=i+1;j<output.length;j++)assert.ok(Math.hypot(output[i].x-output[j].x,output[i].y-output[j].y)>=42);
 assert.deepEqual(spreadMapMarkers(input),output);
});

import {currentMapLeg,checkpointService} from '../src/services.ts';
test('real map follows last confirmed stop and next route stop, including cancellation',()=>{
 const s=createDemo();const leg=currentMapLeg(s);assert.deepEqual(leg.map(p=>p.id),['ic','bridge']);
 const advanced=checkpointService.save(s,'bridge');assert.deepEqual(currentMapLeg(advanced).map(p=>p.id),['bridge','arrival']);
 const record=advanced.reports.find(r=>r.waypointId==='bridge'&&r.status!=='cancelled');const undone=checkpointService.cancel(advanced,record.id);assert.deepEqual(currentMapLeg(undone).map(p=>p.id),['ic','bridge']);
 assert.deepEqual(currentMapLeg({...s,reports:[]}).map(p=>p.id),['start','ic']);
 assert.deepEqual(leg[0].place,FIXED_PLACES.ic);
 const missing={...s,waypoints:s.waypoints.map(p=>({...p,place:undefined}))};assert.deepEqual(currentMapLeg(missing).map(p=>p.id),['ic','bridge']);assert.equal(currentMapLeg(missing)[0].place,undefined);
});


test('admin pin adjustment persists for guide state without changing other groups or passage records',()=>{let w=addGroup(migrateLegacy(createDemo('meal')),{name:'다른 학교',origin:'',travelDate:'2026-09-28',youth:0,leaders:0,ic:false,bridge:false});const other=structuredClone(w.groups[1]);const id=w.groups[0].id;const records=structuredClone(w.groups[0].state.reports);const pin={...place,lat:34.55,lng:127.48,address:'',category:'지도에서 지정한 위치'};w=updateGroup(w,id,s=>setWaypointPlace(s,'meal',pin));const data=new Map();const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};saveWorkspace(storage,w);const restored=loadWorkspace(storage);assert.deepEqual(restored.groups[0].state.waypoints.find(p=>p.id==='meal').place,pin);assert.equal(restored.groups[0].state.trip.meal.name,pin.name);assert.deepEqual(restored.groups[0].state.reports,records);assert.deepEqual(restored.groups[1],other)});


test('fixed checkpoints get exact-name default locations without replacing custom positions or creating records',()=>{const s=createDemo('start');assert.deepEqual(s.waypoints.find(p=>p.id==='arrival').place,FIXED_PLACES.arrival);assert.deepEqual(s.waypoints.find(p=>p.id==='ic').place,FIXED_PLACES.ic);assert.deepEqual(s.waypoints.find(p=>p.id==='bridge').place,FIXED_PLACES.bridge);assert.equal(s.reports.length,0);const custom=setWaypointPlace(s,'bridge',{...FIXED_PLACES.bridge,lat:34.52});assert.equal(withFixedPlaces(custom).waypoints.find(p=>p.id==='bridge').place.lat,34.52);const legacy={...s,waypoints:s.waypoints.map(p=>{const {place,...rest}=p;return rest})};assert.deepEqual(withFixedPlaces(legacy).waypoints.find(p=>p.id==='bridge').place,FIXED_PLACES.bridge);const renamed={...legacy,waypoints:legacy.waypoints.map(p=>p.id==='ic'?{...p,name:'다른 IC'}:p)};assert.equal(withFixedPlaces(renamed).waypoints.find(p=>p.id==='ic').place,undefined)});

test('overview projects stored coordinates and leaves unknown places unmapped',()=>{const west=overviewPosition({lat:35,lng:127});const east=overviewPosition({lat:35,lng:129});const north=overviewPosition({lat:37,lng:127});assert.ok(east.x>west.x);assert.equal(east.y,west.y);assert.ok(north.y<west.y);assert.equal(overviewPosition(undefined),null);assert.equal(overviewPosition({lat:NaN,lng:127}),null);assert.equal(overviewPosition({lat:0,lng:0}),null);});

import {mapConnectionPoints} from '../src/services.ts';
test('map connects to next known location or destination without confirming missing checkpoints',()=>{
 const s=createDemo();const reports=structuredClone(s.reports);
 const unlocated={...s,waypoints:s.waypoints.map(p=>p.kind==='checkpoint'?{...p,place:undefined}:p)};
 assert.deepEqual(mapConnectionPoints(unlocated).map(p=>p.id),['ic','arrival']);
 assert.deepEqual(currentMapLeg(unlocated).map(p=>p.id),['ic','bridge']);
 assert.deepEqual(unlocated.reports,reports);
 const direct={...s,reports:[],waypoints:s.waypoints.map(p=>({...p,included:p.kind==='start'||p.kind==='destination'}))};
 assert.deepEqual(mapConnectionPoints(direct).map(p=>p.id),['start','arrival']);
 assert.deepEqual(mapConnectionPoints(s).map(p=>p.id),['ic','bridge']);
});

test('Kakao places persist through workspace storage',()=>{const w=migrateLegacy(setWaypointPlace(createDemo(),'start',{...place,provider:'kakao'}));const data=new Map();const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};saveWorkspace(storage,w);assert.equal(loadWorkspace(storage).groups[0].state.waypoints.find(p=>p.id==='start').place.provider,'kakao');});
