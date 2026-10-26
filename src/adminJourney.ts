import type {DemoState} from './types';
import {activeReports,furthestReport,routeService} from './services.ts';

export function adminJourney(state:DemoState){
 const reports=activeReports(state),last=furthestReport(state);
 const point=last?routeService.waypoint(state,last.waypointId):undefined;
 const label=(p:DemoState['waypoints'][number])=>p.kind==='start'?(state.organization.originMode==='other'?p.name+' 출발':'학교 출발'):p.kind==='meal'?'식사 장소 출발':p.name+' 통과';
 const current=state.trip.status==='도착'?'센터 도착':state.trip.status==='식사 중'?'식사 중':point?label(point):'출발 전';
 const steps=[{id:'before',label:'출발 전',done:reports.length===0,current:!last&&state.trip.status!=='도착'},...routeService.points(state).filter(p=>p.kind!=='meal'&&p.kind!=='destination').map(p=>({id:p.id,label:label(p),done:reports.some(r=>r.waypointId===p.id),current:p.id===last?.waypointId&&state.trip.status!=='도착'}))];
 const phase=state.trip.status==='도착'?'arrived':state.trip.status==='식사 중'?'eating':!point?'waiting':point.kind==='start'?'departed':point.kind==='meal'?'mealDeparted':point.id==='ic'?'interchange':point.id==='bridge'?'bridge':point.preset==='rest'?'rest':'passed';
 return {current,steps,phase} as const;
}
