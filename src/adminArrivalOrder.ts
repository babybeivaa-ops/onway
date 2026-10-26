import type {DemoGroup} from './workspace';
import {activeReports,routeService} from './services.ts';
import {roadRoutePlan} from './roadRoute.ts';
import {localDate} from './arrivalEstimate.ts';

// Compare all groups on the same basis: straight-line distance from the last confirmed point.
function progress(group:DemoGroup,distances?:Record<string,number>){
 const state=group.state;
 if(state.trip.status==='도착')return {score:4,at:0,bucket:0,distance:0};
 const points=routeService.points(state);
 const reports=activeReports(state).filter(report=>localDate(report.at)===group.travelDate);
 let index=-1,at=Number.POSITIVE_INFINITY;
 points.forEach((point,i)=>{const report=reports.find(r=>r.waypointId===point.id);if(report){index=i;at=Date.parse(report.at)}});
 if(state.trip.status==='식사 중'&&state.trip.mealStartedAt&&localDate(state.trip.mealStartedAt)===group.travelDate){
  const meal=points.findIndex(point=>point.kind==='meal');
  if(meal>index){index=meal;at=Date.parse(state.trip.mealStartedAt)}
 }
 if(index<0)return {score:-1,at,bucket:3,distance:Infinity};
 const place=points[index].place,destination=points.find(p=>p.kind==='destination')?.place;
 const distance=distances?(distances[group.id]??Infinity):(place&&destination?distanceKm(place,destination):Infinity);const bucket=Number.isFinite(distance)?1:2;
 const anchor=(i:number)=>points[i].kind==='start'?0:points[i].id==='ic'?1:points[i].id==='bridge'?2:points[i].kind==='destination'?3:undefined;
 const fixed=anchor(index);
 if(fixed!==undefined)return {score:fixed,at,bucket,distance};
 let before=index-1,after=index+1;
 while(before>=0&&anchor(before)===undefined)before--;
 while(after<points.length&&anchor(after)===undefined)after++;
 const low=before>=0?anchor(before)!:0,high=after<points.length?anchor(after)!:3;
 return {score:low+(high-low)*(index-before)/(after-before),at,bucket,distance};
}

export function sortGroupsByArrivalProgress(groups:DemoGroup[],distances?:Record<string,number>):DemoGroup[]{
 return groups.map((group,index)=>({group,index,...progress(group,distances)})).sort((a,b)=>
  a.group.travelDate.localeCompare(b.group.travelDate)||a.bucket-b.bucket||
  (a.bucket===1?a.distance-b.distance:b.score-a.score)||
  (Number.isFinite(a.at)&&Number.isFinite(b.at)?a.at-b.at:0)||a.index-b.index
 ).map(item=>item.group);
}

function distanceKm(a:{lat:number;lng:number},b:{lat:number;lng:number}){if(![a.lat,a.lng,b.lat,b.lng].every(Number.isFinite)||Math.abs(a.lat)>90||Math.abs(b.lat)>90||Math.abs(a.lng)>180||Math.abs(b.lng)>180)return Infinity;const rad=Math.PI/180,dLat=(b.lat-a.lat)*rad,dLng=(b.lng-a.lng)*rad;const h=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLng/2)**2;return 6371*2*Math.asin(Math.sqrt(Math.min(1,h)));}

export function adminRoadPlan(group:DemoGroup){
 const s=group.state;if(s.trip.status==='도착'||s.trip.status==='출발 전')return null;
 const points=routeService.points(s),reports=activeReports(s).filter(r=>localDate(r.at)===group.travelDate);
 let point=[...points].reverse().find(p=>reports.some(r=>r.waypointId===p.id));
 if(s.trip.status==='식사 중'&&s.trip.mealStartedAt&&localDate(s.trip.mealStartedAt)===group.travelDate){const meal=points.find(p=>p.kind==='meal');if(meal&&(!point||points.indexOf(meal)>points.indexOf(point)))point=meal;}
 return point?roadRoutePlan(s,group.travelDate,point.id):null;
}
