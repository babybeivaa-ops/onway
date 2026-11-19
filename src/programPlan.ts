import {mergeProgramPlan} from '../public-api/program-merge.mjs';
export type ProgramSession={date:string;time:string;activity:string;place:string;classes?:string};
export type ProgramGroup={name:string;aliases:string;start:string;end:string;sessions:ProgramSession[]};
export type ProgramPlan={week:string;source:string;updatedAt:string;groups:ProgramGroup[];dateNote?:string};
export function normalizedSchool(value:string){return value.replace(/초등학교/g,'초').replace(/중학교/g,'중').replace(/고등학교/g,'고').replace(/군복무/g,'').replace(/관측실습/g,'').replace(/[^가-힣a-z0-9]/gi,'').toLowerCase()}
export function matchedProgram(plans:ProgramPlan[],name:string,date:string){
 const target=normalizedSchool(name);if(!target)return undefined;
 const matches=plans.flatMap(p=>p.groups).filter(g=>g.start===date&&[g.name,...g.aliases.split(/[,\n]/)].some(alias=>{const value=normalizedSchool(alias);return value===target||(Math.min(value.length,target.length)>=4&&(value.endsWith(target)||target.endsWith(value)))}));
 return matches.length===1?matches[0]:undefined;
}
export async function programPlans(token?:string):Promise<ProgramPlan[]>{
 if(token){const r=await fetch('/api/shared/program-plans',{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('편성표를 불러오지 못했어요.');return (await r.json()).plans}
 const prefix=new URLSearchParams(location.search).get('demo')==='1'?'onway-self-demo:':'';return JSON.parse(localStorage.getItem(prefix+'onway-program-plans-v1')??'[]');
}
export async function saveProgram(plan:ProgramPlan,token?:string){
 if(!plan.groups.length||plan.groups.some(g=>!g.name.trim()||!g.start||!g.end||g.end<g.start||!g.sessions.length||g.sessions.some(s=>!s.date||s.date<g.start||s.date>g.end||!s.activity.trim()||!/^([01]\d|2[0-3]):[0-5]\d\s*[~–-]\s*([01]\d|2[0-3]):[0-5]\d$/.test(s.time))))throw Error('학교·단체명과 기간, 각 활동의 시간(예: 15:30~17:40)을 확인해주세요.');
 if(token){const r=await fetch('/api/shared/program-plans',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(plan),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('편성표 저장에 실패했어요. 다시 시도해주세요.')}
 else{const prefix=new URLSearchParams(location.search).get('demo')==='1'?'onway-self-demo:':'';const plans=await programPlans();localStorage.setItem(prefix+'onway-program-plans-v1',JSON.stringify([...plans.filter(p=>p.week!==plan.week),mergeProgramPlan(plans.find(p=>p.week===plan.week),plan)]))}
 window.dispatchEvent(new Event('onway-program-updated'));
}

