import {addDays,monday} from './weeklyMeals';
import type {WeeklyMenu} from './weeklyMeals';
const prefix=()=>((new URLSearchParams(location.search).get('demo')==='1')?'onway-self-demo:':'')+'onway-weekly-menu-v1:';
export async function loadWeeklyMenus(start:string,end:string,token?:string,groupId?:string):Promise<WeeklyMenu[]>{
 if(token){const r=await fetch('/api/shared/weekly-menus?'+new URLSearchParams({start,end,...(groupId?{groupId}:{})}),{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('식단표를 불러오지 못했어요. 다시 시도해주세요.');return (await r.json()).menus}
 const menus:WeeklyMenu[]=[];for(let date=monday(start);date<=end;date=addDays(date,7)){const value=localStorage.getItem(prefix()+date);if(value)menus.push(JSON.parse(value))}return menus;
}
export async function saveWeeklyMenu(menu:WeeklyMenu,token?:string){
 if(token){const r=await fetch('/api/shared/weekly-menus',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(menu),signal:AbortSignal.timeout(20000)});if(!r.ok){const result=await r.json().catch(()=>({}));throw Error(result.error??'식단표를 저장하지 못했어요. 다시 시도해주세요.')}}
 else localStorage.setItem(prefix()+menu.weekStart,JSON.stringify(menu));
 window.dispatchEvent(new Event('onway-weekly-menu-updated'));
}
