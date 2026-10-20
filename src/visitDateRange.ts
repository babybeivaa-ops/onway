export function visitDateRange(start:string,duration?:string):string {
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(start);if(!match)return start;
 const [,year,month,day]=match;const date=new Date(start+'T00:00:00Z');if(!Number.isFinite(date.getTime()))return start;
 const nights=duration==='2박 3일'?2:duration==='1박 2일'?1:0;const first=year+'.'+month+'.'+day+'.';if(!nights)return first;
 date.setUTCDate(date.getUTCDate()+nights);const endYear=String(date.getUTCFullYear()),endMonth=String(date.getUTCMonth()+1).padStart(2,'0'),endDay=String(date.getUTCDate()).padStart(2,'0');
 const end=endYear!==year?endYear+'.'+endMonth+'.'+endDay+'.':endMonth!==month?endMonth+'.'+endDay+'.':endDay+'.';return first+'~'+end;
}
