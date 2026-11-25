import {SaveTableImage} from './SaveTableImage';
import {useEffect,useState} from 'react';
import {defaultScheduleDate,scheduleToday} from './scheduleDate';
import {classesForSchedule,sessionForClass} from './programClasses';
import {matchProgramActivity} from './programActivityMatch';
import {programActivities} from './programTimetable';
import {displayProgramPlace} from './programPlaces';
import type {ProgramGroup} from './programPlan';
function ClassLabels({value}:{value?:string}){
 const labels=[...new Set((value||'전체 반').split('/').map(label=>label.trim()).filter(Boolean))];
 return <div className="agenda-class-labels">{labels.map(label=>{const number=label.match(/\d+/)?.[0];const tone=number?String((Number(number)-1)%7):'neutral';return <span key={label} className="agenda-class" data-tone={tone}>{label}</span>;})}</div>;
}
export function ProgramDisplayTable({group,onEdit,editDisabled=false}:{group:ProgramGroup;onEdit?:()=>void;editDisabled?:boolean}){
 const [selectedClass,setSelectedClass]=useState('');
 const classes=classesForSchedule(group.sessions);
 const sessions=group.sessions.filter(s=>sessionForClass(s,classes.includes(selectedClass)?selectedClass:''));
 const dates=[...new Set(group.sessions.map(s=>s.date))].sort();
 const [today,setToday]=useState(()=>scheduleToday());
 useEffect(()=>{const refresh=()=>setToday(scheduleToday());const timer=setInterval(refresh,60000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh)}},[]);
 const [dateChoice,setDateChoice]=useState<{key:string;date:string}|null>(null);
 const dateKey=JSON.stringify([group.name,group.start,group.end]);
 const selectedDate=dateChoice?.key===dateKey&&(dateChoice.date==='all'||dates.includes(dateChoice.date))?dateChoice.date:defaultScheduleDate(dates,today);
 const short=(date:string)=>date.slice(5).replace('-','.')+'.';
 const nights=Math.max(0,Math.round((Date.parse(group.end+'T00:00:00Z')-Date.parse(group.start+'T00:00:00Z'))/86400000));
 const stay=nights===0?'당일':`${nights}박 ${nights+1}일`;
 const weekday=(date:string)=>new Intl.DateTimeFormat('ko-KR',{weekday:'short',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z'));
 return <div className="program-display-table" data-export-title={`일정표_${group.name}_${group.start}_${group.end}`}><div className="program-trip-banner"><div className="program-trip-info"><h3>{group.name}</h3><p>{short(group.start)}{group.end!==group.start&&<> — <span className="program-end-date">{short(group.end)}</span></>}<small>· {stay}</small></p></div>{classes.length>0&&<label className="program-class-filter"><select aria-label="반별 일정" value={classes.includes(selectedClass)?selectedClass:''} onChange={e=>setSelectedClass(e.target.value)}><option value="">전체 반</option>{classes.map(value=><option key={value}>{value}</option>)}</select></label>}{onEdit&&<button type="button" className="secondary program-banner-edit" disabled={editDisabled} onClick={onEdit}>편집하기</button>}</div>
 {dates.length>0&&<nav className="program-date-tabs" aria-label="일정 날짜 선택">{dates.map(date=><button key={date} type="button" aria-pressed={selectedDate===date} onClick={()=>setDateChoice({key:dateKey,date})}><strong>{weekday(date)}</strong><span>{short(date)}</span></button>)}<button type="button" aria-pressed={selectedDate==='all'} onClick={()=>setDateChoice({key:dateKey,date:'all'})}>전체</button></nav>}
 {dates.map(date=>{const rows=sessions.filter(s=>s.date===date).sort((a,b)=>a.time.localeCompare(b.time));return <section className="schedule-day" data-schedule-day={date} hidden={selectedDate!=='all'&&selectedDate!==date} data-day-tone={Math.max(0,Math.round((Date.parse(date+'T00:00:00Z')-Date.parse(group.start+'T00:00:00Z'))/86400000))%3} key={date}><h4><span>{short(date)} <small>({weekday(date)})</small></span>{date===group.start&&<small>{group.start===group.end?'당일':'입소일'}</small>}{date===group.end&&date!==group.start&&<small>퇴소일</small>}</h4><table className="schedule-agenda"><caption className="meal-sr-only">{group.name} {date} 프로그램 일정과 장소</caption><colgroup><col style={{width:78}}/><col/></colgroup><thead><tr><th scope="col">시간</th><th scope="col">프로그램 · 장소</th></tr></thead><tbody>{rows.length===0&&<tr><td colSpan={2}>선택한 반의 일정이 없는 날입니다.</td></tr>}{rows.map((s,i)=><tr key={i}>{(i===0||rows[i-1].time!==s.time)&&<th scope="rowgroup" rowSpan={rows.filter(r=>r.time===s.time).length} className="agenda-time">{s.time?s.time.split(/\s*[~–-]\s*/).map((part,j)=><span key={j}>{j>0?'– ':''}{part}</span>):'미입력'}</th>}<td><div className="agenda-program-row"><div className="agenda-program-info">{classes.length>0&&<ClassLabels value={s.classes}/>}<strong>{matchProgramActivity(s.activity,programActivities).activity||'프로그램 미입력'}</strong></div><span className="agenda-place">{displayProgramPlace(s.place,s.activity)||'장소 확인 중'}</span></div></td></tr>)}</tbody></table></section>})}<div className="document-save-footer document-save-footer-program"><p className="fine program-change-note">센터 상황이나 기상에 따라 변경될 수 있습니다.</p>{selectedDate==='all'?<SaveTableImage label="일정표 저장하기" targetSelector=".program-display-table"/>:null}</div></div>;
}
