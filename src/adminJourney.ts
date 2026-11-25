import {formatSchoolGroupName} from './groupName.ts';
import type {DemoState} from './types';
import {activeReports,furthestReport,routeService} from './services.ts';

export function adminJourney(state:DemoState){
 const reports=activeReports(state),last=furthestReport(state);
 const point=last?routeService.waypoint(state,last.waypointId):undefined;
 const org=state.organization;
 const displayName=formatSchoolGroupName(org.name,state.counts,state.waypoints.find(p=>p.kind==='start')?.place?.name,org.originMode,org.nameKind);
 const school=org.nameKind!=='organization'&&(/(?:초|중|고|대|학교)$/.test(displayName)||['elementary','middle','high'].includes(org.nameKind??''));
 const departureLabel=school?'학교 출발':'단체 출발';
 const label=(p:DemoState['waypoints'][number])=>p.kind==='start'?(state.organization.originMode==='other'?p.name+' 출발':departureLabel):p.kind==='meal'?'식사 장소 출발':p.name+' 통과';
 const current=state.admissionCompletedAt?'입소 완료':state.trip.status==='도착'?'센터 도착':state.trip.status==='식사 중'?'식사 중':point?label(point):'출발 전';
 const steps=[{id:'before',at:undefined as string|undefined,label:'출발 전',done:reports.length===0,current:!state.admissionCompletedAt&&!last&&state.trip.status!=='도착'},...routeService.points(state).filter(p=>p.kind!=='meal'&&p.kind!=='destination').map(p=>({id:p.id,at:reports.find(r=>r.waypointId===p.id)?.at,label:label(p),done:reports.some(r=>r.waypointId===p.id),current:!state.admissionCompletedAt&&p.id===last?.waypointId&&state.trip.status!=='도착'}))];
 const phase=state.admissionCompletedAt||state.trip.status==='도착'?'arrived':state.trip.status==='식사 중'?'eating':!point?'waiting':point.kind==='start'?'departed':point.kind==='meal'?'mealDeparted':point.id==='ic'?'interchange':point.id==='bridge'?'bridge':point.preset==='rest'?'rest':'passed';
 return {current,steps,phase} as const;
}

/** Card status combines confirmations without changing the guide's recorded timeline. */
export function adminCardJourney(state:DemoState){
 const journey=adminJourney(state),report=furthestReport(state);
 const recordedAt=journey.phase==='eating'?state.trip.mealStartedAt:journey.phase==='waiting'||journey.phase==='arrived'?undefined:report?.at;
 const baseline={...journey,recordedAt};
 if(journey.phase==='arrived')return baseline;
 const points=routeService.points(state);
 const reportOrder=points.find(p=>p.id===report?.waypointId)?.order??-1;
 const confirmed=[...points].reverse().map(p=>({point:p,check:state.adminCheckpointChecks?.find(c=>c.waypointId===p.id)})).find(x=>x.check&&Number.isFinite(Date.parse(x.check.confirmedAt)));
 if(!confirmed||confirmed.point.order<reportOrder)return baseline;
 if(confirmed.point.order===reportOrder&&(journey.phase==='eating'||(recordedAt&&Date.parse(recordedAt)>=Date.parse(confirmed.check!.confirmedAt))))return baseline;
 const p=confirmed.point,step=journey.steps.find(x=>x.id===p.id);
 if(!step)return baseline;
 const phase=p.kind==='start'?'departed':p.id==='ic'?'interchange':p.id==='bridge'?'bridge':p.preset==='rest'?'rest':'passed';
 return {...journey,current:step.label,phase,recordedAt:confirmed.check!.confirmedAt} as const;
}
