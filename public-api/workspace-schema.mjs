const text=(x,max=200)=>typeof x==='string'&&x.length<=max;
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const arrival=x=>x===undefined||(x&&text(x.contactName,80)&&text(x.phone,30)&&text(x.dropoff,200));
export function validCounts(x){
 if(!x||!integer(x.youth)||!integer(x.leaders))return false;
 if(x.leaderDetails!==undefined){const d=x.leaderDetails;if(!d||!integer(d.male)||!integer(d.female)||!integer(d.unclassified)||d.male+d.female+d.unclassified!==x.leaders)return false;}
 if(x.youthDetails===undefined)return true;
 const d=x.youthDetails,grades={elementary:['','1','2','3','4','5','6','other'],middle:['','1','2','3'],high:['','1','2','3'],university:['','1','2','3'],adult:[''],preschool:['']};
 if(!d||!Array.isArray(d.rows)||d.rows.length>20||!integer(d.unclassified))return false;
 const ids=new Set(),slots=new Set();let total=d.unclassified;
 for(const r of d.rows){if(!r||!text(r.id,100)||!r.id||!Object.hasOwn(grades,r.level)||!grades[r.level].includes(r.grade)||!integer(r.male)||!integer(r.female)||ids.has(r.id)||slots.has(r.level+':'+r.grade))return false;ids.add(r.id);slots.add(r.level+':'+r.grade);total+=r.male+r.female;}
 return integer(total)&&total===x.youth;
}
const counts=validCounts;
const date=x=>text(x,40)&&Number.isFinite(Date.parse(x));
const unique=xs=>new Set(xs.map(x=>x.id)).size===xs.length;
export function validGroup(g){
 try{
 const s=g.state;
 if(!arrival(s?.organization?.arrival))return false;
 if(s.organization?.nameKind!==undefined&&!['auto','elementary','middle','high','organization'].includes(s.organization.nameKind))return false;
 if(s.organization?.originMode!==undefined&&!['school','other'].includes(s.organization.originMode))return false;
 if(s.plannedArrival!==undefined){const p=s.plannedArrival;if(!p||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!date(p.date)||new Date(p.date).toISOString().slice(0,10)!==p.date||!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time)||!['admin','guide'].includes(p.actor)||!date(p.updatedAt))return false;}
 if(s.countsConfirmedAt!==undefined&&(!s.confirmed||!date(s.countsConfirmedAt)))return false;
 if(s.centerMessages!==undefined&&(!Array.isArray(s.centerMessages)||s.centerMessages.length>1000||!unique(s.centerMessages)||!s.centerMessages.every(m=>m&&text(m.id,100)&&!!m.id&&text(m.text,2000)&&!!m.text.trim()&&date(m.at)&&(m.acknowledgedAt===undefined||date(m.acknowledgedAt)))))return false;
 if(s.sharedPosition!==undefined){const p=s.sharedPosition;if(!p||!Number.isFinite(p.lat)||Math.abs(p.lat)>90||!Number.isFinite(p.lng)||Math.abs(p.lng)>180||!Number.isFinite(p.accuracy)||p.accuracy<0||!date(p.measuredAt)||!date(p.sentAt))return false;}
 return text(g.id,100)&&!!g.id&&/^\d{4}-\d{2}-\d{2}$/.test(g.travelDate)&&new Date(g.travelDate).toISOString().slice(0,10)===g.travelDate&&typeof g.registered==='boolean'&&g.checkpoints&&typeof g.checkpoints.ic==='boolean'&&typeof g.checkpoints.bridge==='boolean'&&
 s.version===1&&s.organization&&text(s.organization.id,100)&&text(s.organization.name,100)&&counts(s.counts)&&counts(s.initialCounts)&&typeof s.confirmed==='boolean'&&text(s.scenario,100)&&s.location&&Number.isFinite(s.location.lat)&&Number.isFinite(s.location.lng)&&s.summary&&Number.isFinite(s.summary.distanceKm)&&s.trip&&['출발 전','이동 중','식사 중','도착'].includes(s.trip.status)&&text(s.trip.origin)&&text(s.trip.destination)&&text(s.trip.plannedDeparture)&&typeof s.trip.meal?.enabled==='boolean'&&text(s.trip.meal.name)&&
 Array.isArray(s.waypoints)&&s.waypoints.length<=100&&unique(s.waypoints)&&s.waypoints.every(p=>text(p.id,100)&&text(p.name)&&['start','meal','checkpoint','destination'].includes(p.kind)&&typeof p.included==='boolean'&&integer(p.order)&&text(p.action)&&(!p.place||(Number.isFinite(p.place.lat)&&Math.abs(p.place.lat)<=90&&Number.isFinite(p.place.lng)&&Math.abs(p.place.lng)<=180&&text(p.place.name)&&text(p.place.id)&&text(p.place.address,500)&&['vworld','kakao'].includes(p.place.provider))))&&
 Array.isArray(s.reports)&&s.reports.length<=20000&&unique(s.reports)&&s.reports.every(r=>text(r.id,100)&&text(r.waypointId,100)&&date(r.at)&&['saved','edited','cancelled'].includes(r.status)&&Array.isArray(r.revisions)&&r.revisions.length<=1000&&r.revisions.every(v=>date(v.at)&&date(v.changedAt)))&&
 Array.isArray(s.changes)&&s.changes.length<=20000&&unique(s.changes)&&s.changes.every(c=>text(c.id,100)&&counts(c.before)&&counts(c.after)&&text(c.reason,10000)&&date(c.at)&&(c.actor===undefined||['admin','guide'].includes(c.actor)));
 }catch{return false}
}
export function validWorkspace(w){return !!w&&w.version===2&&['guide','admin'].includes(w.view)&&typeof w.activeGroupId==='string'&&Array.isArray(w.groups)&&w.groups.length<=1000&&unique(w.groups)&&w.groups.every(validGroup)&&(!w.activeGroupId||w.groups.some(g=>g.id===w.activeGroupId));}
