export function scheduleToday(now=new Date()):string{
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part=(type:string)=>parts.find(p=>p.type===type)?.value??'';
 return `${part('year')}-${part('month')}-${part('day')}`;
}
export function defaultScheduleDate(dates:string[],today=scheduleToday()):string{
 const sorted=[...new Set(dates)].sort();
 return sorted.find(date=>date>=today)??sorted.at(-1)??'';
}
