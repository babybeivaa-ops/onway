import {completeInstitutionName} from './groupName.ts';
import {isNaroOrigin,NARO_BRIDGE_ID,NARO_BRIDGE_PLACE} from './naroOriginRoute.ts';
import {programTypes} from './programTypes.ts';
import {normalizeCounts} from './participantCounts.ts';
import {orderMealAndIc} from './mealRouteOrder.ts';
import {fixedRouteOrder} from './routeOrder.ts';
import {invalidateBaseline} from './arrivalEstimate.ts';
import {withFixedPlaces} from './fixedPlaces.ts';
import {setWaypointPlace,clearWaypointPlace} from './places.ts';
import type {DemoState} from './types';
import {createDemo} from './data.ts';
import {deriveStatus,tripService} from './services.ts';
export type DemoView='guide'|'admin';
export interface DemoGroup {id:string; travelDate:string; registered:boolean; configuredRoute?:boolean; checkpoints:{ic:boolean;bridge:boolean}; state:DemoState}
export interface Workspace {version:2;activeGroupId:string;view:DemoView;groups:DemoGroup[]}
export interface Registration {nameKind?:import('./groupName').GroupNameKind;originMode?:'school'|'other';visitDuration?:'당일'|'1박 2일'|'2박 3일'|'2시간'|'4시간'|'';notes?:string;programType?:import('./programTypes').ProgramType|'';leaderDetails?:import('./types').LeaderDetails;youthDetails?:import('./types').YouthDetails;originPlace?:import('./places').PublicPlace;name:string;travelDate:string;origin:string;youth:number;leaders:number;ic:boolean;bridge:boolean;extraPoints?:{name:string;beforeId:string}[];routeDraft?:{id:string;name:string}[]}
export const WORKSPACE_KEY='onway-workspace-v2';
export const LEGACY_KEY='onway-demo-v1';
export const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
function validDate(v:string){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v}
function validState(s:unknown):s is DemoState {const x=s as DemoState;return !!x&&x.version===1&&typeof x.organization?.name==='string'&&typeof x.trip?.origin==='string'&&typeof x.trip?.meal?.name==='string'&&!!x.summary&&!!x.location&&Array.isArray(x.waypoints)&&Array.isArray(x.reports)&&Array.isArray(x.changes)&&!!x.counts&&!!x.initialCounts;}
export function migrateLegacy(s:DemoState):Workspace {const id='legacy-group';return {version:2,activeGroupId:id,view:'guide',groups:[{id,travelDate:s.reports[0]?.at.slice(0,10)||s.location.measuredAt.slice(0,10)||today(),registered:false,checkpoints:{ic:s.waypoints.some(w=>w.id==='ic'&&w.included),bridge:s.waypoints.some(w=>w.id==='bridge'&&w.included)},state:deriveStatus(withFixedPlaces(s))}]};}
function validateVisit(input:{nameKind?:string;originMode?:string;visitDuration?:string;notes?:string}){if(input.nameKind!==undefined&&!['auto','elementary','middle','high','organization'].includes(input.nameKind))throw Error('학교·기관 구분을 확인해주세요.');if(input.originMode!==undefined&&!['school','other'].includes(input.originMode))throw Error('출발지 설정을 확인해주세요.');if(input.visitDuration!==undefined&&!['','당일','1박 2일','2박 3일','2시간','4시간'].includes(input.visitDuration))throw Error('일정을 확인해주세요.');if(input.notes!==undefined&&(typeof input.notes!=='string'||input.notes.length>2000))throw Error('특이사항은 2000자 이내로 입력해주세요.')}
export function createGroup(input:Registration):DemoGroup {validateVisit(input);
 if(input.programType&& !programTypes.includes(input.programType))throw Error('사업 구분을 확인해주세요.');
 if(!input.name.trim())throw Error('단체명을 입력해주세요.');
 const origin=input.origin.trim()||input.name.trim();
 if(!validDate(input.travelDate))throw Error('올바른 이동일을 입력해주세요.');
 if(![input.youth,input.leaders].every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('인원은 0 이상의 정수로 입력해주세요.');
 const id=crypto.randomUUID();const s=createDemo('start');const counts=normalizeCounts({youth:input.youth,leaders:input.leaders,youthDetails:input.youthDetails,leaderDetails:input.leaderDetails});
 return {id,registered:true,travelDate:input.travelDate,checkpoints:{ic:input.ic,bridge:input.bridge},state:{...s,organization:{id,nameKind:input.nameKind??'auto',name:completeInstitutionName(input.name,input.originMode==='other'||['elementary','middle','high'].includes(input.nameKind??'auto')?undefined:input.originPlace?.name),originMode:input.originMode??'school',...(input.visitDuration!==undefined?{visitDuration:input.visitDuration}:{}),...(input.notes!==undefined?{notes:input.notes.trim()}:{}),...(input.programType?{programType:input.programType}:{}),arrival:{contactName:'',phone:'',dropoff:'체험관 앞'}},trip:{...s.trip,origin,meal:{enabled:!!input.routeDraft?.some(p=>p.id==='meal'),name:''}},initialCounts:structuredClone(counts),counts:structuredClone(counts),waypoints:s.waypoints.map(w=>w.id==='meal'?{...w,included:!!input.routeDraft?.some(p=>p.id==='meal')}:w.id==='start'?{...w,name:origin}:w.id==='ic'?{...w,included:input.ic}:w.id==='bridge'?{...w,included:input.bridge}:w)}};
}
export function addGroup(w:Workspace,input:Registration):Workspace {let group=createGroup(input);if(input.originPlace)group={...group,state:setWaypointPlace(group.state,'start',input.originPlace)};let next:Workspace={...w,activeGroupId:group.id,groups:[...w.groups,group]};for(const point of input.extraPoints??[]){if((point.beforeId==='ic'&&!input.ic)||(point.beforeId==='bridge'&&!input.bridge))throw Error('추가 위치의 확인 지점을 선택해주세요.');next=addCheckpoint(next,group.id,point.name,point.beforeId);}
 if(input.routeDraft){const draft=input.routeDraft;const required=['meal',...(input.ic?['ic']:[]),...(input.bridge?['bridge']:[])];if(new Set(draft.map(p=>p.id)).size!==draft.length||required.some(id=>!draft.some(p=>p.id===id))||draft.some(p=>!required.includes(p.id)&&!p.id.startsWith('draft-')))throw Error('확인 지점 순서를 다시 확인해주세요.');const ids:string[]=[];for(const p of draft){if(p.id.startsWith('draft-')){next=addCheckpoint(next,group.id,p.name,'arrival');ids.push(next.groups.find(g=>g.id===group.id)!.state.waypoints.find(w=>w.name===p.name.trim())!.id)}else ids.push(p.id)}next=updateGroup(next,group.id,s=>{const order=['start',...ids,...s.waypoints.filter(p=>!ids.includes(p.id)&&p.id!=='start'&&p.id!=='arrival').map(p=>p.id),'arrival'];return {...s,waypoints:s.waypoints.map(p=>({...p,order:order.indexOf(p.id)}))}});const route=next.groups.find(g=>g.id===group.id)!.state.waypoints.filter(p=>p.included&&p.kind!=='destination').sort((a,b)=>a.order-b.order);next=saveRoute(next,group.id,route.map(p=>({id:p.id,name:p.name})));}
 return isNaroOrigin(input.originPlace)?applyNaroOriginRoute(next,group.id):next;}
export function updateGroup(w:Workspace,id:string,change:DemoState|((s:DemoState)=>DemoState)):Workspace {if(!w.groups.some(g=>g.id===id))throw Error('단체를 찾을 수 없어요.');return {...w,groups:w.groups.map(g=>g.id===id?{...g,state:invalidateBaseline(g.state,orderMealAndIc(typeof change==='function'?change(g.state):change))}:g)};}
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
 if(raw){const w=JSON.parse(raw) as Workspace;if(w.version!==2||!Array.isArray(w.groups)||w.groups.some(g=>!g.id||!validDate(g.travelDate)||!validState(g.state))||new Set(w.groups.map(g=>g.id)).size!==w.groups.length)throw Error('저장된 단체 정보를 읽을 수 없어요.');if(!storage.getItem('onway-school-name-correction-20261007')&&w.groups.some(g=>g.state.organization.name==='광주 송정동초')){w.groups=w.groups.map(g=>g.state.organization.name==='광주 송정동초'?{...g,state:{...g.state,organization:{...g.state.organization,name:'광주 송정동초등학교'}}}:g);storage.setItem(WORKSPACE_KEY,JSON.stringify(w));storage.setItem('onway-school-name-correction-20261007','done');}return {...w,view:!w.groups.length||w.view==='admin'?'admin':'guide',activeGroupId:w.groups.some(g=>g.id===w.activeGroupId)?w.activeGroupId:(w.groups[0]?.id??''),groups:w.groups.map(g=>repairNaroOriginRoute({...g,state:deriveStatus(orderMealAndIc(withFixedPlaces(g.state)))}))};}
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
 points=fixedRouteOrder(points);
 const old=g.state.waypoints;const selected=points.map((p,order)=>{const existing=old.find(a=>a.id===p.id);return existing?{...existing,included:true,order}:{id:p.id,name:p.name.trim(),kind:'checkpoint' as const,included:true,order,action:p.name.trim()+' 통과했어요'}});
 const waypoints=[...selected,...old.filter(p=>!points.some(a=>a.id===p.id)).map((p,i)=>({...p,included:p.kind==='destination',order:points.length+i}))];
 const next=updateGroup(w,id,s=>deriveStatus({...s,waypoints,trip:{...s.trip,meal:{...s.trip.meal,enabled:points.some(p=>p.id==='meal')},mealStartedAt:points.some(p=>p.id==='meal')?s.trip.mealStartedAt:null}}));
 return {...next,groups:next.groups.map(g=>g.id===id?{...g,configuredRoute:true,checkpoints:{ic:points.some(p=>p.id==='ic'),bridge:points.some(p=>p.id==='bridge')}}:g)};
}

