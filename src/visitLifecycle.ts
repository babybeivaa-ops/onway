type Visit={travelDate:string;state?:{organization?:{visitDuration?:string}}};
export function visitEndDate(group:Visit){
 const date=new Date(group.travelDate+'T00:00:00Z');
 if(!Number.isFinite(date.getTime()))return group.travelDate;
 const duration=group.state?.organization?.visitDuration;
 const nights=duration==='3박 4일'?3:duration==='2박 3일'?2:duration==='1박 2일'?1:0;
 date.setUTCDate(date.getUTCDate()+nights);return date.toISOString().slice(0,10);
}
export function isVisitPast(group:Visit,referenceDate:string,now=new Date()){
 const end=visitEndDate(group);if(end!==referenceDate)return end<referenceDate;
 const korea=new Date(now.getTime()+9*3600000);
 return korea.toISOString().slice(0,10)===referenceDate&&korea.getUTCHours()>=18;
}
