import type {ProgramSession} from './programPlan';
export function sessionClasses(value=''):string[]{
 const result:string[]=[];
 for(const part of value.replace(/\([^)]*\)/g,'').split(/[/]/)){
  const range=part.match(/(\d+)\s*[~–-]\s*(\d+)/);
  if(range&&+range[2]>=+range[1]&&+range[2]-+range[1]<30){for(let n=+range[1];n<=+range[2];n++)result.push(n+'반');}
  else for(const n of part.match(/\d+/g)??[])result.push(n+'반');
 }
 return [...new Set(result)];
}
export function classesForSchedule(sessions:ProgramSession[]){return [...new Set(sessions.flatMap(s=>sessionClasses(s.classes)))].sort((a,b)=>parseInt(a)-parseInt(b));}
export function sessionForClass(session:ProgramSession,selected:string){return !selected||!session.classes?.trim()||session.classes==='전체'||sessionClasses(session.classes).includes(selected);}
