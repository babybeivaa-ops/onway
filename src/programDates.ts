/** Resolve the printed dates, including a week crossing December/January. */
export function programDates(labels:string[],fallbackYear:number){
 const parts=labels.map(label=>{
  const text=label.replace(/\s/g,'');
  const match=text.match(/(?:(\d{4})년)?(\d{1,2})월(\d{1,2})일/)??text.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if(!match)throw Error('일부 날짜를 읽지 못했어요. 날짜가 선명한 원본 PNG를 선택해주세요.');
  return {year:match[1]?Number(match[1]):undefined,month:Number(match[2]),day:Number(match[3])};
 });
 if(!parts.length)throw Error('편성표에서 날짜를 찾지 못했어요.');
 const explicitIndex=parts.findIndex(p=>p.year!==undefined);
 let year=explicitIndex<0?fallbackYear:parts[explicitIndex].year!;
 for(let i=explicitIndex;i>0;i--)if(parts[i-1].month===12&&parts[i].month===1)year--;
 const dates=parts.map((part,i)=>{
  if(i>0&&parts[i-1].month===12&&part.month===1)year++;
  if(part.year!==undefined&&part.year!==year)throw Error('편성표의 연도를 확인해주세요.');
  const date=`${year}-${String(part.month).padStart(2,'0')}-${String(part.day).padStart(2,'0')}`;
  const parsed=new Date(date+'T00:00:00Z');
  if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)throw Error('편성표 날짜를 정확히 읽지 못했어요.');
  return date;
 });
 if(dates.some((date,i)=>i>0&&date<=dates[i-1])||Date.parse(dates.at(-1)!)-Date.parse(dates[0])>6*86400000)throw Error('편성표의 날짜 순서와 주간 범위를 확인해주세요.');
 return {dates,yearInferred:explicitIndex<0};
}
