export type PlannedArrivalInput={period:string;hour:string;minute:string};

export function plannedArrivalParts(time?:string):PlannedArrivalInput {
 if(!time)return {period:'PM',hour:'00',minute:'00'};
 const [hour,minute]=time.split(':');
 return {period:Number(hour)>=12?'PM':'AM',hour:String(Number(hour)%12||12).padStart(2,'0'),minute};
}

export function plannedArrivalTime(value:PlannedArrivalInput):string {
 if(!value.hour&&!value.minute)return '';
 const hour=value.hour||'00',minute=value.minute||'00';
 if(!/^\d{1,2}$/.test(hour)||!/^\d{1,2}$/.test(minute)||Number(hour)>23||Number(minute)>59)
  throw Error('시는 00~23, 분은 00~59로 입력해주세요.');
 const h=Number(hour);
 // Hours above 12 already identify an afternoon time; other hours use the selected period.
 const hours=h>12?h:h%12+(value.period==='PM'?12:0);
 return String(hours).padStart(2,'0')+':'+minute.padStart(2,'0');
}

export function normalizeArrivalHour(value:PlannedArrivalInput):PlannedArrivalInput {
 const h=Number(value.hour);
 return /^\d{1,2}$/.test(value.hour)&&h>12&&h<=23?{...value,period:'PM',hour:String(h-12).padStart(2,'0')}:value;
}
