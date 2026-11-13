export const mealKeys=['breakfast','lunch','dinner'] as const;
export type Meal=typeof mealKeys[number];
export const mealNames:Record<Meal,string>={breakfast:'아침',lunch:'점심',dinner:'저녁'};
export type MealDay={date:string;breakfast:string[];lunch:string[];dinner:string[]};
export type WeeklyMenu={reviewNote?:string;previewSourceWeek?:string;previewKind?:'fictional';weekStart:string;sourceName:string;updatedAt:string;days:MealDay[]};
export type Word={text:string;x:number;y:number;w:number;h:number};
export function addDays(date:string,n:number){const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
export function monday(date:string){const d=new Date(date+'T00:00:00Z');return addDays(date,-((d.getUTCDay()+6)%7))}
export function mealDates(date:string,duration?:string,arrivalLunch=false){
 if(!duration)return [];
 const nights=duration==='2박 3일'?2:duration==='1박 2일'?1:0;
 const result:{date:string;meal:Meal}[]=[];
 if(!nights)return arrivalLunch?[{date,meal:'lunch' as Meal}]:[];
 for(let day=0;day<=nights;day++)for(const meal of mealKeys){if(day===0&&(meal==='breakfast'||(meal==='lunch'&&!arrivalLunch)))continue;if(day===nights&&meal==='dinner')continue;result.push({date:addDays(date,day),meal})}
 return result;
}
// Keep spatial columns and menu bands: group names and participant counts must never become food items.
export function parseWeeklyMenu(words:Word[],anchor:string,sourceName:string):WeeklyMenu{
 const clean=words.filter(w=>w.text.trim()).map(w=>({...w,text:w.text.trim()}));
 const dateWords=clean.flatMap(w=>{const m=w.text.match(/(?:(20\d{2})[.년\-/]\s*)?(\d{1,2})\s*(?:월|[./-])\s*(\d{1,2})\s*일?/);if(!m)return [];const years=m[1]?[+m[1]]:[+anchor.slice(0,4)-1,+anchor.slice(0,4),+anchor.slice(0,4)+1];const dates=years.map(year=>`${year}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`).filter(date=>!Number.isNaN(Date.parse(date))&&new Date(date+'T00:00:00Z').toISOString().startsWith(date));const date=dates.sort((a,b)=>Math.abs(Date.parse(a)-Date.parse(anchor))-Math.abs(Date.parse(b)-Date.parse(anchor)))[0];return date?[{...w,date}]:[]});
 const header=dateWords.filter(w=>dateWords.filter(v=>Math.abs(v.y-w.y)<Math.max(v.h,w.h)).length>=5).sort((a,b)=>a.x-b.x);
 const columns=[...new Map(header.map(w=>[w.date,w])).values()];
 if(columns.length!==7||columns.some((w,i)=>i>0&&w.date!==addDays(columns[0].date,i)))throw Error('7일 날짜 열을 읽지 못했어요. 센터 주간식단표 원본이나 선명한 이미지를 선택해주세요.');
 const firstX=columns[0].x;
 const markers=clean.filter(w=>w.x<firstX&&(/메\s*뉴/.test(w.text)||w.text==='메')).sort((a,b)=>a.y-b.y);
 const counts=clean.filter(w=>w.x<firstX&&w.text.replace(/\s/g,'')==='인원').sort((a,b)=>a.y-b.y);
 if(markers.length!==3||counts.length!==3)throw Error('아침·점심·저녁 메뉴 영역을 구분하지 못했어요. 단체명·인원과 메뉴가 구분된 센터 양식인지 확인해주세요.');
 const days:MealDay[]=columns.map(w=>({date:w.date,breakfast:[],lunch:[],dinner:[]}));
 markers.forEach((marker,i)=>{
  const next=marker.text==='메'?clean.find(w=>w.text==='뉴'&&Math.abs(w.x-marker.x)<marker.h&&w.y>marker.y&&w.y-marker.y<marker.h*3):undefined;
  const center=(marker.y+(next?.y??marker.y))/2-marker.h/2;
  const bottom=counts[i].y-counts[i].h;const top=2*center-bottom;
  if(bottom<=center||top<=columns[0].y)throw Error('메뉴 행의 경계를 확인하지 못했어요. 원본 파일로 다시 시도해주세요.');
  columns.forEach((col,c)=>{
   const cx=col.x+col.w/2,prev=columns[c-1],after=columns[c+1];const left=prev?(prev.x+prev.w/2+cx)/2:cx-(columns[1].x+columns[1].w/2-cx)/2;const right=after?(after.x+after.w/2+cx)/2:cx+(cx-(prev.x+prev.w/2))/2;
   const cell=clean.filter(w=>w.x+w.w/2>left&&w.x+w.w/2<right&&w.y-w.h/2>=top&&w.y<=bottom).sort((a,b)=>a.y-b.y||a.x-b.x);
   const lines:Word[][]=[];for(const w of cell){let row=lines.find(row=>Math.abs(row[0].y-w.y)<Math.max(row[0].h,w.h)*.5);if(!row){row=[];lines.push(row)}row.push(w)}
   days[c][mealKeys[i]]=lines.map(row=>row.sort((a,b)=>a.x-b.x).map(w=>w.text).join(' ').trim()).filter(Boolean);
  });
 });
 if(!days.some(day=>mealKeys.some(meal=>day[meal].length)))throw Error('메뉴 글자를 읽지 못했어요. 더 선명한 파일을 선택해주세요.');
 return {weekStart:monday(days[0].date),sourceName,updatedAt:new Date().toISOString(),days};
}

