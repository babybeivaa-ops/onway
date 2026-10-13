const text=(x,max=200)=>typeof x==='string'&&x.length<=max;
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const counts=x=>x&&integer(x.youth)&&integer(x.leaders);
const date=x=>text(x,40)&&Number.isFinite(Date.parse(x));
const unique=xs=>new Set(xs.map(x=>x.id)).size===xs.length;
export function validGroup(g){
 try{
 const s=g.state;
 return text(g.id,100)&&!!g.id&&/^\d{4}-\d{2}-\d{2}$/.test(g.travelDate)&&new Date(g.travelDate).toISOString().slice(0,10)===g.travelDate&&typeof g.registered==='boolean'&&g.checkpoints&&typeof g.checkpoints.ic==='boolean'&&typeof g.checkpoints.bridge==='boolean'&&
 s.version===1&&s.organization&&text(s.organization.id,100)&&text(s.organization.name,100)&&counts(s.counts)&&counts(s.initialCounts)&&typeof s.confirmed==='boolean'&&text(s.scenario,100)&&s.location&&Number.isFinite(s.location.lat)&&Number.isFinite(s.location.lng)&&s.summary&&Number.isFinite(s.summary.distanceKm)&&s.trip&&['출발 전','이동 중','식사 중','도착'].includes(s.trip.status)&&text(s.trip.origin)&&text(s.trip.destination)&&text(s.trip.plannedDeparture)&&typeof s.trip.meal?.enabled==='boolean'&&text(s.trip.meal.name)&&
 Array.isArray(s.waypoints)&&s.waypoints.length<=100&&unique(s.waypoints)&&s.waypoints.every(p=>text(p.id,100)&&text(p.name)&&['start','meal','checkpoint','destination'].includes(p.kind)&&typeof p.included==='boolean'&&integer(p.order)&&text(p.action)&&(!p.place||(Number.isFinite(p.place.lat)&&Math.abs(p.place.lat)<=90&&Number.isFinite(p.place.lng)&&Math.abs(p.place.lng)<=180&&text(p.place.name)&&text(p.place.id)&&text(p.place.address,500)&&p.place.provider==='vworld')))&&
 Array.isArray(s.reports)&&s.reports.length<=20000&&unique(s.reports)&&s.reports.every(r=>text(r.id,100)&&text(r.waypointId,100)&&date(r.at)&&['saved','edited','cancelled'].includes(r.status)&&Array.isArray(r.revisions)&&r.revisions.length<=1000&&r.revisions.every(v=>date(v.at)&&date(v.changedAt)))&&
 Array.isArray(s.changes)&&s.changes.length<=20000&&unique(s.changes)&&s.changes.every(c=>text(c.id,100)&&counts(c.before)&&counts(c.after)&&text(c.reason,10000)&&date(c.at)&&(c.actor===undefined||['admin','guide'].includes(c.actor)));
 }catch{return false}
}
export function validWorkspace(w){return !!w&&w.version===2&&['guide','admin'].includes(w.view)&&typeof w.activeGroupId==='string'&&Array.isArray(w.groups)&&w.groups.length<=1000&&unique(w.groups)&&w.groups.every(validGroup)&&(!w.activeGroupId||w.groups.some(g=>g.id===w.activeGroupId));}
