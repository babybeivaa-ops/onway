import {normalizeProgramType} from './programTypes';
import {GroupNameKindField} from './GroupNameKindField';
import type {GroupNameKind} from './groupName';
import {ThinkingNoteCloudIcon} from './CloudMascot';
import {GroupBasicFields} from './GroupBasicFields';
import type {VisitDuration} from './VisitScheduleFields';
import type {ProgramType} from './programTypes';
import {ParticipantEditor} from './ParticipantEditor';
import {OriginSettings} from './OriginSettings';
import type {OriginMode} from './OriginSettings';
import type {PublicPlace} from './places';
import {normalizeCounts} from './participantCounts';
import type {ParticipantCount} from './types';
import {useEffect,useRef,useState,useId} from 'react';
import {X} from 'lucide-react';
import type {DemoGroup,GroupDetails} from './workspace';
import {today} from './workspace';
export function GroupDetailsDialog({group,copy,onSave,onClose}:{group:DemoGroup;copy:boolean;onSave:(input:GroupDetails&{travelDate:string})=>void;onClose:()=>void}){
 const [nameKind,setNameKind]=useState<GroupNameKind>(group.state.organization.nameKind??'auto');
 const initialOriginMode=group.state.organization.originMode??'school';
 const [originMode,setOriginMode]=useState<OriginMode>(initialOriginMode);
 const [originPlace,setOriginPlace]=useState<PublicPlace|undefined>();
 const currentOrigin=group.state.waypoints.find(point=>point.id==='start')?.place;
 const formId=useId();const [visitDuration,setVisitDuration]=useState<VisitDuration|''>(group.state.organization.visitDuration??'');const [notes,setNotes]=useState(group.state.organization.notes??'');const [programType,setProgramType]=useState<ProgramType|''>(normalizeProgramType(group.state.organization.programType));const dialog=useRef<HTMLDialogElement>(null);const [name,setName]=useState(group.state.organization.name);const [participantCounts,setParticipantCounts]=useState<ParticipantCount>(()=>copy?{youth:0,leaders:0}:structuredClone(group.state.counts));const [date,setDate]=useState(today);const [error,setError]=useState('');const submitting=useRef(false);useEffect(()=>{dialog.current?.showModal()},[]);
 return <dialog className="registration-dialog group-details-dialog" ref={dialog} aria-labelledby="group-details-title" onCancel={onClose}><div className="dialog-head"><h2 id="group-details-title">{!copy&&<ThinkingNoteCloudIcon/>}{copy?'복사해서 새 일정 등록':'단체 정보 수정'}</h2><div className="group-dialog-actions"><button type="button" className="icon-button" aria-label="단체 정보 창 닫기" onClick={onClose}><X/></button></div></div><form id={formId} onSubmit={e=>{e.preventDefault();if(submitting.current)return;try{if(!copy&&originMode!==initialOriginMode&&!originPlace)throw Error('검색 결과에서 출발 장소를 선택해주세요.');const counts=normalizeCounts(participantCounts);submitting.current=true;onSave({name,nameKind,programType,visitDuration,notes,...counts,travelDate:date,...(!copy&&originPlace?{originPlace,originMode}:{})});onClose()}catch(e){submitting.current=false;setError((e as Error).message)}}}><p className="fine">{copy?'장소·순서·지도 위치를 복사해요. 이동 기록과 인원 변경 이력은 비우고 새로 시작해요.':'이동 기록은 유지돼요. 새 주소를 선택하면 수정 저장 시 출발지에 반영돼요.'}</p><GroupBasicFields name={name} onName={setName} date={copy?date:group.travelDate} onDate={copy?setDate:undefined} programType={programType} onProgram={setProgramType} duration={visitDuration} onDuration={setVisitDuration} notes={notes} onNotes={setNotes}/><GroupNameKindField name={name} selectedName={originPlace?.name??currentOrigin?.name} originMode={originMode} value={nameKind} onChange={setNameKind}/>{!copy&&<>{initialOriginMode==='other'&&originMode==='school'&&<p className="fine" role="status">학교·단체 주소를 선택하고 저장하면 출발지 → 고흥IC → 나로1대교 → 국립청소년우주센터로 자동 변경됩니다. 나로2대교와 다른 중간 지점은 경로에서 제외됩니다.</p>}<OriginSettings name={name} mode={originMode} onMode={setOriginMode} onSelect={setOriginPlace} editing currentPlace={currentOrigin} currentName={group.state.trip.origin}/></>}<ParticipantEditor name={originMode==='school'?(originPlace?.name||name):name} value={participantCounts} onChange={setParticipantCounts}/>{copy&&<p className="fine">이번 일정의 인원을 입력해주세요. 모두 0명이면 ‘인원 미입력’으로 표시돼요.</p>}{error&&<p role="alert" className="form-error">{error}</p>}<button className="primary" type="submit">{copy?'새 일정 등록':'수정 저장'}</button></form></dialog>
}
