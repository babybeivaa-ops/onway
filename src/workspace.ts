import type {DemoState} from './types';
import {createDemo} from './data.ts';
import {deriveStatus,tripService} from './services.ts';
export type DemoView='guide'|'admin';
export interface DemoGroup {id:string; travelDate:string; registered:boolean; configuredRoute?:boolean; checkpoints:{ic:boolean;bridge:boolean}; state:DemoState}
export interface Workspace {version:2;activeGroupId:string;view:DemoView;groups:DemoGroup[]}
export interface Registration {name:string;travelDate:string;origin:string;youth:number;leaders:number;ic:boolean;bridge:boolean;extraPoints?:{name:string;beforeId:string}[];routeDraft?:{id:string;name:string}[]}
export const WORKSPACE_KEY='onway-workspace-v2';
export const LEGACY_KEY='onway-demo-v1';
export const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
function validDate(v:string){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v}
function validState(s:unknown):s is DemoState {const x=s as DemoState;return !!x&&x.version===1&&typeof x.organization?.name==='string'&&typeof x.trip?.origin==='string'&&typeof x.trip?.meal?.name==='string'&&!!x.summary&&!!x.location&&Array.isArray(x.waypoints)&&Array.isArray(x.reports)&&Array.isArray(x.changes)&&!!x.counts&&!!x.initialCounts;}
export function migrateLegacy(s:DemoState):Workspace {const id='legacy-group';return {version:2,activeGroupId:id,view:'guide',groups:[{id,travelDate:s.reports[0]?.at.slice(0,10)||s.location.measuredAt.slice(0,10)||today(),registered:false,checkpoints:{ic:s.waypoints.some(w=>w.id==='ic'&&w.included),bridge:s.waypoints.some(w=>w.id==='bridge'&&w.included)},state:deriveStatus(s)}]};}
export function createGroup(input:Registration):DemoGroup {
 if(!input.name.trim())throw Error('단체명을 입력해주세요.');
 const origin=input.origin.trim()||input.name.trim();
 if(!validDate(input.travelDate))throw Error('올바른 이동일을 입력해주세요.');
 if(![input.youth,input.leaders].every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('인원은 0 이상의 정수로 입력해주세요.');
 const id=crypto.randomUUID();const s=createDemo('start');const counts={youth:input.youth,leaders:input.leaders};
 return {id,registered:true,travelDate:input.travelDate,checkpoints:{ic:input.ic,bridge:input.bridge},state:{...s,organization:{id,name:input.name.trim()},trip:{...s.trip,origin,meal:{enabled:true,name:''}},initialCounts:{...counts},counts:{...counts},waypoints:s.waypoints.map(w=>w.id==='start'?{...w,name:origin}:w.id==='ic'?{...w,included:input.ic}:w.id==='bridge'?{...w,included:input.bridge}:w)}};
}
export function addGroup(w:Workspace,input:Registration):Workspace {const group=createGroup(input);let next:Workspace={...w,activeGroupId:group.id,groups:[...w.groups,group]};for(const point of input.extraPoints??[]){if((point.beforeId==='ic'&&!input.ic)||(point.beforeId==='bridge'&&!input.bridge))throw Error('추가 위치의 확인 지점을 선택해주세요.');next=addCheckpoint(next,group.id,point.name,point.beforeId);}
 if(input.routeDraft){const draft=input.routeDraft;const required=['meal',...(input.ic?['ic']:[]),...(input.bridge?['bridge']:[])];if(new Set(draft.map(p=>p.id)).size!==draft.length||required.some(id=>!draft.some(p=>p.id===id))||draft.some(p=>!required.includes(p.id)&&!p.id.startsWith('draft-')))throw Error('확인 지점 순서를 다시 확인해주세요.');const ids:string[]=[];for(const p of draft){if(p.id.startsWith('draft-')){next=addCheckpoint(next,group.id,p.name,'arrival');ids.push(next.groups.find(g=>g.id===group.id)!.state.waypoints.find(w=>w.name===p.name.trim())!.id)}else ids.push(p.id)}next=updateGroup(next,group.id,s=>{const order=['start',...ids,...s.waypoints.filter(p=>!ids.includes(p.id)&&p.id!=='start'&&p.id!=='arrival').map(p=>p.id),'arrival'];return {...s,waypoints:s.waypoints.map(p=>({...p,order:order.indexOf(p.id)}))}});}
 return next;}
export function updateGroup(w:Workspace,id:string,change:DemoState|((s:DemoState)=>DemoState)):Workspace {if(!w.groups.some(g=>g.id===id))throw Error('단체를 찾을 수 없어요.');return {...w,groups:w.groups.map(g=>g.id===id?{...g,state:typeof change==='function'?change(g.state):change}:g)};}
export function resetGroupState(g:DemoGroup,scenario='default'):DemoState {
 const s=createDemo(scenario);const custom=g.state.waypoints.filter(w=>w.id.startsWith('custom-'));
 const restorePoints=(base:DemoState['waypoints'])=>[...base.map(w=>({...w,order:g.state.waypoints.find(p=>p.id===w.id)?.order??w.order})),...custom].sort((a,b)=>a.order-b.order);
 if(!g.registered)return {...s,waypoints:restorePoints(s.waypoints)};
 const waypoints=s.waypoints.map(w=>w.id==='start'?{...w,name:g.state.trip.origin}:w.id==='ic'?{...w,included:g.checkpoints.ic&&scenario!=='no-ic'}:w.id==='bridge'?{...w,included:g.checkpoints.bridge}:w);
 const reports=s.reports.filter(r=>waypoints.some(w=>w.id===r.waypointId&&w.included));
 return deriveStatus({...s,organization:g.state.organization,initialCounts:{...g.state.initialCounts},counts:{...g.state.initialCounts},trip:{...s.trip,origin:g.state.trip.origin,meal:{...s.trip.meal,name:''}},waypoints:restorePoints(waypoints),reports});
}
export function resetGroup(w:Workspace,id:string,scenario='default'):Workspace {const g=w.groups.find(g=>g.id===id);if(!g)throw Error('단체를 찾을 수 없어요.');let next=updateGroup(w,id,resetGroupState(g,scenario));if(g.configuredRoute){next=saveRoute(next,id,g.state.waypoints.filter(p=>p.included&&p.kind!=='destination').sort((a,b)=>a.order-b.order).map(p=>({id:p.id,name:p.name})));next=updateGroup(next,id,s=>({...s,reports:s.reports.filter(r=>s.waypoints.some(p=>p.id===r.waypointId&&p.included))}));}return next;}
export interface StorageLike {getItem(key:string):string|null;setItem(key:string,value:string):void}
export function loadWorkspace(storage:StorageLike):Workspace {
 const raw=storage.getItem(WORKSPACE_KEY);
 if(raw){const w=JSON.parse(raw) as Workspace;if(w.version!==2||!Array.isArray(w.groups)||!w.groups.length||w.groups.some(g=>!g.id||!validDate(g.travelDate)||!validState(g.state))||new Set(w.groups.map(g=>g.id)).size!==w.groups.length)throw Error('저장된 단체 정보를 읽을 수 없어요.');return {...w,view:w.view==='admin'?'admin':'guide',activeGroupId:w.groups.some(g=>g.id===w.activeGroupId)?w.activeGroupId:w.groups[0].id,groups:w.groups.map(g=>({...g,state:deriveStatus(g.state)}))};}
 const legacy=storage.getItem(LEGACY_KEY);if(legacy){const s=JSON.parse(legacy);if(!validState(s))throw Error('기존 시연 기록을 읽을 수 없어요.');return migrateLegacy(s);}
 return migrateLegacy(createDemo());
}
export const saveWorkspace=(storage:StorageLike,w:Workspace)=>storage.setItem(WORKSPACE_KEY,JSON.stringify(w));

export function addCheckpoint(w:Workspace,groupId:string,name:string,beforeId:string):Workspace {
 return updateGroup(w,groupId,s=>{
 const trimmed=name.trim();if(!trimmed||trimmed.length>60)throw Error('장소명을 1~60자로 입력해주세요.');
 if(s.waypoints.some(p=>p.name.trim()===trimmed)||s.trip.meal.name.trim()===trimmed)throw Error('이미 있는 장소명이에요. 구분할 수 있는 이름을 입력해주세요.');
 const sorted=[...s.waypoints].sort((a,b)=>a.order-b.order);const index=sorted.findIndex(p=>p.id===beforeId);
 if(index<=0)throw Error('출발지 다음부터 도착지 사이에 추가해주세요.');
 const point={id:'custom-'+crypto.randomUUID(),name:trimmed,kind:'checkpoint' as const,included:true,order:0,action:trimmed+' 통과했어요'};
 sorted.splice(index,0,point);return {...s,waypoints:sorted.map((p,i)=>({...p,order:i}))};
 });
}

export function saveRoute(w:Workspace,id:string,points:{id:string;name:string}[]):Workspace {
 const g=w.groups.find(g=>g.id===id);if(!g)throw Error('단체를 찾을 수 없어요.');
 if(new Set(points.map(p=>p.id)).size!==points.length||points.some(p=>!p.name.trim()||p.name.length>100||p.id==='arrival'||(!g.state.waypoints.some(a=>a.id===p.id)&&!p.id.startsWith('custom-'))))throw Error('확인 지점을 다시 확인해주세요.');
 const old=g.state.waypoints;const selected=points.map((p,order)=>{const existing=old.find(a=>a.id===p.id);return existing?{...existing,included:true,order}:{id:p.id,name:p.name.trim(),kind:'checkpoint' as const,included:true,order,action:p.name.trim()+' 통과했어요'}});
 const waypoints=[...selected,...old.filter(p=>!points.some(a=>a.id===p.id)).map((p,i)=>({...p,included:p.kind==='destination',order:points.length+i}))];
 const next=updateGroup(w,id,s=>deriveStatus({...s,waypoints,trip:{...s.trip,meal:{...s.trip.meal,enabled:points.some(p=>p.id==='meal')},mealStartedAt:points.some(p=>p.id==='meal')?s.trip.mealStartedAt:null}}));
 return {...next,groups:next.groups.map(g=>g.id===id?{...g,configuredRoute:true,checkpoints:{ic:points.some(p=>p.id==='ic'),bridge:points.some(p=>p.id==='bridge')}}:g)};
}

export function renameCheckpoint(w:Workspace,groupId:string,pointId:string,name:string):Workspace {
 const trimmed=name.trim();if(!trimmed||trimmed.length>60)throw Error('장소명을 1~60자로 입력해주세요.');
 return updateGroup(w,groupId,s=>{const point=s.waypoints.find(p=>p.id===pointId);if(!point||point.kind==='destination')throw Error('수정할 확인 지점을 찾지 못했어요.');
 if(s.waypoints.some(p=>p.id!==pointId&&(p.kind==='meal'?(s.trip.meal.name.trim()||'점심식사 장소'):p.name)===trimmed))throw Error('이미 있는 장소명이에요.');
 const updated={...s,waypoints:s.waypoints.map(p=>p.id===pointId?{...p,name:trimmed,preset:p.preset??(p.name==='휴게소'?'rest' as const:undefined),action:p.kind==='checkpoint'?trimmed+' 통과했어요':p.action}:p)};
 if(point.kind==='meal')return tripService.updateMeal(updated,{...s.trip.meal,name:trimmed});
 if(point.kind==='start')return {...updated,trip:{...updated.trip,origin:trimmed}};
 return updated;});
}
