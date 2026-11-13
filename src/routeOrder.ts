type RoutePoint={id:string;name?:string};
export function isNaroBridge2(point:RoutePoint){return point.id!=='start'&&(point.id==='custom-naro2-bridge'||point.name?.replace(/\s/gu,'')==='나로2대교');}
export function fixedRouteOrder<T extends RoutePoint>(points:T[]):T[]{
 const start=points.filter(p=>p.id==='start');
 const rest=points.filter(p=>p.id!=='start');
 if(!rest.some(p=>p.id==='bridge'))return [...start,...rest];
 return [...start,...rest.filter(p=>p.id!=='bridge'&&!isNaroBridge2(p)),...rest.filter(p=>p.id==='bridge'),...rest.filter(isNaroBridge2)];
}
export function canMoveRoutePoint(points:RoutePoint[],index:number,offset:number){
 const to=index+offset;
 if(!points[index]||to<0||to>=points.length||['start','ic','bridge'].includes(points[index].id)||['start','bridge'].includes(points[to].id))return false;
 const next=[...points];[next[index],next[to]]=[next[to],next[index]];
 return fixedRouteOrder(next).every((p,i)=>p.id===next[i].id);
}
