import type {DemoState} from './types';
import {routeService} from './services.ts';
import {localDate} from './arrivalEstimate.ts';

export function roadRoutePlan(s:DemoState,travelDate?:string,fromId?:string){
 const all=routeService.points(s);
 const reports=travelDate?s.reports.filter(r=>r.status!=='cancelled'&&localDate(r.at)===travelDate):[];
 const last=[...all].reverse().find(p=>p.kind!=='destination'&&reports.some(r=>r.waypointId===p.id));
 const preview=all.find(p=>p.id===fromId&&p.kind!=='destination');
 const start=preview??last;
 const points=all.slice(start?all.findIndex(p=>p.id===start.id):0);
 const missing=points.filter(p=>!p.place);
 const endpoints=[points[0],points.at(-1)].filter(p=>p&&!p.place);
 const error=endpoints.length?'위치 등록 필요: '+endpoints.map(p=>p!.name).join(', '):points.length<2||points.at(-1)?.kind!=='destination'?'출발지와 도착지를 확인해주세요.':'';
 const notice=missing.length&&!error?'위치 미등록 경유지 제외: '+missing.map(p=>p.name).join(', '):'';
 const coordinates=points.filter(p=>p.place).map(p=>[p.place?.lng,p.place?.lat]);
 return {points,last,preview,missing,error,notice,key:error?'':JSON.stringify(coordinates),report:!preview&&last?reports.find(r=>r.waypointId===last.id):undefined};
}
export interface RoadRoute {distanceMeters:number;durationSeconds:number;paths:[number,number][][];calculatedAt:string;provider:'kakao'}

export function nextDistancePoint(s:DemoState,travelDate:string){
 const plan=roadRoutePlan(s,travelDate);
 return plan.points[plan.last?1:0];
}
