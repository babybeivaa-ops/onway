import {ReceivedPosition} from './ReceivedPosition';
import {AdminCheckpointChecks} from './AdminCheckpointChecks';

import {normalizeProgramType} from './programTypes';
import {PlannedArrivalCard} from './PlannedArrivalCard';
import {FittedGroupName} from './FittedGroupName';
import {participantCountLabel} from './participantCountLabel.ts';

import {visitDateRange} from './visitDateRange';
import {VisitCounts} from './CountDisplay';


import {CalendarCloudIcon,SpaceFriendsIcon} from './CloudMascot';


import type {DemoGroup} from './workspace';
import {formatGroupName,formatSchoolGroupName} from './groupName';
import {adminJourney} from './adminJourney';

export function AdminGroupSummary({onCompleteAdmission,onSendMessage,onAdminCheckpointCheck,onEditCounts,group,archived=false,onReplyMessage,onAcknowledgeMessage,onSetPlannedArrival}:{onCompleteAdmission?:()=>void;onSendMessage?:(text:string)=>void;onAdminCheckpointCheck?:(id:string,time?:string)=>void;onEditCounts?:()=>void;group:DemoGroup;onSetPlannedArrival?:(time:string)=>void;archived?:boolean;onReplyMessage?:(id:string,text:string)=>void;onAcknowledgeMessage?:(id:string)=>void}){
 const notes=group.state.organization.notes;const position=group.state.sharedPosition;const {steps}=adminJourney(group.state),counts=group.state.counts;

 return <section className={'school-visit-summary'+(archived?' archived-visit-summary':'')} aria-label="선택 학교·단체 입소 현황">{notes&&<div className="group-special-notes"><strong>특이사항</strong><p>{notes}</p></div>}<ReceivedPosition completed={!!group.state.admissionCompletedAt} position={position} archived={archived}/>
  <div className="school-visit-heading"><div><p>선택한 학교·단체</p><h2>{formatSchoolGroupName(group.state.organization.name,group.state.counts,group.state.waypoints.find(p=>p.kind==='start')?.place?.name,group.state.organization.originMode,group.state.organization.nameKind)}</h2></div>{!archived&&<ol className="school-journey-steps" style={{width:'max-content',gridTemplateColumns:`repeat(${steps.length}, max-content)`}} aria-label="이동 단계">{steps.map((step,index)=><li key={step.id} data-done={step.done} aria-current={step.current?'step':undefined}><span className="school-step-dot" aria-hidden="true">{step.done&&step.id!=='before'?'✓':index+1}</span><span className="school-step-copy"><span className={step.label==='학교·단체 출발'?'school-departure-label':undefined}>{step.label}</span>{step.at&&<time dateTime={step.at}>{new Date(step.at).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})}</time>}</span></li>)}</ol>}</div>

  {!archived&&<AdminCheckpointChecks state={group.state} onToggle={onAdminCheckpointCheck}/>}
  <dl className="school-visit-facts"><div className="visit-date-program" data-program={normalizeProgramType(group.state.organization.programType)}><dt><CalendarCloudIcon/>입소 일정</dt><dd className="visit-date-value"><FittedGroupName name={visitDateRange(group.travelDate,group.state.organization.visitDuration)}/></dd><dd className="visit-date-arrival"><PlannedArrivalCard compact state={group.state} date={group.travelDate} onSave={archived?undefined:onSetPlannedArrival}/></dd></div><div className="visit-count-cell visit-count-integrated"><dt><SpaceFriendsIcon/>입소 인원</dt><dd className="visit-count-header-summary"><div className="visit-count-top-summary" aria-label="입소 인원 요약"><strong>총 {counts.youth+counts.leaders}명</strong><span className="visit-summary-youth">{participantCountLabel(counts)} {counts.youth}명</span><span>인솔교사 {counts.leaders}명</span>{onCompleteAdmission&&<button type="button" className="secondary admission-complete-button" aria-pressed={!!group.state.admissionCompletedAt} title={group.state.admissionCompletedAt?'다시 누르면 입소 완료 취소':'입소 완료 처리'} onClick={onCompleteAdmission}>{group.state.admissionCompletedAt?'입소 완료됨':'입소 완료'}</button>}</div></dd><dd className="visit-count-table-body"><VisitCounts counts={counts} hideOverview/><div className="visit-count-footer">{onEditCounts&&<button type="button" className="secondary visit-count-edit" onClick={onEditCounts}>인원 수정</button>}</div></dd></div></dl>


 </section>;
}
