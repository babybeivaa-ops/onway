import type {ProgramSession} from './programPlan';
export const weeklyProgramTimes:Record<number,string[]>={
 1:['15:30~17:40','19:00~20:30'],
 2:['09:30~11:40','13:40~15:50','16:00~17:30','19:00~20:30'],
 3:['15:30~17:40','19:00~20:30'],
 4:['09:30~11:40','13:40~15:50','16:00~17:30','19:00~20:30'],
 5:['09:20~11:30'],
};
export const fridayAfternoonTimes=['13:10~15:20','15:30~17:40'];
export const programPlaces=['영상관','세미나실','팀미팅룸','소세미나실','위성블럭실','덕흥천문대','천체투영관'];
export const programActivities=['천체투영관에서 본 하늘','GPS 오리엔티어링','회전하는 물체 그리고 공전','대기비행의 원리와 종이비행기','자기주도 활동','대기비행의 안정성과 폼로켓','우주인훈련장비체험 & S.O.S.','에어로켓 원하는 곳에 보내기','우주착륙선 제작'];
export function stayTimetable(start:string,duration:string):ProgramSession[]{
 const nights=duration==='3박 4일'?3:duration==='2박 3일'?2:duration==='1박 2일'?1:0;
 if(!nights)return addTimetableSlots([],start);
 const sessions:ProgramSession[]=[];
 for(let day=0;day<=nights;day++){
  const date=new Date(start+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+day);
  const iso=date.toISOString().slice(0,10);
  const times=day===0?weeklyProgramTimes[1]:day===nights?[[2,4].includes(date.getUTCDay())?'09:30~11:40':'09:20~11:30']:weeklyProgramTimes[2];
  sessions.push(...times.map(time=>({date:iso,time,activity:'',place:''})));
 }
 return sessions;
}
export function timesForDate(date:string,fridayAfternoon=false){
 const day=new Date(date+'T00:00:00Z').getUTCDay();
 return fridayAfternoon?(day===5?[...fridayAfternoonTimes]:[]):[...(weeklyProgramTimes[day]??[])];
}
export function addTimetableSlots(sessions:ProgramSession[],date:string,fridayAfternoon=false):ProgramSession[]{
 const additions=timesForDate(date,fridayAfternoon).filter(time=>!sessions.some(s=>s.date===date&&s.time===time)).map(time=>({date,time,activity:'',place:''}));
 return [...sessions,...additions].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
}
