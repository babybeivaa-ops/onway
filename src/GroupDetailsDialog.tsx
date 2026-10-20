import {ThinkingNoteCloudIcon} from './CloudMascot';
import {GroupBasicFields} from './GroupBasicFields';
import type {VisitDuration} from './VisitScheduleFields';
import type {ProgramType} from './programTypes';
import {ParticipantEditor} from './ParticipantEditor';
import {normalizeCounts} from './participantCounts';
import type {ParticipantCount} from './types';
import {useEffect,useRef,useState,useId} from 'react';
import {X} from 'lucide-react';
import type {DemoGroup,GroupDetails} from './workspace';
import {today} from './workspace';
export function GroupDetailsDialog({group,copy,onSave,onClose}:{group:DemoGroup;copy:boolean;onSave:(input:GroupDetails&{travelDate:string})=>void;onClose:()=>void}){
 const formId=useId();const [visitDuration,setVisitDuration]=useState<VisitDuration|''>(group.state.organization.visitDuration??'');const [notes,setNotes]=useState(group.state.organization.notes??'');const [programType,setProgramType]=useState<ProgramType|''>(group.state.organization.programType??'');const dialog=useRef<HTMLDialogElement>(null);const [name,setName]=useState(group.state.organization.name);const [participantCounts,setParticipantCounts]=useState<ParticipantCount>(()=>copy?{youth:0,leaders:0}:structuredClone(group.state.counts));const [date,setDate]=useState(today);const [error,setError]=useState('');const submitting=useRef(false);useEffect(()=>{dialog.current?.showModal()},[]);
 return <dialog className="registration-dialog group-details-dialog" ref={dialog} aria-labelledby="group-details-title" onCancel={onClose}><div className="dialog-head"><h2 id="group-details-title">{!copy&&<ThinkingNoteCloudIcon/>}{copy?'복사해서 새 일정 등록':'단체 정보 수정'}</h2><div className="group-dialog-actions"><button type="button" className="icon-button" aria-label="단체 정보 창 닫기" onClick={onClose}><X/></button></div></div><form id={formId} onSubmit={e=>{e.preventDefault();if(submitting.current)return;try{const counts=normalizeCounts(participantCounts);submitting.current=true;onSave({name,programType,visitDuration,notes,...counts,travelDate:date});onClose()}catch(e){submitting.current=false;setError((e as Error).message)}}}><p className="fine">{copy?'장소·순서·지도 위치를 복사해요. 이동 기록과 인원 변경 이력은 비우고 새로 시작해요.':'이동 기록과 지도 위치는 유지돼요. 인원을 바꾸면 변경 이력에 남아요.'}</p><GroupBasicFields name={name} onName={setName} date={copy?date:group.travelDate} onDate={copy?setDate:undefined} programType={programType} onProgram={setProgramType} duration={visitDuration} onDuration={setVisitDuration} notes={notes} onNotes={setNotes}/><ParticipantEditor name={name} value={participantCounts} onChange={setParticipantCounts}/>{copy&&<p className="fine">이번 일정의 인원을 입력해주세요. 모두 0명이면 ‘인원 미입력’으로 표시돼요.</p>}{error&&<p role="alert" className="form-error">{error}</p>}<button className="primary" type="submit">{copy?'새 일정 등록':'수정 저장'}</button></form></dialog>
}
