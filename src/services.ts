import type {DemoState,ParticipantCount,Waypoint} from './types';
import {createDemo,notices} from './data.ts';
export const activeReports=(s:DemoState)=>s.reports.filter(r=>r.status!=='cancelled'&&s.waypoints.some(w=>w.id===r.waypointId&&w.included&&w.kind!=='destination'));
const resolveWaypoint=(s:DemoState,w:Waypoint):Waypoint=>w.kind==='meal'?{...w,name:s.trip.meal.name.trim()||'점심식사 장소',included:s.trip.meal.enabled}:w;
export const routeService={points:(s:DemoState)=>s.waypoints.map(w=>resolveWaypoint(s,w)).filter(w=>w.included).sort((a,b)=>a.order-b.order),waypoint:(s:DemoState,id:string)=>{const w=s.waypoints.find(w=>w.id===id);return w?resolveWaypoint(s,w):undefined},summary:(s:DemoState)=>s.summary};
export const mapService={attribution:'ON:WAY 자체 제작 개념도 · 외부 지도 자료 미사용',location:(s:DemoState)=>s.location};
export const weatherService={notices:()=>notices.filter(n=>n.kind==='weather')};
export const trafficService={notices:()=>notices.filter(n=>n.kind==='traffic')};
export function deriveStatus(s:DemoState):DemoState {
 const ids=activeReports(s).map(r=>r.waypointId);
 const status=s.trip.mealStartedAt&&!ids.includes('meal')?'식사 중':ids.length?'이동 중':'출발 전';
 return {...s,trip:{...s.trip,status}};
}
export const checkpointService={
 next(s:DemoState){const orders=activeReports(s).map(r=>s.waypoints.find(w=>w.id===r.waypointId)?.order??-1);const last=Math.max(-1,...orders);return routeService.points(s).find(w=>w.kind!=='destination'&&w.order>last);},
 save(s:DemoState,waypointId:string,at=new Date().toISOString()):DemoState {if(!s.waypoints.some(w=>w.id===waypointId&&w.included&&w.kind!=='destination')||activeReports(s).some(r=>r.waypointId===waypointId))return s;return deriveStatus({...s,reports:[...s.reports,{id:crypto.randomUUID(),waypointId,at,status:'saved',revisions:[]}]});},
 cancel(s:DemoState,id:string):DemoState{return deriveStatus({...s,reports:s.reports.map(r=>r.id===id?{...r,status:'cancelled',editedAt:new Date().toISOString()}:r)});},
 edit(s:DemoState,id:string,at:string):DemoState {if(!Number.isFinite(Date.parse(at)))throw Error('올바른 시각을 입력해주세요.');return deriveStatus({...s,reports:s.reports.map(r=>r.id===id&&r.status!=='cancelled'?{...r,at,status:'edited',editedAt:new Date().toISOString(),revisions:[...r.revisions,{at:r.at,changedAt:new Date().toISOString()}]}:r)});}
};
export const tripService={
 updateMeal(s:DemoState,meal:DemoState['trip']['meal']):DemoState {const saved={enabled:meal.enabled,name:meal.name.trim()};return deriveStatus({...s,trip:{...s.trip,meal:saved,mealStartedAt:saved.enabled?s.trip.mealStartedAt:null},waypoints:s.waypoints.map(w=>w.kind==='meal'?{...w,name:saved.name||'점심식사 장소',included:saved.enabled}:w)});},
 confirm:(s:DemoState)=>({...s,confirmed:true}),
 changeCounts(s:DemoState,after:ParticipantCount,reason:string):DemoState {if(![after.youth,after.leaders].every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('인원은 0 이상의 정수로 입력해주세요.');if(after.youth===s.counts.youth&&after.leaders===s.counts.leaders)throw Error('변경된 인원이 없어요.');return {...s,counts:after,changes:[{id:crypto.randomUUID(),before:s.counts,after,reason:reason.trim(),at:new Date().toISOString()},...s.changes]};},
 startMeal:(s:DemoState)=>deriveStatus({...s,trip:{...s.trip,mealStartedAt:new Date().toISOString()}})
};
const KEY='onway-demo-v1';
export const storage={load():DemoState{try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s?.version===1&&s.trip&&Array.isArray(s.reports)&&s.counts&&s.waypoints)return deriveStatus(s);}catch{}return createDemo();},save(s:DemoState){localStorage.setItem(KEY,JSON.stringify(s));}};
