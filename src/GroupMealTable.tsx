import {mealKeys,mealNames,monday} from './weeklyMeals';
import type {Meal,WeeklyMenu} from './weeklyMeals';
import {today} from './workspace';
export function GroupMealTable({dates,slots,menus,start,end}:{dates:string[];slots:{date:string;meal:Meal}[];menus:WeeklyMenu[];start:string;end:string}){
 return <div className="group-meal-table-scroll"><table className="group-meal-table" style={{minWidth:dates.length>3?50+dates.length*100:undefined}}><caption className="meal-sr-only">입소 기간 아침·점심·저녁 식단표</caption><colgroup><col className="meal-date-column"/>{dates.map(date=><col key={date}/>)}</colgroup><thead><tr><th scope="col">식사</th>{dates.map(date=><th scope="col" key={date}><strong>{date.slice(5).replace('-','.')+'.'}</strong><span>{new Intl.DateTimeFormat('ko-KR',{weekday:'short',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z'))}</span>{date===start&&<small>입소</small>}{date===end&&end!==start&&<small>퇴소</small>}</th>)}</tr></thead><tbody>{mealKeys.map(meal=><tr key={meal}><th scope="row">{mealNames[meal]}</th>{dates.map(date=>{
 const source=menus.flatMap(menu=>menu.days).find(day=>day.date===date);
 const included=slots.some(slot=>slot.date===date&&slot.meal===meal);
 return <td key={date} className={included?'':'meal-not-included'}>{!included?<span aria-label="식사 미이용">—</span>:source?.[meal].length?<ul>{source[meal].map((food,index)=><li key={index}>{food}</li>)}</ul>:<span className="meal-empty">{source?'메뉴 미등록':monday(date)>today()?'등록 예정':'등록 대기'}</span>}</td>;
 })}</tr>)}</tbody></table></div>;
}
