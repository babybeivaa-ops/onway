import {validateReportTime} from './reportTime.ts';
import {clearWaypointPlace} from './places.ts';
import type {DemoState,ParticipantCount,ParticipantActor,Waypoint} from './types';
import {createDemo,notices} from './data.ts';
export const activeReports=(s:DemoState)=>s.reports.filter(r=>r.status!=='cancelled'&&s.waypoints.some(w=>w.id===r.waypointId&&w.included&&w.kind!=='destination'));
const resolveWaypoint=(s:DemoState,w:Waypoint):Waypoint=>w.kind==='meal'?{...w,name:s.trip.meal.name.trim()||'점심식사 장소',included:s.trip.meal.enabled}:w;
export const routeService={points:(s:DemoState)=>s.waypoints.map(w=>resolveWaypoint(s,w)).filter(w=>w.included).sort((a,b)=>a.order-b.order),waypoint:(s:DemoState,id:string)=>{const w=s.waypoints.find(w=>w.id===id);return w?resolveWaypoint(s,w):undefined},summary:(s:DemoState)=>s.summary};
export const mapService={attribution:'ON:WAY 자체 제작 개념도 · 외부 지도 자료 미사용',location:(s:DemoState)=>s.location};
export const weatherService={notices:()=>notices.filter(n=>n.kind==='weather')};
export const trafficService={notices:()=>notices.filter(n=>n.kind==='traffic')};
export function deriveStatus(s:DemoState):DemoState {
 const ids=activeReports(s).map(r=>r.waypointId);
 const meal=s.waypoints.find(w=>w.kind==='meal'&&w.included);
 const passedMeal=!!meal&&s.waypoints.some(w=>w.included&&w.order>meal.order&&ids.includes(w.id));
 const status=s.trip.mealStartedAt&&meal&&!ids.includes(meal.id)&&!passedMeal?'식사 중':ids.length?'이동 중':'출발 전';
 return {...s,trip:{...s.trip,status}};
}
export const checkpointService={
 next(s:DemoState){const orders=activeReports(s).map(r=>s.waypoints.find(w=>w.id===r.waypointId)?.order??-1);const last=Math.max(-1,...orders);return routeService.points(s).find(w=>w.kind!=='destination'&&w.order>last);},
 save(s:DemoState,waypointId:string,at=new Date().toISOString()):DemoState {validateReportTime(at);if(!s.waypoints.some(w=>w.id===waypointId&&w.included&&w.kind!=='destination')||activeReports(s).some(r=>r.waypointId===waypointId))return s;return deriveStatus({...s,reports:[...s.reports,{id:crypto.randomUUID(),waypointId,at,createdAt:new Date().toISOString(),status:'saved',revisions:[]}]});},
 cancellationTargets(s:DemoState,id:string){const target=s.reports.find(r=>r.id===id&&r.status!=='cancelled');const point=s.waypoints.find(w=>w.id===target?.waypointId);if(!target||!point)return [];return s.reports.filter(r=>r.status!=='cancelled'&&(s.waypoints.find(w=>w.id===r.waypointId)?.order??-1)>=point.order);},
 cancel(s:DemoState,id:string):DemoState{const targets=this.cancellationTargets(s,id);if(!targets.length)return s;const ids=new Set(targets.map(r=>r.id));const point=s.waypoints.find(w=>w.id===targets.find(r=>r.id===id)?.waypointId)!;const meal=s.waypoints.find(w=>w.kind==='meal');const at=new Date().toISOString();return deriveStatus({...s,trip:{...s.trip,mealStartedAt:meal&&meal.order>=point.order?null:s.trip.mealStartedAt},reports:s.reports.map(r=>ids.has(r.id)?{...r,status:'cancelled',editedAt:at}:r)});},
 edit(s:DemoState,id:string,at:string):DemoState {validateReportTime(at);return deriveStatus({...s,reports:s.reports.map(r=>r.id===id&&r.status!=='cancelled'?{...r,at,status:'edited',editedAt:new Date().toISOString(),revisions:[...r.revisions,{at:r.at,changedAt:new Date().toISOString()}]}:r)});}
};
export const tripService={
 updateMeal(s:DemoState,meal:DemoState['trip']['meal']):DemoState {const saved={enabled:meal.enabled,name:meal.name.trim()};return deriveStatus({...s,trip:{...s.trip,meal:saved,mealStartedAt:saved.enabled?s.trip.mealStartedAt:null},waypoints:s.waypoints.map(w=>w.kind==='meal'?{...(w.name===(saved.name||'점심식사 장소')?w:clearWaypointPlace(w)),name:saved.name||'점심식사 장소',included:saved.enabled}:w)});},
 confirm:(s:DemoState)=>({...s,confirmed:true}),
 changeCounts(s:DemoState,after:ParticipantCount,reason:string,actor?:ParticipantActor):DemoState {if(![after.youth,after.leaders].every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('인원은 0 이상의 정수로 입력해주세요.');if(after.youth===s.counts.youth&&after.leaders===s.counts.leaders)return s;return {...s,counts:after,changes:[{id:crypto.randomUUID(),before:s.counts,after,...(actor?{actor}:{}),reason:reason.trim(),at:new Date().toISOString()},...s.changes]};},
 startMeal:(s:DemoState)=>deriveStatus({...s,trip:{...s.trip,mealStartedAt:new Date().toISOString()}})
};
const KEY='onway-demo-v1';
export const storage={load():DemoState{try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s?.version===1&&s.trip&&Array.isArray(s.reports)&&s.counts&&s.waypoints)return deriveStatus(s);}catch{}return createDemo();},save(s:DemoState){localStorage.setItem(KEY,JSON.stringify(s));}};

// Route progress is independent of the order in which reports were entered.
export function furthestReport(s:DemoState){const reports=activeReports(s);return [...routeService.points(s)].reverse().map(p=>reports.find(r=>r.waypointId===p.id)).find(Boolean);}
export function missedPoints(s:DemoState){const last=furthestReport(s);if(!last)return [];const order=routeService.waypoint(s,last.waypointId)!.order;const done=new Set(activeReports(s).map(r=>r.waypointId));return routeService.points(s).filter(p=>p.kind!=='destination'&&p.order<order&&!done.has(p.id));}
export function latestRecordChange(s:DemoState){const dates=s.reports.flatMap(r=>[r.createdAt,r.editedAt]).filter((at):at is string=>!!at&&Number.isFinite(Date.parse(at)));return dates.sort((a,b)=>Date.parse(b)-Date.parse(a))[0]??null;}

/** Focus the real map on the last confirmed stop and its route successor. */
export function currentMapLeg(s:DemoState){
 const points=routeService.points(s);const last=furthestReport(s);
 const index=last?points.findIndex(p=>p.id===last.waypointId):0;
 return points.slice(Math.max(0,index),Math.max(0,index)+2);
}

/** Display a known next location without changing the actual next checkpoint. */
export function mapConnectionPoints(s:DemoState){
 const [start]=currentMapLeg(s);if(!start)return [];
 const next=routeService.points(s).find(p=>p.order>start.order&&p.place);
 return next?[start,next]:[start];
}
