import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroup} from '../src/workspace.ts';
import {sortGroupsByArrivalProgress} from '../src/adminArrivalOrder.ts';
const date='2026-10-23';
function group(name:string,point?:string,time='13:47'){
 const g=createGroup({name,travelDate:date,origin:name,youth:10,leaders:1,ic:true,bridge:true});g.id=name;
 if(point){g.state.trip.status='이동 중';g.state.reports=[{id:name,waypointId:point,at:`${date}T${time}:00+09:00`,status:'saved',revisions:[]}]}
 return g;
}
test('screenshot schools sort bridge, IC, departure, with arrived first and waiting last',()=>{
 const arrived=group('센터 도착');arrived.state.trip.status='도착';
 const groups=[group('효천고','ic'),group('이반성초','start'),group('울산 동평초','bridge'),group('출발 전'),arrived],snapshot=structuredClone(groups);
 assert.deepEqual(sortGroupsByArrivalProgress(groups).map(g=>g.id),['센터 도착','울산 동평초','효천고','이반성초','출발 전']);assert.deepEqual(groups,snapshot);
});
test('same checkpoint uses earlier confirmation, exact ties keep the existing order',()=>{
 assert.deepEqual(sortGroupsByArrivalProgress([group('늦음','bridge','14:00'),group('빠름','bridge','13:00'),group('동일','bridge','13:00')]).map(g=>g.id),['빠름','동일','늦음']);
});
test('cancelled, excluded and other-date reports cannot advance a school',()=>{
 const cancelled=group('취소','bridge');cancelled.state.reports[0].status='cancelled';
 const excluded=group('제외','bridge');excluded.state.waypoints.find(p=>p.id==='bridge')!.included=false;
 const old=group('이전 날짜','bridge');old.state.reports[0].at='2026-10-22T13:47:00+09:00';
 assert.equal(sortGroupsByArrivalProgress([cancelled,excluded,old,group('출발','start')])[0].id,'출발');
});
test('custom stops without coordinates follow known distances',()=>{
 const custom=group('휴게소','rest');custom.state.waypoints=custom.state.waypoints.map(p=>({...p,order:p.order*2}));
 const ic=custom.state.waypoints.find(p=>p.id==='ic')!,bridge=custom.state.waypoints.find(p=>p.id==='bridge')!;
 custom.state.waypoints.push({id:'rest',name:'휴게소',kind:'checkpoint',included:true,order:(ic.order+bridge.order)/2,action:'통과'});
 assert.deepEqual(sortGroupsByArrivalProgress([group('IC','ic'),custom,group('대교','bridge')]).map(g=>g.id),['대교','IC','휴게소']);
});
test('earlier visit dates stay before future visits',()=>{
 const future=group('내일','bridge');future.travelDate='2026-10-24';future.state.trip.status='도착';
 assert.deepEqual(sortGroupsByArrivalProgress([future,group('오늘')]).map(g=>g.id),['오늘','내일']);
});

test('different routes compare checkpoint coordinates rather than milestone labels',()=>{const museum=group('우주과학관 출발','start');museum.state.waypoints.find(p=>p.id==='start')!.place={id:'museum',name:'나로우주센터 우주과학관',provider:'kakao',address:'고흥',lat:34.453408084334384,lng:127.51774103712972};const near=group('나로2대교','start');near.state.waypoints.find(p=>p.id==='start')!.place={id:'bridge2',name:'나로2대교',provider:'kakao',address:'고흥',lat:34.47748604682972,lng:127.45806446034042};assert.deepEqual(sortGroupsByArrivalProgress([group('고흥IC','ic'),museum,group('나로1대교','bridge'),near]).map(g=>g.id),['나로1대교','나로2대교','우주과학관 출발','고흥IC']);museum.state.trip.status='도착';assert.equal(sortGroupsByArrivalProgress([near,museum])[0].id,museum.id)});

test('road distance overrides straight-line proximity; missing results follow known distances',()=>{const a=group('IC','ic'),b=group('bridge','bridge'),c=group('unknown','start');assert.deepEqual(sortGroupsByArrivalProgress([b,c,a],{IC:1000,bridge:5000}).map(g=>g.id),['IC','bridge','unknown']);});