export function renameCheckpoint(w:Workspace,groupId:string,pointId:string,name:string):Workspace {
 const trimmed=name.trim();if(!trimmed||trimmed.length>60)throw Error('장소명을 1~60자로 입력해주세요.');
 return updateGroup(w,groupId,s=>{const point=s.waypoints.find(p=>p.id===pointId);if(!point||point.kind==='destination')throw Error('수정할 확인 지점을 찾지 못했어요.');
 if(s.waypoints.some(p=>p.id!==pointId&&(p.kind==='meal'?(s.trip.meal.name.trim()||'점심식사 장소'):p.name)===trimmed))throw Error('이미 있는 장소명이에요.');
 const updated={...s,waypoints:s.waypoints.map(p=>p.id===pointId?{...(p.name===trimmed?p:clearWaypointPlace(p)),name:trimmed,preset:p.preset??(p.name==='휴게소'?'rest' as const:undefined),action:p.kind==='checkpoint'?trimmed+' 통과했어요':p.action}:p)};
 if(point.kind==='meal')return tripService.updateMeal(updated,{...s.trip.meal,name:trimmed});
 if(point.kind==='start')return {...updated,trip:{...updated.trip,origin:trimmed}};
 return updated;});
}

export function deleteGroup(w:Workspace,id:string):Workspace {if(!w.groups.some(g=>g.id===id))throw Error('단체를 찾을 수 없어요.');const groups=w.groups.filter(g=>g.id!==id);return {...w,groups,activeGroupId:w.activeGroupId===id?(groups[0]?.id??''):w.activeGroupId,view:groups.length?w.view:'admin'};}

