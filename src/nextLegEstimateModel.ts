import type {DemoState} from './types';
import {routeService} from './services.ts';
export function nextLegEstimatePlan(state:DemoState,date:string,toCenter=false){
 if(state.trip.status==='도착')return null;
 const points=routeService.points(state);
 const kstDate=(at:string)=>new Date(Date.parse(at)+9*3600000).toISOString().slice(0,10);
 const reports=[...state.reports.filter(r=>r.status!=='cancelled'),...(state.adminCheckpointChecks??[]).map(r=>({waypointId:r.waypointId,at:r.confirmedAt}))].filter(r=>Number.isFinite(Date.parse(r.at))&&kstDate(r.at)===date);
 const from=[...points].reverse().find(p=>reports.some(r=>r.waypointId===p.id));
 if(!from)return null;
 const isBridge=from.id==='bridge'||from.name.replace(/\s/g,'')==='나로1대교';
 const isIc=from.id==='ic'||from.name.replace(/\s/g,'').toLowerCase()==='고흥ic';
 if(!isIc&&!isBridge)return null;
 const target=isIc&&!toCenter?points.find(p=>p.id==='bridge'||p.name.replace(/\s/g,'')==='나로1대교'):points.find(p=>p.kind==='destination');
 if(!target||target.order<=from.order)return null;
 const segment=points.filter(p=>p.order>=from.order&&p.order<=target.order);
 if(segment.some(p=>!p.place||p.kind==='meal'||/휴게소|휴식/.test(p.name)))return null;
 const report=reports.filter(r=>r.waypointId===from.id).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))[0];
 return {from:from.name,target:target.name,at:report.at,key:JSON.stringify(segment.map(p=>[p.place!.lng,p.place!.lat]))};
}
export function estimatedArrival(at:string,seconds:number){return new Date(Date.parse(at)+seconds*1000).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'numeric',minute:'2-digit',hour12:true})}
