export function validCalendarMonth(month:string){
 return /^\d{4}-(0[1-9]|1[0-2])$/.test(month)&&month.slice(0,4)!=='0000';
}
export function shiftCalendarMonth(month:string,offset:number){
 const date=new Date(month+'-01T00:00:00Z');
 date.setUTCMonth(date.getUTCMonth()+offset);
 return date.toISOString().slice(0,7);
}
export function calendarDays(month:string):(string|null)[]{
 if(!validCalendarMonth(month))return [];
 const first=new Date(month+'-01T00:00:00Z');
 const last=new Date(first);last.setUTCMonth(last.getUTCMonth()+1);last.setUTCDate(0);
 const cells:(string|null)[]=Array(first.getUTCDay()).fill(null);
 for(let day=1;day<=last.getUTCDate();day++)cells.push(month+'-'+String(day).padStart(2,'0'));
 while(cells.length%7)cells.push(null);
 return cells;
}
export function archivedVisits<T extends {travelDate:string}>(groups:T[],referenceDate:string,month:string,date:string|null=null){
 return groups.filter(group=>group.travelDate<referenceDate&&group.travelDate.startsWith(month+'-')&&(!date||group.travelDate===date))
  .sort((a,b)=>a.travelDate.localeCompare(b.travelDate));
}
