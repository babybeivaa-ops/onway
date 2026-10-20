const journeyTimeFormat = new Intl.DateTimeFormat('ko-KR', {
 timeZone:'Asia/Seoul',hour:'numeric',minute:'2-digit',hourCycle:'h12',
});
export function journeyTimeLabel(value:string):string {
 const date=new Date(value);
 if(Number.isNaN(date.getTime()))return '';
 const parts=journeyTimeFormat.formatToParts(date);
 const part=(type:string)=>parts.find(p=>p.type===type)?.value??'';
 return `${part('dayPeriod')} ${Number(part('hour'))}시 ${part('minute')}분`;
}
