import type {DemoState} from './types';
export function localDate(at:string){const d=new Date(at);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
export function routeIdentity(s:DemoState){return JSON.stringify(s.waypoints.filter(p=>p.included&&(p.kind!=='meal'||s.trip.meal.enabled)).sort((a,b)=>a.order-b.order).map(p=>[p.id,p.kind==='meal'?s.trip.meal.name:p.name,p.place?.lat,p.place?.lng]))}
export function invalidateBaseline(before:DemoState,after:DemoState):DemoState{
 if(routeIdentity(before)===routeIdentity(after))return after;
 const {totalRoadDistanceKm,...rest}=after;
 return {...rest,distanceNeedsReview:before.distanceNeedsReview||before.totalRoadDistanceKm!==undefined};
}
export function saveBaseline(s:DemoState,values:Record<string,string>):DemoState{
 const text=(values.total??'').trim();const {totalRoadDistanceKm,...rest}=s;
 if(!text)return {...rest,distanceNeedsReview:false};
 const km=Number(text);if(!/^\d+(?:\.\d)?$/.test(text)||!Number.isFinite(km)||km<=0||km>Number.MAX_SAFE_INTEGER/10)throw Error('전체 도로 거리는 0보다 큰 숫자로, 소수점 한 자리까지 입력해주세요.');
 return {...s,totalRoadDistanceKm:km,distanceNeedsReview:false};
}
export function departureDistance(s:DemoState,travelDate:string){
 const km=s.totalRoadDistanceKm;
 if(typeof km!=='number'||!Number.isFinite(km)||km<=0)return null;
 const points=s.waypoints.filter(p=>p.included&&(p.kind!=='meal'||s.trip.meal.enabled));
 if(s.reports.some(r=>r.status!=='cancelled'&&localDate(r.at)===travelDate&&points.some(p=>p.id===r.waypointId)))return null;
 return km;
}
