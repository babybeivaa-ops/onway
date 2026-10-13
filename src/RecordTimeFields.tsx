export function recordTimeValue(date:string,period:string,hour:string,minute:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!['AM','PM'].includes(period)||!/^\d{1,2}$/.test(hour)||!/^\d{1,2}$/.test(minute)||Number(hour)<1||Number(hour)>12||Number(minute)>59)throw Error('날짜와 시각을 확인해주세요.');
 return date+'T'+String(Number(hour)%12+(period==='PM'?12:0)).padStart(2,'0')+':'+minute.padStart(2,'0');
}
export function RecordTimeFields({value}:{value:string}){
 const date=value.slice(0,10),hour=Number(value.slice(11,13)),minute=value.slice(14,16);
 return <><div className="record-time-fields"><label>오전·오후<select name="recordPeriod" defaultValue={hour>=12?'PM':'AM'}><option value="AM">오전</option><option value="PM">오후</option></select></label><label>시<input required name="recordHour" inputMode="numeric" pattern="[0-9]{1,2}" defaultValue={hour%12||12} maxLength={2} onFocus={e=>e.currentTarget.select()} /></label><label>분<input required name="recordMinute" inputMode="numeric" pattern="[0-9]{1,2}" defaultValue={minute} maxLength={2} onFocus={e=>e.currentTarget.select()} /></label></div><details className="record-date"><summary>날짜 · {date.replaceAll('-','. ')} <span>변경</span></summary><label>기록 날짜<input required type="date" name="recordDate" defaultValue={date}/></label></details></>;
}
