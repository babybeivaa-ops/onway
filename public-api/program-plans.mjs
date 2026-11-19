import {mergeProgramPlan} from './program-merge.mjs';
import {documentKey} from './documents.mjs';
import {preferRegisteredProgramNames} from './program-names.mjs';
const key=documentKey('center-program-plans','2000-01-01','schedule');
const fail=(s,status=400)=>Object.assign(Error(s),{status});
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().startsWith(s);
const text=(s,max)=>typeof s==='string'&&s.length<=max;
const normalize=s=>s.replace(/초등학교/g,'초').replace(/중학교/g,'중').replace(/고등학교/g,'고').replace(/군복무/g,'').replace(/관측실습/g,'').replace(/[^가-힣a-z0-9]/gi,'').toLowerCase();
export function validateProgramPlan(p){
 if(!p||!validDate(p.week)||!text(p.source,200)||!Array.isArray(p.groups)||!p.groups.length||p.groups.length>30)throw fail('편성표 형식을 확인해주세요.');
 const groups=p.groups.map(g=>{if(!g||!text(g.name,200)||!g.name.trim()||!text(g.aliases,1000)||!validDate(g.start)||!validDate(g.end)||g.end<g.start||!Array.isArray(g.sessions)||!g.sessions.length||g.sessions.length>200)throw fail('단체명과 기간을 확인해주세요.');
 const sessions=g.sessions.map(s=>{if(!s||!validDate(s.date)||s.date<g.start||s.date>g.end||!text(s.time,30)||!/^([01]\d|2[0-3]):[0-5]\d\s*[~–-]\s*([01]\d|2[0-3]):[0-5]\d$/.test(s.time)||!text(s.activity,500)||!s.activity.trim()||!text(s.place,200)||(s.classes!==undefined&&!text(s.classes,100)))throw fail('활동 날짜·시간·내용을 확인해주세요.');return {date:s.date,time:s.time,activity:s.activity.trim(),place:s.place.trim(),...(s.classes?.trim()?{classes:s.classes.trim()}:{})}});
 return {name:g.name.trim(),aliases:g.aliases,start:g.start,end:g.end,sessions}});
 return {week:p.week,source:p.source,updatedAt:new Date().toISOString(),groups};
}
export function ownProgramPlans(plans,group){
 if(!group)return [];const target=normalize(group.state.organization.name);
 const matches=plans.flatMap(p=>p.groups.map(g=>({p,g}))).filter(({g})=>g.start===group.travelDate&&[g.name,...g.aliases.split(/[,\n]/)].some(s=>{const v=normalize(s);return v===target||(Math.min(v.length,target.length)>=4&&(v.endsWith(target)||target.endsWith(v)))}));
 return matches.length===1?[{...matches[0].p,source:'센터 일정표',groups:[matches[0].g]}]:[];
}
export async function serveProgramPlans(req,res,{store,canEdit,group,registeredNames=[]}){
 const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value))};
 try{if(!store)throw fail('편성표 저장소를 확인해주세요.',503);
 if(req.method==='GET'){const plans=((await store.read(key))?.plans??[]).map(p=>preferRegisteredProgramNames(p,registeredNames));json(200,{plans:canEdit?plans:ownProgramPlans(plans,group)});return;}
 if(req.method!=='POST')throw fail('허용되지 않은 요청이에요.',405);if(!canEdit)throw fail('관리자만 편성표를 등록할 수 있어요.',403);
 let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>500000)throw fail('편성표 내용이 너무 커요.',413);chunks.push(chunk)}let input;try{input=JSON.parse(Buffer.concat(chunks).toString())}catch{throw fail('잘못된 편성표 요청이에요.')}
 const plan=validateProgramPlan(input),plans=(await store.read(key))?.plans??[];const merged=validateProgramPlan(mergeProgramPlan(plans.find(p=>p.week===plan.week),plan));await store.write(key,{plans:[...plans.filter(p=>p.week!==plan.week),merged]});json(200,{plan:merged});
 }catch(e){json(e.status??500,{error:e.status?e.message:'편성표를 처리하지 못했어요.'})}
}