export const isPastJourney=(g:DemoGroup,date=today())=>g.travelDate<date;
export function changeTravelDate(w:Workspace,id:string,date:string):Workspace{if(!validDate(date))throw Error('올바른 이동일을 입력해주세요.');if(!w.groups.some(g=>g.id===id))throw Error('단체를 찾을 수 없어요.');return {...w,groups:w.groups.map(g=>g.id===id?{...g,travelDate:date}:g)};}

export interface GroupDetails {nameKind?:import('./groupName').GroupNameKind;originMode?:'school'|'other';originPlace?:import('./places').PublicPlace;visitDuration?:'당일'|'1박 2일'|'2박 3일'|'2시간'|'4시간'|'';notes?:string;programType?:import('./programTypes').ProgramType|'';leaderDetails?:import('./types').LeaderDetails;youthDetails?:import('./types').YouthDetails;name:string;youth:number;leaders:number;arrival?:import('./types').GroupArrivalInfo}
export function editGroupDetails(w:Workspace,id:string,input:GroupDetails):Workspace{validateVisit(input);if(input.programType!==undefined&&input.programType!==''&&!programTypes.includes(input.programType))throw Error('사업 구분을 확인해주세요.');const arrival=input.arrival===undefined?undefined:validateArrival(input.arrival);const previous=w.groups.find(g=>g.id===id);const mode=input.originMode??previous?.state.organization.originMode;const name=completeInstitutionName(input.name,mode==='other'||['elementary','middle','high'].includes(input.nameKind??previous?.state.organization.nameKind??'auto')?undefined:(input.originPlace??previous?.state.waypoints.find(p=>p.id==='start')?.place)?.name);if(!name||name.length>80)throw Error('단체명을 1~80자로 입력해주세요.');if(![input.youth,input.leaders].every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('인원은 0 이상의 정수로 입력해주세요.');const updated=updateGroup(w,id,s=>{let next=s;next={...s,counts:normalizeCounts({youth:input.youth,leaders:input.leaders,youthDetails:input.youthDetails,leaderDetails:input.leaderDetails},s.counts)};if(input.originPlace)next=setWaypointPlace(next,'start',input.originPlace);const start=next.waypoints.find(p=>p.id==='start');const followName=start&&!start.place&&start.name===s.organization.name;return {...next,organization:{...next.organization,name,...(input.nameKind?{nameKind:input.nameKind}:{}),...(input.originMode?{originMode:input.originMode}:{}),...(input.visitDuration!==undefined?{visitDuration:input.visitDuration}:{}),...(input.notes!==undefined?{notes:input.notes.trim()}:{}),...(input.programType===undefined?{}:{programType:input.programType||undefined}),...(arrival===undefined?{}:{arrival})},...(followName?{trip:{...next.trip,origin:name},waypoints:next.waypoints.map(p=>p.id==='start'?{...p,name}:p)}:{})}});if(input.originMode==='school'&&previous?.state.organization.originMode==='other'&&input.originPlace)return applySchoolOriginRoute(updated,id);return isNaroOrigin(input.originPlace)?applyNaroOriginRoute(updated,id):updated;}
export function copyJourney(w:Workspace,id:string,input:GroupDetails&{travelDate:string}):Workspace{const source=w.groups.find(g=>g.id===id);if(!source)throw Error('복사할 단체를 찾을 수 없어요.');const group=createGroup({...input,visitDuration:input.visitDuration??source.state.organization.visitDuration,notes:input.notes??source.state.organization.notes,origin:source.state.trip.origin,ic:source.checkpoints.ic,bridge:source.checkpoints.bridge});group.configuredRoute=source.configuredRoute;group.state={...group.state,organization:{...group.state.organization,nameKind:input.nameKind??source.state.organization.nameKind??'auto',originMode:source.state.organization.originMode??'school',programType:input.programType===undefined?source.state.organization.programType:input.programType||undefined,...(source.state.organization.arrival?{arrival:structuredClone(source.state.organization.arrival)}:{})},totalRoadDistanceKm:source.state.totalRoadDistanceKm,distanceNeedsReview:source.state.distanceNeedsReview,waypoints:structuredClone(source.state.waypoints),trip:{...group.state.trip,meal:structuredClone(source.state.trip.meal),mealStartedAt:null,status:'출발 전'},reports:[],changes:[],confirmed:false};return {...w,view:'admin',activeGroupId:group.id,groups:[...w.groups,group]};}
export const needsParticipantCounts=(s:DemoState)=>s.counts.youth===0&&s.counts.leaders===0;

function validateArrival(info:import('./types').GroupArrivalInfo){if(!info||typeof info.contactName!=='string'||typeof info.phone!=='string'||typeof info.dropoff!=='string')throw Error('담당자 안내를 확인해주세요.');const result={contactName:info.contactName.trim(),phone:info.phone.trim(),dropoff:info.dropoff.trim()};if(result.contactName.length>80||result.phone.length>30||result.dropoff.length>200)throw Error('담당자 안내가 너무 길어요.');if(result.phone&&!/^[0-9+() -]+$/.test(result.phone))throw Error('연락처를 확인해주세요.');return result;}
function applyNaroOriginRoute(w:Workspace,id:string):Workspace {const g=w.groups.find(g=>g.id===id)!;const start=g.state.waypoints.find(p=>p.kind==='start')!;let next=saveRoute(w,id,[{id:start.id,name:start.name},{id:NARO_BRIDGE_ID,name:NARO_BRIDGE_PLACE.name}]);return updateGroup(next,id,s=>setWaypointPlace(s,NARO_BRIDGE_ID,NARO_BRIDGE_PLACE));}

function applySchoolOriginRoute(w:Workspace,id:string):Workspace {const defaults=createDemo('start').waypoints.filter(p=>p.id==='ic'||p.id==='bridge');const prepared=updateGroup(w,id,s=>({...s,waypoints:[...s.waypoints.filter(p=>p.id!=='ic'&&p.id!=='bridge'),...defaults]}));const start=prepared.groups.find(g=>g.id===id)!.state.waypoints.find(p=>p.kind==='start')!;return saveRoute(prepared,id,[{id:start.id,name:start.name},...defaults.map(p=>({id:p.id,name:p.name}))]);}

// Repair only the uncustomized legacy default route that missed the museum POI name.
export function repairNaroOriginRoute(group:DemoGroup):DemoGroup {const start=group.state.waypoints.find(p=>p.kind==='start');if(!isNaroOrigin(start?.place))return group;const active=group.state.waypoints.filter(p=>p.included);if(active.length!==4||!active.every(p=>['start','ic','bridge','arrival'].includes(p.id))||!active.some(p=>p.id==='ic'&&p.name==='고흥IC')||!active.some(p=>p.id==='bridge'&&p.name==='나로1대교'))return group;const w:Workspace={version:2,view:'admin',activeGroupId:group.id,groups:[group]};const fixed=applyNaroOriginRoute(w,group.id).groups[0];return {...fixed,state:{...fixed.state,organization:{...fixed.state.organization,originMode:'other'}}};}
