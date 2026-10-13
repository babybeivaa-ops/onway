import type {DemoState} from './types';
export interface PublicPlace {id:string;name:string;address:string;category?:string;lat:number;lng:number;provider:'vworld'}
export function setWaypointPlace(s:DemoState,id:string,place:PublicPlace):DemoState {
 const point=s.waypoints.find(p=>p.id===id&&p.included);
 if(!point)throw Error('확인 지점을 찾지 못했어요.');
 if(place.provider!=='vworld'||!place.name.trim()||!Number.isFinite(place.lat)||!Number.isFinite(place.lng)||Math.abs(place.lat)>90||Math.abs(place.lng)>180)throw Error('올바른 위치를 선택해주세요.');
 // The fixed destination must remain the youth space center.
 if(point.kind==='destination'&&place.name!=='국립청소년우주센터')throw Error('도착지는 국립청소년우주센터를 선택해주세요.');
 return {...s,waypoints:s.waypoints.map(p=>p.id===id?{...p,name:place.name,place:{...place},action:p.kind==='checkpoint'?place.name+' 통과했어요':p.action}:p),trip:{...s.trip,...(point.kind==='start'?{origin:place.name}:{}),...(point.kind==='meal'?{meal:{...s.trip.meal,name:place.name}}:{})}};
}

export function clearWaypointPlace<T extends {place?:PublicPlace}>(point:T){const {place,...rest}=point;return rest;}
