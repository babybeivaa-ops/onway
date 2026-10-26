import {participantReasonLabel} from './participantActor.ts';
import {guideEditedCurrentCounts} from './participantConfirmation.ts';
import {formatSchoolGroupName} from './groupName.ts';
import type {DemoGroup} from './workspace';
export interface AdminNotice {
 id:string;groupId:string;groupName:string;kind:'message'|'counts'|'confirmation'|'movement';at:string;text:string;acknowledged:boolean;countsEdited?:boolean;
}
export function adminNotices(groups:DemoGroup[]):AdminNotice[]{
 return groups.flatMap(g=>[
  ...g.state.reports.filter(r=>r.status!=='cancelled'&&g.state.waypoints.some(p=>p.id===r.waypointId&&p.included)).map(r=>{const point=g.state.waypoints.find(p=>p.id===r.waypointId)!;const groupName=formatSchoolGroupName(g.state.organization.name,g.state.counts,g.state.waypoints.find(p=>p.kind==='start')?.place?.name,g.state.organization.originMode,g.state.organization.nameKind);const verb=point.kind==='start'||point.kind==='meal'?point.name+'에서 출발하였습니다.':point.kind==='destination'?'센터에 도착하였습니다.':point.name+objectParticle(point.name)+' 통과하였습니다.';return {id:g.id+':movement:'+r.id,groupId:g.id,groupName,kind:'movement' as const,at:r.at,text:groupName+subjectParticle(groupName)+' '+verb,acknowledged:false};}),
  ...(g.state.confirmed&&g.state.countsConfirmedAt?[{id:g.id+':confirmation:'+g.state.countsConfirmedAt,groupId:g.id,groupName:g.state.organization.name,kind:'confirmation' as const,at:g.state.countsConfirmedAt,text:g.state.organization.name+(guideEditedCurrentCounts(g.state)?'가 수정한 인원을 확인하였습니다.':'가 인원 변동없음을 확인하였습니다.'),countsEdited:guideEditedCurrentCounts(g.state),acknowledged:false}]:[]),
  ...(g.state.centerMessages??[]).map(m=>({id:g.id+':message:'+m.id,groupId:g.id,groupName:g.state.organization.name,kind:'message' as const,at:m.at,text:m.text,acknowledged:!!m.acknowledgedAt})),
  ...g.state.changes.filter(c=>c.actor==='guide'||(!c.actor&&c.reason!=='관리자 등록 정보 수정')).map(c=>({id:g.id+':counts:'+c.id,groupId:g.id,groupName:g.state.organization.name,kind:'counts' as const,at:c.at,text:`참가자 ${c.before.youth} → ${c.after.youth}명 · 인솔교사 ${c.before.leaders} → ${c.after.leaders}명${c.reason?' / '+participantReasonLabel(c.reason):''}`,acknowledged:false}))
 ]).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)||a.id.localeCompare(b.id));
}
export function newAdminNotices(events:AdminNotice[],previous:Set<string>|null){
 return previous===null?[]:events.filter(e=>!previous.has(e.id)&&!e.acknowledged);
}

function hasFinalConsonant(value:string){const code=value.trim().charCodeAt(value.trim().length-1);return code>=0xac00&&code<=0xd7a3&&(code-0xac00)%28!==0;}
function objectParticle(value:string){return hasFinalConsonant(value)?'을':'를';}
function subjectParticle(value:string){return hasFinalConsonant(value)?'이':'가';}
