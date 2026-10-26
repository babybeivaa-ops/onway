import {participantReasonLabel} from './participantActor.ts';
import {participantCountLabel} from './participantCountLabel.ts';
import {formatGroupName} from './groupName';
import type {DemoGroup} from './workspace';
export function RecentActivity({groups,onSelect}:{groups:DemoGroup[];onSelect:(id:string)=>void}){
 const events=groups.flatMap(g=>[...g.state.changes.map(c=>({id:g.id+c.id,group:g,at:c.at,text:'인원 변경 · '+participantCountLabel(c.before,c.after)+' '+c.before.youth+' → '+c.after.youth+'명 / 인솔교사 '+c.before.leaders+' → '+c.after.leaders+'명',note:participantReasonLabel(c.reason)})),...g.state.reports.map(r=>({id:g.id+r.id,group:g,at:r.editedAt||r.createdAt||r.at,text:(g.state.waypoints.find(p=>p.id===r.waypointId)?.name||'지점')+' · '+(r.status==='cancelled'?'기록 취소':r.status==='edited'?'시각 수정':'지점 확인'),note:'기록 시각 '+new Date(r.at).toLocaleString('ko-KR')}))]).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,20);
 return <section className="feature-card"><h2>최근 변경</h2><p className="fine">등록 단체 전체 · 최근 20건</p>{events.length?<ul className="activity-list">{events.map(e=><li key={e.id}><button type="button" onClick={()=>onSelect(e.group.id)}><strong>{formatGroupName(e.group.state.organization.name)}</strong><span>{e.text}</span>{e.note&&<small>{e.note}</small>}<small>{new Date(e.at).toLocaleString('ko-KR')} · 이동일 {e.group.travelDate}</small></button></li>)}</ul>:<p className="fine">아직 변경 기록이 없어요.</p>}</section>;
}
