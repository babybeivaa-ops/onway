import {documentKey} from './documents.mjs';
const meals=['breakfast','lunch','dinner'];
const validDate=date=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date+'T00:00:00Z').toISOString().startsWith(date);
const addDays=(date,n)=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const monday=date=>addDays(date,-((new Date(date+'T00:00:00Z').getUTCDay()+6)%7));
const fail=(message,status=400)=>Object.assign(Error(message),{status});
export function validateWeeklyMenu(menu){
 if(!menu||!validDate(menu.weekStart)||monday(menu.weekStart)!==menu.weekStart||typeof menu.sourceName!=='string'||menu.sourceName.length>200||!Array.isArray(menu.days)||menu.days.length!==7)throw fail('주간 식단표 형식을 확인해주세요.');
 const days=menu.days.map((day,i)=>{if(!day||day.date!==addDays(menu.weekStart,i)||!meals.every(meal=>Array.isArray(day[meal])&&day[meal].length<=30&&day[meal].every(line=>typeof line==='string'&&line.length<=200)))throw fail('날짜별 메뉴를 확인해주세요.');return {date:day.date,...Object.fromEntries(meals.map(meal=>[meal,day[meal].map(s=>s.trim()).filter(Boolean)]))}});
 return {weekStart:menu.weekStart,sourceName:menu.sourceName,updatedAt:new Date().toISOString(),days};
}
export async function serveWeeklyMenus(req,res,url,{store,canEdit,group}){
 const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value))};
 try{
  if(!store)throw fail('식단표 저장소를 확인해주세요.',503);
  if(req.method==='POST'){
   if(!canEdit)throw fail('관리자만 식단표를 등록할 수 있어요.',403);
   let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>200000)throw fail('식단표 내용이 너무 커요.',413);chunks.push(chunk)}
   let input;try{input=JSON.parse(Buffer.concat(chunks).toString())}catch{throw fail('잘못된 식단표 요청이에요.')}
   const menu=validateWeeklyMenu(input);await store.write(documentKey('center-weekly-menu',menu.weekStart,'menu'),menu);json(200,{menu});return;
  }
  if(req.method!=='GET')throw fail('허용되지 않은 요청이에요.',405);
  const start=url.searchParams.get('start'),end=url.searchParams.get('end');if(!validDate(start)||!validDate(end)||end<start||end>addDays(start,31))throw fail('조회할 식단 날짜를 확인해주세요.');
  if(!canEdit){const duration=group?.state.organization.visitDuration;const last=group?addDays(group.travelDate,duration==='3박 4일'?3:duration==='2박 3일'?2:duration==='1박 2일'?1:0):'';if(!group||start<group.travelDate||end>last)throw fail('해당 단체의 입소 기간만 조회할 수 있어요.',403)}
  const menus=[];for(let date=monday(start);date<=end;date=addDays(date,7)){const menu=await store.read(documentKey('center-weekly-menu',date,'menu'));if(menu)menus.push(canEdit?menu:{...menu,sourceName:'센터 주간식단표',days:menu.days.filter(day=>day.date>=start&&day.date<=end)})}
  const previewGroup=canEdit?url.searchParams.get('groupId'):group?.id;
  if(previewGroup){const preview=await store.read(documentKey(previewGroup,'2000-01-01','meal-preview'));if((preview?.previewKind||preview?.previewSourceWeek)&&!menus.some(m=>m.weekStart===preview.weekStart)&&preview.days.some(d=>d.date>=start&&d.date<=end))menus.push({...preview,days:preview.days.filter(d=>d.date>=start&&d.date<=end)})}
  json(200,{menus});
 }catch(e){json(e.status??500,{error:e.status?e.message:'식단표를 처리하지 못했어요. 다시 시도해주세요.'})}
}
