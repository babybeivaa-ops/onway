import {normalizeProgramType} from './programTypes';
import {PlannedArrivalCard} from './PlannedArrivalCard';
import {FittedGroupName} from './FittedGroupName';
import {participantCountLabel} from './participantCountLabel.ts';
import {CenterMessages} from './CenterMessages';
import {visitDateRange} from './visitDateRange';
import {VisitCounts} from './CountDisplay';
import {GuideCountChanges} from './GuideCountChanges';
import {CalendarCloudIcon,SpaceFriendsIcon} from './CloudMascot';


import type {DemoGroup} from './workspace';
import {formatGroupName,formatSchoolGroupName} from './groupName';
import {adminJourney} from './adminJourney';

export function AdminGroupSummary({group,archived=false,onAcknowledgeMessage,onSetPlannedArrival}:{group:DemoGroup;onSetPlannedArrival?:(time:string)=>void;archived?:boolean;onAcknowledgeMessage?:(id:string)=>void}){
 const notes=group.state.organization.notes;const position=group.state.sharedPosition;const {steps}=adminJourney(group.state),counts=group.state.counts;

 return <section className={'school-visit-summary'+(archived?' archived-visit-summary':'')} aria-label="선택 학교·단체 입소 현황">{notes&&<div className="group-special-notes"><strong>특이사항</strong><p>{notes}</p></div>}{position&&<div className="received-position"><strong>인솔교사가 보낸 위치</strong><span>위치 확인 {new Date(position.measuredAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} · 오차 약 {Math.round(position.accuracy)}m</span><a href={'https://map.kakao.com/link/map/'+encodeURIComponent('인솔교사 공유 위치')+','+position.lat+','+position.lng} target="_blank" rel="noreferrer">지도에서 보기</a><small>전송 당시 위치이며 실시간 위치가 아니에요.</small></div>}
  <div className="school-visit-heading"><div><p>선택한 학교·단체</p><h2>{formatSchoolGroupName(group.state.organization.name,group.state.counts,group.state.waypoints.find(p=>p.kind==='start')?.place?.name,group.state.organization.originMode,group.state.organization.nameKind)}</h2></div>{!archived&&<ol className="school-journey-steps" aria-label="이동 단계">{steps.map((step,index)=><li key={step.id} data-done={step.done} aria-current={step.current?'step':undefined}><span className="school-step-dot" aria-hidden="true">{step.done&&step.id!=='before'?'✓':index+1}</span><span>{step.label}</span></li>)}</ol>}</div>
  <dl className="school-visit-facts"><div className="visit-date-program" data-program={normalizeProgramType(group.state.organization.programType)}><dt><CalendarCloudIcon/>입소 일정</dt><dd className="visit-date-value"><FittedGroupName name={visitDateRange(group.travelDate,group.state.organization.visitDuration)}/></dd><dd className="visit-date-arrival"><PlannedArrivalCard compact state={group.state} date={group.travelDate} onSave={archived?undefined:onSetPlannedArrival}/></dd></div><div className="visit-count-cell visit-count-integrated"><dt><SpaceFriendsIcon/>입소 인원</dt><dd><div className="visit-count-top-summary" aria-label="입소 인원 요약"><strong>총 {counts.youth+counts.leaders}명</strong><span className="visit-summary-youth">{participantCountLabel(counts)} {counts.youth}명</span><span>인솔교사 {counts.leaders}명</span></div><VisitCounts counts={counts} hideOverview/></dd></div></dl>
  <CenterMessages messages={group.state.centerMessages} onAcknowledge={onAcknowledgeMessage}/>
  <GuideCountChanges changes={group.state.changes}/>
 </section>;
}
