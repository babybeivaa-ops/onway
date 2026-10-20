import {ChevronLeft,ChevronRight,CalendarDays} from 'lucide-react';
import type {DemoGroup} from './workspace';
import {calendarDays,shiftCalendarMonth,validCalendarMonth,archivedVisits} from './archiveCalendarModel';
import {formatSchoolGroupName} from './groupName';
import './archive-calendar.css';

export function ArchiveCalendar({groups,referenceDate,month,selectedDate,onMonthChange,onDateSelect}:{groups:DemoGroup[];referenceDate:string;month:string;selectedDate:string|null;onMonthChange:(month:string)=>void;onDateSelect:(date:string|null)=>void}){
 const visits=archivedVisits(groups,referenceDate,month);
 const byDate=new Map<string,DemoGroup[]>();
 for(const group of visits)byDate.set(group.travelDate,[...(byDate.get(group.travelDate)??[]),group]);
 const monthLabel=Number(month.slice(0,4))+'년 '+Number(month.slice(5))+'월';
 const currentMonth=referenceDate.slice(0,7);
 return <section className="archive-calendar" aria-label="지난 방문 달력">
  <div className="archive-calendar-heading"><h2><CalendarDays size={21} aria-hidden="true"/>지난 방문 달력</h2><span>{monthLabel} · {visits.length}개 단체</span></div>
  <div className="archive-calendar-controls">
   <div className="archive-month-nav">
    <button type="button" aria-label="이전 달" disabled={month==='0001-01'} onClick={()=>onMonthChange(shiftCalendarMonth(month,-1))}><ChevronLeft size={20}/></button>
    <label><span className="visually-hidden">지난 방문 조회 월</span><input type="month" value={month} min="0001-01" max={currentMonth} onChange={event=>{const value=event.target.value;if(validCalendarMonth(value)&&value<=currentMonth)onMonthChange(value)}}/></label>
    <button type="button" aria-label="다음 달" disabled={month>=currentMonth} onClick={()=>onMonthChange(shiftCalendarMonth(month,1))}><ChevronRight size={20}/></button>
   </div>
   <button type="button" className="archive-month-all" aria-pressed={!selectedDate} onClick={()=>onDateSelect(null)}>이달 전체</button>
  </div>
  <div className="archive-calendar-weekdays" aria-hidden="true">{['일','월','화','수','목','금','토'].map(day=><span key={day}>{day}</span>)}</div>
  <div className="archive-calendar-days">
   {calendarDays(month).map((date,index)=>{
    if(!date)return <span className="archive-calendar-blank" aria-hidden="true" key={'blank-'+index}/>;
    const entries=byDate.get(date)??[];
    const label=`${Number(date.slice(0,4))}년 ${Number(date.slice(5,7))}월 ${Number(date.slice(8))}일`;
    return <button type="button" key={date} className={'archive-calendar-day'+(entries.length?' has-visits':'')} disabled={date>=referenceDate} aria-pressed={selectedDate===date} aria-label={label+', 방문 '+entries.length+'개 단체'} onClick={()=>onDateSelect(date)}>
     <time dateTime={date}>{Number(date.slice(8))}</time>
     {!!entries.length&&<><span className="archive-day-count">{entries.length}개 단체</span><span className="archive-day-name" title={entries.map(g=>g.state.organization.name).join(', ')}>{formatSchoolGroupName(entries[0].state.organization.name,entries[0].state.counts)}{entries.length>1?' 외 '+(entries.length-1):''}</span></>}
    </button>;
   })}
  </div>
  <p className="archive-calendar-hint">방문일 기준으로 표시해요. 날짜를 선택하면 아래에서 단체와 기록을 볼 수 있어요.</p>
 </section>;
}
