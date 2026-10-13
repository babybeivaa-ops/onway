export function reportDatePrefix(at:string,travelDate:string){
 const d=new Date(at);const year=d.getFullYear(),month=d.getMonth()+1,day=d.getDate();
 const localDate=year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
 return localDate===travelDate?'':(String(year)===travelDate.slice(0,4)?month+'/'+day:year+'/'+month+'/'+day)+' ';
}
export function validateReportTime(at:string,now=Date.now()){
 const timestamp=Date.parse(at);
 if(!Number.isFinite(timestamp))throw Error('올바른 확인 시각을 입력해주세요.');
 if(timestamp>now)throw Error('미래 시각은 기록할 수 없어요. 현재 또는 이전 시각을 입력해주세요.');
}
