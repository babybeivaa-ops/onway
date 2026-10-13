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
test('meal change clears stale coordinates; invalid coordinates and destination rejected',()=>{const s=setWaypointPlace(createDemo(),'meal',place);assert.equal(s.trip.meal.name,place.name);assert.equal(tripService.updateMeal(s,{enabled:true,name:'다른 식당'}).waypoints.find(p=>p.id==='meal').place,undefined);assert.throws(()=>setWaypointPlace(s,'start',{...place,lat:NaN}));assert.throws(()=>setWaypointPlace(s,'arrival',place));});
test('no key produces safe unavailable response',async()=>{const h=createMapHandler({key:'',domain:''});assert.deepEqual((await request(h,'/api/maps/status')).body,{available:false,provider:'vworld'});assert.equal((await request(h,'/api/maps/search?q=학교')).status,503);});
test('search removes duplicates and returns no key',async()=>{const key='test-private-key';let upstream;const item={id:'1',title:'학교',address:{road:'주소'},point:{x:'127',y:'35'}};const h=createMapHandler({key,domain:'https://example.org',fetchImpl:async u=>{upstream=u;return new Response(JSON.stringify({response:{status:'OK',result:{items:[item,item]}}}));}});const r=await request(h,'/api/maps/search?q=학교');assert.equal(r.status,200);assert.equal(r.body.items.length,1);assert.equal(upstream.searchParams.get('key'),key);assert.ok(!JSON.stringify(r).includes(key));});
test('upstream failures never disclose credentials or raw response',async()=>{const key='test-private-key';for(const fetchImpl of [async()=>new Response(JSON.stringify({response:{status:'ERROR',error:{text:key}}})),async()=>{throw Error('https://api.example/'+key)}]){const r=await request(createMapHandler({key,domain:'https://example.org',fetchImpl}),'/api/maps/search?q=학교');assert.equal(r.status,502);assert.ok(!JSON.stringify(r).includes(key));}});
test('tile proxy uses VWorld y/x order and rejects invalid coordinates',async()=>{let calls=0,url='';const h=createMapHandler({key:'secret',domain:'https://example.org',fetchImpl:async u=>{calls++;url=String(u);return new Response(new Uint8Array([1,2]),{headers:{'content-type':'image/png'}})}});assert.equal((await request(h,'/api/maps/tiles/7/109/50.png')).status,200);assert.match(url,/Base\/7\/50\/109.png$/);assert.equal((await request(h,'/api/maps/tiles/7/900/50.png')).status,400);assert.equal(calls,1);});
test('upstream XML authentication error is not served as image',async()=>{const h=createMapHandler({key:'secret',domain:'https://example.org',fetchImpl:async()=>new Response('<error>secret</error>',{headers:{'content-type':'application/xml'}})});const r=await request(h,'/api/maps/tiles/7/109/50.png');assert.equal(r.status,502);assert.ok(!JSON.stringify(r).includes('secret'));});

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
 assert.deepEqual(currentMapLeg({...s,reports:[]}).map(p=>p.id),['start','meal']);
 assert.deepEqual(leg[0].place,FIXED_PLACES.ic);
 const missing={...s,waypoints:s.waypoints.map(p=>({...p,place:undefined}))};assert.deepEqual(currentMapLeg(missing).map(p=>p.id),['ic','bridge']);assert.equal(currentMapLeg(missing)[0].place,undefined);
});

test('search returns provider category without guessing missing categories',async()=>{
 const make=category=>({id:String(category),title:'나로1대교',category,address:{road:'주소'},point:{x:'127',y:'35'}});
 const h=createMapHandler({key:'secret',domain:'https://example.org',fetchImpl:async()=>new Response(JSON.stringify({response:{status:'OK',result:{items:[make('교통 > 교량')]}}}))});
 assert.equal((await request(h,'/api/maps/search?q=나로1대교')).body.items[0].category,'교통 > 교량');
 const missing=createMapHandler({key:'secret',domain:'https://example.org',fetchImpl:async()=>new Response(JSON.stringify({response:{status:'OK',result:{items:[make(undefined)]}}}))});
 assert.equal((await request(missing,'/api/maps/search?q=나로1대교')).body.items[0].category,'');
});

test('admin pin adjustment persists for guide state without changing other groups or passage records',()=>{let w=addGroup(migrateLegacy(createDemo()),{name:'다른 학교',origin:'',travelDate:'2026-09-28',youth:0,leaders:0,ic:false,bridge:false});const other=structuredClone(w.groups[1]);const id=w.groups[0].id;const records=structuredClone(w.groups[0].state.reports);const pin={...place,lat:34.55,lng:127.48,address:'',category:'지도에서 지정한 위치'};w=updateGroup(w,id,s=>setWaypointPlace(s,'meal',pin));const data=new Map();const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};saveWorkspace(storage,w);const restored=loadWorkspace(storage);assert.deepEqual(restored.groups[0].state.waypoints.find(p=>p.id==='meal').place,pin);assert.equal(restored.groups[0].state.trip.meal.name,pin.name);assert.deepEqual(restored.groups[0].state.reports,records);assert.deepEqual(restored.groups[1],other)});

test('multiword search retries place name once and ranks region matches',async()=>{const queries=[];const h=createMapHandler({key:'test',domain:'https://example.org',fetchImpl:async u=>{const q=u.searchParams.get('query');queries.push(q);return new Response(JSON.stringify({response:q==='창원 사파'?{status:'NOT_FOUND'}:{status:'OK',result:{items:[{id:'a',title:'사파',address:{road:'서울'},point:{x:127,y:37}},{id:'b',title:'사파초등학교',address:{road:'경남 창원시'},point:{x:128,y:35}}]}}}))}});const r=await request(h,'/api/maps/search?q='+encodeURIComponent('창원 사파'));assert.deepEqual(queries,['창원 사파','사파']);assert.equal(r.body.items[0].id,'b');assert.equal(r.body.usedQuery,'사파');assert.ok(r.body.notice.includes('주소를 확인'));});

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
