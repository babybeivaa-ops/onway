import {AdminCheckpointChecks} from './AdminCheckpointChecks';

import {normalizeProgramType} from './programTypes';
import {PlannedArrivalCard} from './PlannedArrivalCard';
import {FittedGroupName} from './FittedGroupName';
import {participantCountLabel} from './participantCountLabel.ts';
import {CenterMessages} from './CenterMessages';
import {visitDateRange} from './visitDateRange';
import {VisitCounts} from './CountDisplay';
import {RecentChanges} from './RecentChanges';

import {CalendarCloudIcon,SpaceFriendsIcon} from './CloudMascot';


import type {DemoGroup} from './workspace';
import {formatGroupName,formatSchoolGroupName} from './groupName';
import {adminJourney} from './adminJourney';

export function AdminGroupSummary({onAdminCheckpointCheck,onEditCounts,group,archived=false,onReplyMessage,onAcknowledgeMessage,onSetPlannedArrival}:{onAdminCheckpointCheck?:(id:string,time?:string)=>void;onEditCounts?:()=>void;group:DemoGroup;onSetPlannedArrival?:(time:string)=>void;archived?:boolean;onReplyMessage?:(id:string,text:string)=>void;onAcknowledgeMessage?:(id:string)=>void}){
 const notes=group.state.organization.notes;const position=group.state.sharedPosition;const {steps}=adminJourney(group.state),counts=group.state.counts;

 return <section className={'school-visit-summary'+(archived?' archived-visit-summary':'')} aria-label="선택 학교·단체 입소 현황">{notes&&<div className="group-special-notes"><strong>특이사항</strong><p>{notes}</p></div>}<section className="received-position" aria-label="인솔교사 전송 위치"><div className="received-position-heading"><strong>인솔교사 전송 위치</strong><span className="received-position-status">{position?'수신됨':'수신 대기'}</span></div>{position?<><span>최근 전송 <time dateTime={position.sentAt}>{new Date(position.sentAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</time></span><span className="received-position-detail">위치 측정 {new Date(position.measuredAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} · 오차 약 {Math.round(position.accuracy)}m</span><a className="received-position-map" href={'https://map.kakao.com/link/map/'+encodeURIComponent(group.state.organization.name+' 인솔교사 전송 위치')+','+position.lat+','+position.lng} target="_blank" rel="noreferrer">전송 위치 지도에서 보기 ↗</a><small>마지막으로 전송한 위치입니다. 실시간 이동 위치가 아니에요.</small></>:<p className="received-position-empty">{archived?'이 방문에서 전송받은 위치가 없어요.':'인솔교사가 ‘센터에 위치 전송’을 누르면 여기에 표시돼요.'}</p>}</section>
  <div className="school-visit-heading"><div><p>선택한 학교·단체</p><h2>{formatSchoolGroupName(group.state.organization.name,group.state.counts,group.state.waypoints.find(p=>p.kind==='start')?.place?.name,group.state.organization.originMode,group.state.organization.nameKind)}</h2></div>{!archived&&<ol className="school-journey-steps" style={{width:'max-content',gridTemplateColumns:`repeat(${steps.length}, max-content)`}} aria-label="이동 단계">{steps.map((step,index)=><li key={step.id} data-done={step.done} aria-current={step.current?'step':undefined}><span className="school-step-dot" aria-hidden="true">{step.done&&step.id!=='before'?'✓':index+1}</span><span className="school-step-copy"><span className={step.label==='학교·단체 출발'?'school-departure-label':undefined}>{step.label}</span>{step.at&&<time dateTime={step.at}>{new Date(step.at).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})}</time>}</span></li>)}</ol>}</div>

  {!archived&&<AdminCheckpointChecks state={group.state} onToggle={onAdminCheckpointCheck}/>}
  <dl className="school-visit-facts"><div className="visit-date-program" data-program={normalizeProgramType(group.state.organization.programType)}><dt><CalendarCloudIcon/>입소 일정</dt><dd className="visit-date-value"><FittedGroupName name={visitDateRange(group.travelDate,group.state.organization.visitDuration)}/></dd><dd className="visit-date-arrival"><PlannedArrivalCard compact state={group.state} date={group.travelDate} onSave={archived?undefined:onSetPlannedArrival}/></dd></div><div className="visit-count-cell visit-count-integrated"><dt><SpaceFriendsIcon/>입소 인원</dt><dd><div className="visit-count-top-summary" aria-label="입소 인원 요약"><strong>총 {counts.youth+counts.leaders}명</strong><span className="visit-summary-youth">{participantCountLabel(counts)} {counts.youth}명</span><span>인솔교사 {counts.leaders}명</span>{onEditCounts&&<button type="button" className="secondary visit-count-edit" onClick={onEditCounts}>인원 수정</button>}</div><VisitCounts counts={counts} hideOverview/></dd></div></dl>
  <CenterMessages onReply={onReplyMessage} messages={group.state.centerMessages} onAcknowledge={onAcknowledgeMessage}/>

  <RecentChanges state={group.state}/>
 </section>;
}
