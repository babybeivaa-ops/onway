import type {DemoState} from './types';
import {FIXED_PLACES} from './fixedPlaces.ts';
// Compare straight-line distance; this is not a driving-route optimizer.
function distance(p:{lat:number;lng:number},end:{lat:number;lng:number}){const rad=Math.PI/180,a=(p.lat-end.lat)*rad,b=(p.lng-end.lng)*rad;return Math.sin(a/2)**2+Math.cos(p.lat*rad)*Math.cos(end.lat*rad)*Math.sin(b/2)**2;}
export function orderMealAndIc(s:DemoState):DemoState{
 const meal=s.waypoints.find(p=>p.kind==='meal'&&p.included),ic=s.waypoints.find(p=>p.id==='ic'&&p.included);
 if(!s.trip.meal.enabled||!meal?.place||!ic)return s;
 const icPlace=ic.place??(ic.name===FIXED_PLACES.ic.name?FIXED_PLACES.ic:undefined),end=s.waypoints.find(p=>p.kind==='destination')?.place??FIXED_PLACES.arrival;
 if(!icPlace||![meal.place,icPlace,end].every(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180))return s;
 // Keep already-confirmed route history stable.
 if(s.reports.some(r=>r.status!=='cancelled'&&[meal.id,ic.id,'bridge'].includes(r.waypointId)))return s;
 const delta=distance(meal.place,end)-distance(icPlace,end);if(Math.abs(delta)<1e-12)return s;
 const sorted=[...s.waypoints].sort((a,b)=>a.order-b.order);
 const ordered=[...sorted.filter(p=>p.kind==='start'),...sorted.filter(p=>p.kind!=='start'&&p.kind!=='destination'&&p.id!=='bridge'),...sorted.filter(p=>p.id==='bridge'),...sorted.filter(p=>p.kind==='destination')];
 const a=ordered.findIndex(p=>p.id===meal.id),b=ordered.findIndex(p=>p.id===ic.id);
 if((delta>0&&a>b)||(delta<0&&a<b))[ordered[a],ordered[b]]=[ordered[b],ordered[a]];
 if(ordered.every((p,i)=>p.id===sorted[i].id))return s;
 const orders=new Map(ordered.map((p,i)=>[p.id,i]));return {...s,waypoints:s.waypoints.map(p=>({...p,order:orders.get(p.id)!}))};
}

// Older manually entered meals may have a name but no chosen coordinates.
export function orderMealFromCandidates(s:DemoState,candidates:import('./places').PublicPlace[]):DemoState{
 const meal=s.waypoints.find(p=>p.kind==='meal'&&p.included);if(!meal||meal.place)return orderMealAndIc(s);
 const compact=(v:string)=>v.replace(/\s+/gu,'');const exact=candidates.filter(p=>compact(p.name)===compact(meal.name));if(!exact.length)return s;
 const options=exact.map(place=>orderMealAndIc({...s,waypoints:s.waypoints.map(p=>p.id===meal.id?{...p,place}:p)}));
 const signature=(state:DemoState)=>[...state.waypoints].sort((a,b)=>a.order-b.order).map(p=>p.id).join('|');
 if(options.some(v=>signature(v)!==signature(options[0]))||signature(options[0])===signature(s))return s;
 const orders=new Map(options[0].waypoints.map(p=>[p.id,p.order]));return {...s,waypoints:s.waypoints.map(p=>({...p,order:orders.get(p.id)!}))};
}
