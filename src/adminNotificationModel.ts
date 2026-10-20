import type {DemoGroup} from './workspace';
export interface AdminNotice {
 id:string;groupId:string;groupName:string;kind:'message'|'counts';at:string;text:string;acknowledged:boolean;
}
export function adminNotices(groups:DemoGroup[]):AdminNotice[]{
 return groups.flatMap(g=>[
  ...(g.state.centerMessages??[]).map(m=>({id:g.id+':message:'+m.id,groupId:g.id,groupName:g.state.organization.name,kind:'message' as const,at:m.at,text:m.text,acknowledged:!!m.acknowledgedAt})),
  ...g.state.changes.filter(c=>c.actor==='guide'||(!c.actor&&c.reason!=='관리자 등록 정보 수정')).map(c=>({id:g.id+':counts:'+c.id,groupId:g.id,groupName:g.state.organization.name,kind:'counts' as const,at:c.at,text:`참가자 ${c.before.youth} → ${c.after.youth}명 · 인솔교사 ${c.before.leaders} → ${c.after.leaders}명${c.reason?' / '+c.reason:''}`,acknowledged:false}))
 ]).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)||a.id.localeCompare(b.id));
}
export function newAdminNotices(events:AdminNotice[],previous:Set<string>|null){
 return previous===null?[]:events.filter(e=>!previous.has(e.id)&&!e.acknowledged);
}
